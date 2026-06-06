CREATE TABLE IF NOT EXISTS scope_assessments (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  command_body TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('execute', 'clarify', 'split', 'reject')),
  confidence NUMERIC(4, 2) NOT NULL DEFAULT 0,
  template_key TEXT,
  template_label TEXT,
  summary TEXT NOT NULL,
  missing_inputs JSONB NOT NULL DEFAULT '[]'::jsonb,
  clarifying_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  proposed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  definition_of_done JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scope_assessments_project_idx ON scope_assessments(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scope_assessment_id INTEGER REFERENCES scope_assessments(id) ON DELETE SET NULL,
  template_key TEXT,
  template_label TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'blocked', 'needs_input', 'cancelled')),
  original_command TEXT NOT NULL,
  current_step_index INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER NOT NULL DEFAULT 0,
  agent TEXT NOT NULL DEFAULT 'claude' CHECK (agent IN ('claude', 'codex', 'gemini', 'opencode', 'goose')),
  working_dir TEXT,
  definition_of_done JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS workflow_runs_project_idx ON workflow_runs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workflow_runs_status_idx ON workflow_runs(status, created_at);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id SERIAL PRIMARY KEY,
  workflow_run_id INTEGER NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'blocked', 'needs_input', 'cancelled')),
  command_id INTEGER REFERENCES commands(id) ON DELETE SET NULL,
  result_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (workflow_run_id, step_index)
);

CREATE INDEX IF NOT EXISTS workflow_steps_run_idx ON workflow_steps(workflow_run_id, step_index);
CREATE INDEX IF NOT EXISTS workflow_steps_command_idx ON workflow_steps(command_id) WHERE command_id IS NOT NULL;

ALTER TABLE commands ADD COLUMN IF NOT EXISTS scope_assessment_id INTEGER REFERENCES scope_assessments(id) ON DELETE SET NULL;
ALTER TABLE commands ADD COLUMN IF NOT EXISTS workflow_run_id INTEGER REFERENCES workflow_runs(id) ON DELETE SET NULL;
ALTER TABLE commands ADD COLUMN IF NOT EXISTS workflow_step_id INTEGER REFERENCES workflow_steps(id) ON DELETE SET NULL;
