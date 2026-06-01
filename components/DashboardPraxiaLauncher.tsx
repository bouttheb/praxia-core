"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Candidate = {
  id: number;
  name: string;
  area: string;
  description: string | null;
  vision_md: string | null;
  last_today: string | null;
  last_tomorrow: string | null;
};

const quickPrompts = [
  "What needs attention across my projects?",
  "Continue the most important blocked project.",
  "Summarize what changed recently.",
];

function scoreProject(prompt: string, project: Candidate) {
  const haystack = [project.name, project.area, project.description, project.vision_md, project.last_today, project.last_tomorrow]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const terms = prompt
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export function DashboardPraxiaLauncher({ projects }: { projects: Candidate[] }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const trimmed = prompt.trim();
  const likelyProject = useMemo(() => {
    if (!trimmed) return null;
    const ranked = projects
      .map((project) => ({ project, score: scoreProject(trimmed, project) }))
      .sort((a, b) => b.score - a.score);
    return ranked[0]?.score > 0 ? ranked[0].project : null;
  }, [projects, trimmed]);

  function ask() {
    if (!trimmed) return;
    const params = new URLSearchParams({ prompt: trimmed });
    if (likelyProject) params.set("project", String(likelyProject.id));
    router.push(`/chat?${params.toString()}`);
  }

  return (
    <section className="surface-solid p-5 mb-8">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
        <div className="flex-1 min-w-0">
          <div className="eyebrow">Command from anywhere</div>
          <label className="sr-only" htmlFor="dashboard-praxia-prompt">
            Ask Praxia
          </label>
          <textarea
            id="dashboard-praxia-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
                event.preventDefault();
                ask();
              }
            }}
            rows={2}
            className="input mt-3 w-full"
            placeholder="Tell the machine at home what to do next..."
            style={{ resize: "vertical", minHeight: "4.5rem" }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {quickPrompts.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPrompt(item)}
                className="status-chip text-left"
                style={{ maxWidth: "100%", whiteSpace: "normal" }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="lg:w-72 shrink-0">
          <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--color-ink-faint)" }}>
            Likely project
          </div>
          <div className="mt-1 min-h-6 text-sm font-medium">
            {likelyProject ? likelyProject.name : "Dashboard context"}
          </div>
          <div className="mt-1 min-h-8 text-xs" style={{ color: "var(--color-ink-mute)" }}>
            {likelyProject ? `${likelyProject.area} - command will open with this project selected.` : "Choose a project on the next screen if needed."}
          </div>
          <button type="button" onClick={ask} disabled={!trimmed} className="btn btn-primary mt-3 w-full justify-center">
            Queue command
          </button>
        </div>
      </div>
    </section>
  );
}
