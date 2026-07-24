#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { commandForAgent } from "./agent-adapters.mjs";

const envPath = join(homedir(), ".praxia", "dashboard.env");
loadEnvFile(envPath);

const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:3030";
const DASHBOARD_WRITE_KEY = process.env.DASHBOARD_WRITE_KEY;
const DAEMON_ID = process.env.DAEMON_ID || "local-daemon";
const POLL_INTERVAL_MS = Number(process.env.DAEMON_POLL_INTERVAL_MS || 5000);
const VERSION = "praxia-core-daemon-v0";
const PROJECT_SOURCE_DOC_PATHS = ["docs/VISION.md", "VISION.md", "README.md", "ARCHITECTURE.md", "docs/ARCHITECTURE.md"];
const MAX_DOC_BYTES = Number(process.env.PRAXIA_MAX_DOC_BYTES || 80_000);

if (!DASHBOARD_WRITE_KEY) {
  console.error("DASHBOARD_WRITE_KEY is required. Put it in ~/.praxia/dashboard.env or the process environment.");
  process.exit(1);
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function redactSensitiveText(input) {
  return input
    .replace(/(api[_-]?key|secret|token|password)\s*[:=]\s*["']?[^"'\s]+/gi, "$1=[REDACTED]")
    .replace(/(sk-[A-Za-z0-9_-]{20,})/g, "[REDACTED_API_KEY]")
    .replace(/(postgres(?:ql)?:\/\/)[^\s)]+/gi, "$1[REDACTED_DATABASE_URL]");
}

function readProjectSourceDocs(root, projectName) {
  const docs = [];
  let used = 0;
  for (const docPath of PROJECT_SOURCE_DOC_PATHS) {
    const fullPath = join(root, docPath);
    if (!existsSync(fullPath)) continue;
    try {
      const contents = readFileSync(fullPath, "utf8");
      const bytes = Buffer.byteLength(contents, "utf8");
      if (used + bytes > MAX_DOC_BYTES && docs.length > 0) continue;
      used += bytes;
      docs.push({
        path: docPath,
        contents: redactSensitiveText(contents).trimEnd(),
      });
    } catch {
      // Ignore unreadable docs; the command can still run.
    }
  }

  if (docs.length === 0) return null;
  return `# ${projectName} Source Docs Snapshot

Synced by the Praxia daemon from the local project repository.

${docs.map((doc) => `## ${doc.path}\n\n${doc.contents}`).join("\n\n")}
`;
}

function buildAgentPrompt(command, cwd) {
  const localDocs = readProjectSourceDocs(cwd, command.project_name);
  const docs = localDocs || command.vision_md || "No README, VISION, or ARCHITECTURE docs are currently synced.";
  const latestUpdate = [command.latest_today, command.latest_tomorrow]
    .filter(Boolean)
    .join("\nNext: ");
  const workflowContext = command.workflow_run_id
    ? `Workflow context:
Template: ${command.workflow_template_label || "Praxia workflow"}
Step: ${Number(command.workflow_step_index ?? 0) + 1} of ${command.workflow_total_steps || "?"}
Step title: ${command.workflow_step_title || "Current step"}
Definition of done:
${Array.isArray(command.workflow_definition_of_done) && command.workflow_definition_of_done.length > 0
  ? command.workflow_definition_of_done.map((item) => `- ${item}`).join("\n")
  : "- Complete the current step and report verification evidence"}
`
    : "Workflow context: ad hoc command";

  return `You are working inside a Praxia-managed AI coding project.

Project: ${command.project_name}
Current Praxia completion: ${Number(command.completion_percent || 0)}%
Working directory: ${cwd}
${workflowContext}

Project scope docs:

${docs}

Latest Praxia update:
${latestUpdate || "No prior update logged."}

User command:
${command.body}

After you finish, include this exact block at the end of your response so Praxia can update the dashboard:

PRAXIA_REPORT
summary: one concise paragraph describing what you completed
next: the next useful step or blocker
completion_percent: integer from 0 to 100 based on the project scope docs
workflow_step_status: completed, blocked, needs_input, failed, or cancelled
verification: what you ran or inspected to verify this step
blockers: any blocker, or none
needs_input: the exact human input needed, or none
scope_changed: yes or no
docs_updated: yes or no
END_PRAXIA_REPORT

If the project scope changed, update the local README/VISION/ARCHITECTURE docs before reporting docs_updated: yes.`;
}

async function api(method, path, body) {
  const response = await fetch(new URL(path, DASHBOARD_URL), {
    method,
    headers: {
      authorization: `Bearer ${DASHBOARD_WRITE_KEY}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `${method} ${path} failed with HTTP ${response.status}`);
  }
  return payload;
}

function resolveWorkingDir(value) {
  if (!value || typeof value !== "string") {
    return { ok: false, reason: "Project has no working directory." };
  }
  const expanded = value.startsWith("~/") ? join(homedir(), value.slice(2)) : value;
  const absolute = resolve(expanded);
  if (!absolute.startsWith("/")) return { ok: false, reason: "Working directory must be absolute." };
  if (!existsSync(absolute)) return { ok: false, reason: `Working directory does not exist: ${absolute}` };
  const real = realpathSync(absolute);
  return { ok: true, path: real };
}

function runProcess({ agent, body, cwd }) {
  const { bin, args } = commandForAgent(agent, body);
  return new Promise((resolveRun) => {
    const started = Date.now();
    let stdout = "";
    let stderr = "";
    const child = spawn(bin, args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });
    child.on("error", (error) => {
      resolveRun({
        status: "failed",
        result: stdout.trim(),
        error: error.message,
        exitCode: 127,
        durationMs: Date.now() - started,
      });
    });
    child.on("close", (code) => {
      const ok = code === 0;
      resolveRun({
        status: ok ? "completed" : "failed",
        result: stdout.trim(),
        error: ok ? null : stderr.trim() || `Process exited with code ${code}`,
        exitCode: code,
        durationMs: Date.now() - started,
      });
    });
  });
}

async function tick() {
  await api("POST", "/api/daemon/heartbeat", {
    daemonId: DAEMON_ID,
    dashboardUrl: DASHBOARD_URL,
    version: VERSION,
    note: "polling",
  });
  const { command } = await api("POST", "/api/commands/claim", { daemonId: DAEMON_ID });
  if (!command) return;
  log(`claimed command ${command.id} for ${command.project_name}`);

  const cwd = resolveWorkingDir(command.working_dir);
  if (!cwd.ok) {
    await api("PATCH", `/api/commands/${command.id}`, {
      status: "blocked",
      error: cwd.reason,
      durationMs: 0,
    });
    log(`blocked command ${command.id}: ${cwd.reason}`);
    return;
  }

  const result = await runProcess({
    agent: command.agent,
    body: buildAgentPrompt(command, cwd.path),
    cwd: cwd.path,
  });
  await api("PATCH", `/api/commands/${command.id}`, {
    ...result,
    sourceDocsMarkdown: readProjectSourceDocs(cwd.path, command.project_name),
  });
  log(`finished command ${command.id} with ${result.status}`);
}

async function main() {
  log(`Praxia Core daemon started as ${DAEMON_ID}; polling ${DASHBOARD_URL}`);
  while (true) {
    try {
      await tick();
    } catch (error) {
      log(`poll error: ${error instanceof Error ? error.message : String(error)}`);
    }
    await new Promise((resolveTimer) => setTimeout(resolveTimer, POLL_INTERVAL_MS));
  }
}

main();
