import { NextResponse } from "next/server";
import { syncProjectSourceDocs } from "@/lib/project-source-docs";
import { requireCommandKeyIfConfigured } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    endpoint: "project_source_doc_sync",
    projectId,
    supportedMethods: ["GET", "POST"],
    sourceDocs: ["docs/VISION.md", "VISION.md", "README.md", "ARCHITECTURE.md", "docs/ARCHITECTURE.md"],
  });
}

export async function POST(req: Request, { params }: Params) {
  const guard = requireCommandKeyIfConfigured(req);
  if (guard) return guard;

  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }

  const result = await syncProjectSourceDocs(projectId);
  if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.redirect(new URL("/", req.url));
}
