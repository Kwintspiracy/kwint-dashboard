-- Atomic claim for agent_schedules — prevents multi-machine double-fire.
--
-- Bug 2026-04-21 (observed on schedule 24e69e71 "Displacer in the Cortex"):
-- the runner on Fly runs with 2 machines; both tick cron.py concurrently.
-- Both SELECTed the schedule as due (next_run <= now), both created a job
-- before anyone got around to updating last_run. Result: 2x cron-channel
-- jobs for a single schedule fire → 2x LLM tokens burned per tick.
--
-- Fix: a single atomic UPDATE with a due-check in the WHERE clause. The
-- first caller flips next_run forward; concurrent callers see the updated
-- next_run and get 0 rows affected → skip.
--
-- Same pattern as claim_job (for agent_jobs). Keep them symmetric.

CREATE OR REPLACE FUNCTION public.claim_schedule(
  p_schedule_id uuid,
  p_now timestamptz,
  p_next_run timestamptz
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE agent_schedules
  SET last_run = p_now,
      next_run = p_next_run,
      updated_at = p_now
  WHERE id = p_schedule_id
    AND active = true
    AND (next_run IS NULL OR next_run <= p_now);
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

ALTER FUNCTION public.claim_schedule(uuid, timestamptz, timestamptz) OWNER TO postgres;

-- Allow the service role to call it (cron ticker uses service role).
GRANT EXECUTE ON FUNCTION public.claim_schedule(uuid, timestamptz, timestamptz) TO service_role, authenticated;
