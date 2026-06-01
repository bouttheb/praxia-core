import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { sql } from "@/lib/db";
import { normalizeWorkingDirectory, redactSensitiveText } from "@/lib/security";

export const PROJECT_SOURCE_DOC_PATHS = [
  "docs/VISION.md",
  "VISION.md",
  "README.md",
  "ARCHITECTURE.md",
  "docs/ARCHITECTURE.md",
] as const;

export type ProjectSourceDoc = {
  path: string;
  bytes: number;
  contents: string;
};

async function readDoc(root: string, relativePath: string): Promise<ProjectSourceDoc | null> {
  try {
    const fullPath = path.join(root, relativePath);
    const info = await stat(fullPath);
    if (!info.isFile()) return null;
    const contents = await readFile(fullPath, "utf8");
    return {
      path: relativePath,
      bytes: Buffer.byteLength(contents, "utf8"),
      contents,
    };
  } catch {
    return null;
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function buildProjectSourceDocsSnapshot({
  projectName,
  workingDirectory,
}: {
  projectName: string;
  workingDirectory: string | null;
}) {
  const root = normalizeWorkingDirectory(workingDirectory);
  if (!root) return null;

  const docs = (
    await Promise.all(PROJECT_SOURCE_DOC_PATHS.map((docPath) => readDoc(path.resolve(root), docPath)))
  ).filter((doc): doc is ProjectSourceDoc => doc !== null);

  if (docs.length === 0) return null;

  const safeDocs = docs.map((doc) => ({
    ...doc,
    contents: redactSensitiveText(doc.contents),
  }));
  const sections = safeDocs
    .map((doc) => `## ${doc.path}\n\n${doc.contents.trimEnd()}`)
    .join("\n\n");

  return {
    docs: safeDocs,
    markdown: `# ${projectName} Source Docs Snapshot

Synced by Praxia Core from the local project repository.

${sections}
`,
  };
}

export async function syncProjectSourceDocs(projectId: number) {
  const [project] = await sql<
    {
      id: number;
      name: string;
      completion_percent: number;
      vision_md: string | null;
      working_directory: string | null;
    }[]
  >`
    SELECT id, name, completion_percent, vision_md, working_directory
    FROM projects
    WHERE id = ${projectId}
  `;
  if (!project) return null;

  const snapshot = await buildProjectSourceDocsSnapshot({
    projectName: project.name,
    workingDirectory: project.working_directory,
  });

  if (!snapshot) {
    return {
      ok: true,
      synced: false,
      docs_found: 0,
      doc_paths: [] as string[],
      completion_percent: project.completion_percent,
      message: "No readable source docs found for this project.",
    };
  }

  const oldVision = project.vision_md ?? "";
  const nextVision = snapshot.markdown;
  const synced = oldVision.trim() !== nextVision.trim();
  if (synced) {
    await sql`
      UPDATE projects
      SET vision_md = ${nextVision}, updated_at = NOW()
      WHERE id = ${projectId}
    `;
  }

  return {
    ok: true,
    synced,
    docs_found: snapshot.docs.length,
    doc_paths: snapshot.docs.map((doc) => doc.path),
    old_vision_length: oldVision.length,
    new_vision_length: nextVision.length,
    completion_percent: project.completion_percent,
    slug: slugify(project.name),
  };
}
