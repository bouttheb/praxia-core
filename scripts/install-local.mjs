#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";

const cwd = process.cwd();
const localEnvPath = join(cwd, ".env.local");
const daemonEnvPath = join(homedir(), ".praxia", "dashboard.env");

function parseEnv(text) {
  const values = new Map();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    values.set(trimmed.slice(0, index), trimmed.slice(index + 1));
  }
  return values;
}

function serializeEnv(values) {
  return Array.from(values.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n";
}

function readEnv(path) {
  if (!existsSync(path)) return new Map();
  return parseEnv(readFileSync(path, "utf8"));
}

function ensure(value, fallback) {
  return value && value.trim() ? value : fallback;
}

const local = readEnv(localEnvPath);
const daemon = readEnv(daemonEnvPath);
const writeKey = ensure(
  process.env.DASHBOARD_WRITE_KEY || local.get("DASHBOARD_WRITE_KEY") || daemon.get("DASHBOARD_WRITE_KEY"),
  randomBytes(32).toString("hex"),
);
const dashboardUrl = ensure(
  process.env.DASHBOARD_URL || local.get("DASHBOARD_URL") || daemon.get("DASHBOARD_URL"),
  "http://localhost:3030",
);
const databaseUrl = ensure(process.env.DATABASE_URL || local.get("DATABASE_URL"), "");
const daemonId = ensure(process.env.DAEMON_ID || daemon.get("DAEMON_ID"), hostname() || "local-machine");

local.set("DATABASE_URL", databaseUrl || "postgres://praxia:praxia@localhost:5432/praxia");
local.set("DASHBOARD_WRITE_KEY", writeKey);
local.set("DASHBOARD_URL", dashboardUrl);
if (!local.has("COMMAND_KEY")) local.set("COMMAND_KEY", "");

daemon.set("DASHBOARD_URL", dashboardUrl);
daemon.set("DASHBOARD_WRITE_KEY", writeKey);
daemon.set("DAEMON_ID", daemonId);
daemon.set("CLAUDE_BIN", ensure(process.env.CLAUDE_BIN || daemon.get("CLAUDE_BIN"), "claude"));
daemon.set("CODEX_BIN", ensure(process.env.CODEX_BIN || daemon.get("CODEX_BIN"), "codex"));
daemon.set("DAEMON_POLL_INTERVAL_MS", ensure(process.env.DAEMON_POLL_INTERVAL_MS || daemon.get("DAEMON_POLL_INTERVAL_MS"), "5000"));

mkdirSync(dirname(daemonEnvPath), { recursive: true });
writeFileSync(localEnvPath, serializeEnv(local), "utf8");
writeFileSync(daemonEnvPath, serializeEnv(daemon), { encoding: "utf8", mode: 0o600 });

console.log("Praxia Core local config written.");
console.log(`- ${localEnvPath}`);
console.log(`- ${daemonEnvPath}`);
if (!databaseUrl) {
  console.log("");
  console.log("No DATABASE_URL was found, so .env.local now points at the Docker Postgres default.");
  console.log("Run:");
  console.log("  docker compose up -d postgres");
  console.log("  npm run db:init");
} else {
  console.log("");
  console.log("Next:");
  console.log("  npm run db:init");
}
console.log("  npm run dev");
console.log("  node daemon/dashboard-daemon.mjs");
