import { NextResponse } from "next/server";
import { generateDeviceToken, hashSecret, requireCloudMode } from "@/lib/cloud-mode";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const cloudGuard = requireCloudMode();
  if (cloudGuard) return cloudGuard;

  const body = (await req.json().catch(() => null)) as {
    code?: unknown;
    daemonId?: unknown;
    label?: unknown;
  } | null;

  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const daemonId = typeof body?.daemonId === "string" && body.daemonId.trim() ? body.daemonId.trim() : "hosted-daemon";
  const label = typeof body?.label === "string" && body.label.trim() ? body.label.trim() : daemonId;
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const [pairing] = await sql<
    {
      id: number;
      organization_id: number;
      status: string;
      expires_at: string;
    }[]
  >`
    SELECT id, organization_id, status, expires_at
    FROM daemon_pairing_codes
    WHERE code_hash = ${hashSecret(code)}
    LIMIT 1
  `;

  if (!pairing || pairing.status !== "pending" || new Date(pairing.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "pairing code is invalid or expired" }, { status: 404 });
  }

  const deviceToken = generateDeviceToken();
  const [device] = await sql<{ id: number }[]>`
    INSERT INTO daemon_devices (
      organization_id,
      daemon_id,
      label,
      token_hash,
      last_seen_at,
      status
    )
    VALUES (
      ${pairing.organization_id},
      ${daemonId},
      ${label},
      ${hashSecret(deviceToken)},
      NOW(),
      'active'
    )
    RETURNING id
  `;

  await sql`
    UPDATE daemon_pairing_codes
    SET status = 'used', claimed_by_daemon_id = ${daemonId}, claimed_at = NOW()
    WHERE id = ${pairing.id}
  `;

  await sql`
    INSERT INTO audit_events (organization_id, action, target_type, target_id, metadata)
    VALUES (
      ${pairing.organization_id},
      'daemon_device.paired',
      'daemon_device',
      ${String(device.id)},
      ${JSON.stringify({ daemonId })}::jsonb
    )
  `;

  return NextResponse.json({
    ok: true,
    deviceId: device.id,
    daemonId,
    deviceToken,
    next: "Store this token on the daemon machine and use it as the bearer token for hosted daemon polling.",
  });
}
