-- Wave 1.3 (audit 2026-04-23) — atomic parallel-delegation progress update.
--
-- Before: inject_delegation_result() in agent/jobs.py loaded the parent row,
-- mutated pending_delegation.delegations[i].done in Python memory, then wrote
-- the whole JSON back. Two sub-jobs completing concurrently produced a
-- last-writer-wins race: one worker persisted [done=T, done=F], the other
-- persisted [done=F, done=T], and the parent stayed pinned on a partial state
-- until cron's 10-min timeout killed it.
--
-- This RPC does the update inside a single transaction with SELECT ... FOR
-- UPDATE, serialising concurrent completions. Returns the updated
-- pending_delegation so the caller can decide whether to ship the final
-- combined result or keep waiting.

CREATE OR REPLACE FUNCTION public.mark_delegation_done(
  p_parent_job_id uuid,
  p_sub_job_id uuid,
  p_result_text text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pending jsonb;
  v_delegations jsonb;
  v_updated jsonb;
  v_elem jsonb;
  v_idx int;
  v_found boolean := false;
BEGIN
  -- Row-lock the parent to serialise concurrent sub-job completions.
  SELECT pending_delegation INTO v_pending
  FROM agent_jobs
  WHERE id = p_parent_job_id
  FOR UPDATE;

  IF v_pending IS NULL THEN
    RETURN NULL;
  END IF;

  v_delegations := v_pending->'delegations';
  IF v_delegations IS NULL OR jsonb_typeof(v_delegations) <> 'array' THEN
    -- Not a parallel delegation — caller should use the non-parallel path.
    RETURN v_pending;
  END IF;

  v_updated := '[]'::jsonb;
  FOR v_idx IN 0..jsonb_array_length(v_delegations)-1 LOOP
    v_elem := v_delegations->v_idx;
    IF (v_elem->>'job_id')::uuid = p_sub_job_id THEN
      v_elem := v_elem
        || jsonb_build_object('result', to_jsonb(p_result_text))
        || jsonb_build_object('done', true);
      v_found := true;
    END IF;
    v_updated := v_updated || jsonb_build_array(v_elem);
  END LOOP;

  IF NOT v_found THEN
    -- Sub-job id not in the delegations list — probably a double-inject or
    -- a stale event. Do nothing but return current state so caller can log.
    RETURN v_pending;
  END IF;

  v_pending := jsonb_set(v_pending, '{delegations}', v_updated);

  UPDATE agent_jobs
  SET pending_delegation = v_pending,
      updated_at = now()
  WHERE id = p_parent_job_id;

  RETURN v_pending;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_delegation_done(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_delegation_done(uuid, uuid, text) TO service_role;

COMMENT ON FUNCTION public.mark_delegation_done(uuid, uuid, text) IS
  'Atomically marks one sub-delegation as done with its result text and returns '
  'the updated pending_delegation JSON. Uses SELECT ... FOR UPDATE so concurrent '
  'sub-job completions are serialised — fixes the last-writer-wins race where '
  'a parent could stay pinned on a partial-done state until cron''s timeout '
  'killed it. Introduced by audit 2026-04-23 Wave 1.3.';
