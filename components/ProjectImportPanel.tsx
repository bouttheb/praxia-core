"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Candidate = {
  name: string;
  workingDirectory: string;
  description: string | null;
  hasGit: boolean;
  docs: string[];
};

export function ProjectImportPanel() {
  const router = useRouter();
  const [root, setRoot] = useState("~/code");
  const [areaName, setAreaName] = useState("Imported Projects");
  const [agent, setAgent] = useState<"claude" | "codex">("claude");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "scanning" | "importing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function scan() {
    setStatus("scanning");
    setError(null);
    try {
      const response = await fetch("/api/projects/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ root, maxDepth: 2 }),
      });
      const payload = (await response.json()) as { candidates?: Candidate[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`);
      const next = payload.candidates ?? [];
      setCandidates(next);
      setSelected(new Set(next.slice(0, 10).map((candidate) => candidate.workingDirectory)));
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not scan projects.");
    }
  }

  async function importSelected() {
    setStatus("importing");
    setError(null);
    try {
      const chosen = candidates.filter((candidate) => selected.has(candidate.workingDirectory));
      for (const candidate of chosen) {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            areaName,
            name: candidate.name,
            description: candidate.description,
            workingDirectory: candidate.workingDirectory,
            agent,
          }),
        });
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);
      }
      setStatus("done");
      router.refresh();
      router.push("/");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not import selected projects.");
    }
  }

  function toggle(path: string) {
    const next = new Set(selected);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelected(next);
  }

  return (
    <section className="surface-solid p-5">
      <div className="eyebrow">Import projects</div>
      <h2 className="serif text-2xl mt-2">Scan a folder</h2>
      <p className="mt-2 text-sm" style={{ color: "var(--color-ink-mute)" }}>
        Find git repos and README/VISION docs under a local folder, then import the ones you choose.
      </p>
      <div className="grid md:grid-cols-[minmax(0,1fr)_180px_140px] gap-3 mt-4">
        <input className="input w-full font-mono text-sm" value={root} onChange={(event) => setRoot(event.target.value)} />
        <input className="input w-full" value={areaName} onChange={(event) => setAreaName(event.target.value)} />
        <select className="input w-full" value={agent} onChange={(event) => setAgent(event.target.value as "claude" | "codex")}>
          <option value="claude">Claude Code</option>
          <option value="codex">Codex</option>
        </select>
      </div>
      <div className="mt-3 flex gap-2 flex-wrap">
        <button type="button" className="btn" onClick={scan} disabled={status === "scanning"}>
          {status === "scanning" ? "Scanning..." : "Scan folder"}
        </button>
        {candidates.length > 0 && (
          <button type="button" className="btn btn-primary" onClick={importSelected} disabled={selected.size === 0 || status === "importing"}>
            Import {selected.size}
          </button>
        )}
      </div>
      {error && <p className="text-sm mt-3" style={{ color: "var(--color-danger)" }}>{error}</p>}
      {candidates.length > 0 && (
        <div className="mt-4 space-y-2 max-h-[360px] overflow-y-auto cockpit-scroll">
          {candidates.map((candidate) => (
            <label key={candidate.workingDirectory} className="block rounded-[14px] p-3" style={{ border: "1px solid var(--color-line)" }}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(candidate.workingDirectory)}
                  onChange={() => toggle(candidate.workingDirectory)}
                  className="mt-1"
                />
                <div className="min-w-0">
                  <div className="font-semibold">{candidate.name}</div>
                  <div className="text-xs truncate font-mono" style={{ color: "var(--color-ink-faint)" }}>
                    {candidate.workingDirectory}
                  </div>
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {candidate.hasGit && <span className="status-chip">git</span>}
                    {candidate.docs.slice(0, 3).map((doc) => <span key={doc} className="status-chip">{doc}</span>)}
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
