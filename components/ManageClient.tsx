"use client";

import { useCallback, useEffect, useState } from "react";
import { agentLabel, agentOptions, type AgentKey } from "@/lib/agents";

const KEY_STORAGE = "praxia-core-command-key";

type Area = { id: number; name: string; sort_order: number; hidden: boolean };
type Project = {
  id: number;
  area_id: number;
  name: string;
  description: string | null;
  completion_percent: number;
  sort_order: number;
  archived: boolean;
  hidden: boolean;
  working_directory: string | null;
  vision_md: string | null;
  agent: AgentKey;
  fallback_agent: AgentKey | null;
  required_daemon_id: string | null;
  due_date: string | null;
};
type AreaWithProjects = Area & { projects: Project[] };
type SyncDocsResult = {
  synced: boolean;
  docs_found: number;
  doc_paths: string[];
  completion_percent: number;
  message?: string;
};

export function ManageClient() {
  const [areas, setAreas] = useState<AreaWithProjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commandKey, setCommandKey] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [needsKey, setNeedsKey] = useState(false);

  useEffect(() => {
    setCommandKey(window.localStorage.getItem(KEY_STORAGE) ?? "");
  }, []);

  const authedFetch = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      headers.set("content-type", "application/json");
      headers.set("accept", "application/json");
      if (commandKey) headers.set("x-praxia-command-key", commandKey);
      const response = await fetch(url, { ...init, headers, cache: "no-store" });
      if (response.status === 401 || response.status === 503) {
        setNeedsKey(true);
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      return response.json();
    },
    [commandKey],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await authedFetch("/api/projects?show_hidden=true")) as { areas: AreaWithProjects[] };
      setAreas(data.areas ?? []);
      setNeedsKey(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load projects.");
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function saveKey() {
    const trimmed = draftKey.trim();
    window.localStorage.setItem(KEY_STORAGE, trimmed);
    setCommandKey(trimmed);
    setDraftKey("");
    setNeedsKey(false);
  }

  return (
    <div className="space-y-6">
      {(needsKey || error) && (
        <section className="surface-solid p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="eyebrow">Access</div>
              <p className="mt-2 text-sm" style={{ color: error ? "var(--color-danger)" : "var(--color-ink-mute)" }}>
                {error ?? "Enter COMMAND_KEY to unlock project management from this browser."}
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                className="input min-w-[240px]"
                placeholder="COMMAND_KEY"
                value={draftKey}
                onChange={(event) => setDraftKey(event.target.value)}
              />
              <button type="button" className="btn btn-primary" onClick={saveKey}>
                Unlock
              </button>
            </div>
          </div>
        </section>
      )}

      <AddArea
        onAdd={async (name) => {
          await authedFetch("/api/areas", { method: "POST", body: JSON.stringify({ name }) });
          await refresh();
        }}
      />

      {loading && areas.length === 0 ? (
        <div className="surface-solid p-5">Loading projects...</div>
      ) : (
        <div className="space-y-8">
          {areas.map((area) => (
            <AreaBlock key={area.id} area={area} authedFetch={authedFetch} refresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddArea({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="surface-solid p-5 flex gap-2 flex-wrap"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try {
          await onAdd(name.trim());
          setName("");
        } finally {
          setBusy(false);
        }
      }}
    >
      <input className="input flex-1 min-w-[260px]" placeholder="New project group" value={name} onChange={(event) => setName(event.target.value)} />
      <button type="submit" className="btn btn-primary" disabled={busy}>
        Add group
      </button>
    </form>
  );
}

function AreaBlock({
  area,
  authedFetch,
  refresh,
}: {
  area: AreaWithProjects;
  authedFetch: (url: string, init?: RequestInit) => Promise<unknown>;
  refresh: () => Promise<void>;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(area.name);

  return (
    <section className="space-y-3" style={{ opacity: area.hidden ? 0.55 : 1 }}>
      <div className="flex items-center gap-2 flex-wrap">
        {renaming ? (
          <>
            <input className="input max-w-md" value={name} onChange={(event) => setName(event.target.value)} />
            <button
              className="btn btn-primary"
              onClick={async () => {
                await authedFetch(`/api/areas/${area.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
                setRenaming(false);
                await refresh();
              }}
            >
              Save
            </button>
            <button className="btn" onClick={() => setRenaming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <h2 className="serif text-2xl">{area.name}</h2>
            {area.hidden && <span className="status-chip">hidden</span>}
            <button className="btn" onClick={() => setRenaming(true)}>
              Rename
            </button>
            <button
              className="btn"
              onClick={async () => {
                await authedFetch(`/api/areas/${area.id}`, { method: "PATCH", body: JSON.stringify({ hidden: !area.hidden }) });
                await refresh();
              }}
            >
              {area.hidden ? "Show" : "Hide"}
            </button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                if (!confirm(`Delete group "${area.name}" and all ${area.projects.length} projects?`)) return;
                await authedFetch(`/api/areas/${area.id}`, { method: "DELETE" });
                await refresh();
              }}
            >
              Delete
            </button>
          </>
        )}
      </div>

      <div className="space-y-3">
        {area.projects.map((project) => (
          <ProjectRow key={project.id} project={project} authedFetch={authedFetch} refresh={refresh} />
        ))}
      </div>
      <AddProject
        areaId={area.id}
        onAdd={async (name) => {
          await authedFetch("/api/projects", { method: "POST", body: JSON.stringify({ area_id: area.id, name }) });
          await refresh();
        }}
      />
    </section>
  );
}

function AddProject({
  areaId,
  onAdd,
}: {
  areaId: number;
  onAdd: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex gap-2 flex-wrap pl-1"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try {
          await onAdd(name.trim());
          setName("");
        } finally {
          setBusy(false);
        }
      }}
    >
      <input
        className="input flex-1 min-w-[260px]"
        aria-label={`New project in area ${areaId}`}
        placeholder="New project name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <button type="submit" className="btn" disabled={busy}>
        Add project
      </button>
    </form>
  );
}

function ProjectRow({
  project,
  authedFetch,
  refresh,
}: {
  project: Project;
  authedFetch: (url: string, init?: RequestInit) => Promise<unknown>;
  refresh: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [showVision, setShowVision] = useState(false);
  const [editingVision, setEditingVision] = useState(false);
  const [visionDraft, setVisionDraft] = useState(project.vision_md ?? "");
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [completionPercent, setCompletionPercent] = useState(project.completion_percent);
  const [workingDirectory, setWorkingDirectory] = useState(project.working_directory ?? "");
  const [agent, setAgent] = useState<AgentKey>(project.agent);
  const [fallbackAgent, setFallbackAgent] = useState<AgentKey | "none">(project.fallback_agent ?? "none");
  const [requiredDaemonId, setRequiredDaemonId] = useState(project.required_daemon_id ?? "");
  const [dueDate, setDueDate] = useState(project.due_date ?? "");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function patchProject(payload: Record<string, unknown>) {
    return authedFetch(`/api/projects/${project.id}`, { method: "PATCH", body: JSON.stringify(payload) });
  }

  async function persistDueDate(next: string) {
    setDueDate(next);
    setBusy("date");
    try {
      await patchProject({ due_date: next || null });
    } finally {
      setBusy(null);
    }
  }

  async function syncDocs() {
    setBusy("sync");
    setSyncMessage(null);
    try {
      const result = (await authedFetch(`/api/projects/${project.id}/sync-docs`, { method: "POST" })) as SyncDocsResult;
      if (result.docs_found === 0) {
        setSyncMessage(result.message ?? "No readable source docs found.");
      } else {
        setSyncMessage(`${result.synced ? "Synced" : "Already current"} - ${result.docs_found} doc${result.docs_found === 1 ? "" : "s"}`);
      }
      await refresh();
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setBusy(null);
    }
  }

  if (editing) {
    return (
      <article className="surface-solid p-4 space-y-3">
        <div className="grid md:grid-cols-[minmax(0,1fr)_120px] gap-3">
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" />
          <input
            type="number"
            min={0}
            max={100}
            className="input"
            value={completionPercent}
            onChange={(event) => setCompletionPercent(Number(event.target.value))}
          />
        </div>
        <input className="input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" />
        <input
          className="input font-mono text-xs"
          value={workingDirectory}
          onChange={(event) => setWorkingDirectory(event.target.value)}
          placeholder="Working directory"
        />
        <input
          className="input font-mono text-xs"
          value={requiredDaemonId}
          onChange={(event) => setRequiredDaemonId(event.target.value)}
          placeholder="Required daemon ID, optional"
        />

        <div className="grid md:grid-cols-3 gap-3">
          <label className="text-sm">
            <span className="block mb-1" style={{ color: "var(--color-ink-faint)" }}>Agent</span>
            <select className="input w-full" value={agent} onChange={(event) => setAgent(event.target.value as AgentKey)}>
              {agentOptions.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block mb-1" style={{ color: "var(--color-ink-faint)" }}>Fallback</span>
            <select className="input w-full" value={fallbackAgent} onChange={(event) => setFallbackAgent(event.target.value as AgentKey | "none")}>
              <option value="none">None</option>
              {agentOptions.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block mb-1" style={{ color: "var(--color-ink-faint)" }}>Due date</span>
            <input className="input w-full" type="date" value={dueDate} onChange={(event) => persistDueDate(event.target.value)} />
          </label>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            className="btn btn-primary"
            onClick={async () => {
              setBusy("save");
              try {
                await patchProject({
                  name,
                  description: description || null,
                  completion_percent: completionPercent,
                  working_directory: workingDirectory || null,
                  agent,
                  fallback_agent: fallbackAgent === "none" ? null : fallbackAgent,
                  required_daemon_id: requiredDaemonId || null,
                });
                setEditing(false);
                await refresh();
              } finally {
                setBusy(null);
              }
            }}
            disabled={busy === "save"}
          >
            Save
          </button>
          <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
          {dueDate && <button className="btn" onClick={() => persistDueDate("")}>Clear date</button>}
        </div>
      </article>
    );
  }

  return (
    <article className="surface-solid p-4" style={{ opacity: project.hidden ? 0.55 : 1 }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{project.name}</h3>
            <span className="status-chip">{agentLabel(project.agent)}</span>
            {project.fallback_agent && <span className="status-chip">fallback {agentLabel(project.fallback_agent)}</span>}
            {project.required_daemon_id && <span className="status-chip">daemon {project.required_daemon_id}</span>}
            {project.hidden && <span className="status-chip">hidden</span>}
            {project.due_date && <span className="status-chip">due {project.due_date}</span>}
          </div>
          {project.description && <p className="text-sm mt-2" style={{ color: "var(--color-ink-mute)" }}>{project.description}</p>}
          {project.working_directory && (
            <div className="font-mono text-xs mt-2 truncate" style={{ color: "var(--color-ink-faint)" }} title={project.working_directory}>
              {project.working_directory.replace(/^\/Users\/[^/]+/, "~")}
            </div>
          )}
        </div>
        <div className="text-sm tabular-nums" style={{ color: "var(--color-ink-mute)" }}>{project.completion_percent}%</div>
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        <button className="btn" onClick={() => setShowVision((value) => !value)}>
          {showVision ? "Hide vision" : project.vision_md ? "Vision" : "No vision"}
        </button>
        <button className="btn" onClick={syncDocs} disabled={busy === "sync"}>{busy === "sync" ? "Syncing..." : "Sync docs"}</button>
        <button className="btn" onClick={() => setEditing(true)}>Edit</button>
        <button
          className="btn"
          onClick={async () => {
            await patchProject({ hidden: !project.hidden });
            await refresh();
          }}
        >
          {project.hidden ? "Show" : "Hide"}
        </button>
        <button
          className="btn btn-danger"
          onClick={async () => {
            if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
            await authedFetch(`/api/projects/${project.id}`, { method: "DELETE" });
            await refresh();
          }}
        >
          Delete
        </button>
      </div>

      {syncMessage && <p className="text-xs mt-3" style={{ color: "var(--color-ink-faint)" }}>{syncMessage}</p>}

      {showVision && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--color-line)" }}>
          {editingVision ? (
            <div className="space-y-3">
              <textarea
                className="input font-mono text-xs w-full"
                style={{ minHeight: "18rem" }}
                value={visionDraft}
                onChange={(event) => setVisionDraft(event.target.value)}
                placeholder="# Vision&#10;&#10;## Purpose"
              />
              <div className="flex gap-2">
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    await patchProject({ vision_md: visionDraft });
                    setEditingVision(false);
                    await refresh();
                  }}
                >
                  Save vision
                </button>
                <button className="btn" onClick={() => setEditingVision(false)}>Cancel</button>
              </div>
            </div>
          ) : project.vision_md ? (
            <>
              <pre className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--color-ink-mute)" }}>{project.vision_md}</pre>
              <button className="btn mt-3" onClick={() => setEditingVision(true)}>Edit vision</button>
            </>
          ) : (
            <button className="btn" onClick={() => setEditingVision(true)}>Write vision</button>
          )}
        </div>
      )}
    </article>
  );
}
