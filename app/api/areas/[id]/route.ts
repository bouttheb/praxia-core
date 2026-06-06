import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCommandKeyIfConfigured } from "@/lib/security";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const guard = requireCommandKeyIfConfigured(req);
  if (guard) return guard;

  const { id } = await params;
  const areaId = Number(id);
  if (!Number.isFinite(areaId)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    sort_order?: unknown;
    hidden?: unknown;
  } | null;

  const fields: string[] = [];
  const values: unknown[] = [];
  if (typeof body?.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "area name required" }, { status: 400 });
    fields.push(`name = $${fields.length + 1}`);
    values.push(name);
  }
  if (typeof body?.sort_order === "number") {
    fields.push(`sort_order = $${fields.length + 1}`);
    values.push(Math.round(body.sort_order));
  }
  if (typeof body?.hidden === "boolean") {
    fields.push(`hidden = $${fields.length + 1}`);
    values.push(body.hidden);
  }

  if (fields.length === 0) return NextResponse.json({ error: "no fields to update" }, { status: 400 });

  values.push(areaId);
  const [area] = await sql.unsafe(`UPDATE areas SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING id`, values as never);
  if (!area) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, area });
}

export async function DELETE(req: Request, { params }: Params) {
  const guard = requireCommandKeyIfConfigured(req);
  if (guard) return guard;

  const { id } = await params;
  const areaId = Number(id);
  if (!Number.isFinite(areaId)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const result = await sql`DELETE FROM areas WHERE id = ${areaId} RETURNING id`;
  if (result.count === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
