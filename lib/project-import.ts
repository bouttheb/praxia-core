import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export type ProjectImportCandidate = {
  name: string;
  workingDirectory: string;
  description: string | null;
  hasGit: boolean;
  docs: string[];
};

const DOC_PATHS = ["README.md", "docs/VISION.md", "VISION.md", "ARCHITECTURE.md", "docs/ARCHITECTURE.md"];

function displayName(dir: string) {
  return path.basename(dir)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function exists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readDescription(root: string) {
  const readmePath = path.join(root, "README.md");
  try {
    const text = await readFile(readmePath, "utf8");
    const firstParagraph = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && !line.startsWith("!"))[0];
    return firstParagraph?.slice(0, 220) || null;
  } catch {
    return null;
  }
}

export async function scanProjectCandidates(root: string, maxDepth = 2): Promise<ProjectImportCandidate[]> {
  const resolvedRoot = path.resolve(root.replace(/^~(?=\/|$)/, process.env.HOME || "~"));
  const candidates = new Map<string, ProjectImportCandidate>();

  async function walk(current: string, depth: number) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    const hasGit = entries.some((entry) => entry.name === ".git");
    const docs = [];
    for (const docPath of DOC_PATHS) {
      if (await exists(path.join(current, docPath))) docs.push(docPath);
    }

    if (hasGit || docs.length > 0) {
      candidates.set(current, {
        name: displayName(current),
        workingDirectory: current,
        description: await readDescription(current),
        hasGit,
        docs,
      });
      if (hasGit) return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      await walk(path.join(current, entry.name), depth + 1);
    }
  }

  await walk(resolvedRoot, 0);
  return Array.from(candidates.values()).sort((a, b) => a.workingDirectory.localeCompare(b.workingDirectory));
}
