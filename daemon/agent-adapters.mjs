const adapters = {
  claude: {
    bin: () => process.env.CLAUDE_BIN || "claude",
    args: (body) => ["-p", "--permission-mode", "bypassPermissions", body],
  },
  codex: {
    bin: () => process.env.CODEX_BIN || "codex",
    args: (body, options = {}) => [
      "exec",
      "--sandbox",
      "workspace-write",
      "-c",
      "approval_policy=\"never\"",
      ...(options.outputPath ? ["--output-last-message", options.outputPath] : []),
      body,
    ],
  },
  gemini: {
    bin: () => process.env.GEMINI_BIN || "gemini",
    args: (body) => ["-p", body],
  },
  opencode: {
    bin: () => process.env.OPENCODE_BIN || "opencode",
    args: (body) => ["run", body],
  },
  goose: {
    bin: () => process.env.GOOSE_BIN || "goose",
    args: (body) => ["run", "-t", body],
  },
};

export function commandForAgent(agent, body, options = {}) {
  const adapter = adapters[agent] ?? adapters.claude;
  return { bin: adapter.bin(), args: adapter.args(body, options) };
}
