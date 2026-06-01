"use client";

import { useEffect, useState } from "react";
import type { AreaWithProjects } from "@/lib/db";
import { ProjectCard } from "@/components/ProjectCard";

const STORAGE_KEY = "praxia-core:collapsed-areas";

function readCollapsed(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((value) => typeof value === "number"));
  } catch {}
  return new Set();
}

function writeCollapsed(value: Set<number>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(value)));
  } catch {}
}

export function AreaSection({ area, areaPct }: { area: AreaWithProjects; areaPct: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readCollapsed();
    setCollapsed(stored.has(area.id));
    setHydrated(true);
  }, [area.id]);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    const stored = readCollapsed();
    if (next) stored.add(area.id);
    else stored.delete(area.id);
    writeCollapsed(stored);
  }

  return (
    <section>
      <button onClick={toggle} className="w-full text-left flex items-baseline justify-between gap-4 mb-3 group" aria-expanded={!collapsed}>
        <div className="flex items-baseline gap-2.5 min-w-0">
          <Chevron collapsed={collapsed && hydrated} />
          <h2 className="serif text-xl sm:text-2xl truncate" style={{ color: "var(--color-ink)" }}>
            {area.name}
          </h2>
          <span className="text-[10px] uppercase tracking-[0.16em] shrink-0" style={{ color: "var(--color-ink-faint)" }}>
            {area.projects.length} - {areaPct}%
          </span>
        </div>
      </button>

      <div className="bar mb-5">
        <div className="bar-fill" style={{ width: `${areaPct}%` }} />
      </div>

      {!(collapsed && hydrated) &&
        (area.projects.length === 0 ? (
          <div className="text-sm" style={{ color: "var(--color-ink-faint)" }}>
            No projects in this area yet.
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {area.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ))}
    </section>
  );
}

function Chevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      style={{
        transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
        transition: "transform 200ms ease",
        color: "var(--color-ink-faint)",
        flexShrink: 0,
      }}
      className="self-center"
    >
      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
