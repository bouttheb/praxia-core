#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const envPath = join(homedir(), ".praxia", "dashboard.env");
loadEnvFile(envPath);

const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:3030";
const DASHBOARD_WRITE_KEY = process.env.DASHBOARD_WRITE_KEY;
const DAEMON_ID = process.env.DAEMON_ID || "local-daemon";
const POLL_INTERVAL_MS = Number(process.env.DAEMON_POLL_INTERVAL_MS || 5000);
const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
const CODEX_BIN = process.env.CODEX_BIN || "codex";

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

function commandForAgent(agent, body) {
  if (agent === "codex") return { bin: CODEX_BIN, args: ["exec", "--full-auto", body] };
  return { bin: CLAUDE_BIN, args: ["-p", "--permission-mode", "bypassPermissions", body] };
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
    body: command.body,
    cwd: cwd.path,
  });
  await api("PATCH", `/api/commands/${command.id}`, result);
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
