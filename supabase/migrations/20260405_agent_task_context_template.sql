-- Add task_context_template to agents so orchestrators can customize
-- the instructions injected with every task-board job
ALTER TABLE agents ADD COLUMN IF NOT EXISTS task_context_template text;
