# Claude Code Notes

When asked to install Praxia Core, follow [AGENTS.md](AGENTS.md).

The short version:

```bash
npm install
npm run install:local
npm run db:init
npm run dev
node daemon/dashboard-daemon.mjs
```

If `DATABASE_URL` is blank after `npm run install:local`, ask the user for a
Postgres connection string before running `npm run db:init`.
