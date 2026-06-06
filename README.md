# Praxia Core

[Website](https://trypraxia.com) · [Hosted app](https://app.trypraxia.com) · [GitHub](https://github.com/bouttheb/praxia-core)

Praxia Core is a self-hosted dashboard for managing multiple AI coding projects
across local agents from your phone or any browser.

It gives you one place to see every project, read its current README/vision
snapshot, check the latest progress, and queue work for a local machine running
Codex, Claude Code, Gemini CLI, OpenCode, Goose, or another future adapter.
Your browser is the remote control; your paired computer does the actual work
in the local repo.

## Why Praxia

The name Praxia comes from the Greek word _praxis_, meaning the practical
application of knowledge. Most AI systems help you think. Praxia helps you act.

It turns ideas into projects, projects into tasks, and tasks into completed
outcomes. The goal is not simply artificial intelligence. It is applied
intelligence.

## What It Does

- Track projects across project groups such as Open Source, Client Work, or Personal.
- Store each project's working directory, default agent, progress, and latest update.
- Sync project docs from `docs/VISION.md`, `VISION.md`, `README.md`, and architecture docs.
- Queue commands from a web dashboard.
- Let a local daemon claim commands and run your selected local AI coding agent.
- Report results, blockers, failures, completed work, refreshed docs, and completion percentage back to the dashboard.

## How Praxia Is Different

Some tools focus on controlling or observing live AI coding sessions. Praxia
focuses on the project layer above those sessions.

Use Praxia when the hard part is not one terminal tab, but keeping track of many
projects, many agent runs, and the context needed to continue each one. Each
project gets a home for its docs, status, working directory, default agent,
queued commands, and run history.

Codex, Claude Code, Gemini CLI, OpenCode, and Goose can be workers. Praxia is
the command center that helps you decide what should happen next across the
whole portfolio.

## Quick Start

If you are asking an AI coding agent to install this repo for you, give it this
prompt:

```text
Clone this Praxia Core repo, read AGENTS.md, run the local install steps,
ask me for DATABASE_URL if it is missing, start the web app, start the daemon,
and help me add my first projects by local repo path.
```

```bash
git clone <praxia-core-repo-url>
cd praxia-core
npm install
npm run install:local
npm run db:up
```

The default local path uses Docker Postgres at
`postgres://praxia:praxia@localhost:5432/praxia`. To use Neon, Supabase, or
another Postgres provider, replace `DATABASE_URL` in `.env.local`.
If another local Postgres is already using port 5432, either stop it, change
the Docker port, or use a hosted Postgres URL.

```bash
npm run db:init
npm run smoke:self-hosted
npm run db:seed
npm run dev
```

Open <http://localhost:3030>.

In another terminal, start the daemon:

```bash
mkdir -p ~/.praxia
cp .env.local ~/.praxia/dashboard.env
node daemon/dashboard-daemon.mjs
```

The setup page shows recent daemon heartbeats once the local runner connects.

If you already initialized Praxia before the multi-agent adapters were added,
apply the migrations once:

```bash
psql "$DATABASE_URL" -f db/migrations/001_expand_agent_adapters.sql
psql "$DATABASE_URL" -f db/migrations/002_scope_workflows.sql
psql "$DATABASE_URL" -f db/migrations/003_manage_project_specs.sql
```

## Onboarding Projects

Open `/setup` and add one row per repo:

- **Project Group**: a group such as Open Source, Client Work, or Personal Projects.
- **Project name**: the display name on the dashboard.
- **Working directory**: the repo path as seen by the daemon machine.
- **Default agent**: choose Claude Code, Codex, Gemini CLI, OpenCode, or Goose.

You can also use **Import projects** on `/setup` to scan a local folder for git
repos and README/VISION docs, then import selected projects in one pass.

After adding a project, open its details and use **Sync docs** to pull in
`README.md`, `docs/VISION.md`, `VISION.md`, `ARCHITECTURE.md`, or
`docs/ARCHITECTURE.md` when those files exist on the web app host. If your web
app is hosted away from the machine with the repos, keep the working directory
configured for the daemon and use progress updates/command results as the live
source of truth.

## Deployment Shape

The web app can run anywhere Next.js and Postgres run. The daemon should run on
the machine that has your project repos and your authenticated Codex / Claude
Code CLIs.

Common setups:

- Laptop or desktop hosts both the dashboard and daemon.
- Home server hosts the dashboard; workstation runs the daemon.
- VPS hosts the dashboard; local machine reaches it through a private tunnel.

For always-on daemon setup, see [docs/DAEMON_SERVICE.md](docs/DAEMON_SERVICE.md).

## Hosted Mode

This repo also includes the first Praxia Cloud blueprint for a managed hosted
version. Hosted mode is off by default; self-hosted installs do not need hosted
accounts, billing, or cloud database credentials.

Inspect the plan at `/cloud` or read [docs/CLOUD_MODE.md](docs/CLOUD_MODE.md).
The hosted layer adds accounts, organizations, daemon device pairing, audit
events, and billing boundaries while keeping command execution on the user's own
machine through an outbound-only daemon.

## Security Model

Praxia Core is local-first, but it is intentionally powerful. The dashboard can
queue work for a daemon that runs local coding agents inside project
directories. Treat the daemon like a trusted local automation tool.

Recommended defaults:

- Run Praxia Core on `localhost` for personal use.
- If exposing it beyond your machine, put it behind a VPN, private network, or authenticated reverse proxy.
- Set strong `COMMAND_KEY` and `DASHBOARD_WRITE_KEY` values before non-local exposure.
- Only add project directories you trust.
- Review queued commands before running unattended automation.
- Never commit `.env.local`, daemon tokens, or dashboard keys.

In production, Praxia Core fails closed for non-loopback command APIs unless
`COMMAND_KEY` is configured. See [SECURITY.md](SECURITY.md) for details.

## Public Scrub

This repo is intended to be a generic shell. Before publishing a fork, run:

```bash
npm run audit:private-names
npm run audit:secrets
```

Also inspect screenshots manually before adding them to a public repo.
