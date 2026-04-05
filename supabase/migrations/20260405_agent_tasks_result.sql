-- Add result column to agent_tasks so the orchestrator can report back what it accomplished
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS result text;
