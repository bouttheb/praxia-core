"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProjectWithLatest } from "@/lib/db";
import { ProgressRing } from "@/components/ProgressRing";
import { RelativeTime, staleness } from "@/components/RelativeTime";

type CardState = {
  label: string;
  tone: "good" | "warn" | "info" | "danger" | "accent" | "ink";
};

const TONE: Record<CardState["tone"], { color: string; bg: string }> = {
  good: { color: "var(--color-success)", bg: "var(--color-success-soft)" },
  warn: { color: "var(--color-warn)", bg: "var(--color-warn-soft)" },
  info: { color: "var(--color-info)", bg: "var(--color-info-soft)" },
  danger: { color: "var(--color-danger)", bg: "var(--color-danger-soft)" },
  accent: { color: "var(--color-accent)", bg: "var(--color-accent-soft)" },
  ink: { color: "var(--color-ink-mute)", bg: "rgba(0,0,0,0.04)" },
};

function deriveState(project: ProjectWithLatest): CardState {
  if (project.command_counts.running > 0) return { label: "Running", tone: "accent" };
  if (project.command_counts.queued > 0) return { label: "Queued", tone: "info" };
  if (project.command_counts.blocked > 0) return { label: "Blocked", tone: "danger" };
  if (project.completion_percent >= 100) return { label: "Done", tone: "good" };
  const last = project.latest_update;
  const today = (last?.today ?? "").toLowerCase();
  const tomorrow = (last?.tomorrow ?? "").toLowerCase();
  if (today.includes("blocked") || tomorrow.includes("blocked")) return { label: "Blocked", tone: "danger" };
  const stale = staleness(last?.created_at ?? null);
  if (stale === "cold") return { label: "Stale", tone: "warn" };
  if (stale === "fresh") return { label: "Active", tone: "good" };
  return { label: "Ready", tone: "ink" };
}

function shortPath(value: string | null) {
  if (!value) return "No working directory";
  return value.replace(/^\/Users\/[^/]+/, "~");
}

export function ProjectCard({ project }: { project: ProjectWithLatest }) {
  const [open, setOpen] = useState(false);
  const state = deriveState(project);
  const tone = TONE[state.tone];
  const last = project.latest_update;

  return (
    <>
      <div className="surface-glass surface-glass-hover praxia-rise p-5 flex flex-col gap-4 relative group">
        <button
          type="button"
          aria-label="Project details"
          onClick={() => setOpen(true)}
          className="absolute top-3 right-3 leading-none rounded-full w-6 h-6 flex items-center justify-center text-[12px] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            color: "var(--color-ink-faint)",
            border: "1px solid var(--color-line)",
            background: "var(--color-bg-elevated-solid)",
          }}
        >
          i
        </button>

        <div className="flex items-start gap-4">
          <ProgressRing value={project.completion_percent} size={64} stroke={5} />
          <div className="min-w-0 flex-1">
            <div className="serif text-[1.05rem] leading-tight truncate" style={{ color: "var(--color-ink)" }}>
              {project.name}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="status-chip" style={{ background: tone.bg, borderColor: "transparent", color: tone.color }}>
                <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: tone.color }} />
                {state.label}
              </span>
              <span className="status-chip">{project.agent}</span>
              {last && (
                <span className="text-[10px]" style={{ color: "var(--color-ink-faint)" }}>
                  <RelativeTime iso={last.created_at} />
                </span>
              )}
            </div>
          </div>
        </div>

        {last ? (
          <div className="text-[0.85rem] leading-snug line-clamp-2" style={{ color: "var(--color-ink-mute)" }}>
            {last.today}
          </div>
        ) : (
          <div className="text-[0.85rem]" style={{ color: "var(--color-ink-faint)" }}>
            No updates yet. Queue work or log progress to start tracking.
          </div>
        )}

        <div className="text-[11px] truncate" style={{ color: "var(--color-ink-faint)" }}>
          {shortPath(project.working_directory)}
        </div>

        <div className="pt-3 mt-auto flex items-center justify-between gap-3" style={{ borderTop: "1px solid var(--color-line)" }}>
          <button type="button" className="btn" onClick={() => setOpen(true)}>
            Details
          </button>
          <Link href={`/chat?project=${project.id}`} className="btn btn-primary">
            Command
          </Link>
        </div>
      </div>

      {open && <ProjectModal project={project} onClose={() => setOpen(false)} />}
    </>
  );
}

function ProjectModal({ project, onClose }: { project: ProjectWithLatest; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: "rgba(17,17,17,0.45)", backdropFilter: "blur(6px)" }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="surface-solid w-full sm:max-w-2xl p-6 max-h-[85vh] overflow-y-auto cockpit-scroll"
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <div className="flex items-start gap-4">
          <ProgressRing value={project.completion_percent} size={64} stroke={5} />
          <div className="flex-1 min-w-0">
            <div className="serif text-2xl">{project.name}</div>
            {project.description && (
              <div className="text-sm mt-1" style={{ color: "var(--color-ink-mute)" }}>
                {project.description}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="status-chip">{project.agent}</span>
              {project.fallback_agent && <span className="status-chip">fallback {project.fallback_agent}</span>}
              {project.required_daemon_id && <span className="status-chip">daemon {project.required_daemon_id}</span>}
            </div>
          </div>
          <button onClick={onClose} className="btn">
            Close
          </button>
        </div>

        <div className="mt-5 text-sm" style={{ color: "var(--color-ink-mute)" }}>
          <span className="font-medium" style={{ color: "var(--color-ink)" }}>
            Working directory:
          </span>{" "}
          {shortPath(project.working_directory)}
        </div>

        {project.latest_update ? (
          <div className="mt-6 space-y-5">
            <div>
              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--color-ink-faint)" }}>
                Latest progress - <RelativeTime iso={project.latest_update.created_at} />
              </div>
              <div className="text-[0.95rem] whitespace-pre-wrap">{project.latest_update.today}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--color-ink-faint)" }}>
                Next step
              </div>
              <div className="text-[0.95rem] whitespace-pre-wrap">{project.latest_update.tomorrow}</div>
            </div>
          </div>
        ) : (
          <div className="mt-6 text-sm" style={{ color: "var(--color-ink-faint)" }}>
            No updates logged yet for this project.
          </div>
        )}

        {project.vision_md && (
          <details className="mt-6 pt-6 border-t" style={{ borderColor: "var(--color-line)" }}>
            <summary className="cursor-pointer text-[10px] uppercase tracking-widest" style={{ color: "var(--color-ink-faint)" }}>
              Vision and source docs
            </summary>
            <div className="mt-3 text-[0.9rem] whitespace-pre-wrap leading-relaxed" style={{ color: "var(--color-ink-mute)" }}>
              {project.vision_md}
            </div>
          </details>
        )}

        <div className="mt-6 pt-4 border-t flex justify-end gap-2" style={{ borderColor: "var(--color-line)" }}>
          <form action={`/api/projects/${project.id}/sync-docs`} method="post">
            <button className="btn" type="submit">
              Sync docs
            </button>
          </form>
          <Link href={`/chat?project=${project.id}`} className="btn btn-primary">
            Open command
          </Link>
        </div>
      </div>
    </div>
  );
}
