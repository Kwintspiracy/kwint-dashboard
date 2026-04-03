-- Add key_source column to track BYOK vs operator billing
alter table agent_runs
  add column if not exists key_source text
    check (key_source in ('entity', 'operator'));
