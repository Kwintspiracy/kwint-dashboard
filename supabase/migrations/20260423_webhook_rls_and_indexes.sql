-- Wave 4.5 + 4.7 (audit 2026-04-23) — RLS policy for webhook_triggers +
-- missing indexes.
--
-- Before this migration, `webhook_triggers` had row-level security flagged
-- as a gap in the audit: the table carries `entity_id` but no explicit
-- CREATE POLICY entry in 20260412_perf_indexes_rls.sql alongside all the
-- other core tables. If RLS ends up enabled without a policy, every query
-- silently returns empty. If RLS is left disabled, server-side queries
-- without `.eq('entity_id', ...)` leak across tenants.
--
-- This migration:
--   (1) Enables RLS on webhook_triggers (defaults to deny).
--   (2) Adds a policy mirroring the other tables: scope to current user's
--       entities via the `auth_user_entity_ids()` SECURITY DEFINER helper.
--   (3) Adds three missing indexes flagged in the audit:
--       - skill_connectors(skill_id)
--       - approval_requests(agent_id)
--       - approval_requests(job_id)

-- 4.7 — RLS on webhook_triggers
ALTER TABLE public.webhook_triggers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Entity members only" ON public.webhook_triggers;

CREATE POLICY "Entity members only" ON public.webhook_triggers
  FOR ALL TO public
  USING (entity_id = ANY(public.auth_user_entity_ids()))
  WITH CHECK (entity_id = ANY(public.auth_user_entity_ids()));

-- 4.5 — performance indexes (were missing; full-table scans on hot paths).
-- skill_connectors(skill_id) speeds up the `.select('*, skill_connectors(...)')`
-- join in actions.ts:getSkillsAction.
CREATE INDEX IF NOT EXISTS idx_skill_connectors_skill_id
  ON public.skill_connectors (skill_id);

-- approval_requests(agent_id) speeds up the agent-scoped approval-list path.
CREATE INDEX IF NOT EXISTS idx_approval_requests_agent_id
  ON public.approval_requests (agent_id);

-- approval_requests(job_id) speeds up the runner's _find_matching_approval
-- lookup (`eq("job_id", X).eq("tool_name", Y)`).
CREATE INDEX IF NOT EXISTS idx_approval_requests_job_id
  ON public.approval_requests (job_id);

COMMENT ON POLICY "Entity members only" ON public.webhook_triggers IS
  'Added by audit 2026-04-23 Wave 4.7. Webhook routes still use service-role '
  'for the initial lookup (external callers have no session), so the policy '
  'mainly protects the dashboard-side list view from cross-tenant reads.';
