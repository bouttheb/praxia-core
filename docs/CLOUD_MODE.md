# Praxia Cloud Mode

Praxia Cloud is the hosted layer on top of Praxia Core. The hosted product should
keep the local-runner model: the web app coordinates work, while the user's own
machine runs Codex or Claude Code against local repos.

## Product Boundary

Praxia Core remains the public self-hosted shell:

- single operator by default
- user-managed Postgres
- user-managed daemon key
- no billing
- no hosted account dependency

Praxia Cloud adds managed infrastructure:

- hosted Postgres
- user accounts and organizations
- sessions, email verification, and workspace invites
- short-lived daemon pairing codes
- revocable device tokens
- audit logs
- billing and usage limits
- guided AI onboarding

## Pricing Hypothesis

Praxia Cloud sells the command center, not AI compute. Users bring their own
local Codex and Claude Code accounts.

| Plan | Price | Projects | Runs/mo | Machines | Members |
| --- | ---: | ---: | ---: | ---: | ---: |
| Free | $0 | 3 | 25 | 1 | 1 |
| Builder | $29/mo | 12 | 500 | 1 | 1 |
| Pro | $59/mo | 36 | 1,000 | 3 | 3 |
| Studio | $129/mo | 100 | 3,000 | 5 | 5 |

These limits should be enforced server-side before billing goes live.

## First Hosted Milestone

The first hosted version should prove three things before adding billing polish:

1. A user can create an account and workspace.
2. The user can pair a local machine through an outbound-only daemon flow.
3. The user can import one repo, queue one command, and see the result return.

Everything else depends on those loops being boring and reliable.

## Pairing Protocol

Hosted pairing should not require inbound access to a user's computer.

1. The web app creates a short-lived pairing code for a workspace.
2. The user runs the daemon installer on the machine with their repos.
3. The daemon submits the pairing code to Praxia Cloud.
4. Praxia Cloud exchanges the code for a revocable device token.
5. The daemon stores the token locally and uses it for future polling.
6. The web app shows heartbeat, device label, last seen time, and revoke controls.

The current scaffold includes disabled-by-default API routes:

- `GET /api/cloud/pairing`
- `POST /api/cloud/pairing`
- `POST /api/cloud/pairing/complete`

Set `PRAXIA_MODE=cloud` only in a hosted deployment. Pairing creation also
requires `HOSTED_ADMIN_KEY` until real auth replaces that temporary gate.

## Multi-Tenant Rules

Before any hosted beta, every dashboard query and mutation must be scoped by
organization membership. The self-hosted schema can keep permissive defaults,
but hosted routes must enforce:

- authenticated account
- active organization membership
- project belongs to the organization
- command belongs to a project in the organization
- daemon device belongs to the organization
- audit event written for privileged actions
- plan limits checked before project, machine, and run creation

## Signup and Billing Model

Hosted signup should create:

1. `accounts` row
2. verified email or pending email verification token
3. `organizations` row
4. owner `organization_memberships` row
5. `subscriptions` row with the chosen plan
6. first `organization_usage_periods` row
7. daemon pairing code after payment or free-plan activation

Billing webhooks should write `checkout_events` first, then update
`subscriptions`, `organizations.plan`, and `organizations.billing_status`.

## Guided AI Onboarding

The hosted assistant should walk the user through the exact setup path:

1. Check Git, Node, Codex, and Claude Code.
2. Install or update the Praxia daemon package.
3. Pair with the hosted browser code.
4. Confirm heartbeat from the local machine.
5. Scan local folders for repos and docs.
6. Import selected projects.
7. Queue a harmless first command.

The assistant should not ask for cloud database credentials. Praxia Cloud owns
the database and infrastructure.

## Infrastructure

Minimum hosted stack:

- Next.js web app
- managed Postgres
- auth provider or first-party auth
- email for account lifecycle
- background job runner for cleanup and retention
- object storage for long logs and artifacts
- observability for web, database, and daemon API routes
- billing provider after the pairing loop is proven

## Launch Gates

Do not open a hosted beta until these are true:

- command creation requires authenticated workspace membership
- daemon tokens are hash-stored and revocable
- pairing codes expire automatically
- command results redact obvious secrets
- every pairing and command lifecycle event has an audit entry
- rate limits exist for login, pairing, polling, and command creation
- there is a clear warning that commands execute on the user's own machine
