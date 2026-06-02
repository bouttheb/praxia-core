# Architecture

Praxia Core has three moving parts:

1. **Next.js app** - dashboard, setup, command queue, project docs sync, run history.
2. **Postgres** - source of truth for areas, projects, updates, and commands.
3. **Local daemon** - polls the app, claims queued commands, runs the selected local AI coding agent, reports back.

The browser never runs shell commands. It only writes command rows. The daemon
is the local process that decides whether it can run a command for a project's
working directory.

```text
Browser or phone -> Next.js app -> Postgres <- daemon -> local repo -> Codex/Claude
```

## Data Model

- `organizations`: top-level owner for local or hosted workspaces.
- `accounts` and `organization_memberships`: hosted user and workspace boundary.
- `areas`: project groups.
- `projects`: project metadata, agent choice, working directory, docs snapshot.
- `updates`: progress log entries.
- `commands`: queue rows claimed by the daemon.
- `settings`: small key/value store for future local preferences.
- `daemon_heartbeats`: recent daemon check-ins so setup can show connected machines.
- `daemon_devices` and `daemon_pairing_codes`: hosted device pairing scaffold.
- `audit_events`: hosted audit trail for pairing, command, and admin actions.
- `subscriptions`: hosted billing boundary.

## Dispatch Flow

1. User queues a command from `/chat`.
2. `POST /api/commands` inserts a `queued` row.
3. Daemon calls `POST /api/commands/claim`.
4. API atomically marks one command as `running`.
5. Daemon runs the selected local AI coding agent in the project's working directory.
6. Daemon patches `/api/commands/:id` with completion, failure, or blocker state.
7. Completed commands can create a progress update.

The daemon also calls `POST /api/daemon/heartbeat` during its polling loop so
the setup page can show whether a local runner has connected recently.

## Hosted Mode

Hosted Praxia keeps the same outbound daemon architecture. The cloud app should
never need inbound network access to a user's computer:

```text
Browser -> Praxia Cloud -> hosted Postgres <- daemon polling from user's machine
```

Cloud mode is disabled by default with `PRAXIA_MODE=self-hosted`. A hosted
deployment can set `PRAXIA_MODE=cloud` after auth, workspace scoping, rate
limits, and revocable daemon tokens are in place. See
[docs/CLOUD_MODE.md](docs/CLOUD_MODE.md).
