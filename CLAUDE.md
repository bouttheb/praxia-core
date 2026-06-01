# Claude Code Notes

When asked to install Praxia Core, follow [AGENTS.md](AGENTS.md).

The short version:

```bash
npm install
npm run install:local
npm run db:up
npm run db:init
npm run smoke:self-hosted
npm run dev
node daemon/dashboard-daemon.mjs
```

The default `DATABASE_URL` points at Docker Postgres. If Docker is unavailable
or the user wants hosted Postgres, ask for a connection string before running
`npm run db:init`.
