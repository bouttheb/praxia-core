# Security

Praxia Core is self-hosted software that can coordinate local AI coding agents.
That makes the daemon powerful. Secure the dashboard before exposing it outside
your local network.

## Security Model

Praxia is designed around an outbound local daemon. The web dashboard stores
projects and queued commands. The daemon runs on the machine that has your repos
and authenticated AI coding CLIs, claims queued commands, executes them locally,
and reports results back.

This is powerful by design. Treat Praxia Core like a local automation system,
not like a public static website.

Recommended defaults:

- Run Praxia Core on `localhost` for personal use.
- If you expose the dashboard beyond one machine, put it behind a VPN, private
  network, or authenticated reverse proxy.
- Set strong `COMMAND_KEY` and `DASHBOARD_WRITE_KEY` values before non-local
  exposure.
- Only add repositories you trust.
- Review queued commands before leaving the daemon unattended.
- Never commit `.env.local`, daemon tokens, or dashboard keys.

In production, Praxia Core fails closed for non-loopback command APIs unless
`COMMAND_KEY` is configured. This protects command creation, project import, and
source-doc sync endpoints from being accidentally exposed without an explicit
command key.

## Secrets

- `DATABASE_URL` belongs in `.env.local` on the web app host.
- `DASHBOARD_WRITE_KEY` belongs in `.env.local` and `~/.praxia/dashboard.env`.
- `COMMAND_KEY` protects browser/API command creation and other privileged
  dashboard actions.

For local development on `localhost`, `COMMAND_KEY` can be unset. For production
or any non-loopback exposure, configure `COMMAND_KEY`; otherwise protected
command APIs return an error instead of accepting requests.

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
