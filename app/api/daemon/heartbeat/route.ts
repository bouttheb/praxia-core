import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireDaemonKey } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = requireDaemonKey(req);
  if (guard) return guard;

  const body = (await req.json().catch(() => null)) as {
    daemonId?: unknown;
    dashboardUrl?: unknown;
    version?: unknown;
    note?: unknown;
  } | null;

  const daemonId =
    typeof body?.daemonId === "string" && body.daemonId.trim()
      ? body.daemonId.trim()
      : "unnamed-daemon";
  const dashboardUrl = typeof body?.dashboardUrl === "string" ? body.dashboardUrl : null;
  const version = typeof body?.version === "string" ? body.version : "praxia-core";
  const note = typeof body?.note === "string" ? body.note : null;

  await sql`
    INSERT INTO daemon_heartbeats (daemon_id, dashboard_url, version, note, last_seen_at)
    VALUES (${daemonId}, ${dashboardUrl}, ${version}, ${note}, NOW())
    ON CONFLICT (daemon_id)
    DO UPDATE SET
      dashboard_url = EXCLUDED.dashboard_url,
      version = EXCLUDED.version,
      note = EXCLUDED.note,
      last_seen_at = NOW()
  `;

  return NextResponse.json({ ok: true, daemonId });
}
