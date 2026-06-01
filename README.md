# Praxia Core

Praxia Core is a self-hosted dashboard for people managing too many AI coding
projects at once.

It gives you one place to see every project, read its current README/vision
snapshot, check the latest progress, and queue work for a local machine running
Codex or Claude Code. The phone or browser is the remote control; your paired
computer does the actual work in the local repo.

## What It Does

- Track projects across areas such as Open Source, Client Work, or Personal.
- Store each project's working directory, default agent, progress, and latest update.
- Sync project docs from `docs/VISION.md`, `VISION.md`, `README.md`, and architecture docs.
- Queue commands from a web dashboard.
- Let a local daemon claim commands and run `claude -p` or `codex exec`.
- Report results, blockers, failures, and completed work back to the dashboard.

## Quick Start

If you are asking Codex or Claude Code to install this repo for you, give it
this prompt:

```text
Clone this Praxia Core repo, read AGENTS.md, run the local install steps,
ask me for DATABASE_URL if it is missing, start the web app, start the daemon,
and help me add my first projects by local repo path.
```

```bash
git clone https://github.com/your-org/praxia-core.git
cd praxia-core
npm install
npm run install:local
```

If `DATABASE_URL` is blank after the installer runs, add a Postgres connection
string to `.env.local`, then:

```bash
npm run db:init
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

## Onboarding Projects

Open `/setup` and add one row per repo:

- **Area**: a group such as Open Source, Client Work, or Personal Projects.
- **Project name**: the display name on the dashboard.
- **Working directory**: the repo path as seen by the daemon machine.
- **Default agent**: `claude` for Claude Code or `codex` for Codex.

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

## Security Notes

Praxia Core can ask an agent to modify files in a local repo. Treat the daemon
as a powerful local automation process.

- Keep `DASHBOARD_WRITE_KEY` private.
- Use a private network, VPN, or authenticated reverse proxy before exposing the app.
- Only add project directories you trust.
- Review queued commands before running unattended automation.
- Do not commit `.env.local` or `~/.praxia/dashboard.env`.

## Public Scrub

This repo is intended to be a generic shell. Before publishing a fork, run:

```bash
npm run audit:private-names
npm run audit:secrets
```

Also inspect screenshots manually before adding them to a public repo.
