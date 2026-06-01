# Security

Praxia Core is self-hosted software that can coordinate local AI coding agents.
That makes the daemon powerful. Secure the dashboard before exposing it outside
your local network.

## Secrets

- `DATABASE_URL` belongs in `.env.local` on the web app host.
- `DASHBOARD_WRITE_KEY` belongs in `.env.local` and `~/.praxia/dashboard.env`.
- `COMMAND_KEY` is optional. If set, browser/API command creation requires it.

Never commit `.env.local`, `.env`, or `~/.praxia/dashboard.env`.

## Daemon

The daemon:

- authenticates with `DASHBOARD_WRITE_KEY`;
- claims commands from the dashboard;
- runs commands with `spawn`, not shell-string execution;
- runs only inside the project `working_directory`;
- reports results back to the app.

You should only add project directories you trust.

## Reporting Issues

If you publish a fork, replace this section with your own security contact.
