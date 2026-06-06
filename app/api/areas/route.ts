import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCommandKeyIfConfigured } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = requireCommandKeyIfConfigured(req);
  if (guard) return guard;

  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "area name required" }, { status: 400 });

  const [area] = await sql<{ id: number }[]>`
    INSERT INTO areas (name, sort_order)
    VALUES (${name}, COALESCE((SELECT MAX(sort_order) + 1 FROM areas), 0))
    RETURNING id
  `;
  return NextResponse.json({ ok: true, areaId: area.id });
}
