import path from "node:path";
import { timingSafeEqual } from "node:crypto";

const MAX_COMMAND_BYTES = 100_000;

export function safeCompareSecret(provided: string | null | undefined, expected: string | null | undefined) {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

export function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function requireDaemonKey(req: Request): Response | null {
  const expected = process.env.DASHBOARD_WRITE_KEY;
  if (!expected) {
    return Response.json(
      { error: "DASHBOARD_WRITE_KEY is not configured on the web app." },
      { status: 503 },
    );
  }
  if (!safeCompareSecret(getBearerToken(req), expected)) {
    return Response.json({ error: "daemon write key required" }, { status: 401 });
  }
  return null;
}

export function requireCommandKeyIfConfigured(req: Request): Response | null {
  const expected = process.env.COMMAND_KEY;
  if (!expected) {
    if (process.env.NODE_ENV === "production" && !isLoopbackRequest(req)) {
      return Response.json(
        { error: "COMMAND_KEY must be configured before exposing Praxia command APIs." },
        { status: 503 },
      );
    }
    return null;
  }
  if (
    safeCompareSecret(req.headers.get("x-praxia-command-key"), expected) ||
    safeCompareSecret(getBearerToken(req), expected)
  ) {
    return null;
  }
  return Response.json({ error: "command key required" }, { status: 401 });
}

function isLoopbackRequest(req: Request) {
  try {
    const hostname = new URL(req.url).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

export function checkCommandBody(value: unknown): string | Response {
  if (typeof value !== "string" || !value.trim()) {
    return Response.json({ error: "command body required" }, { status: 400 });
  }
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes > MAX_COMMAND_BYTES) {
    return Response.json({ error: "command body too large" }, { status: 413 });
  }
  return value.trim();
}

export function normalizeWorkingDirectory(value: string | null): string | null {
  if (!value?.trim()) return null;
  if (value.startsWith("~/")) {
    const home = process.env.HOME || "";
    return path.join(home, value.slice(2));
  }
  return value;
}

export function redactSensitiveText(input: string): string {
  return input
    .replace(/(api[_-]?key|secret|token|password)\s*[:=]\s*["']?[^"'\s]+/gi, "$1=[REDACTED]")
    .replace(/(sk-[A-Za-z0-9_-]{20,})/g, "[REDACTED_API_KEY]")
    .replace(/(postgres(?:ql)?:\/\/)[^\s)]+/gi, "$1[REDACTED_DATABASE_URL]");
}
