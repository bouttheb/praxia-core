# Engine Framework

How client-facing engines are built in Praxia. This document is the playbook;
the code contract lives in [lib/engine-framework.ts](../lib/engine-framework.ts)
(blueprint types + registry, with a fully worked fictional example) and
[lib/engine-agent-doctrine.ts](../lib/engine-agent-doctrine.ts) (the chat
agent's behavioral contract as a prompt builder).

## What an engine is

A client-facing product surface inside one Praxia workspace:

- **One org, one landing page.** The client logs in with a magic link and is
  standing inside the engine. Nothing else of Praxia is visible to them —
  members with a single workspace get no nav chrome at all
  (`memberChromeless`). Owners/admins keep their chrome.
- **Deliverables, not file shares.** Videos, summaries, and memos are
  published to storage under the blueprint's `blobPrefix` with a
  `manifest.json`; the dashboard shows the newest of each with the full
  archive one dropdown away. No shared folders, no shared docs.
- **A chat agent with a doctrine.** The client talks to the engine in their
  domain language. The agent investigates (and even ships improvements)
  backstage, but the reply never mentions how anything works.
- **A self-improvement loop with a governor.** Feedback about the
  deliverables gets built immediately; requests for new functionality are
  declined with a formal-request email while the owner is quietly alerted.

## The blueprint

`EngineBlueprint` is the single object that describes an engine — identity,
client voice (persona, pronouns, domain vocabulary), deliverable nouns,
storage prefix, agent working directory, and the escalation channel. Every
framework concern keys off it:

- nav chrome for the engine's workspace,
- deliverable loading and publishing,
- the agent chat prompt (`buildEngineAgentChatCommand`),
- preflight checks of the client's view.

Start from `EXAMPLE_FIELD_GUIDE_BLUEPRINT` and write every string as if the
client will read it — most of them will, either in the UI or through the
agent's mouth.

## Standing up a new engine

1. **Blueprint.** Add an `EngineBlueprint` to the registry in
   `lib/engine-framework.ts`.
2. **Provision.** Create the org, the client's membership (magic-link login —
   possession of the inbox is what admits them), and the engine's project
   with its `working_directory` pointing at the pipeline repo.
3. **Page.** Build the landing page at the blueprint's `href`: a full-width
   player with an archive dropdown on top; below it, chat in the left column
   and the engine's cards (forms, summary, memo) stacked on the right.
4. **Chat route.** Save the client's message, queue a daemon command whose
   body is `buildEngineAgentChatCommand({ blueprint, message,
   dashboardContextJson })`, and paste the command's result back into the
   thread verbatim when it completes. The doctrine handles the rest.
5. **Publish deliverables.** Upload each produced file under
   `deliverables.blobPrefix` and regenerate `manifest.json` from the full
   storage listing (idempotent; partial publishes are safe). File names ARE
   the taxonomy:

   | Pattern | Kind |
   | --- | --- |
   | `{M.D.YY}-open.mov` / `-close.mov` | open / close video |
   | `{M.D.YY}-meeting.mp4` | meeting replay |
   | `{stem}.summary.md` | summary |
   | `{stem}.fundamentals.md` | fundamentals |
   | `{stem}.committee.{md,pdf,html}` or `*memo*` | weekly memo |

6. **Escalation channel.** Point `agent.notifyScript` at a notifier that
   reaches the owner without the client knowing (e.g. a script that fires a
   desktop banner + message), and create the two markdown logs the doctrine
   expects (`feedbackLogPath`, `escalationLogPath`).
7. **Preflight.** Before go-live, render the production page through a
   short-lived session as the actual member and assert: HTTP 200, the engine
   renders, and no nav chrome leaks. Revoke the session after.

## UI conventions (learned the hard way)

- The dropdown is the single source of the selected item's title — never
  repeat it as a bold title or filename/timestamp line.
- The newest deliverable leads; a same-day meeting recording outranks the
  morning brief it followed.
- Stat strips render only once they have real readings — a column of dash
  cards above the headline content is noise.
- The chat panel never sets its own height: pin it to the neighbor column,
  scroll messages internally (pinned to newest), keep the composer visible.
- No suggested-prompt buttons in the chat; the empty state is a clean box.
- Mobile is the primary client surface. Assume the client reads on a phone.

## Agent doctrine (summary — the full text lives in code)

1. **Front stage / backstage.** Replies are 2–6 conversational sentences in
   the client's domain vocabulary. Never code, paths, commits, tests, or
   anything about how the engine works. Never claim a signal that wasn't
   verified in the evidence.
2. **Self-improving product.** Deliverable feedback gets built and committed
   directly; the client is told what the product will start doing
   differently — never how. A per-engine learning log compounds improvements
   across sessions.
3. **Escalation governor.** New functionality or real-world actions
   (auto-trading, live orders, freight, purchases, acting on the client's
   behalf) are never built from chat: the client is pointed at the formal-
   request email; the owner gets the quiet notify + a durable log entry.

## Delivery cutover pattern

When an engine replaces an older delivery channel (shared folder, shared
doc), key the switch on the **deliverable's date stem**, not the wall clock —
a late retry of a pre-cutover deliverable uses the old path; a re-render of a
post-cutover one never falls back.
