-- Perf: replace per-row RLS subqueries with a STABLE function call so Postgres
-- evaluates membership once per query instead of once per row.

CREATE OR REPLACE FUNCTION public.auth_user_entity_ids() RETURNS uuid[]
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$
    SELECT COALESCE(array_agg(entity_id), ARRAY[]::uuid[])
    FROM entity_members
    WHERE user_id = auth.uid()
  $$;

GRANT EXECUTE ON FUNCTION public.auth_user_entity_ids() TO authenticated;

-- Rewrite every entity-scoped RLS policy to use the cached function.
-- Replaces "entity_id IN (SELECT ...)" or "EXISTS (SELECT 1 FROM entity_members ...)"
-- with a single ARRAY lookup that Postgres evaluates once per query.

DROP POLICY IF EXISTS "Entity members only" ON public.agents;
CREATE POLICY "Entity members only" ON public.agents FOR ALL TO public
  USING (entity_id = ANY(public.auth_user_entity_ids()))
  WITH CHECK (entity_id = ANY(public.auth_user_entity_ids()));

DROP POLICY IF EXISTS "Entity members only" ON public.agent_jobs;
CREATE POLICY "Entity members only" ON public.agent_jobs FOR ALL TO public
  USING (entity_id = ANY(public.auth_user_entity_ids()))
  WITH CHECK (entity_id = ANY(public.auth_user_entity_ids()));

DROP POLICY IF EXISTS "Entity members only" ON public.agent_memory;
CREATE POLICY "Entity members only" ON public.agent_memory FOR ALL TO public
  USING (entity_id = ANY(public.auth_user_entity_ids()))
  WITH CHECK (entity_id = ANY(public.auth_user_entity_ids()));

DROP POLICY IF EXISTS "Entity members only" ON public.agent_runs;
CREATE POLICY "Entity members only" ON public.agent_runs FOR ALL TO public
  USING (entity_id = ANY(public.auth_user_entity_ids()))
  WITH CHECK (entity_id = ANY(public.auth_user_entity_ids()));

DROP POLICY IF EXISTS "Entity members only" ON public.agent_schedules;
CREATE POLICY "Entity members only" ON public.agent_schedules FOR ALL TO public
  USING (entity_id = ANY(public.auth_user_entity_ids()))
  WITH CHECK (entity_id = ANY(public.auth_user_entity_ids()));

DROP POLICY IF EXISTS "Entity members only" ON public.agent_skills;
CREATE POLICY "Entity members only" ON public.agent_skills FOR ALL TO public
  USING (entity_id = ANY(public.auth_user_entity_ids()))
  WITH CHECK (entity_id = ANY(public.auth_user_entity_ids()));

DROP POLICY IF EXISTS "agent_tasks_member_access" ON public.agent_tasks;
CREATE POLICY "agent_tasks_member_access" ON public.agent_tasks FOR ALL TO public
  USING (entity_id = ANY(public.auth_user_entity_ids()))
  WITH CHECK (entity_id = ANY(public.auth_user_entity_ids()));

DROP POLICY IF EXISTS "Entity members only" ON public.approval_requests;
CREATE POLICY "Entity members only" ON public.approval_requests FOR ALL TO public
  USING (entity_id = ANY(public.auth_user_entity_ids()))
  WITH CHECK (entity_id = ANY(public.auth_user_entity_ids()));

DROP POLICY IF EXISTS "Entity members only" ON public.connectors;
CREATE POLICY "Entity members only" ON public.connectors FOR ALL TO public
  USING (entity_id = ANY(public.auth_user_entity_ids()))
  WITH CHECK (entity_id = ANY(public.auth_user_entity_ids()));

DROP POLICY IF EXISTS "Entity members only" ON public.tool_calls;
CREATE POLICY "Entity members only" ON public.tool_calls FOR ALL TO public
  USING (entity_id = ANY(public.auth_user_entity_ids()))
  WITH CHECK (entity_id = ANY(public.auth_user_entity_ids()));

DROP POLICY IF EXISTS "entity_llm_keys_member_access" ON public.entity_llm_keys;
CREATE POLICY "entity_llm_keys_member_access" ON public.entity_llm_keys FOR ALL TO public
  USING (entity_id = ANY(public.auth_user_entity_ids()))
  WITH CHECK (entity_id = ANY(public.auth_user_entity_ids()));

DROP POLICY IF EXISTS "entity members full access" ON public.agent_assignments;
CREATE POLICY "entity members full access" ON public.agent_assignments FOR ALL TO public
  USING (entity_id = ANY(public.auth_user_entity_ids()))
  WITH CHECK (entity_id = ANY(public.auth_user_entity_ids()));

DROP POLICY IF EXISTS "entity members full access" ON public.agent_skill_assignments;
CREATE POLICY "entity members full access" ON public.agent_skill_assignments FOR ALL TO public
  USING (entity_id = ANY(public.auth_user_entity_ids()))
  WITH CHECK (entity_id = ANY(public.auth_user_entity_ids()));

-- Composite indexes matching the hot query patterns in src/lib/actions.ts.
CREATE INDEX IF NOT EXISTS idx_agent_jobs_entity_status_created
  ON public.agent_jobs (entity_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_memory_entity_active
  ON public.agent_memory (entity_id, archived, valid_to)
  WHERE archived = false;

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_created
  ON public.agent_runs (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_entity_status_created
  ON public.agent_tasks (entity_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_calls_job_created
  ON public.tool_calls (job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_entity_created
  ON public.agent_jobs (entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entity_members_user
  ON public.entity_members (user_id, entity_id);
