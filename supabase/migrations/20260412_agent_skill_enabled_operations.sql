-- Per-agent subset of skill operations. NULL = all operations enabled (backwards compat).
-- Empty array = skill assigned but no operations available (edge case, treated as skill disabled).
-- Non-empty array = only the listed operation slugs are exposed to the agent's toolkit.
ALTER TABLE public.agent_skill_assignments
  ADD COLUMN IF NOT EXISTS enabled_operations text[] DEFAULT NULL;

COMMENT ON COLUMN public.agent_skill_assignments.enabled_operations IS
  'Subset of skill operations enabled for this agent. NULL = all enabled. Empty array = none.';
