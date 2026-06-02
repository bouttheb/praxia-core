# Scrub Report

Status: final public-release inspection.

## Completed

- Created a separate `praxia-core` workspace.
- Ported only the generic dashboard, project cards, command queue, source-doc sync, setup flow, run history, and daemon.
- Added daemon heartbeat wiring so the setup page can show connected local runners.
- Added `AGENTS.md`, `CLAUDE.md`, and `npm run install:local` so Codex/Claude can follow a concrete install path.
- Added Docker Postgres, folder scanning, and project import so self-hosted users can try Praxia without a hosted database account.
- Added a self-hosted smoke test and daemon service docs for macOS/Linux/manual Windows.
- Added a hosted-mode planning page, cloud schema scaffold, and disabled-by-default pairing API routes for future Praxia Cloud work.
- Removed customer-specific routes, fixtures, screenshots, docs, and business workflows from the public shell.
- Replaced seed data with neutral example projects.
- Replaced public docs with generic Praxia Core positioning.
- Kept the code of conduct generic, with no personal contact details.
- Preserved the existing AGPL-3.0 license family.

## Checks

- Production build: passed.
- Local browser check: passed for `/`, `/setup`, `/cloud`, `/chat`, and `/runs`.
- Hosted page browser check: passed at `/cloud`.
- Hosted pairing API disabled-by-default check: passed.
- Private-name content search: no matches.
- Private-name filename search: no matches.
- Secret keyword search: only expected references in docs, environment examples, and redaction/security helper code.
- Project scanner: passed against this repo.
- Self-hosted smoke test: blocked on this machine because Docker is not installed and an unrelated local Postgres is answering on port 5432 without the `praxia` role. The script now reports this clearly and tells users to run `npm run db:up` or set a real `DATABASE_URL`.

## Remaining Before Publish

- Flip the private GitHub repo to public after final approval.
