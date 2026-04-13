-- MCP (Model Context Protocol) remote server connections per entity.
-- v0: each connection points to a catalog slug (e.g. 'notion') and reuses the
-- existing connector's OAuth token for auth. tool_config stores per-tool
-- enable/disable + risk overrides (added in a later phase).

CREATE TABLE IF NOT EXISTS mcp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  slug text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  tool_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_mcp_connections_entity ON mcp_connections(entity_id) WHERE active;

ALTER TABLE mcp_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mcp_connections_entity_select ON mcp_connections;
CREATE POLICY mcp_connections_entity_select ON mcp_connections
  FOR SELECT USING (
    entity_id IN (SELECT entity_id FROM entity_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS mcp_connections_entity_write ON mcp_connections;
CREATE POLICY mcp_connections_entity_write ON mcp_connections
  FOR ALL USING (
    entity_id IN (SELECT entity_id FROM entity_members WHERE user_id = auth.uid())
  ) WITH CHECK (
    entity_id IN (SELECT entity_id FROM entity_members WHERE user_id = auth.uid())
  );

-- Service role bypass for runner
DROP POLICY IF EXISTS mcp_connections_service ON mcp_connections;
CREATE POLICY mcp_connections_service ON mcp_connections
  FOR ALL TO service_role USING (true) WITH CHECK (true);
