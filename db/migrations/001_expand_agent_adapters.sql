ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_agent_check;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_fallback_agent_check;
ALTER TABLE commands DROP CONSTRAINT IF EXISTS commands_agent_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_agent_check
  CHECK (agent IN ('claude', 'codex', 'gemini', 'opencode', 'goose'));

ALTER TABLE projects
  ADD CONSTRAINT projects_fallback_agent_check
  CHECK (fallback_agent IN ('claude', 'codex', 'gemini', 'opencode', 'goose'));

ALTER TABLE commands
  ADD CONSTRAINT commands_agent_check
  CHECK (agent IN ('claude', 'codex', 'gemini', 'opencode', 'goose'));
