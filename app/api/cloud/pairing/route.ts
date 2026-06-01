import { NextResponse } from "next/server";
import { generatePairingCode, hashSecret, requireCloudMode, requireHostedAdminKey } from "@/lib/cloud-mode";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    enabled: process.env.PRAXIA_MODE === "cloud",
    purpose: "Create short-lived daemon pairing codes for hosted Praxia deployments.",
    create: "POST /api/cloud/pairing with an organizationId and HOSTED_ADMIN_KEY.",
  });
}

export async function POST(req: Request) {
  const cloudGuard = requireCloudMode();
  if (cloudGuard) return cloudGuard;

  const adminGuard = requireHostedAdminKey(req);
  if (adminGuard) return adminGuard;

  const body = (await req.json().catch(() => null)) as {
    organizationId?: unknown;
    accountId?: unknown;
    ttlMinutes?: unknown;
  } | null;

  const organizationId = Number(body?.organizationId);
  if (!Number.isFinite(organizationId)) {
    return NextResponse.json({ error: "organizationId required" }, { status: 400 });
  }

  const accountId = Number.isFinite(Number(body?.accountId)) ? Number(body?.accountId) : null;
  const ttlMinutes = Math.min(Math.max(Number(body?.ttlMinutes) || 15, 5), 60);
  const code = generatePairingCode();

  const [pairing] = await sql<{ id: number; expires_at: string }[]>`
    INSERT INTO daemon_pairing_codes (
      organization_id,
      created_by_account_id,
      code_hash,
      expires_at
    )
    VALUES (
      ${organizationId},
      ${accountId},
      ${hashSecret(code)},
      NOW() + make_interval(mins => ${ttlMinutes})
    )
    RETURNING id, expires_at
  `;

  await sql`
    INSERT INTO audit_events (organization_id, account_id, action, target_type, target_id, metadata)
    VALUES (
      ${organizationId},
      ${accountId},
      'daemon_pairing.created',
      'daemon_pairing_code',
      ${String(pairing.id)},
      ${JSON.stringify({ ttlMinutes })}::jsonb
    )
  `;

  return NextResponse.json({
    pairingId: pairing.id,
    code,
    expiresAt: pairing.expires_at,
    next: "Run `praxia daemon pair` or POST this code to /api/cloud/pairing/complete from the daemon machine.",
  });
}
