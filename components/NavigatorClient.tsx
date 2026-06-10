"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Markdown } from "@/components/Markdown";

const KEY_STORAGE = "praxia-core-command-key";
const DUMP_STORAGE = "praxia-core:navigator_dump";

type QueueTask = {
  id: string;
  title: string;
  status: string;
};

type ChatEntry = {
  id: number;
  kind: "chat" | "plan";
  question: string;
  questionChars: number;
  reply: string | null;
  error: string | null;
  pending: boolean;
};

type NavigatorState = {
  root: string;
  index: null | {
    generatedAt: string;
    files: number;
    projects: Array<{ root: string; title?: string | null; files: number }>;
  };
  latestPlan: null | {
    id: string;
    generatedAt: string;
    detectedCapabilities?: string[];
    goals?: string[];
    blockers?: string[];
    openDecisions?: string[];
    recommendation?: { decision: string; narrative: string };
    approvalTasks?: Array<{ id: string; title: string; scope?: { allowedActions?: string[] } }>;
  };
  queue: { tasks: QueueTask[] };
  artifacts: Record<string, string[]>;
};

export function NavigatorClient() {
  const [commandKey, setCommandKey] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState("");
  const [needsKey, setNeedsKey] = useState(false);
  const [state, setState] = useState<NavigatorState | null>(null);
  const [dump, setDump] = useState("");
  const dumpRef = useRef<HTMLTextAreaElement | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const nextIdRef = useRef(1);

  useEffect(() => {
    const stored = localStorage.getItem(KEY_STORAGE);
    if (stored) setCommandKey(stored);
    const storedDump = localStorage.getItem(DUMP_STORAGE);
    if (storedDump) {
      setDump(storedDump);
      if (dumpRef.current) dumpRef.current.value = storedDump;
    }
  }, []);

  const authedFetch = useCallback(
    async (init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      headers.set("content-type", "application/json");
      if (commandKey) headers.set("x-praxia-command-key", commandKey);
      const response = await fetch("/api/navigator", { ...init, headers, cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 503) {
        setNeedsKey(true);
        throw new Error(data.error ?? "Navigator authorization required");
      }
      if (!response.ok) throw new Error(data.error ?? `Navigator failed (${response.status})`);
      setNeedsKey(false);
      return data;
    },
    [commandKey],
  );

  const refresh = useCallback(async () => {
    const data = await authedFetch({ method: "GET" });
    setState(data);
  }, [authedFetch]);

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Navigator failed to load."));
  }, [refresh]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [chat.length, busy]);

  function appendChat(entry: Omit<ChatEntry, "id">) {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    setChat((prev) => [...prev, { ...entry, id }]);
    return id;
  }

  function resolveChat(id: number, patch: Partial<ChatEntry>) {
    setChat((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch, pending: false } : entry)));
  }

  function captureDumpText() {
    const text = dumpRef.current?.value ?? dump;
    setDump(text);
    localStorage.setItem(DUMP_STORAGE, text);
    return text;
  }

  function clearDump() {
    setDump("");
    if (dumpRef.current) dumpRef.current.value = "";
    localStorage.removeItem(DUMP_STORAGE);
  }

  async function generatePlan() {
    const text = captureDumpText();
    if (!text.trim()) {
      setError("Paste a transcript before generating a plan.");
      return;
    }
    setBusy("Plan");
    setError(null);
    const entryId = appendChat({ kind: "plan", question: text.slice(0, 240), questionChars: text.length, reply: null, error: null, pending: true });
    try {
      const data = await authedFetch({ method: "POST", body: JSON.stringify({ action: "plan", text }) });
      setState(data.state ?? state);
      resolveChat(entryId, { reply: data.reply ?? "Plan generated." });
      clearDump();
    } catch (err) {
      resolveChat(entryId, { error: err instanceof Error ? err.message : "Plan generation failed." });
    } finally {
      setBusy(null);
    }
  }

  async function sendChat(event: FormEvent) {
    event.preventDefault();
    const text = chatDraft.trim();
    if (!text || busy) return;
    setChatDraft("");
    setBusy("Chat");
    const entryId = appendChat({ kind: "chat", question: text, questionChars: text.length, reply: null, error: null, pending: true });
    try {
      const data = await authedFetch({ method: "POST", body: JSON.stringify({ action: "chat", text }) });
      setState(data.state ?? state);
      resolveChat(entryId, { reply: data.reply ?? "(no reply)" });
    } catch (err) {
      resolveChat(entryId, { error: err instanceof Error ? err.message : "Chat failed." });
    } finally {
      setBusy(null);
    }
  }

  async function runAction(label: string, body: Record<string, unknown>) {
    setBusy(label);
    setError(null);
    try {
      const data = await authedFetch({ method: "POST", body: JSON.stringify(body) });
      setState(data.state ?? state);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : `${label} failed`);
      return null;
    } finally {
      setBusy(null);
    }
  }

  function saveKey(event: FormEvent) {
    event.preventDefault();
    const value = draftKey.trim();
    if (!value) return;
    localStorage.setItem(KEY_STORAGE, value);
    setCommandKey(value);
    setDraftKey("");
    setNeedsKey(false);
  }

  const approvalTasks = state?.latestPlan?.approvalTasks ?? [];
  const isGeneratingPlan = busy === "Plan" && !state?.latestPlan;

  return (
    <div className="space-y-6">
      {needsKey && (
        <section className="surface-solid p-5">
          <div className="eyebrow">Command key</div>
          <form onSubmit={saveKey} className="mt-3 flex gap-2 flex-wrap">
            <input
              type="password"
              className="input flex-1 min-w-[240px]"
              placeholder="COMMAND_KEY"
              value={draftKey}
              onChange={(event) => setDraftKey(event.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              Unlock
            </button>
          </form>
        </section>
      )}

      {error && (
        <div className="surface-solid px-4 py-3 text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] items-start">
        <div className="space-y-5">
          <Panel title="Brain dump">
            <textarea
              ref={dumpRef}
              className="input w-full min-h-[360px] leading-relaxed"
              name="navigator-dump"
              placeholder="Paste a transcript here."
              defaultValue={dump}
              onInput={(event) => {
                const text = event.currentTarget.value;
                setDump(text);
                localStorage.setItem(DUMP_STORAGE, text);
              }}
            />
            <div className="text-xs mt-2" style={{ color: "var(--color-ink-faint)" }}>
              {dump.trim().length.toLocaleString()} characters ready
            </div>
            <div className="flex gap-2 flex-wrap mt-3">
              <button type="button" className="btn" disabled={!!busy} onClick={() => runAction("Index", { action: "index" })}>
                {busy === "Index" ? "Indexing…" : "Index"}
              </button>
              <button type="button" className="btn btn-primary" disabled={!!busy} onClick={generatePlan}>
                {busy === "Plan" ? "Planning…" : "Generate plan"}
              </button>
            </div>
          </Panel>
        </div>

        <Panel title="Plan">
          {isGeneratingPlan ? (
            <ThinkingState />
          ) : !state?.latestPlan ? (
            <Empty text="No plan yet. Paste a brain dump and generate one — the planner reads your workspace and turns it into concrete tasks." />
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 max-h-[52vh] overflow-y-auto cockpit-scroll pr-1">
                {approvalTasks.map((task) => (
                  <label
                    key={task.id}
                    className="grid grid-cols-[20px_minmax(0,1fr)] gap-3 p-3 rounded-[12px]"
                    style={{ border: "1px solid var(--color-line)", background: "var(--color-bg-elevated-solid)" }}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selected.has(task.id)}
                      onChange={(event) => {
                        const next = new Set(selected);
                        if (event.target.checked) next.add(task.id);
                        else next.delete(task.id);
                        setSelected(next);
                      }}
                    />
                    <span className="min-w-0">
                      <span className="text-sm font-medium">{task.title}</span>
                      {task.scope?.allowedActions?.length ? (
                        <span className="block text-xs mt-1" style={{ color: "var(--color-ink-faint)" }}>
                          {task.scope.allowedActions.join(", ")}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-primary"
                disabled={!!busy || selected.size === 0}
                onClick={() =>
                  runAction("Authorize", { action: "authorize-selected", taskIds: Array.from(selected) }).then(() =>
                    setSelected(new Set()),
                  )
                }
              >
                Authorize selected
              </button>
            </div>
          )}

          <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--color-line)" }}>
            <div className="eyebrow mb-3">Talk to the planner</div>
            <div className="space-y-3 max-h-[34vh] overflow-y-auto cockpit-scroll pr-1">
              {chat.length === 0 ? (
                <Empty text="Ask questions or request changes — the planner answers with the plan and codebase in front of it. Pushback included." />
              ) : (
                chat.map((entry) => <ChatBubbles key={entry.id} entry={entry} />)
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendChat} className="mt-4 flex gap-2">
              <input
                className="input flex-1 min-w-0"
                placeholder={state?.latestPlan ? "Ask about the plan, or tell the planner what to change…" : "Generate a plan first, then ask away…"}
                value={chatDraft}
                onChange={(event) => setChatDraft(event.target.value)}
                disabled={busy === "Chat"}
              />
              <button type="submit" className="btn btn-primary" disabled={!!busy || !chatDraft.trim()}>
                {busy === "Chat" ? "…" : "Send"}
              </button>
            </form>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="surface-solid p-5">
      <h2 className="eyebrow mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-sm" style={{ color: "var(--color-ink-faint)" }}>
      {text}
    </div>
  );
}

function ChatBubbles({ entry }: { entry: ChatEntry }) {
  const isPlan = entry.kind === "plan";
  return (
    <div className="space-y-2">
      {isPlan ? (
        <div className="ml-6 text-xs" style={{ color: "var(--color-ink-faint)" }}>
          <span className="status-chip">brain dump</span>
          <span className="ml-2">{entry.questionChars.toLocaleString()} characters</span>
          <div
            className="mt-1 rounded-[12px] px-3 py-2 text-sm truncate"
            style={{ background: "var(--color-bg-sunken)", border: "1px solid var(--color-line)", color: "var(--color-ink-mute)" }}
            title={entry.question}
          >
            {entry.question}
            {entry.questionChars > 240 ? "…" : ""}
          </div>
        </div>
      ) : (
        <div
          className="rounded-[12px] px-3 py-2 text-sm ml-6"
          style={{ background: "var(--color-bg-sunken)", border: "1px solid var(--color-line)" }}
        >
          {entry.question}
        </div>
      )}
      {entry.pending ? (
        <div className="flex items-center gap-2 text-xs mr-6" style={{ color: "var(--color-ink-faint)" }}>
          <span className="chat-dots" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          {isPlan ? "The planner is reading your brain dump and workspace…" : "Praxia is thinking…"}
        </div>
      ) : entry.error ? (
        <div className="rounded-[12px] px-3 py-2 text-xs mr-6" style={{ color: "var(--color-danger)", border: "1px solid var(--color-line)" }}>
          {entry.error}
        </div>
      ) : entry.reply ? (
        <div
          className="rounded-[12px] px-3 py-2.5 text-sm mr-6"
          style={{ background: "var(--color-bg-elevated-solid)", border: "1px solid var(--color-line)", color: "var(--color-ink-mute)" }}
        >
          <Markdown text={entry.reply} />
        </div>
      ) : null}
    </div>
  );
}

function ThinkingState() {
  return (
    <div
      className="min-h-[300px] rounded-[16px] flex flex-col items-center justify-center text-center px-6"
      style={{ background: "var(--color-bg-sunken)", border: "1px solid var(--color-line)" }}
    >
      <div
        className="w-10 h-10 rounded-full mb-4"
        style={{
          border: "3px solid var(--color-line-strong)",
          borderTopColor: "var(--color-accent)",
          animation: "navigator-spin 900ms linear infinite",
        }}
      />
      <div className="serif text-xl">Generating plan</div>
      <div className="text-sm mt-2 max-w-[340px]" style={{ color: "var(--color-ink-mute)" }}>
        The planner is reading your brain dump and your codebase, drafting concrete tasks, and noting where it disagrees.
      </div>
    </div>
  );
}
