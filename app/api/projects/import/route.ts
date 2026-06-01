import { NextResponse } from "next/server";
import { scanProjectCandidates } from "@/lib/project-import";
import { requireCommandKeyIfConfigured } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = requireCommandKeyIfConfigured(req);
  if (guard) return guard;

  const body = (await req.json().catch(() => null)) as { root?: unknown; maxDepth?: unknown } | null;
  const root = typeof body?.root === "string" && body.root.trim() ? body.root.trim() : process.env.HOME || process.cwd();
  const maxDepth = Number.isFinite(Number(body?.maxDepth)) ? Number(body?.maxDepth) : 2;
  const candidates = await scanProjectCandidates(root, Math.max(0, Math.min(4, maxDepth)));
  return NextResponse.json({ candidates });
}
