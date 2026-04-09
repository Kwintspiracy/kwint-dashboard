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
  role: z.enum(['agent', 'orchestrator', 'system']).default('agent'),
  telegram_bot_token: z.string().nullable().optional(),
  telegram_bot_username: z.string().nullable().optional(),
  requires_approval: z.array(z.string()).nullable().optional(),
  task_context_template: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
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
  auth_type: z.enum(['api_key', 'oauth2', 'bearer', 'basic', 'none']).default('api_key'),
  oauth_client_id: z.string().nullable().optional(),
  oauth_client_secret: z.string().nullable().optional(),
  oauth_refresh_token: z.string().nullable().optional(),
  oauth_access_token: z.string().nullable().optional(),
  oauth_token_expires_at: z.string().nullable().optional(),
  oauth_token_url: z.string().nullable().optional(),
  oauth_scopes: z.string().nullable().optional(),
})

export const UpdateConnectorSchema = CreateConnectorSchema.partial().extend({
  active: z.boolean().optional(),
})

export type CreateConnectorInput = z.infer<typeof CreateConnectorSchema>
export type UpdateConnectorInput = z.infer<typeof UpdateConnectorSchema>

// ─── Skill ───────────────────────────────────────────────────────────────────

const RequiredConfigItemSchema = z.object({
  label: z.string(),
  description: z.string(),
  type: z.enum(['connector_slug', 'manual']),
  value: z.string().optional(),
  critical: z.boolean().default(true),
})

const OperationItemSchema = z.object({
  name: z.string(),
  slug: z.string(),
  risk: z.enum(['read', 'write', 'destructive']),
  requires_approval: z.boolean().default(false),
})

export const CreateSkillSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  slug: SlugSchema,
  content: z.string().min(1, 'Content is required'),
  description: z.string().max(300).nullable().optional(),
  default_content: z.string().nullable().optional(),
  content_overridden: z.boolean().optional(),
  required_config: z.array(RequiredConfigItemSchema).nullable().optional(),
  operations: z.array(OperationItemSchema).nullable().optional(),
  connector_ids: z.array(UuidSchema).optional(),
})

export const UpdateSkillSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: SlugSchema.optional(),
  content: z.string().min(1).optional(),
  description: z.string().max(300).nullable().optional(),
  default_content: z.string().nullable().optional(),
  content_overridden: z.boolean().optional(),
  required_config: z.array(RequiredConfigItemSchema).nullable().optional(),
  operations: z.array(OperationItemSchema).nullable().optional(),
  active: z.boolean().optional(),
  connector_ids: z.array(UuidSchema).optional(),
})

export type CreateSkillInput = z.infer<typeof CreateSkillSchema>
export type UpdateSkillInput = z.infer<typeof UpdateSkillSchema>

export const SetSkillApprovalsSchema = z.object({
  agent_id: UuidSchema,
  skill_id: UuidSchema,
  approval_overrides: z.record(z.string(), z.boolean()),
})
export type SetSkillApprovalsInput = z.infer<typeof SetSkillApprovalsSchema>

// ─── Memory ──────────────────────────────────────────────────────────────────

export const CreateMemorySchema = z.object({
  fact: z.string().min(1, 'Fact is required'),
  category: z.string().min(1, 'Category is required').max(60),
  importance: z.number().int().min(1).max(10),
  agent_id: z.string().uuid().nullable().optional(),
})

export const UpdateMemorySchema = CreateMemorySchema.partial()

export const ArchiveStaleMemoriesSchema = z.object({
  days_threshold: z.number().int().min(1).max(365).optional().default(90),
  min_importance: z.number().int().min(1).max(5).optional().default(2),
})

export const UnarchiveMemorySchema = z.object({
  id: z.string().uuid(),
})

export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>
export type UpdateMemoryInput = z.infer<typeof UpdateMemorySchema>
export type ArchiveStaleMemoriesInput = z.infer<typeof ArchiveStaleMemoriesSchema>
export type UnarchiveMemoryInput = z.infer<typeof UnarchiveMemorySchema>

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

export const SessionsPageSchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(200).default(30),
  status: z.string().nullable().optional(),
  channel: z.string().nullable().optional(),
  agent_id: z.string().nullable().optional(),
})

export type SessionsPageInput = z.infer<typeof SessionsPageSchema>

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

// ─── Plugin ──────────────────────────────────────────────────────────────────

export const CreatePluginSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  slug: SlugSchema,
  description: z.string().max(500).optional(),
  plugin_type: z.enum(['webhook', 'transform', 'schedule']),
  hook: z.enum(['pre_task', 'post_task', 'pre_tool', 'post_tool', 'on_memory_save']),
  webhook_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  config: z.record(z.string(), z.unknown()).optional(),
})

export const UpdatePluginSchema = CreatePluginSchema.partial().extend({
  active: z.boolean().optional(),
})

export type CreatePluginInput = z.infer<typeof CreatePluginSchema>
export type UpdatePluginInput = z.infer<typeof UpdatePluginSchema>

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

// ─── LLM Key ──────────────────────────────────────────────────────────────────

export const SaveLlmKeySchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  api_key: z.string().default(''),
  base_url: z.string().nullable().optional(),
  nickname: z.string().max(80).nullable().optional(),
})

export type SaveLlmKeyInput = z.infer<typeof SaveLlmKeySchema>

// ─── MCP Server ───────────────────────────────────────────────────────────────

export const CreateMcpServerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  slug: SlugSchema,
  transport: z.enum(['http', 'stdio']),
  url: z
    .string()
    .url('Must be a valid URL')
    .refine(
      (u) => u.startsWith('http://') || u.startsWith('https://'),
      'URL must start with http:// or https://',
    )
    .nullable()
    .optional(),
  command: z.string().max(500).nullable().optional(),
  active: z.boolean().default(true),
})

export const UpdateMcpServerSchema = CreateMcpServerSchema.partial()

export type CreateMcpServerInput = z.infer<typeof CreateMcpServerSchema>
export type UpdateMcpServerInput = z.infer<typeof UpdateMcpServerSchema>

// ─── Task Board ───────────────────────────────────────────────────────────────

export const CreateTaskSchema = z.object({
  orchestrator_id: UuidSchema,
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
})

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
  job_id: z.string().uuid().nullable().optional(),
  result: z.string().max(5000).nullable().optional(),
})

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>
