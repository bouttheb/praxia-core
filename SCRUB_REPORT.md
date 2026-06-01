# Scrub Report

Status: local inspection build, not published.

## Completed

- Created a separate `praxia-core` workspace.
- Ported only the generic dashboard, project cards, command queue, source-doc sync, setup flow, run history, and daemon.
- Removed customer-specific routes, fixtures, screenshots, docs, and business workflows from the public shell.
- Replaced seed data with neutral example projects.
- Replaced public docs with generic Praxia Core positioning.
- Preserved the existing AGPL-3.0 license family.

## Checks

- Production build: passed.
- Private-name content search: no matches.
- Private-name filename search: no matches.
- Secret keyword search: only expected references in docs, environment examples, and redaction/security helper code.

## Remaining Before Publish

- Inspect the app locally in a browser.
- Review the repo tree manually.
- Replace placeholder GitHub URLs in `package.json`.
- Decide whether to keep or replace the generic code-of-conduct contact language.
- Create the public GitHub repo only after manual approval.
