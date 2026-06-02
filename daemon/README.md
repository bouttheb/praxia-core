# Praxia Core Daemon

The daemon connects a Praxia Core dashboard to the machine that actually has
your project repos. It polls the dashboard for queued commands, claims one,
runs the configured local AI coding agent in the project's working directory,
then posts the result back.

## Configure

Create `~/.praxia/dashboard.env`:

```bash
mkdir -p ~/.praxia
cat > ~/.praxia/dashboard.env <<EOF
DASHBOARD_URL=http://localhost:3030
DASHBOARD_WRITE_KEY=replace-with-the-same-value-from-.env.local
DAEMON_ID=home-machine
CLAUDE_BIN=claude
CODEX_BIN=codex
GEMINI_BIN=gemini
OPENCODE_BIN=opencode
GOOSE_BIN=goose
EOF
```

Built-in agent adapters:

- `claude`: `claude -p --permission-mode bypassPermissions <prompt>`
- `codex`: `codex exec --full-auto <prompt>`
- `gemini`: `gemini -p <prompt>`
- `opencode`: `opencode run <prompt>`
- `goose`: `goose run -t <prompt>`

## Run

```bash
node daemon/dashboard-daemon.mjs
```

When connected, the setup page will show the daemon id under connected
machines. The daemon sends a heartbeat before polling for queued commands.

## Safety Model

- The dashboard stores one `working_directory` per project.
- The daemon refuses commands for projects without a working directory.
- Commands run with `spawn`, not a shell string.
- The daemon API requires `DASHBOARD_WRITE_KEY`.
- Expose the dashboard only behind access controls you trust.
