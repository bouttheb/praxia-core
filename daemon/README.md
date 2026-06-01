# Praxia Core Daemon

The daemon connects a Praxia Core dashboard to the machine that actually has
your project repos. It polls the dashboard for queued commands, claims one,
runs either Claude Code or Codex in the project's configured working directory,
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
EOF
```

## Run

```bash
node daemon/dashboard-daemon.mjs
```

## Safety Model

- The dashboard stores one `working_directory` per project.
- The daemon refuses commands for projects without a working directory.
- Commands run with `spawn`, not a shell string.
- The daemon API requires `DASHBOARD_WRITE_KEY`.
- Expose the dashboard only behind access controls you trust.
