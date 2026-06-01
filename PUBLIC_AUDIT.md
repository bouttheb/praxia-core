# Public Audit

This file records the local checks used before publishing Praxia Core.

## Required Checks

Run a case-insensitive `rg` search for every private organization name,
client name, person name, domain, and project codename that should not appear
in the public repo. Also run the same search over filenames with `find`.

## Manual Checks

- Review screenshots before committing them.
- Confirm `.env.local` is not tracked.
- Confirm `~/.praxia/dashboard.env` is not inside the repo.
- Confirm sample data uses neutral project names.
