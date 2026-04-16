-- Configurator chat sessions: persist dialogue between user and the Opus-powered
-- Agent Configurator. One session may be linked to an agent (null before the
-- agent is first created) and is reused for post-ready iterations.

CREATE TABLE IF NOT EXISTS configurator_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  turn_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_configurator_sessions_entity ON configurator_sessions(entity_id);
CREATE INDEX IF NOT EXISTS idx_configurator_sessions_agent ON configurator_sessions(agent_id);

ALTER TABLE configurator_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS configurator_sessions_entity_select ON configurator_sessions;
CREATE POLICY configurator_sessions_entity_select ON configurator_sessions
  FOR SELECT USING (
    entity_id IN (SELECT entity_id FROM entity_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS configurator_sessions_entity_write ON configurator_sessions;
CREATE POLICY configurator_sessions_entity_write ON configurator_sessions
  FOR ALL USING (
    entity_id IN (SELECT entity_id FROM entity_members WHERE user_id = auth.uid())
  ) WITH CHECK (
    entity_id IN (SELECT entity_id FROM entity_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS configurator_sessions_service ON configurator_sessions;
CREATE POLICY configurator_sessions_service ON configurator_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
