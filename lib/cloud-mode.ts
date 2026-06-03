import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getBearerToken, safeCompareSecret } from "@/lib/security";

export function isCloudMode() {
  return process.env.PRAXIA_MODE === "cloud";
}

export function requireCloudMode() {
  if (isCloudMode()) return null;
  return NextResponse.json(
    {
      error: "cloud mode is disabled",
      next: "Set PRAXIA_MODE=cloud in the hosted deployment before enabling device pairing.",
    },
    { status: 404 },
  );
}

export function requireHostedAdminKey(req: Request) {
  const expected = process.env.HOSTED_ADMIN_KEY;
  if (!expected) {
    return NextResponse.json(
      {
        error: "HOSTED_ADMIN_KEY is not configured",
        next: "Hosted pairing creation must be protected by real auth before production use.",
      },
      { status: 503 },
    );
  }
  if (
    safeCompareSecret(getBearerToken(req), expected) ||
    safeCompareSecret(req.headers.get("x-praxia-hosted-admin-key"), expected)
  ) {
    return null;
  }
  return NextResponse.json({ error: "hosted admin key required" }, { status: 401 });
}

export function generatePairingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  const bytes = randomBytes(12);
  for (const byte of bytes) value += alphabet[byte % alphabet.length];
  return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}`;
}

export function generateDeviceToken() {
  return `pxd_${randomBytes(32).toString("base64url")}`;
}

export function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
