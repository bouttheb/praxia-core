import { scanProjectCandidates } from "@/lib/project-import";

async function main() {
  const root = process.argv[2] ?? process.cwd();
  const candidates = await scanProjectCandidates(root);
  if (candidates.length === 0) {
    console.log(`No project candidates found under ${root}`);
    return;
  }
  for (const candidate of candidates) {
    console.log(`${candidate.name}`);
    console.log(`  path: ${candidate.workingDirectory}`);
    console.log(`  git: ${candidate.hasGit ? "yes" : "no"}`);
    console.log(`  docs: ${candidate.docs.length ? candidate.docs.join(", ") : "none"}`);
    if (candidate.description) console.log(`  description: ${candidate.description}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
