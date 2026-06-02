export const agentOptions = [
  { key: "claude", label: "Claude Code" },
  { key: "codex", label: "Codex" },
  { key: "gemini", label: "Gemini CLI" },
  { key: "opencode", label: "OpenCode" },
  { key: "goose", label: "Goose" },
] as const;

export type AgentKey = (typeof agentOptions)[number]["key"];

export function isAgentKey(value: unknown): value is AgentKey {
  return typeof value === "string" && agentOptions.some((agent) => agent.key === value);
}

export function parseAgentKey(value: unknown, fallback: AgentKey = "claude"): AgentKey {
  return isAgentKey(value) ? value : fallback;
}

export function agentLabel(key: string | null | undefined) {
  return agentOptions.find((agent) => agent.key === key)?.label ?? key ?? "Unknown";
}
