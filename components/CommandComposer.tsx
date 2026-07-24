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

type ScopeAssessment = {
  decision: "execute" | "clarify" | "split" | "reject";
  confidence: number;
  templateKey: string | null;
  templateLabel: string | null;
  summary: string;
  missingInputs: string[];
  clarifyingQuestions: string[];
  proposedSteps: string[];
  definitionOfDone: string[];
  riskLevel: "low" | "medium" | "high";
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
  const [status, setStatus] = useState<"idle" | "assessing" | "submitting" | "done" | "error">("idle");
  const [assessment, setAssessment] = useState<ScopeAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reviewScope() {
    if (!projectId || !body.trim()) return;
    setStatus("assessing");
    setError(null);
    setAssessment(null);
    try {
      const response = await fetch("/api/commands/scope", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: Number(projectId),
          body,
          agent: agent === "project" ? undefined : agent,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; assessment?: ScopeAssessment } | null;
      if (!response.ok || !payload?.assessment) throw new Error(payload?.error ?? `HTTP ${response.status}`);
      setAssessment(payload.assessment);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not assess scope.");
    }
  }

  async function submit(force = false) {
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
          force,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; assessment?: ScopeAssessment } | null;
      if (!response.ok) {
        if (payload?.assessment) setAssessment(payload.assessment);
        throw new Error(payload?.error ?? `HTTP ${response.status}`);
      }
      setStatus("done");
      setBody("");
      setAssessment(null);
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
            onChange={(event) => {
              setBody(event.target.value);
              setAssessment(null);
            }}
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

          <button type="button" onClick={reviewScope} disabled={!projectId || !body.trim() || status === "assessing"} className="btn w-full">
            {status === "assessing" ? "Reviewing..." : "Review scope"}
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={!projectId || !body.trim() || status === "submitting" || (assessment != null && assessment.decision !== "execute")}
            className="btn btn-primary w-full"
          >
            {status === "submitting" ? "Queueing..." : "Queue workflow"}
          </button>
          {assessment && assessment.decision !== "execute" && assessment.decision !== "reject" && (
            <button type="button" onClick={() => submit(true)} disabled={status === "submitting"} className="btn w-full">
              Queue anyway
            </button>
          )}
          {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}
        </div>
      </div>
      {assessment && <ScopeAssessmentPanel assessment={assessment} />}
    </section>
  );
}

function ScopeAssessmentPanel({ assessment }: { assessment: ScopeAssessment }) {
  const tone: Record<ScopeAssessment["decision"], string> = {
    execute: "var(--color-success)",
    clarify: "var(--color-warn)",
    split: "var(--color-warn)",
    reject: "var(--color-danger)",
  };

  return (
    <div className="mt-5 p-4 rounded-[8px]" style={{ background: "var(--color-bg-sunken)" }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="status-chip" style={{ color: tone[assessment.decision] }}>
          {assessment.decision.replaceAll("_", " ")}
        </span>
        {assessment.templateLabel && <span className="status-chip">{assessment.templateLabel}</span>}
        <span className="status-chip">{assessment.riskLevel} risk</span>
      </div>
      <p className="mt-3 text-sm" style={{ color: "var(--color-ink-mute)" }}>
        {assessment.summary}
      </p>

      {assessment.clarifyingQuestions.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-ink-faint)" }}>
            Questions
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {assessment.clarifyingQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      )}

      {assessment.proposedSteps.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-ink-faint)" }}>
            Proposed workflow
          </div>
          <ol className="mt-2 space-y-1 text-sm list-decimal list-inside">
            {assessment.proposedSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
