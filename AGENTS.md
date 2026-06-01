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
4. Check `.env.local`.
   - If `DATABASE_URL` is blank, ask the user for a Postgres connection string.
   - Do not invent a hosted database credential.
   - Do not commit `.env.local`.
5. Run `npm run db:init`.
6. Optionally run `npm run db:seed` for demo projects.
7. Start the web app with `npm run dev`.
8. Start the daemon with `node daemon/dashboard-daemon.mjs`.
9. Open `http://localhost:3030/setup`.
10. Add projects using repo paths as seen by the daemon machine.

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
