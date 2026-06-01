# Agent Install Guide

Use this file when a user asks Codex, Claude Code, or another coding agent to
install Praxia Core.

## Goal

Install a self-hosted Praxia Core dashboard, configure the local daemon, and
add the user's first projects without exposing secrets or guessing private
paths.

## Do This

1. Clone the repo and enter it.
2. Run `npm install`.
3. Run `npm run install:local`.
4. If Docker is available and the user did not provide a hosted Postgres URL, run `npm run db:up`.
5. Check `.env.local`.
   - The default `DATABASE_URL` points at Docker Postgres.
   - If the user wants hosted Postgres, ask for their connection string.
   - Do not invent a hosted database credential.
   - Do not commit `.env.local`.
6. Run `npm run db:init`.
7. Run `npm run smoke:self-hosted`.
   - If port 5432 is already occupied by another local Postgres, ask the user whether to use that database, change Docker's port, or use hosted Postgres.
8. Optionally run `npm run db:seed` for demo projects.
9. Start the web app with `npm run dev`.
10. Start the daemon with `node daemon/dashboard-daemon.mjs`.
11. Open `http://localhost:3030/setup`.
12. Add projects using repo paths as seen by the daemon machine, or run `npm run scan:projects -- <folder>` first.

## Project Onboarding Rules

For each project, collect:

- area name;
- project display name;
- local working directory;
- default agent: `claude` or `codex`;
- optional description.

The working directory must be valid on the machine running the daemon. If the
dashboard is hosted elsewhere, the daemon still uses its own local path.

## Verify

- `npm run build` passes.
- `/setup` shows the setup page.
- When the daemon is running, `/setup` shows a connected machine heartbeat.
- Queue a harmless command first, such as `pwd && git status --short`.

## Safety

- Never commit `.env.local` or `~/.praxia/dashboard.env`.
- Never print full database URLs or API keys in summaries.
- Do not expose the dashboard publicly until the user has an auth, VPN, or
  trusted reverse-proxy plan.
- Ask before adding unfamiliar project directories.
