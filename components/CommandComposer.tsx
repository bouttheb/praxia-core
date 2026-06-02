"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { agentOptions, type AgentKey } from "@/lib/agents";

type ProjectOption = {
  id: number;
  name: string;
  area: string;
  agent: AgentKey;
};

export function CommandComposer({
  projects,
  initialProjectId,
  initialPrompt,
}: {
  projects: ProjectOption[];
  initialProjectId?: number | null;
  initialPrompt?: string;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(String(initialProjectId ?? projects[0]?.id ?? ""));
  const [body, setBody] = useState(initialPrompt ?? "");
  const [agent, setAgent] = useState<"project" | AgentKey>("project");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!projectId || !body.trim()) return;
    setStatus("submitting");
    setError(null);
    try {
      const response = await fetch("/api/commands", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: Number(projectId),
          body,
          agent: agent === "project" ? undefined : agent,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);
      setStatus("done");
      setBody("");
      router.refresh();
      router.push("/runs");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not queue command.");
    }
  }

  return (
    <section className="surface-solid p-5">
      <div className="eyebrow">Queue command</div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_260px] gap-4 mt-4">
        <div>
          <label className="text-sm font-medium" htmlFor="command-body">
            What should the local agent do?
          </label>
          <textarea
            id="command-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={8}
            className="input mt-2 w-full"
            placeholder="Run tests, inspect the latest diff, continue the build, or implement the next feature..."
          />
        </div>
        <div className="space-y-4">
          <label className="block text-sm font-medium" htmlFor="project-id">
            Project
          </label>
          <select id="project-id" className="input w-full" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.area} / {project.name}
              </option>
            ))}
          </select>

          <label className="block text-sm font-medium" htmlFor="agent">
            Agent
          </label>
          <select id="agent" className="input w-full" value={agent} onChange={(event) => setAgent(event.target.value as "project" | AgentKey)}>
            <option value="project">Project default</option>
            {agentOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>

          <button type="button" onClick={submit} disabled={!projectId || !body.trim() || status === "submitting"} className="btn btn-primary w-full">
            {status === "submitting" ? "Queueing..." : "Queue command"}
          </button>
          {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}
        </div>
      </div>
    </section>
  );
}
