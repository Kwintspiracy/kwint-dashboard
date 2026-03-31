import { z } from 'zod'

// ─── Shared primitives ────────────────────────────────────────────────────────

export const UuidSchema = z.string().uuid()

export const SlugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(80)
  .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')

// ─── Agent ───────────────────────────────────────────────────────────────────

export const CreateAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  slug: SlugSchema,
  personality: z.string().min(1, 'Personality is required'),
  model: z.string().min(1, 'Model is required'),
  role: z.enum(['agent', 'orchestrator']).default('agent'),
  telegram_bot_token: z.string().nullable().optional(),
  telegram_bot_username: z.string().nullable().optional(),
  requires_approval: z.array(z.string()).nullable().optional(),
  capabilities: z.array(z.string()).optional(),
})

export const UpdateAgentSchema = CreateAgentSchema.partial().extend({
  active: z.boolean().optional(),
  is_default: z.boolean().optional(),
})

export type CreateAgentInput = z.infer<typeof CreateAgentSchema>
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>

// ─── Connector ───────────────────────────────────────────────────────────────

export const CreateConnectorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  slug: SlugSchema,
  base_url: z.string().url('Must be a valid URL').nullable().optional(),
  api_key: z.string().nullable().optional(),
})

export const UpdateConnectorSchema = CreateConnectorSchema.partial().extend({
  active: z.boolean().optional(),
})

export type CreateConnectorInput = z.infer<typeof CreateConnectorSchema>
export type UpdateConnectorInput = z.infer<typeof UpdateConnectorSchema>

// ─── Skill ───────────────────────────────────────────────────────────────────

export const CreateSkillSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  slug: SlugSchema,
  content: z.string().min(1, 'Content is required'),
  connector_ids: z.array(UuidSchema).optional(),
})

export const UpdateSkillSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: SlugSchema.optional(),
  content: z.string().min(1).optional(),
  active: z.boolean().optional(),
  connector_ids: z.array(UuidSchema).optional(),
})

export type CreateSkillInput = z.infer<typeof CreateSkillSchema>
export type UpdateSkillInput = z.infer<typeof UpdateSkillSchema>

// ─── Memory ──────────────────────────────────────────────────────────────────

export const CreateMemorySchema = z.object({
  fact: z.string().min(1, 'Fact is required'),
  category: z.string().min(1, 'Category is required').max(60),
  importance: z.number().int().min(1).max(10),
  agent_id: z.string().uuid().nullable().optional(),
})

export const UpdateMemorySchema = CreateMemorySchema.partial()

export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>
export type UpdateMemoryInput = z.infer<typeof UpdateMemorySchema>

// ─── Schedule / Automation ───────────────────────────────────────────────────

export const CreateScheduleSchema = z.object({
  agent_id: UuidSchema,
  type: z.enum(['cron', 'heartbeat']),
  name: z.string().min(1, 'Name is required').max(120),
  cron_expr: z.string().min(1, 'Cron expression is required'),
  task: z.string().nullable().optional(),
  objectives: z.string().nullable().optional(),
  chat_id: z.string().nullable().optional(),
})

export const UpdateScheduleSchema = CreateScheduleSchema.partial().extend({
  active: z.boolean().optional(),
})

export type CreateScheduleInput = z.infer<typeof CreateScheduleSchema>
export type UpdateScheduleInput = z.infer<typeof UpdateScheduleSchema>

// ─── Pagination ──────────────────────────────────────────────────────────────

export const JobsPageSchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  status: z.string().nullable().optional(),
  channel: z.string().nullable().optional(),
  agent_id: z.string().nullable().optional(),
})

export type JobsPageInput = z.infer<typeof JobsPageSchema>

export const ToolCallsPageSchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(200).default(100),
  tool_name: z.string().nullable().optional(),
})

export type ToolCallsPageInput = z.infer<typeof ToolCallsPageSchema>

// ─── Approval ────────────────────────────────────────────────────────────────

export const ResolveApprovalSchema = z.object({
  id: UuidSchema,
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
})

export type ResolveApprovalInput = z.infer<typeof ResolveApprovalSchema>

// ─── Budget ──────────────────────────────────────────────────────────────────

export const UpsertBudgetSchema = z.object({
  agent_id: z.string().uuid('Invalid agent ID'),
  daily_token_limit: z.number().int().min(0).default(0),
  monthly_token_limit: z.number().int().min(0).default(0),
  alert_threshold_pct: z.number().int().min(0).max(100).default(80),
  auto_pause: z.boolean().default(false),
})

export type UpsertBudgetInput = z.infer<typeof UpsertBudgetSchema>

// ─── Approval Rule ───────────────────────────────────────────────────────────

export const CreateApprovalRuleSchema = z.object({
  agent_id: z.string().uuid().nullable().optional(),
  tool_name: z.string().min(1, 'Tool name is required'),
  action: z.enum(['auto_approve', 'require_approval', 'block']),
})

export type CreateApprovalRuleInput = z.infer<typeof CreateApprovalRuleSchema>

// ─── Webhook Trigger ──────────────────────────────────────────────────────────

export const CreateTriggerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  slug: SlugSchema,
  agent_id: z.string().uuid('Invalid agent'),
  task_template: z.string().min(1, 'Task template is required'),
})

export const UpdateTriggerSchema = CreateTriggerSchema.partial().extend({
  active: z.boolean().optional(),
})

export type CreateTriggerInput = z.infer<typeof CreateTriggerSchema>
export type UpdateTriggerInput = z.infer<typeof UpdateTriggerSchema>

// ─── Entity ──────────────────────────────────────────────────────────────────

export const CreateEntitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  slug: SlugSchema,
  description: z.string().max(500).optional(),
  icon: z.string().max(4).default('🏢'),
  industry: z.enum(['agency', 'startup', 'personal', 'studio', 'enterprise', 'other']).optional(),
  goal: z.string().max(1000).optional(),
})
export const UpdateEntitySchema = CreateEntitySchema.partial()
export type CreateEntityInput = z.infer<typeof CreateEntitySchema>
