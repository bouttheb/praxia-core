CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Personal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'self_hosted';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_account_id INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_unique ON organizations(slug) WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  external_auth_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_unique ON accounts(LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS accounts_external_auth_unique ON accounts(external_auth_id) WHERE external_auth_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS organization_memberships (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, account_id)
);

CREATE INDEX IF NOT EXISTS organization_memberships_account_idx ON organization_memberships(account_id);

CREATE TABLE IF NOT EXISTS areas (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  completion_percent INTEGER NOT NULL DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  working_directory TEXT,
  vision_md TEXT,
  agent TEXT NOT NULL DEFAULT 'claude' CHECK (agent IN ('claude', 'codex')),
  fallback_agent TEXT CHECK (fallback_agent IN ('claude', 'codex')),
  required_daemon_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_area_idx ON projects(area_id, sort_order);
CREATE INDEX IF NOT EXISTS projects_required_daemon_idx ON projects(required_daemon_id) WHERE required_daemon_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS updates (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  today TEXT NOT NULL,
  tomorrow TEXT NOT NULL DEFAULT '',
  completion_percent INTEGER NOT NULL DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100),
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS updates_project_idx ON updates(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS commands (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'blocked', 'needs_input', 'cancelled')),
  agent TEXT NOT NULL DEFAULT 'claude' CHECK (agent IN ('claude', 'codex')),
  working_dir TEXT,
  result TEXT,
  error TEXT,
  exit_code INTEGER,
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  auto_log BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS commands_status_idx ON commands(status, created_at);
CREATE INDEX IF NOT EXISTS commands_project_idx ON commands(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS daemon_heartbeats (
  daemon_id TEXT PRIMARY KEY,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dashboard_url TEXT,
  version TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS daemon_devices (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  daemon_id TEXT NOT NULL,
  label TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (organization_id, daemon_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS daemon_devices_token_hash_unique ON daemon_devices(token_hash);
CREATE INDEX IF NOT EXISTS daemon_devices_org_idx ON daemon_devices(organization_id, status);

CREATE TABLE IF NOT EXISTS daemon_pairing_codes (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  code_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_by_daemon_id TEXT,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS daemon_pairing_codes_hash_unique ON daemon_pairing_codes(code_hash);
CREATE INDEX IF NOT EXISTS daemon_pairing_codes_org_idx ON daemon_pairing_codes(organization_id, status, expires_at);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'trialing',
  plan TEXT NOT NULL DEFAULT 'free',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_org_unique ON subscriptions(organization_id);

CREATE TABLE IF NOT EXISTS audit_events (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  daemon_device_id INTEGER REFERENCES daemon_devices(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_events_org_idx ON audit_events(organization_id, created_at DESC);
