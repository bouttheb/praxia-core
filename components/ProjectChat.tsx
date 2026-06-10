"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { agentLabel, agentOptions, type AgentKey } from "@/lib/agents";
import { Markdown } from "@/components/Markdown";
import { Monogram } from "@/components/Monogram";

type ProjectOption = {
  id: number;
  name: string;
  area: string;
  agent: AgentKey;
};

type ChatMessage = {
  id: number;
  body: string;
  status: string;
  agent: string;
  result: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

type OverviewCommand = {
  id: number;
  project_id: number;
  body: string;
  status: string;
  created_at: string;
};

const ACTIVE_STATUSES = new Set(["queued", "running"]);

function timeAgo(value: string | null | undefined) {
  if (!value) return "";
  const ms = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function elapsed(since: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const SUGGESTED_PROMPTS = [
  "What's the current state of this project?",
  "What should we work on next?",
  "Anything broken or unfinished right now?",
];

export function ProjectChat({
  projects,
  initialProjectId,
  initialPrompt,
}: {
  projects: ProjectOption[];
  initialProjectId: number | null;
  initialPrompt: string;
}) {
  const router = useRouter();
  const validInitial = projects.some((p) => p.id === initialProjectId) ? initialProjectId : null;
  const [selectedId, setSelectedId] = useState<number | null>(validInitial ?? projects[0]?.id ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadLoaded, setThreadLoaded] = useState(false);
  const [overview, setOverview] = useState<Map<number, OverviewCommand>>(new Map());
  const [draft, setDraft] = useState(initialPrompt);
  const [agent, setAgent] = useState<AgentKey | "default">("default");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const endRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const filterRef = useRef<HTMLInputElement | null>(null);
  const prevCountRef = useRef(0);
  const selected = useMemo(() => projects.find((p) => p.id === selectedId) ?? null, [projects, selectedId]);

  const loadThread = useCallback(async (projectId: number) => {
    const response = await fetch(`/api/projects/${projectId}/commands?t=${Date.now()}`, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error ?? `Could not load the conversation (${response.status})`);
    return (data?.messages ?? []) as ChatMessage[];
  }, []);

  const loadOverview = useCallback(async () => {
    const response = await fetch(`/api/commands?t=${Date.now()}`, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok) return;
    const map = new Map<number, OverviewCommand>();
    for (const command of (data?.commands ?? []) as OverviewCommand[]) {
      if (!map.has(command.project_id)) map.set(command.project_id, command);
    }
    setOverview(map);
  }, []);

  const refreshSelected = useCallback(async () => {
    if (!selectedId) return;
    try {
      const thread = await loadThread(selectedId);
      setMessages(thread);
      setThreadLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the conversation.");
    }
  }, [selectedId, loadThread]);

  useEffect(() => {
    setMessages([]);
    setThreadLoaded(false);
    setError(null);
    prevCountRef.current = 0;
    void refreshSelected();
  }, [selectedId, refreshSelected]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const threadActive = useMemo(() => messages.some((m) => ACTIVE_STATUSES.has(m.status)), [messages]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshSelected();
      void loadOverview();
    }, threadActive ? 3000 : 12000);
    return () => window.clearInterval(timer);
  }, [threadActive, refreshSelected, loadOverview]);

  // Ticking clock for the "working · 1m 12s" indicator.
  useEffect(() => {
    if (!threadActive) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [threadActive]);

  // Scroll only when content grows — silent polls must not move the page.
  useEffect(() => {
    if (!threadLoaded) return;
    if (messages.length > prevCountRef.current) {
      endRef.current?.scrollIntoView({ block: "end", behavior: prevCountRef.current === 0 ? "auto" : "smooth" });
    }
    prevCountRef.current = messages.length;
  }, [messages.length, threadLoaded]);

  // Cmd/Ctrl+K focuses the project filter.
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        filterRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function selectProject(projectId: number) {
    setSelectedId(projectId);
    router.replace(`/chat?project=${projectId}`, { scroll: false });
  }

  function autosize() {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${selectedId}/commands`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: text, ...(agent === "default" ? {} : { agent }) }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? `Could not send (${response.status})`);
      setDraft("");
      if (composerRef.current) composerRef.current.style.height = "auto";
      if (data?.message) setMessages((prev) => [...prev, data.message as ChatMessage]);
      void loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the message.");
    } finally {
      setSending(false);
    }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  function usePrompt(prompt: string) {
    setDraft(prompt);
    composerRef.current?.focus();
  }

  const sessions = useMemo(() => {
    const query = filter.trim().toLowerCase();
    const list = projects
      .filter((project) => !query || project.name.toLowerCase().includes(query) || project.area.toLowerCase().includes(query))
      .map((project) => ({ project, last: overview.get(project.id) ?? null }));
    return list.sort((a, b) => {
      if (a.last && b.last) return new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime();
      if (a.last) return -1;
      if (b.last) return 1;
      return a.project.name.localeCompare(b.project.name);
    });
  }, [projects, overview, filter]);

  return (
    <>
      <aside
        className="w-[300px] shrink-0 border-r hidden lg:flex flex-col"
        style={{ borderColor: "var(--color-line)" }}
      >
        <div className="px-4 pt-5 pb-3 space-y-3">
          <div className="eyebrow">Sessions</div>
          <input
            ref={filterRef}
            className="w-full text-sm px-3 py-2 rounded-[10px] outline-none"
            style={{ background: "var(--color-bg-sunken)", border: "1px solid transparent" }}
            placeholder="Filter projects…  ⌘K"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            onFocus={(event) => (event.currentTarget.style.borderColor = "var(--color-line-strong)")}
            onBlur={(event) => (event.currentTarget.style.borderColor = "transparent")}
          />
        </div>
        <div className="flex-1 overflow-y-auto cockpit-scroll px-2 pb-4 space-y-0.5">
          {sessions.map(({ project, last }) => {
            const active = project.id === selectedId;
            const pending = last ? ACTIVE_STATUSES.has(last.status) : false;
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => selectProject(project.id)}
                className={`chat-session w-full text-left rounded-[12px] px-3 py-2.5 flex items-center gap-3 ${active ? "is-active" : ""}`}
              >
                <Monogram name={project.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{project.name}</span>
                    <span className="ml-auto flex items-center gap-1.5 shrink-0">
                      {pending && <span className="chat-pulse-dot" />}
                      <span className="text-[10px] tabular-nums" style={{ color: "var(--color-ink-faint)" }}>
                        {last ? timeAgo(last.created_at) : ""}
                      </span>
                    </span>
                  </span>
                  <span className="block text-xs truncate mt-0.5" style={{ color: "var(--color-ink-faint)" }}>
                    {last ? last.body : project.area}
                  </span>
                </span>
              </button>
            );
          })}
          {sessions.length === 0 && (
            <div className="px-3 py-2 text-xs" style={{ color: "var(--color-ink-faint)" }}>
              No projects match “{filter}”.
            </div>
          )}
        </div>
      </aside>

      <section className="flex-1 min-w-0 flex flex-col">
        <header
          className="px-5 py-3.5 border-b flex items-center gap-3 flex-wrap shrink-0"
          style={{ borderColor: "var(--color-line)" }}
        >
          <div className="lg:hidden">
            <select
              className="input py-2"
              value={selectedId ?? ""}
              onChange={(event) => selectProject(Number(event.target.value))}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          {selected && (
            <div className="hidden lg:flex items-center gap-3 min-w-0">
              <Monogram name={selected.name} size={28} />
              <div className="min-w-0">
                <h1 className="text-[15px] font-semibold truncate leading-tight">{selected.name}</h1>
                <div className="text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                  {selected.area} · {agentLabel(selected.agent)}
                </div>
              </div>
            </div>
          )}
        </header>

        {error && (
          <div className="px-5 py-2 text-sm shrink-0" style={{ color: "var(--color-danger)" }}>
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto cockpit-scroll">
          <div className="max-w-[740px] mx-auto w-full px-5 py-6 space-y-6">
            {!threadLoaded ? (
              <ThreadSkeleton />
            ) : messages.length === 0 ? (
              selected && <EmptyThread project={selected} onPrompt={usePrompt} />
            ) : (
              messages.map((message) => <MessageTurn key={message.id} message={message} now={now} />)
            )}
            <div ref={endRef} />
          </div>
        </div>

        <div className="shrink-0 px-5 pb-5 pt-2">
          <form onSubmit={send} className="chat-composer max-w-[740px] mx-auto w-full px-4 pt-3 pb-2.5">
            <textarea
              ref={composerRef}
              className="w-full resize-none outline-none bg-transparent text-[15px] leading-relaxed"
              rows={1}
              style={{ minHeight: 28, maxHeight: 168 }}
              placeholder={selected ? `Message ${selected.name}…` : "Pick a project first…"}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                autosize();
              }}
              onKeyDown={onComposerKeyDown}
              disabled={!selected || sending}
            />
            <div className="flex items-center gap-3 mt-1.5">
              <select
                className="chat-quiet-select"
                value={agent}
                onChange={(event) => setAgent(event.target.value as AgentKey | "default")}
                title="Agent for this message"
              >
                <option value="default">{selected ? `${agentLabel(selected.agent)}` : "Default agent"}</option>
                {agentOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="ml-auto hidden md:inline text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                ⏎ Send · ⇧⏎ New line
              </span>
              <button type="submit" className="chat-send" disabled={!selected || sending || !draft.trim()} aria-label="Send">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}

function ThreadSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="flex justify-end">
        <div className="chat-skeleton h-10 w-[55%]" />
      </div>
      <div className="space-y-2">
        <div className="chat-skeleton h-4 w-[88%]" />
        <div className="chat-skeleton h-4 w-[72%]" />
        <div className="chat-skeleton h-4 w-[80%]" />
      </div>
      <div className="flex justify-end">
        <div className="chat-skeleton h-10 w-[40%]" />
      </div>
      <div className="space-y-2">
        <div className="chat-skeleton h-4 w-[84%]" />
        <div className="chat-skeleton h-4 w-[60%]" />
      </div>
    </div>
  );
}

function EmptyThread({ project, onPrompt }: { project: ProjectOption; onPrompt: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center text-center pt-16 pb-8">
      <Monogram name={project.name} size={52} />
      <h2 className="mt-4 text-lg font-semibold">{project.name}</h2>
      <p className="mt-1.5 text-sm max-w-[400px]" style={{ color: "var(--color-ink-mute)" }}>
        Messages run on your paired machine in this project&apos;s working directory — {agentLabel(project.agent)} replies
        right here.
      </p>
      <div className="mt-6 flex flex-col gap-2 w-full max-w-[400px]">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPrompt(prompt)}
            className="text-sm text-left px-4 py-2.5 rounded-[12px] transition-colors"
            style={{ border: "1px solid var(--color-line)", color: "var(--color-ink-mute)" }}
            onMouseEnter={(event) => (event.currentTarget.style.background = "var(--color-bg-sunken)")}
            onMouseLeave={(event) => (event.currentTarget.style.background = "transparent")}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

const STATUS_CHIPS: Record<string, { label: string; tone: "warn" | "danger" }> = {
  needs_input: { label: "needs your input", tone: "warn" },
  blocked: { label: "blocked", tone: "danger" },
  failed: { label: "run failed", tone: "danger" },
  cancelled: { label: "cancelled", tone: "warn" },
};

function MessageTurn({ message, now }: { message: ChatMessage; now: number }) {
  const pending = ACTIVE_STATUSES.has(message.status);
  const reply = message.result?.trim() || "";
  const chip = STATUS_CHIPS[message.status];
  return (
    <div className="chat-turn space-y-4">
      <div className="flex justify-end">
        <div
          className="rounded-[16px] rounded-br-[6px] px-4 py-2.5 text-[15px] max-w-[75%] whitespace-pre-wrap leading-relaxed"
          style={{ background: "var(--color-bg-sunken)" }}
        >
          {message.body}
        </div>
      </div>
      {pending ? (
        <div className="flex items-center gap-2.5 text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
          <span className="chat-dots" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          {agentLabel(message.agent)} is {message.status === "queued" ? "waiting for your machine" : "working"} ·{" "}
          <span className="tabular-nums">{elapsed(message.created_at, now)}</span>
        </div>
      ) : reply ? (
        <div className="space-y-2 min-w-0">
          {chip && (
            <span
              className="status-chip"
              style={{ color: chip.tone === "danger" ? "var(--color-danger)" : "var(--color-warn)" }}
            >
              {chip.label}
            </span>
          )}
          <div className="text-[15px]" style={{ color: "var(--color-ink)" }}>
            <Markdown text={reply} />
          </div>
          {chip && message.error && (
            <div className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
              {message.error}
            </div>
          )}
        </div>
      ) : (
        <div className="text-[13px]" style={{ color: "var(--color-danger)" }}>
          {message.status === "blocked"
            ? `Blocked: ${message.error ?? "the daemon could not run this command."}`
            : message.error || `The run ${message.status} without a reply.`}
        </div>
      )}
    </div>
  );
}
