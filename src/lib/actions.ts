'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import {
  CreateAgentSchema,
  UpdateAgentSchema,
  CreateConnectorSchema,
  UpdateConnectorSchema,
  CreateSkillSchema,
  UpdateSkillSchema,
  CreateMemorySchema,
  UpdateMemorySchema,
  ArchiveStaleMemoriesSchema,
  ImportFileAsMemorySchema,
  CreateScheduleSchema,
  UpdateScheduleSchema,
  ResolveApprovalSchema,
  UpsertBudgetSchema,
  CreateApprovalRuleSchema,
  CreateTriggerSchema,
  UpdateTriggerSchema,
  CreateEntitySchema,
  UpdateEntitySchema,
  CreateMcpServerSchema,
  UpdateMcpServerSchema,
  CreatePluginSchema,
  UpdatePluginSchema,
  SaveLlmKeySchema,
  JobsPageSchema,
  SessionsPageSchema,
  ToolCallsPageSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  SetSkillApprovalsSchema,
  UpdateUserProfileSchema,
  type JobsPageInput,
  type SessionsPageInput,
  type ToolCallsPageInput,
} from '@/lib/schemas'
import { SKILL_CAPABILITIES } from '@/lib/skill-templates'

async function getActiveEntityId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('kwint_active_entity')?.value ?? null
}

// ─── ActionResult ─────────────────────────────────────────────────────────────

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string }

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data }
}

function fail(error: string): ActionResult<never> {
  return { ok: false, error }
}

function dbError(e: unknown): ActionResult<never> {
  console.error('[actions]', e)
  return fail('An unexpected error occurred. Please try again.')
}

function dbFail(e: { message: string }): ActionResult<never> {
  console.error('[actions]', e.message)
  return fail('Operation failed. Please try again.')
}

// ─── Auth Guard ──────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { supabase, user }
}

async function requireAuthWithEntity() {
  const { supabase, user } = await requireAuth()

  // Always load entities for the current user — never trust the cookie alone
  const { data: entities } = await supabase
    .from('entities')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at')
  if (!entities || entities.length === 0) throw new Error('No workspace found')

  const validIds = new Set(entities.map(e => e.id))
  const cookieEntityId = await getActiveEntityId()

  // Use cookie value only if it belongs to this user, otherwise fall back to first entity
  const entityId = cookieEntityId && validIds.has(cookieEntityId)
    ? cookieEntityId
    : entities[0].id

  // Fix stale / cross-user cookie immediately
  if (entityId !== cookieEntityId) {
    try {
      const cookieStore = await cookies()
      cookieStore.set('kwint_active_entity', entityId, { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: 'lax', secure: true })
    } catch {}
  }

  return { supabase, entityId }
}

// ─── Session Cleanup ─────────────────────────────────────────────────────────

export async function clearSessionCookiesAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('kwint_active_entity')
  cookieStore.delete('kwint_has_entities')
}

// ─── Entity Actions ──────────────────────────────────────────────────────────

export async function getEntitiesAction() {
  const { supabase, user } = await requireAuth()
  const { data, error } = await supabase
    .from('entities')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at')
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load workspaces') }
  return data || []
}

export async function createEntityAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return fail('Please sign in again')

    const parsed = CreateEntitySchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0].message)

    const { data: entity, error } = await supabase
      .from('entities')
      .insert({ ...parsed.data, user_id: user.id })
      .select('id')
      .single()
    if (error) {
      console.error('[createEntity]', error.message, error.code, error.details)
      return fail(error.code === '23505' ? 'A workspace with this slug already exists' : 'Failed to create workspace')
    }

    // Add owner to entity_members
    const { error: memberError } = await supabase.from('entity_members').insert({
      entity_id: entity.id,
      user_id: user.id,
      role: 'owner',
    })
    if (memberError) console.error('[createEntity] member insert:', memberError.message)

    return ok({ id: entity.id })
  } catch (e) {
    console.error('[createEntity] unexpected:', e)
    return fail('Failed to create workspace. Please try again.')
  }
}

export async function updateEntityAction(id: string, raw: unknown): Promise<ActionResult> {
  const { supabase, user } = await requireAuth()
  const parsed = UpdateEntitySchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  // Verify ownership
  const { data: entity } = await supabase.from('entities').select('user_id').eq('id', id).single()
  if (!entity || entity.user_id !== user.id) return fail('Not authorized')

  try {
    const { error } = await supabase
      .from('entities')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) { return dbError(e) }
}

export async function deleteEntityAction(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireAuth()
  const { data: entity } = await supabase.from('entities').select('user_id').eq('id', id).single()
  if (!entity || entity.user_id !== user.id) return fail('Not authorized')

  // Don't allow deleting the last entity
  const { count } = await supabase.from('entities').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
  if ((count ?? 0) <= 1) return fail('Cannot delete your only workspace')

  try {
    const { error } = await supabase.from('entities').delete().eq('id', id)
    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) { return dbError(e) }
}

export async function switchEntityAction(entityId: string): Promise<ActionResult> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('Please sign in again')

    const { data: entity } = await supabase.from('entities').select('id').eq('id', entityId).eq('user_id', user.id).single()
    if (!entity) return fail('Workspace not found')

    const cookieStore = await cookies()
    cookieStore.set('kwint_active_entity', entityId, { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: 'lax', secure: true })
    cookieStore.set('kwint_has_entities', user.id, { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: true, secure: true })
    return ok(undefined)
  } catch (e) {
    console.error('[switchEntity]', e)
    return fail('Failed to switch workspace')
  }
}

export async function migrateExistingDataAction(entityId: string): Promise<ActionResult<{ count: number }>> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('Please sign in again')

    const { data: entity } = await supabase.from('entities').select('id').eq('id', entityId).eq('user_id', user.id).single()
    if (!entity) return fail('Workspace not found')

    const tables = ['agents', 'agent_jobs', 'agent_runs', 'agent_memory', 'agent_skills', 'connectors', 'agent_schedules', 'approval_requests', 'approval_rules', 'agent_budgets', 'tool_calls', 'webhook_triggers', 'skill_versions', 'skill_connectors']
    let totalCount = 0
    for (const table of tables) {
      const { data } = await supabase.from(table).update({ entity_id: entityId }).is('entity_id', null).select('id')
      totalCount += (data?.length ?? 0)
    }
    return ok({ count: totalCount })
  } catch (e) {
    console.error('[migrateData]', e)
    return fail('Failed to migrate data')
  }
}

// ─── Batched Stats (single request instead of 10) ────────────────────────────

const EMPTY_STATS = {
  jobCounts: { completed: 0, failed: 0, pending: 0, processing: 0, total: 0 },
  totalTokens: 0,
  jobsPerDay: [] as { date: string; completed: number; failed: number; pending: number }[],
  toolUsage: [] as { name: string; count: number }[],
  avgDuration: 0,
  successRate: 100,
  channels: [] as { name: string; value: number }[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentJobs: [] as any[],
  agentMap: {} as Record<string, string>,
  allAgents: [] as { id: string; name: string }[],
  costByAgent: [] as { name: string; input_tokens: number; output_tokens: number; total_tokens: number; runs: number }[],
}

export async function getAllStatsAction() {
  const authResult = await requireAuthWithEntity().catch(() => null)
  if (!authResult) return EMPTY_STATS
  const { supabase, entityId } = authResult

  const [counts, tokens, tools, dur, rate, chans, agents, costData] = await Promise.all([
    supabase.rpc('get_job_counts', { p_entity_id: entityId }),
    supabase.rpc('get_total_tokens', { p_entity_id: entityId }),
    supabase.rpc('get_tool_usage', { p_entity_id: entityId }),
    supabase.rpc('get_average_duration', { p_entity_id: entityId }),
    supabase.rpc('get_success_rate', { p_entity_id: entityId }),
    supabase.rpc('get_channel_breakdown', { p_entity_id: entityId }),
    supabase.from('agents').select('*').eq('entity_id', entityId).order('is_default', { ascending: false }).order('name'),
    supabase.from('agent_runs').select('agent_id, input_tokens, output_tokens, agents(name)').eq('entity_id', entityId),
  ])

  // Jobs per day (last 30 days)
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const { data: jpdData } = await supabase
    .from('agent_jobs').select('created_at, status')
    .eq('entity_id', entityId)
    .gte('created_at', since.toISOString())
    .order('created_at')

  const buckets: Record<string, { date: string; completed: number; failed: number; pending: number }> = {}
  for (const row of jpdData || []) {
    const date = new Date(row.created_at).toISOString().split('T')[0]
    if (!buckets[date]) buckets[date] = { date, completed: 0, failed: 0, pending: 0 }
    if (row.status === 'completed') buckets[date].completed++
    else if (row.status === 'failed') buckets[date].failed++
    else buckets[date].pending++
  }

  // Recent jobs
  const { data: recentData } = await supabase
    .from('agent_jobs')
    .select('id, status, channel, task, chat_id, tools_used, turn, result, error, chain_count, agent_id, created_at, completed_at')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(8)

  // Cost by agent
  const costs: Record<string, { name: string; input: number; output: number; runs: number }> = {}
  for (const row of costData.data || []) {
    const id = row.agent_id || 'unknown'
    const agentData = row.agents as unknown as { name: string } | { name: string }[] | null
    const name = Array.isArray(agentData) ? agentData[0]?.name || 'Unknown' : agentData?.name || 'Unknown'
    if (!costs[id]) costs[id] = { name, input: 0, output: 0, runs: 0 }
    costs[id].input += row.input_tokens || 0
    costs[id].output += row.output_tokens || 0
    costs[id].runs++
  }

  const agentList = agents.data || []
  const agentMap: Record<string, string> = {}
  for (const a of agentList) agentMap[a.id] = a.name

  return {
    jobCounts: (counts.data as { completed: number; failed: number; pending: number; processing: number; total: number }) ?? { completed: 0, failed: 0, pending: 0, processing: 0, total: 0 },
    totalTokens: ((tokens.data as { total: number })?.total ?? 0) as number,
    jobsPerDay: Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date)),
    toolUsage: (tools.data || []) as { name: string; count: number }[],
    avgDuration: (dur.data as number) ?? 0,
    successRate: (rate.data as number) ?? 100,
    channels: (chans.data || []) as { name: string; value: number }[],
    recentJobs: recentData || [],
    agentMap,
    allAgents: agentList.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })),
    costByAgent: Object.entries(costs).map(([, c]) => ({
      name: c.name, input_tokens: c.input, output_tokens: c.output,
      total_tokens: c.input + c.output, runs: c.runs,
    })).sort((a, b) => b.total_tokens - a.total_tokens),
  }
}

// ─── Stats Actions (return raw data, throw on error) ─────────────────────────
// These match the original queries.ts signatures so pages don't need changes

export async function getJobCountsAction() {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase.rpc('get_job_counts', { p_entity_id: entityId })
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }
  // RPC returns jsonb: { total, completed, failed, pending, processing }
  return data as { completed: number; failed: number; pending: number; processing: number; total: number }
}

export async function getTotalTokensAction() {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase.rpc('get_total_tokens', { p_entity_id: entityId })
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }
  // RPC returns jsonb: { total, input_total, output_total }
  // But the stats page expects just a number (total tokens)
  return (data as { total: number }).total ?? 0
}

export async function getJobsPerDayAction(days = 30) {
  const { supabase, entityId } = await requireAuthWithEntity()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('agent_jobs')
    .select('created_at, status')
    .eq('entity_id', entityId)
    .gte('created_at', since.toISOString())
    .order('created_at')
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }

  const buckets: Record<string, { date: string; completed: number; failed: number; pending: number }> = {}
  for (const row of data || []) {
    const date = new Date(row.created_at).toISOString().split('T')[0]
    if (!buckets[date]) buckets[date] = { date, completed: 0, failed: 0, pending: 0 }
    if (row.status === 'completed') buckets[date].completed++
    else if (row.status === 'failed') buckets[date].failed++
    else buckets[date].pending++
  }
  return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date))
}

export async function getToolUsageAction() {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase.rpc('get_tool_usage', { p_entity_id: entityId })
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }
  // RPC returns TABLE(name text, count bigint)
  return (data || []) as { name: string; count: number }[]
}

export async function getAverageDurationAction() {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase.rpc('get_average_duration', { p_entity_id: entityId })
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }
  return (data as number) ?? 0
}

export async function getSuccessRateAction() {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase.rpc('get_success_rate', { p_entity_id: entityId })
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }
  return (data as number) ?? 100
}

export async function getChannelBreakdownAction() {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase.rpc('get_channel_breakdown', { p_entity_id: entityId })
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }
  return (data || []) as { name: string; value: number }[]
}

export async function getCostByAgentAction() {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase.from('agent_runs').select('agent_id, input_tokens, output_tokens, agents(name)').eq('entity_id', entityId)
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }

  const costs: Record<string, { name: string; input: number; output: number; runs: number }> = {}
  for (const row of data || []) {
    const id = row.agent_id || 'unknown'
    const agentData = row.agents as unknown as { name: string } | { name: string }[] | null
    const name = Array.isArray(agentData) ? agentData[0]?.name || 'Unknown' : agentData?.name || 'Unknown'
    if (!costs[id]) costs[id] = { name, input: 0, output: 0, runs: 0 }
    costs[id].input += row.input_tokens || 0
    costs[id].output += row.output_tokens || 0
    costs[id].runs++
  }
  return Object.entries(costs).map(([, c]) => ({
    name: c.name,
    input_tokens: c.input,
    output_tokens: c.output,
    total_tokens: c.input + c.output,
    runs: c.runs,
  })).sort((a, b) => b.total_tokens - a.total_tokens)
}

// ─── Read Actions (return raw data, throw on error) ──────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAgentsAction(): Promise<any[]> {
  const { supabase, entityId } = await requireAuthWithEntity()
  // List view never needs `personality` (the 2-10KB system prompt text).
  // It's loaded on demand via getAgentEditDataAction(id) when the edit panel opens.
  const { data, error } = await supabase
    .from('agents')
    .select('id, name, slug, model, role, active, is_default, avatar_url, capabilities, requires_approval, task_context_template, system_agent, telegram_bot_token, telegram_bot_username, created_at, updated_at')
    .eq('entity_id', entityId)
    .order('is_default', { ascending: false })
    .order('name')
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }
  return data || []
}

export async function getJobsAction(input: JobsPageInput) {
  const parsed = JobsPageSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.message)
  const { cursor, limit, status, channel, agent_id } = parsed.data

  const { supabase, entityId } = await requireAuthWithEntity()
  let query = supabase
    .from('agent_jobs')
    .select('id, status, channel, task, original_task, chat_id, tools_used, turn, result, error, chain_count, agent_id, created_at, completed_at, total_duration_ms, input_tokens, output_tokens')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (cursor) query = query.lt('created_at', cursor)
  if (status) query = query.eq('status', status)
  if (channel) query = query.eq('channel', channel)
  if (agent_id) query = query.eq('agent_id', agent_id)

  const { data, error: err } = await query
  if (err) { console.error('[actions]', err.message); throw new Error('Failed to load data') }

  const rows = data || []
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null
  return { items, nextCursor, hasMore }
}

export async function getSessionsAction(input: SessionsPageInput) {
  const parsed = SessionsPageSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.message)
  const { cursor, limit, status, channel, agent_id } = parsed.data

  const { supabase, entityId } = await requireAuthWithEntity()
  let query = supabase
    .from('session_summary')
    .select('session_id, entity_id, task, original_task, channel, agent_id, chat_id, root_status, created_at, completed_at, result, error, child_count, total_input_tokens, total_output_tokens, total_duration_ms, session_status, child_agent_ids')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (cursor) query = query.lt('created_at', cursor)
  if (status) query = query.eq('session_status', status)
  if (channel) query = query.eq('channel', channel)
  if (agent_id) query = query.or(`agent_id.eq.${agent_id},child_agent_ids.cs.{${agent_id}}`)

  const { data, error: err } = await query
  if (err) { console.error('[actions] getSessionsAction', err.message); throw new Error('Failed to load sessions') }

  const rows = data || []
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null
  return { items, nextCursor, hasMore }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getConnectorsAction(): Promise<any[]> {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase.from('connectors_safe').select('*').eq('entity_id', entityId).order('name')
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }
  return data || []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSkillsAction(): Promise<any[]> {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase
    .from('agent_skills')
    .select('*, skill_connectors(connector_id, connectors(id, name, slug))')
    .eq('entity_id', entityId)
    .order('name')
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }
  return data || []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getMemoriesAction(category?: string, agentId?: string, includeArchived = false): Promise<any[]> {
  const { supabase, entityId } = await requireAuthWithEntity()
  // Exclude `embedding` (vector(1536)) — huge payload never used in the UI.
  let query = supabase
    .from('agent_memory')
    .select('id, entity_id, agent_id, category, fact, importance, source, skill_tags, memory_layer, valid_to, archived, access_count, last_accessed_at, created_at, updated_at')
    .eq('entity_id', entityId)
    .order('updated_at', { ascending: false })
    .limit(500)
  if (!includeArchived) query = query.eq('archived', false)
  if (category) query = query.eq('category', category)
  if (agentId) query = query.eq('agent_id', agentId)
  const { data, error } = await query
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }
  return data || []
}

export async function getMemoryCountAction() {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase.from('agent_memory').select('category').eq('entity_id', entityId)
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }

  const counts: Record<string, number> = { total: 0 }
  for (const row of data || []) {
    counts[row.category] = (counts[row.category] || 0) + 1
    counts.total++
  }
  return counts
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSchedulesAction(): Promise<any[]> {
  const { supabase, entityId } = await requireAuthWithEntity()
  const [schedRes, sysRes] = await Promise.all([
    supabase.from('agent_schedules').select('*, agents(name)').eq('entity_id', entityId).order('created_at', { ascending: false }),
    supabase.from('agents').select('id, name, slug, active').eq('entity_id', entityId).eq('system_agent', true),
  ])
  if (schedRes.error) { console.error('[actions]', schedRes.error.message); throw new Error('Failed to load data') }

  // Surface hardcoded system crons (memory guardian, etc.) alongside user schedules
  const systemCrons = (sysRes.data || []).map(a => ({
    id: `system-${a.slug}`,
    agent_id: a.id,
    type: 'system',
    name: `${a.name} (system)`,
    cron_expr: a.slug === 'memory-guardian' ? '0 3 * * * (daily)' : 'every cron tick',
    active: a.active,
    agents: { name: a.name },
    last_run: null,
    last_status: null,
  }))

  return [...(schedRes.data || []), ...systemCrons]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getApprovalsAction(status?: string): Promise<any[]> {
  const { supabase, entityId } = await requireAuthWithEntity()
  let query = supabase
    .from('approval_requests')
    .select('*, agents(name), agent_jobs(task, channel)')
    .eq('entity_id', entityId)
    .order('requested_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }
  return data || []
}

export async function getToolCallsAction(limit = 100) {
  const safeLimit = Math.min(Math.max(1, limit), 500)
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase
    .from('tool_calls')
    .select('*, agent_jobs(task, agent_id, channel)')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }
  return data || []
}

export async function getJobTraceAction(jobId: string): Promise<ActionResult<{ calls: unknown[], children: unknown[] }>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()

    // Verify job belongs to entity
    const { data: job, error: jobErr } = await supabase
      .from('agent_jobs')
      .select('id')
      .eq('id', jobId)
      .eq('entity_id', entityId)
      .single()
    if (jobErr || !job) return fail('Not found')

    const { data: toolCalls } = await supabase
      .from('tool_calls')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })

    const { data: childJobs } = await supabase
      .from('agent_jobs')
      .select('id, task, result, status, total_duration_ms, chain_count, agent_id, agents(name), created_at, completed_at, input_tokens, output_tokens')
      .eq('parent_job_id', jobId)
      .eq('entity_id', entityId)

    return ok({ calls: toolCalls ?? [], children: childJobs ?? [] })
  } catch (e) {
    return dbError(e)
  }
}

// ─── Agent Mutations ──────────────────────────────────────────────────────────

export async function createAgentAction(raw: unknown): Promise<ActionResult<unknown>> {
  const parsed = CreateAgentSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agents')
      .insert({ ...parsed.data, entity_id: entityId })
      .select()
      .single()

    if (error) return dbFail(error)
    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

export async function updateAgentAction(
  id: string,
  raw: unknown,
): Promise<ActionResult<unknown>> {
  const parsed = UpdateAgentSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agents')
      .update(parsed.data)
      .eq('id', id)
      .eq('entity_id', entityId)
      .select()
      .single()

    if (error) return dbFail(error)
    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

// ─── Effective Prompt Preview ─────────────────────────────────────────────────

type PromptSection = { source: string; label: string; content: string; tokens: number }

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export async function previewEffectivePromptAction(agentId: string): Promise<ActionResult<{
  sections: PromptSection[]
  totalTokens: number
  isTemplateMode: boolean
}>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()

    const { data: agent, error: agentErr } = await supabase
      .from('agents')
      .select('personality, role, task_context_template')
      .eq('id', agentId)
      .eq('entity_id', entityId)
      .single()
    if (agentErr || !agent) return fail('Agent not found')

    const KNOWN_PLACEHOLDERS = ['{{skills}}', '{{memories}}', '{{team}}', '{{date}}', '{{briefing}}', '{{channel}}']
    const isTemplateMode = KNOWN_PLACEHOLDERS.some(p => (agent.personality ?? '').includes(p))

    const sections: PromptSection[] = []

    // 1. Personality
    sections.push({
      source: 'personality',
      label: 'Personality',
      content: agent.personality ?? '',
      tokens: estimateTokens(agent.personality ?? ''),
    })

    if (!isTemplateMode) {
      // 2. Skills (auto-assembled)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: skillAssignments } = await supabase
        .from('agent_skill_assignments')
        .select('agent_skills(name, slug, content)')
        .eq('agent_id', agentId)
        .eq('entity_id', entityId)

      if (skillAssignments && skillAssignments.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const skillContent = (skillAssignments as any[])
          .map(sa => sa.agent_skills?.content)
          .filter(Boolean)
          .join('\n\n---\n\n')
        if (skillContent) {
          sections.push({
            source: 'skills',
            label: `Skills (${skillAssignments.length})`,
            content: skillContent,
            tokens: estimateTokens(skillContent),
          })
        }
      }

      // 3. Team (orchestrators only)
      if (agent.role === 'orchestrator') {
        const { data: teamAssignments } = await supabase
          .from('agent_assignments')
          .select('sub_agent_id, instructions, agents!agent_assignments_sub_agent_id_fkey(name, slug, capabilities)')
          .eq('orchestrator_id', agentId)
          .eq('entity_id', entityId)

        if (teamAssignments && teamAssignments.length > 0) {
          const lines = ["## Your team", "", "Use `delegate_task` with the agent's slug:", ""]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const ta of teamAssignments as any[]) {
            const a = ta.agents
            if (!a) continue
            const caps = (a.capabilities ?? []).slice(0, 3)
            lines.push(`- **${a.name}** — slug: \`${a.slug}\`${caps.length ? ` (${caps.join(', ')})` : ''}`)
            if (ta.instructions) lines.push(`  Instructions: ${ta.instructions}`)
          }
          const teamContent = lines.join('\n')
          sections.push({
            source: 'team',
            label: `Team (${teamAssignments.length} agents)`,
            content: teamContent,
            tokens: estimateTokens(teamContent),
          })
        }
      }
    }

    const totalTokens = sections.reduce((sum, s) => sum + s.tokens, 0)
    return ok({ sections, totalTokens, isTemplateMode })
  } catch (e) { return dbError(e) }
}

export async function deleteAgentAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()

    // Prevent deleting system agents
    const { data: agent } = await supabase.from('agents').select('system_agent').eq('id', id).eq('entity_id', entityId).single()
    if (agent?.system_agent) return fail('Cannot delete system agents')

    // Nullify FK references that use NO ACTION (keep data, just unlink)
    await Promise.all([
      supabase.from('agent_jobs').update({ agent_id: null }).eq('agent_id', id).eq('entity_id', entityId),
      supabase.from('agent_runs').update({ agent_id: null }).eq('agent_id', id),
      supabase.from('agent_tasks').update({ assigned_agent_id: null }).eq('assigned_agent_id', id),
      supabase.from('agent_tasks').update({ created_by_agent_id: null }).eq('created_by_agent_id', id),
      supabase.from('approval_requests').update({ agent_id: null }).eq('agent_id', id),
    ])

    // Delete child records (these have CASCADE or we delete explicitly)
    await Promise.all([
      supabase.from('agent_memory').delete().eq('agent_id', id),
    ])

    const { error } = await supabase.from('agents').delete().eq('id', id).eq('entity_id', entityId)
    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) {
    return dbError(e)
  }
}

export async function setDefaultAgentAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()

    const { error: clearError } = await supabase
      .from('agents')
      .update({ is_default: false })
      .eq('entity_id', entityId)
      .neq('id', id)

    if (clearError) return dbFail(clearError)

    const { error } = await supabase
      .from('agents')
      .update({ is_default: true })
      .eq('id', id)
      .eq('entity_id', entityId)

    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) {
    return dbError(e)
  }
}

// ─── Connector Mutations ──────────────────────────────────────────────────────

export async function createConnectorAction(
  raw: unknown,
): Promise<ActionResult<unknown>> {
  const parsed = CreateConnectorSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('connectors')
      .insert({ ...parsed.data, entity_id: entityId })
      .select()
      .single()

    if (error) return dbFail(error)
    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

export async function updateConnectorAction(
  id: string,
  raw: unknown,
): Promise<ActionResult<unknown>> {
  const parsed = UpdateConnectorSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('connectors')
      .update(parsed.data)
      .eq('id', id)
      .eq('entity_id', entityId)
      .select()
      .single()

    if (error) return dbFail(error)
    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

export async function deleteConnectorAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase.from('connectors').delete().eq('id', id).eq('entity_id', entityId)

    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) {
    return dbError(e)
  }
}

export async function toggleConnectorActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase
      .from('connectors')
      .update({ active })
      .eq('id', id)
      .eq('entity_id', entityId)

    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) {
    return dbError(e)
  }
}

// ─── Skill Mutations ──────────────────────────────────────────────────────────

export async function createSkillAction(
  raw: unknown,
): Promise<ActionResult<unknown>> {
  const parsed = CreateSkillSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { connector_ids, ...skillData } = parsed.data

    const { data, error } = await supabase
      .from('agent_skills')
      .insert({ ...skillData, entity_id: entityId })
      .select()
      .single()

    if (error) return dbFail(error)

    if (connector_ids && connector_ids.length > 0) {
      const junctions = connector_ids.map((connector_id) => ({
        skill_id: (data as { id: string }).id,
        connector_id,
        entity_id: entityId,
      }))

      const { error: junctionError } = await supabase
        .from('skill_connectors')
        .insert(junctions)

      if (junctionError) return dbFail(junctionError)
    }

    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

export async function updateSkillAction(
  id: string,
  raw: unknown,
): Promise<ActionResult<unknown>> {
  const parsed = UpdateSkillSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { connector_ids, ...skillData } = parsed.data

    // Save current version before updating
    const { data: current } = await supabase
      .from('agent_skills')
      .select('name, content')
      .eq('id', id)
      .eq('entity_id', entityId)
      .single()

    if (current) {
      const { data: lastVersion } = await supabase
        .from('skill_versions')
        .select('version')
        .eq('skill_id', id)
        .order('version', { ascending: false })
        .limit(1)

      const nextVersion = (lastVersion?.[0]?.version ?? 0) + 1

      await supabase.from('skill_versions').insert({
        skill_id: id,
        entity_id: entityId,
        version: nextVersion,
        content: current.content,
        name: current.name,
      })
    }

    // If content is changing and default_content exists, mark as overridden
    const updateData: typeof skillData & { content_overridden?: boolean } = { ...skillData }
    if (skillData.content !== undefined && current?.content !== undefined) {
      const { data: currentFull } = await supabase
        .from('agent_skills')
        .select('default_content')
        .eq('id', id)
        .eq('entity_id', entityId)
        .single()
      if (currentFull?.default_content) {
        updateData.content_overridden = skillData.content !== currentFull.default_content
      }
    }

    const { data, error } = await supabase
      .from('agent_skills')
      .update(updateData)
      .eq('id', id)
      .eq('entity_id', entityId)
      .select()
      .single()

    if (error) return dbFail(error)

    if (connector_ids !== undefined) {
      const replaceResult = await updateSkillConnectorsAction(id, connector_ids)
      if (!replaceResult.ok) return replaceResult
    }

    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

export async function resetSkillToDefaultAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()

    const { data: skill } = await supabase
      .from('agent_skills')
      .select('default_content, content')
      .eq('id', id)
      .eq('entity_id', entityId)
      .single()

    if (!skill) return fail('Skill not found')
    if (!skill.default_content) return fail('This skill has no default content to reset to')

    const { data, error } = await supabase
      .from('agent_skills')
      .update({ content: skill.default_content, content_overridden: false })
      .eq('id', id)
      .eq('entity_id', entityId)
      .select()
      .single()

    if (error) return dbFail(error)
    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

export async function deleteSkillAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase.from('agent_skills').delete().eq('id', id).eq('entity_id', entityId)

    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) {
    return dbError(e)
  }
}

export async function toggleSkillActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase
      .from('agent_skills')
      .update({ active })
      .eq('id', id)
      .eq('entity_id', entityId)

    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) {
    return dbError(e)
  }
}

export async function updateSkillConnectorsAction(
  skillId: string,
  connectorIds: string[],
): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()

    // Verify skill ownership before modifying connectors
    const { data: skill } = await supabase
      .from('agent_skills').select('id').eq('id', skillId).eq('entity_id', entityId).single()
    if (!skill) return fail('Skill not found')

    const { error: deleteError } = await supabase
      .from('skill_connectors')
      .delete()
      .eq('skill_id', skillId)

    if (deleteError) return dbFail(deleteError)

    if (connectorIds.length > 0) {
      const junctions = connectorIds.map((connector_id) => ({
        skill_id: skillId,
        connector_id,
        entity_id: entityId,
      }))

      const { error: insertError } = await supabase
        .from('skill_connectors')
        .insert(junctions)

      if (insertError) return dbFail(insertError)
    }

    return ok(undefined)
  } catch (e) {
    return dbError(e)
  }
}

// ─── Memory Mutations ─────────────────────────────────────────────────────────

export async function createMemoryAction(
  raw: unknown,
): Promise<ActionResult<unknown>> {
  const parsed = CreateMemorySchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agent_memory')
      .insert({ ...parsed.data, entity_id: entityId })
      .select()
      .single()

    if (error) return dbFail(error)
    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

// ─── File Import for Memories ────────────────────────────────────────────────

async function getConnectorToken(supabase: Awaited<ReturnType<typeof requireAuthWithEntity>>['supabase'], entityId: string, slug: string): Promise<string | null> {
  // Fetch all connector fields needed for auth
  const { data: rows } = await supabase
    .from('connectors')
    .select('id, auth_type, api_key, oauth_access_token, oauth_refresh_token, oauth_token_expires_at, oauth_token_url, oauth_client_id, oauth_client_secret')
    .eq('slug', slug)
    .eq('entity_id', entityId)

  if (!rows || rows.length === 0) return null

  // Prefer OAuth2 connector if multiple exist
  const row = rows.find(r => r.auth_type === 'oauth2') || rows[0]

  if (row.auth_type === 'oauth2') {
    let token = row.oauth_access_token
    const expiresAt = row.oauth_token_expires_at

    // Check if token is still valid (5 min buffer)
    let valid = false
    if (token && expiresAt) {
      try {
        const exp = new Date(expiresAt).getTime()
        valid = (exp - Date.now()) > 300_000
      } catch { /* treat as invalid */ }
    } else if (token && !expiresAt) {
      valid = true
    }

    if (valid) return token

    // Try refresh
    const refreshToken = row.oauth_refresh_token
    const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
    const tokenUrl = row.oauth_token_url || GOOGLE_TOKEN_URL
    const clientId = row.oauth_client_id || process.env.GOOGLE_CLIENT_ID
    const clientSecret = row.oauth_client_secret || process.env.GOOGLE_CLIENT_SECRET

    if (refreshToken && clientId && clientSecret) {
      try {
        const body = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        })
        const res = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        })
        if (res.ok) {
          const data = await res.json()
          const newToken = data.access_token
          if (newToken) {
            // Update DB with new token
            const update: Record<string, unknown> = { oauth_access_token: newToken, oauth_token_url: tokenUrl }
            if (data.expires_in) {
              update.oauth_token_expires_at = new Date(Date.now() + data.expires_in * 1000).toISOString()
            }
            if (data.refresh_token) update.oauth_refresh_token = data.refresh_token
            await supabase.from('connectors').update(update).eq('id', row.id)
            return newToken
          }
        }
      } catch { /* refresh failed */ }
    }

    return token || null // return expired token as last resort
  }

  // Non-OAuth: use api_key directly
  return row.api_key || null
}

export async function listFilesForImportAction(
  connectorSlug: string,
  query?: string,
): Promise<ActionResult<{ id: string; name: string; size?: number; modified?: string; mime?: string }[]>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()

    const token = await getConnectorToken(supabase, entityId, connectorSlug)
    if (!token) return fail('Connector not authenticated. Check your connector settings.')

    if (connectorSlug === 'google-drive') {
      const params = new URLSearchParams({
        pageSize: '30',
        fields: 'files(id,name,mimeType,modifiedTime,size)',
        orderBy: 'modifiedTime desc',
      })
      if (query) params.set('q', `name contains '${query.replace(/'/g, "\\'")}'`)

      const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return fail(`Drive API error: ${res.status}`)
      const data = await res.json()
      return ok((data.files || []).map((f: Record<string, string>) => ({
        id: f.id, name: f.name, size: f.size ? Math.round(Number(f.size) / 1024) : undefined,
        modified: f.modifiedTime?.slice(0, 10), mime: f.mimeType,
      })))
    }

    if (connectorSlug === 'notion') {
      const body: Record<string, unknown> = {
        page_size: 30,
        filter: { value: 'page', property: 'object' },
      }
      if (query) body.query = query

      const res = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) return fail(`Notion API error: ${res.status}`)
      const data = await res.json()
      return ok((data.results || []).map((p: Record<string, unknown>) => {
        const props = (p.properties || {}) as Record<string, Record<string, unknown>>
        let title = ''
        for (const prop of Object.values(props)) {
          if (prop.type === 'title') {
            const parts = (prop.title || []) as { plain_text?: string }[]
            title = parts.map(t => t.plain_text || '').join('')
            break
          }
        }
        return {
          id: p.id as string,
          name: title || '(untitled)',
          modified: ((p.last_edited_time || '') as string).slice(0, 10),
        }
      }))
    }

    return fail(`Import not supported for connector: ${connectorSlug}`)
  } catch (e) {
    return dbError(e)
  }
}

export async function importFileAsMemoryAction(
  raw: unknown,
): Promise<ActionResult<unknown>> {
  const parsed = ImportFileAsMemorySchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)

  const { connector_slug, file_id, file_name, agent_id, category, importance } = parsed.data

  try {
    const { supabase, entityId } = await requireAuthWithEntity()

    const token = await getConnectorToken(supabase, entityId, connector_slug)
    if (!token) return fail('Connector not authenticated.')

    let text = ''
    let name = file_name || file_id

    if (connector_slug === 'google-drive') {
      // Get file metadata
      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file_id}?fields=name,mimeType`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!metaRes.ok) return fail(`Failed to read file metadata: ${metaRes.status}`)
      const meta = await metaRes.json()
      name = meta.name || name
      const mime = meta.mimeType || ''

      if (mime === 'application/vnd.google-apps.document') {
        // Google Doc → export as text
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${file_id}/export?mimeType=text/plain`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!res.ok) return fail('Failed to export Google Doc')
        text = await res.text()
      } else {
        // Download raw and return as text (server-side, no python-docx available)
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${file_id}?alt=media`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!res.ok) return fail('Failed to download file')
        const buf = await res.arrayBuffer()
        // Try to decode as text
        text = new TextDecoder('utf-8', { fatal: false }).decode(buf)
        // If mostly garbage (binary), warn
        const controlChars = (text.match(/[\x00-\x08\x0e-\x1f]/g) || []).length
        if (controlChars > text.length * 0.1) {
          return fail(`'${name}' appears to be a binary file (${mime}). Convert to Google Docs format first, then re-import.`)
        }
      }
    } else if (connector_slug === 'notion') {
      // Get page title
      const pageRes = await fetch(`https://api.notion.com/v1/pages/${file_id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28' },
      })
      if (!pageRes.ok) return fail(`Failed to read Notion page: ${pageRes.status}`)
      const page = await pageRes.json()
      const props = page.properties || {}
      for (const prop of Object.values(props) as Record<string, unknown>[]) {
        if (prop.type === 'title') {
          name = ((prop.title || []) as { plain_text?: string }[]).map(t => t.plain_text || '').join('')
          break
        }
      }

      // Read blocks (page content)
      let cursor: string | undefined
      const blocks: string[] = []
      for (let i = 0; i < 3; i++) {
        const url = `https://api.notion.com/v1/blocks/${file_id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28' },
        })
        if (!res.ok) break
        const data = await res.json()
        for (const block of (data.results || [])) {
          const bt = block[block.type] || {}
          const rt = bt.rich_text || []
          const blockText = rt.map((r: { plain_text?: string }) => r.plain_text || '').join('')
          if (blockText) blocks.push(blockText)
        }
        if (!data.has_more) break
        cursor = data.next_cursor
      }
      text = blocks.join('\n\n')
    } else {
      return fail(`Import not supported for: ${connector_slug}`)
    }

    if (!text.trim()) return fail(`No text content found in '${name}'.`)

    // Truncate to 5000 chars (memory limit)
    const fact = text.length > 5000
      ? `[Imported from ${name}]\n\n${text.slice(0, 4900)}\n\n[...truncated...]`
      : `[Imported from ${name}]\n\n${text}`

    const { data, error } = await supabase
      .from('agent_memory')
      .insert({
        fact,
        category,
        importance,
        agent_id: agent_id || null,
        entity_id: entityId,
        source: 'manual',
      })
      .select()
      .single()

    if (error) return dbFail(error)
    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

export async function importLocalFileAction(
  base64Content: string,
  fileName: string,
  agentId: string | null,
  category: string,
  importance: number,
): Promise<ActionResult<unknown>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()

    const buffer = Buffer.from(base64Content, 'base64')
    const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'))
    let text = ''

    if (ext === '.pdf') {
      try {
        // pdf-parse v1 loads a test file on require() — bypass by importing the core directly
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse/lib/pdf-parse.js')
        const data = await pdfParse(buffer)
        text = data.text
      } catch (pdfErr) {
        console.error('[importLocalFile] PDF parse error:', pdfErr)
        return fail(`Failed to extract text from PDF: ${pdfErr instanceof Error ? pdfErr.message : String(pdfErr)}`)
      }
    } else if (['.txt', '.md', '.json', '.csv', '.xml', '.html', '.yml', '.yaml', '.toml', '.log'].includes(ext)) {
      text = buffer.toString('utf-8')
    } else {
      return fail(`Unsupported file type: ${ext}. Supported: .pdf, .txt, .md, .json, .csv`)
    }

    if (!text.trim()) return fail(`No text content found in '${fileName}'.`)

    // Clean text: remove null bytes and excessive whitespace
    const cleaned = text.replace(/\0/g, '').replace(/\n{3,}/g, '\n\n').trim()
    const truncated = cleaned.length > 4500 ? cleaned.slice(0, 4500) + '\n\n[...truncated...]' : cleaned
    const fact = `[${fileName}]\n\n${truncated}`

    console.log(`[importLocalFile] ${fileName}: ${text.length} chars extracted, ${fact.length} chars stored`)

    const { data, error } = await supabase
      .from('agent_memory')
      .insert({
        fact,
        category,
        importance,
        agent_id: agentId || null,
        entity_id: entityId,
        source: 'manual',
      })
      .select()
      .single()

    if (error) {
      console.error('[importLocalFile] DB insert error:', error.message, error.details, error.hint)
      return fail(`Database error: ${error.message}`)
    }
    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

export async function updateMemoryAction(
  id: string,
  raw: unknown,
): Promise<ActionResult<unknown>> {
  const parsed = UpdateMemorySchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agent_memory')
      .update(parsed.data)
      .eq('id', id)
      .eq('entity_id', entityId)
      .select()
      .single()

    if (error) return dbFail(error)
    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

export async function deleteMemoryAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase
      .from('agent_memory')
      .delete()
      .eq('id', id)
      .eq('entity_id', entityId)

    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) {
    return dbError(e)
  }
}

export async function unarchiveMemoryAction(id: string): Promise<ActionResult<unknown>> {
  if (!id || typeof id !== 'string') return fail('Invalid memory ID')
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agent_memory')
      .update({ archived: false })
      .eq('id', id)
      .eq('entity_id', entityId)
      .select()
      .single()

    if (error) return dbFail(error)
    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

export async function archiveStaleMemoriesAction(
  raw: unknown = {},
): Promise<ActionResult<{ archived: number }>> {
  const parsed = ArchiveStaleMemoriesSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)

  const { days_threshold, min_importance } = parsed.data

  try {
    const { supabase, entityId } = await requireAuthWithEntity()

    const cutoff = new Date(Date.now() - days_threshold * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('agent_memory')
      .update({ archived: true })
      .eq('entity_id', entityId)
      .eq('archived', false)
      .lt('last_accessed_at', cutoff)
      .lte('importance', min_importance)
      .select('id')

    if (error) return dbFail(error)
    return ok({ archived: (data || []).length })
  } catch (e) {
    return dbError(e)
  }
}

// ─── Schedule Mutations ───────────────────────────────────────────────────────

export async function createScheduleAction(
  raw: unknown,
): Promise<ActionResult<unknown>> {
  const parsed = CreateScheduleSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agent_schedules')
      .insert({ ...parsed.data, entity_id: entityId })
      .select()
      .single()

    if (error) return dbFail(error)
    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

export async function updateScheduleAction(
  id: string,
  raw: unknown,
): Promise<ActionResult<unknown>> {
  const parsed = UpdateScheduleSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agent_schedules')
      .update(parsed.data)
      .eq('id', id)
      .eq('entity_id', entityId)
      .select()
      .single()

    if (error) return dbFail(error)
    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

export async function deleteScheduleAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase
      .from('agent_schedules')
      .delete()
      .eq('id', id)
      .eq('entity_id', entityId)

    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) {
    return dbError(e)
  }
}

export async function runScheduleNowAction(id: string): Promise<ActionResult<{ job_id: string | null }>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()

    const { data: schedule, error } = await supabase
      .from('agent_schedules')
      .select('task, objectives, agent_id, agents(slug)')
      .eq('id', id)
      .eq('entity_id', entityId)
      .single()

    if (error || !schedule) return fail('Schedule not found')

    const task = schedule.task || schedule.objectives || 'Run scheduled task'
    const agentSlug = (schedule.agents as unknown as { slug: string } | null)?.slug

    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL
    const apiKey = process.env.API_SECRET_KEY || process.env.WORKER_SECRET

    const res = await fetch(`${agentUrl}/api/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ task, async: true, agent_slug: agentSlug, entity_id: entityId }),
    })

    if (!res.ok) return fail(`Agent API error: ${res.status}`)
    const result = await res.json().catch(() => ({}))
    return ok({ job_id: (result as { job_id?: string }).job_id ?? null })
  } catch (e) {
    return dbError(e)
  }
}

// ─── Job / Bulk Mutations ─────────────────────────────────────────────────────

export async function cancelPendingJobsAction(): Promise<ActionResult<{ count: number }>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agent_jobs')
      .update({ status: 'cancelled' })
      .eq('entity_id', entityId)
      .in('status', ['pending', 'processing', 'awaiting_delegation'])
      .select('id')

    if (error) return dbFail(error)
    return ok({ count: (data ?? []).length })
  } catch (e) {
    return dbError(e)
  }
}

export async function deleteFailedJobsAction(): Promise<ActionResult<{ count: number }>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    // Get failed job IDs first
    const { data: jobs, error: fetchError } = await supabase
      .from('agent_jobs')
      .select('id')
      .eq('entity_id', entityId)
      .eq('status', 'failed')

    if (fetchError) return dbFail(fetchError)
    if (!jobs || jobs.length === 0) return ok({ count: 0 })

    const ids = jobs.map(j => j.id)

    // Get child job IDs (parent_job_id references)
    const { data: childJobs } = await supabase
      .from('agent_jobs')
      .select('id')
      .in('parent_job_id', ids)
    const childIds = (childJobs ?? []).map((j: { id: string }) => j.id)
    const allIds = [...ids, ...childIds]

    // Delete all FK children for both parent and child jobs
    await supabase.from('tool_calls').delete().in('job_id', allIds)
    await supabase.from('approval_requests').delete().in('job_id', allIds)
    await supabase.from('agent_tasks').delete().in('job_id', allIds)

    // Delete child jobs first, then parent jobs
    if (childIds.length > 0) {
      await supabase.from('agent_jobs').delete().in('id', childIds)
    }

    // Now delete the failed jobs
    const { error } = await supabase
      .from('agent_jobs')
      .delete()
      .in('id', ids)

    if (error) return dbFail(error)
    return ok({ count: ids.length })
  } catch (e) {
    return dbError(e)
  }
}

export async function deleteJobAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase.from('agent_jobs').delete().eq('id', id).eq('entity_id', entityId)

    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) {
    return dbError(e)
  }
}

// ─── API-Proxied Actions ──────────────────────────────────────────────────────

export async function retryJobAction(task: string): Promise<ActionResult<unknown>> {
  try {
    if (task.length > 10000) return fail('Task too long')
    await requireAuth()
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL
    const apiKey = process.env.NEXT_PRIVATE_WORKER || process.env.WORKER_SECRET || process.env.API_SECRET_KEY

    if (!agentUrl) return fail('Agent API not configured')

    const res = await fetch(`${agentUrl}/api/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ task }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      console.error('[actions]', `Agent API ${res.status}:`, text)
      return fail('The agent service returned an error. Please try again.')
    }

    const json = await res.json().catch(() => null)
    return ok(json)
  } catch (e) {
    return dbError(e)
  }
}

export async function activateTelegramAction(
  slug: string,
): Promise<ActionResult<unknown>> {
  try {
    await requireAuth()
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL
    const apiKey = process.env.WORKER_SECRET || process.env.API_SECRET_KEY

    if (!agentUrl) return fail('NEXT_PUBLIC_AGENT_API_URL is not configured')
    if (!apiKey) return fail('WORKER_SECRET not configured on dashboard')

    const res = await fetch(`${agentUrl}/api/telegram_setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ agent_slug: slug, action: 'register' }),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => null)
      const msg = json?.error ?? res.statusText
      console.error('[actions]', `Agent API ${res.status}:`, msg)
      return fail(`Telegram setup failed (${res.status}): ${msg}`)
    }

    const json = await res.json().catch(() => null)
    return ok(json)
  } catch (e) {
    return dbError(e)
  }
}

export async function deactivateTelegramAction(
  slug: string,
): Promise<ActionResult<unknown>> {
  try {
    await requireAuth()
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL
    const apiKey = process.env.NEXT_PRIVATE_WORKER || process.env.WORKER_SECRET || process.env.API_SECRET_KEY

    if (!agentUrl) return fail('NEXT_PUBLIC_AGENT_API_URL is not configured')

    const res = await fetch(`${agentUrl}/api/telegram_setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ agent_slug: slug, action: 'deregister' }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      console.error('[actions]', `Agent API ${res.status}:`, text)
      return fail('The agent service returned an error. Please try again.')
    }

    const json = await res.json().catch(() => null)
    return ok(json)
  } catch (e) {
    return dbError(e)
  }
}

// ─── Budget Actions ──────────────────────────────────────────────────────────

export async function getBudgetsAction() {
  const authResult = await requireAuthWithEntity().catch(() => null)
  if (!authResult) return []
  const { supabase, entityId } = authResult
  const { data, error } = await supabase
    .from('agent_budgets')
    .select('*, agents(name, slug)')
    .eq('entity_id', entityId)
  if (error) { console.error('[actions]', error.message); return [] }
  return data || []
}

export async function upsertBudgetAction(raw: unknown): Promise<ActionResult<unknown>> {
  const parsed = UpsertBudgetSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agent_budgets')
      .upsert(
        { ...parsed.data, entity_id: entityId, updated_at: new Date().toISOString() },
        { onConflict: 'agent_id' },
      )
      .select()
      .single()

    if (error) return dbFail(error)
    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

export async function deleteBudgetAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase.from('agent_budgets').delete().eq('id', id).eq('entity_id', entityId)
    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) {
    return dbError(e)
  }
}

export async function getAgentUsageAction(agentId: string) {
  const authResult = await requireAuthWithEntity().catch(() => null)
  if (!authResult) return { daily: 0, monthly: 0 }
  const { supabase, entityId } = authResult
  const [daily, monthly] = await Promise.all([
    supabase.rpc('get_daily_token_usage', { p_agent_id: agentId, p_entity_id: entityId }),
    supabase.rpc('get_monthly_token_usage', { p_agent_id: agentId, p_entity_id: entityId }),
  ])
  return {
    daily: (daily.data as number) ?? 0,
    monthly: (monthly.data as number) ?? 0,
  }
}

// ─── Approval Rules ──────────────────────────────────────────────────────────

export async function getApprovalRulesAction() {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase
    .from('approval_rules')
    .select('*, agents(name)')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }
  return data || []
}

export async function createApprovalRuleAction(raw: unknown): Promise<ActionResult<unknown>> {
  const parsed = CreateApprovalRuleSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('approval_rules')
      .insert({ ...parsed.data, entity_id: entityId })
      .select()
      .single()
    if (error) return dbFail(error)
    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

export async function deleteApprovalRuleAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase.from('approval_rules').delete().eq('id', id).eq('entity_id', entityId)
    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) {
    return dbError(e)
  }
}

export async function resolveApprovalAction(
  raw: unknown,
): Promise<ActionResult<unknown>> {
  await requireAuth()
  const parsed = ResolveApprovalSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)

  try {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL
    const apiKey = process.env.NEXT_PRIVATE_WORKER || process.env.WORKER_SECRET || process.env.API_SECRET_KEY

    if (!agentUrl) return fail('NEXT_PUBLIC_AGENT_API_URL is not configured')

    const res = await fetch(`${agentUrl}/api/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(parsed.data),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      console.error('[actions]', `Agent API ${res.status}:`, text)
      return fail('The agent service returned an error. Please try again.')
    }

    const json = await res.json().catch(() => null)
    return ok(json)
  } catch (e) {
    return dbError(e)
  }
}

// ─── Skill Versions ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSkillVersionsAction(skillId: string): Promise<any[]> {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase
    .from('skill_versions')
    .select('*')
    .eq('skill_id', skillId)
    .eq('entity_id', entityId)
    .order('version', { ascending: false })
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }
  return data || []
}

export async function rollbackSkillAction(skillId: string, versionId: string): Promise<ActionResult> {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data: version, error: vErr } = await supabase
    .from('skill_versions')
    .select('content, name')
    .eq('id', versionId)
    .eq('skill_id', skillId)
    .eq('entity_id', entityId)
    .single()
  if (vErr || !version) return fail('Version not found')

  const { error } = await supabase
    .from('agent_skills')
    .update({ content: version.content, name: version.name, updated_at: new Date().toISOString() })
    .eq('id', skillId)
    .eq('entity_id', entityId)
  if (error) return dbFail(error)
  return ok(undefined)
}

// ─── Webhook Triggers ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTriggersAction(): Promise<any[]> {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase
    .from('webhook_triggers')
    .select('*, agents(name, slug)')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load data') }
  return data || []
}

export async function createTriggerAction(raw: unknown): Promise<ActionResult<unknown>> {
  const parsed = CreateTriggerSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('webhook_triggers')
      .insert({ ...parsed.data, entity_id: entityId })
      .select()
      .single()
    if (error) return dbFail(error)
    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

export async function updateTriggerAction(id: string, raw: unknown): Promise<ActionResult<unknown>> {
  const parsed = UpdateTriggerSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('webhook_triggers')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('entity_id', entityId)
      .select()
      .single()
    if (error) return dbFail(error)
    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

export async function deleteTriggerAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase.from('webhook_triggers').delete().eq('id', id).eq('entity_id', entityId)
    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) {
    return dbError(e)
  }
}

export async function toggleTriggerActiveAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase
      .from('webhook_triggers')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('entity_id', entityId)
    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) {
    return dbError(e)
  }
}

// ─── Semantic Memory Search ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function searchMemoriesSemanticAction(query: string, agentId?: string): Promise<any[]> {
  const { supabase, entityId } = await requireAuthWithEntity()

  // First, get the embedding for the query
  // We call the OpenAI embeddings API server-side
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    // Fall back to keyword search
    return getMemoriesAction(undefined, agentId)
  }

  try {
    const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        input: query.slice(0, 8000),
        model: 'text-embedding-3-small',
      }),
    })

    if (!embeddingRes.ok) {
      // Fall back to keyword search
      return getMemoriesAction(undefined, agentId)
    }

    const embeddingData = await embeddingRes.json()
    const embedding = embeddingData.data?.[0]?.embedding

    if (!embedding) {
      return getMemoriesAction(undefined, agentId)
    }

    // Call the match_memories RPC
    const { data, error } = await supabase.rpc('match_memories', {
      query_embedding: embedding,
      match_count: 20,
      similarity_threshold: 0.3,
      p_agent_id: agentId || null,
      p_entity_id: entityId,
    })

    if (error) {
      console.error('[actions]', error.message)
      // Fall back to keyword search
      return getMemoriesAction(undefined, agentId)
    }

    return data || []
  } catch {
    return getMemoriesAction(undefined, agentId)
  }
}

export async function backfillEmbeddingsAction(): Promise<ActionResult<{ count: number }>> {
  const { supabase, entityId } = await requireAuthWithEntity()

  // Get memories without embeddings
  const { data: memories, error } = await supabase
    .from('agent_memory')
    .select('id, fact')
    .eq('entity_id', entityId)
    .is('embedding', null)
    .limit(50)

  if (error) return dbFail(error)
  if (!memories || memories.length === 0) return ok({ count: 0 })

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return fail('OPENAI_API_KEY not configured')

  let count = 0
  for (const mem of memories) {
    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({ input: mem.fact.slice(0, 8000), model: 'text-embedding-3-small' }),
      })
      if (!res.ok) continue
      const data = await res.json()
      const embedding = data.data?.[0]?.embedding
      if (!embedding) continue

      await supabase
        .from('agent_memory')
        .update({ embedding })
        .eq('id', mem.id)

      count++
    } catch { continue }
  }

  return ok({ count })
}

// ─── MCP Server Actions ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getMcpServersAction(): Promise<any[]> {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase
    .from('mcp_servers')
    .select('*')
    .eq('entity_id', entityId)
    .order('name')
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load MCP servers') }
  return data || []
}

export async function createMcpServerAction(raw: unknown): Promise<ActionResult<unknown>> {
  const parsed = CreateMcpServerSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  // Validate transport-specific requirements
  if (parsed.data.transport === 'http' && !parsed.data.url) {
    return fail('URL is required for HTTP transport')
  }
  if (parsed.data.transport === 'stdio' && !parsed.data.command) {
    return fail('Command is required for stdio transport')
  }

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('mcp_servers')
      .insert({ ...parsed.data, entity_id: entityId })
      .select()
      .single()
    if (error) return error.code === '23505' ? fail('An MCP server with this slug already exists') : dbFail(error)
    return ok(data)
  } catch (e) { return dbError(e) }
}

export async function updateMcpServerAction(id: string, raw: unknown): Promise<ActionResult<unknown>> {
  const parsed = UpdateMcpServerSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('mcp_servers')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('entity_id', entityId)
      .select()
      .single()
    if (error) return dbFail(error)
    return ok(data)
  } catch (e) { return dbError(e) }
}

export async function deleteMcpServerAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase
      .from('mcp_servers')
      .delete()
      .eq('id', id)
      .eq('entity_id', entityId)
    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) { return dbError(e) }
}

export async function toggleMcpServerActiveAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase
      .from('mcp_servers')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('entity_id', entityId)
    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) { return dbError(e) }
}

export async function testMcpServerAction(id: string): Promise<ActionResult<{ tool_count: number; tools: string[] }>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()

    // Load the server record
    const { data: server, error } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('id', id)
      .eq('entity_id', entityId)
      .single()
    if (error || !server) return fail('MCP server not found')
    if (server.transport !== 'http') return fail('Connection test is only supported for HTTP transport')
    if (!server.url) return fail('Server has no URL configured')

    // Validate URL — block private IPs and metadata endpoints (SSRF prevention)
    const url: string = server.url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return fail('Server URL must start with http:// or https://')
    }
    try {
      const parsed = new URL(url)
      const hostname = parsed.hostname.toLowerCase()
      const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]',
        '169.254.169.254', 'metadata.google.internal']
      const blockedPrefixes = ['10.', '192.168.', '172.16.', '172.17.', '172.18.', '172.19.',
        '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.',
        '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '169.254.']
      if (blocked.includes(hostname) || blockedPrefixes.some(p => hostname.startsWith(p))) {
        return fail('Cannot connect to private or internal addresses')
      }
    } catch { return fail('Invalid server URL') }

    // Call tools/list via the dashboard (server-side fetch)
    const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: payload,
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return fail(`MCP server returned HTTP ${res.status}`)
    }

    const json = await res.json().catch(() => null)
    if (!json || json.error) {
      return fail(`MCP server returned an error: ${json?.error?.message ?? 'unknown'}`)
    }

    const tools: unknown[] = json?.result?.tools ?? []
    const toolNames = (tools as { name?: string }[])
      .filter((t) => typeof t?.name === 'string')
      .map((t) => t.name as string)

    return ok({ tool_count: toolNames.length, tools: toolNames })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return fail(`Connection failed: ${msg.slice(0, 200)}`)
  }
}

// ─── Plugin Actions ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPluginsAction(): Promise<any[]> {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase
    .from('agent_plugins')
    .select('*')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[actions]', error.message); throw new Error('Failed to load plugins') }
  return data || []
}

export async function createPluginAction(raw: unknown): Promise<ActionResult<unknown>> {
  const parsed = CreatePluginSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { webhook_url, ...rest } = parsed.data
    const { data, error } = await supabase
      .from('agent_plugins')
      .insert({
        ...rest,
        webhook_url: webhook_url || null,
        entity_id: entityId,
      })
      .select()
      .single()
    if (error) return error.code === '23505' ? fail('A plugin with this slug already exists') : dbFail(error)
    return ok(data)
  } catch (e) { return dbError(e) }
}

export async function updatePluginAction(id: string, raw: unknown): Promise<ActionResult<unknown>> {
  const parsed = UpdatePluginSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { webhook_url, ...rest } = parsed.data
    const { data, error } = await supabase
      .from('agent_plugins')
      .update({
        ...rest,
        ...(webhook_url !== undefined ? { webhook_url: webhook_url || null } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('entity_id', entityId)
      .select()
      .single()
    if (error) return dbFail(error)
    return ok(data)
  } catch (e) { return dbError(e) }
}

export async function deletePluginAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase
      .from('agent_plugins')
      .delete()
      .eq('id', id)
      .eq('entity_id', entityId)
    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) { return dbError(e) }
}

export async function togglePluginActiveAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase
      .from('agent_plugins')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('entity_id', entityId)
    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) { return dbError(e) }
}

// ─── Prompt Improvement ───────────────────────────────────────────────────────

export async function analyzeJobFailureAction(
  jobId: string,
): Promise<ActionResult<{ diagnosis: string; suggestion: string }>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()

    const { data: job, error: jobErr } = await supabase
      .from('agent_jobs')
      .select('task, error, result, agent_id')
      .eq('id', jobId)
      .eq('entity_id', entityId)
      .single()
    if (jobErr || !job) return fail('Job not found')
    if (!job.agent_id) return fail('Job has no associated agent')

    const { data: agent, error: agentErr } = await supabase
      .from('agents')
      .select('personality, name')
      .eq('id', job.agent_id)
      .eq('entity_id', entityId)
      .single()
    if (agentErr || !agent) return fail('Agent not found')

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return fail('ANTHROPIC_API_KEY is not configured')

    const prompt = `You are an AI prompt optimizer. An AI agent failed to complete a task.

System prompt:
<prompt>${agent.personality.slice(0, 2000)}</prompt>

Task:
<task>${job.task.slice(0, 500)}</task>

Failure:
<error>${(job.error || job.result || 'Unknown failure').slice(0, 500)}</error>

Respond with ONLY a valid JSON object, no markdown:
{"diagnosis":"one sentence explaining the root cause, max 20 words","suggestion":"specific text to append to the system prompt, 2-4 sentences, be concrete"}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) return fail('Analysis request failed')

    const data = await res.json()
    const text = data.content?.[0]?.text ?? ''

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    let parsed: { diagnosis: string; suggestion: string }
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return fail('Could not parse analysis response')
    }

    if (!parsed.diagnosis || !parsed.suggestion) return fail('Incomplete analysis response')
    return ok(parsed)
  } catch (e) {
    return dbError(e)
  }
}

export async function applyPromptSuggestionAction(
  agentId: string,
  appendText: string,
): Promise<ActionResult<unknown>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()

    const { data: agent, error: fetchErr } = await supabase
      .from('agents')
      .select('personality')
      .eq('id', agentId)
      .eq('entity_id', entityId)
      .single()
    if (fetchErr || !agent) return fail('Agent not found')

    const updatedPersonality = agent.personality.trimEnd() + '\n\n' + appendText.trim()

    const { error } = await supabase
      .from('agents')
      .update({ personality: updatedPersonality })
      .eq('id', agentId)
      .eq('entity_id', entityId)
    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) {
    return dbError(e)
  }
}

// ─── LLM Keys ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getLlmKeysAction(): Promise<any[]> {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase
    .from('entity_llm_keys')
    .select('id, provider, api_key, base_url, nickname, is_active, created_at, updated_at')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function saveLlmKeyAction(
  raw: unknown,
): Promise<ActionResult<unknown>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const parsed = SaveLlmKeySchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')
    const { provider, api_key, base_url, nickname } = parsed.data

    const { data, error } = await supabase
      .from('entity_llm_keys')
      .upsert(
        { entity_id: entityId, provider, api_key, base_url: base_url ?? null, nickname: nickname ?? null },
        { onConflict: 'entity_id,provider' },
      )
      .select()
      .single()
    if (error) return dbFail(error)
    return ok(data)
  } catch (e) {
    return dbError(e)
  }
}

export async function deleteLlmKeyAction(
  provider: string,
): Promise<ActionResult<void>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase
      .from('entity_llm_keys')
      .delete()
      .eq('entity_id', entityId)
      .eq('provider', provider)
    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) {
    return dbError(e)
  }
}

// ─── Operator Config ─────────────────────────────────────────────────────────

// Returns provider IDs that the SaaS operator has configured at the platform level.
// Operator sets OPERATOR_PROVIDERS=anthropic,openai (comma-separated) in env vars.
// These models are available to users without their own key, but billed by the operator.
export async function getOperatorProvidersAction(): Promise<string[]> {
  const raw = process.env.OPERATOR_PROVIDERS ?? ''
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

// ─── User Profile ────────────────────────────────────────────────────────────

export type UserProfile = {
  user_id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  timezone: string
  locale: string
}

export async function getUserProfileAction(): Promise<UserProfile> {
  const { supabase, user } = await requireAuth()
  const { data } = await supabase
    .from('user_profiles')
    .select('user_id, display_name, avatar_url, timezone, locale')
    .eq('user_id', user.id)
    .maybeSingle()
  return {
    user_id: user.id,
    email: user.email ?? '',
    display_name: data?.display_name ?? null,
    avatar_url: data?.avatar_url ?? null,
    timezone: data?.timezone ?? 'UTC',
    locale: data?.locale ?? 'en',
  }
}

export async function updateUserProfileAction(raw: unknown): Promise<ActionResult<UserProfile>> {
  try {
    const { supabase, user } = await requireAuth()
    const parsed = UpdateUserProfileSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: user.id, ...parsed.data }, { onConflict: 'user_id' })
    if (error) return dbFail(error)
    const profile = await getUserProfileAction()
    return ok(profile)
  } catch (e) {
    return dbError(e)
  }
}

// Returns whether the current user is on the operator allowlist.
// Operator sets OPERATOR_USER_IDS=uuid1,uuid2 in env vars. Only these users can
// fall back to the operator's env API key when their entity has no key configured.
// All other users must configure their own LLM key in Settings.
export async function isOperatorAction(): Promise<{ isOperator: boolean }> {
  const { user } = await requireAuth()
  const raw = process.env.OPERATOR_USER_IDS ?? ''
  const allowlist = raw.split(',').map(s => s.trim()).filter(Boolean)
  return { isOperator: allowlist.includes(user.id) }
}

// ─── Agent Skill Assignments ─────────────────────────────────────────────────

export async function getAgentEditDataAction(agentId: string): Promise<ActionResult<{
  personality: string | null
  skillIds: string[]
  customInstructions: Record<string, boolean>
  subAgents: { sub_agent_id: string; instructions: string | null }[]
  orchestratorId: string | null
}>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const [agentRes, skillsRes, assignmentsRes, orchParentRes] = await Promise.all([
      supabase.from('agents').select('personality').eq('id', agentId).eq('entity_id', entityId).limit(1).maybeSingle(),
      supabase.from('agent_skill_assignments').select('skill_id, use_custom_instructions').eq('agent_id', agentId).eq('entity_id', entityId),
      supabase.from('agent_assignments').select('sub_agent_id, instructions').eq('orchestrator_id', agentId).eq('entity_id', entityId),
      supabase.from('agent_assignments').select('orchestrator_id').eq('sub_agent_id', agentId).eq('entity_id', entityId).limit(1).maybeSingle(),
    ])
    const skillRows = skillsRes.data ?? []
    const customInstructions: Record<string, boolean> = {}
    for (const r of skillRows) { if (r.use_custom_instructions) customInstructions[r.skill_id] = true }
    return ok({
      personality: agentRes.data?.personality ?? null,
      skillIds: skillRows.map(r => r.skill_id),
      customInstructions,
      subAgents: assignmentsRes.data ?? [],
      orchestratorId: orchParentRes.data?.orchestrator_id ?? null,
    })
  } catch (e) { return dbError(e) }
}

export async function getAgentSkillAssignmentsAction(agentId: string): Promise<ActionResult<string[]>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agent_skill_assignments')
      .select('skill_id')
      .eq('agent_id', agentId)
      .eq('entity_id', entityId)
    if (error) return dbFail(error)
    return ok((data ?? []).map((r: { skill_id: string }) => r.skill_id))
  } catch (e) {
    return dbError(e)
  }
}

export async function getSkillCustomInstructionsAction(agentId: string): Promise<ActionResult<Record<string, boolean>>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agent_skill_assignments')
      .select('skill_id, use_custom_instructions')
      .eq('agent_id', agentId)
      .eq('entity_id', entityId)
    if (error) return dbFail(error)
    const result: Record<string, boolean> = {}
    for (const r of data ?? []) {
      if (r.use_custom_instructions) result[r.skill_id] = true
    }
    return ok(result)
  } catch (e) { return dbError(e) }
}

export async function setSkillCustomInstructionsAction(agentId: string, skillId: string, useCustomInstructions: boolean): Promise<ActionResult<null>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase
      .from('agent_skill_assignments')
      .update({ use_custom_instructions: useCustomInstructions })
      .eq('agent_id', agentId)
      .eq('skill_id', skillId)
      .eq('entity_id', entityId)
    if (error) return dbFail(error)
    return ok(null)
  } catch (e) { return dbError(e) }
}

export async function setSkillApprovalsAction(raw: unknown): Promise<ActionResult<null>> {
  const parsed = SetSkillApprovalsSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase
      .from('agent_skill_assignments')
      .update({ approval_overrides: parsed.data.approval_overrides })
      .eq('agent_id', parsed.data.agent_id)
      .eq('skill_id', parsed.data.skill_id)
      .eq('entity_id', entityId)
    if (error) return dbFail(error)
    await syncHttpApprovalRule(supabase, entityId, parsed.data.agent_id)
    return ok(null)
  } catch (e) {
    return dbError(e)
  }
}

// Keeps the approval_rules table in sync with per-operation skill overrides.
// If any assigned skill has an operation marked requires_approval, ensures an
// approval_rules row exists for http_request so the runner gate fires.
// Typed tool names exposed by skill adapters — kept in sync with agent/adapters/*.py (item 4.1)
const SKILL_ADAPTER_TOOLS: Record<string, string[]> = {
  'gmail':          ['gmail_send_email', 'gmail_list_emails'],
  'resend':         ['resend_send_email'],
  'google-sheets':  ['sheets_read_range', 'sheets_write_range', 'sheets_append_row'],
  'slack':          ['slack_send_message', 'slack_list_channels', 'slack_get_messages'],
  'outlook':        ['outlook_send_email', 'outlook_list_emails'],
  'google-drive':   ['drive_list_files', 'drive_read_file', 'drive_upload_file'],
  'google-docs':    ['docs_get', 'docs_replace_text', 'docs_append', 'docs_create'],
  'stripe':         ['stripe_list_customers', 'stripe_create_payment_link', 'stripe_get_balance'],
  'github':         ['github_list_issues', 'github_create_issue', 'github_list_pull_requests'],
  'notion':         ['notion_search', 'notion_get_page', 'notion_create_page'],
  'hubspot':        ['hubspot_list_contacts', 'hubspot_create_contact', 'hubspot_list_deals'],
  'linear':         ['linear_list_issues', 'linear_create_issue'],
}

async function syncHttpApprovalRule(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  entityId: string,
  agentId: string,
): Promise<void> {
  // Fetch all skill assignments with their slugs and approval_overrides
  const { data } = await supabase
    .from('agent_skill_assignments')
    .select('approval_overrides, agent_skills(slug)')
    .eq('agent_id', agentId)
    .eq('entity_id', entityId)

  const rows = (data ?? []) as Array<{ approval_overrides: Record<string, boolean> | null; agent_skills: { slug: string } | null }>
  const anyRequires = rows.some(row => Object.values(row.approval_overrides ?? {}).some(Boolean))

  // Collect adapter tool names for skills with approval enabled (item 4.1)
  const adapterToolsToGate = new Set<string>()
  for (const row of rows) {
    const hasApproval = Object.values(row.approval_overrides ?? {}).some(Boolean)
    if (hasApproval) {
      const slug = row.agent_skills?.slug
      if (slug && SKILL_ADAPTER_TOOLS[slug]) {
        SKILL_ADAPTER_TOOLS[slug].forEach(t => adapterToolsToGate.add(t))
      }
    }
  }

  // Delete old rules for http_request and all known adapter tools
  const toolsToDelete = ['http_request', ...Object.values(SKILL_ADAPTER_TOOLS).flat()]
  for (const toolName of toolsToDelete) {
    await supabase
      .from('approval_rules')
      .delete()
      .eq('agent_id', agentId)
      .eq('tool_name', toolName)
      .eq('entity_id', entityId)
  }

  if (!anyRequires) return

  // Insert approval rule for http_request (fallback for skills without adapters)
  await supabase.from('approval_rules').insert({
    agent_id: agentId,
    tool_name: 'http_request',
    action: 'require_approval',
    entity_id: entityId,
  })

  // Insert approval rules for each typed adapter tool (item 4.1)
  for (const toolName of adapterToolsToGate) {
    await supabase.from('approval_rules').insert({
      agent_id: agentId,
      tool_name: toolName,
      action: 'require_approval',
      entity_id: entityId,
    })
  }
}

export async function setAgentSkillAssignmentsAction(agentId: string, skillIds: string[]): Promise<ActionResult<null>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data: agent } = await supabase.from('agents').select('id').eq('id', agentId).eq('entity_id', entityId).single()
    if (!agent) return fail('Agent not found')
    // Preserve existing approval_overrides before deleting
    const { data: existing } = await supabase
      .from('agent_skill_assignments')
      .select('skill_id, approval_overrides')
      .eq('agent_id', agentId)
      .eq('entity_id', entityId)
    const overridesMap: Record<string, Record<string, boolean>> = {}
    for (const row of existing ?? []) {
      if (row.approval_overrides && Object.keys(row.approval_overrides).length > 0) {
        overridesMap[row.skill_id] = row.approval_overrides
      }
    }
    await supabase.from('agent_skill_assignments').delete().eq('agent_id', agentId).eq('entity_id', entityId)
    if (skillIds.length > 0) {
      const rows = skillIds.map(skill_id => ({
        agent_id: agentId, skill_id, entity_id: entityId,
        approval_overrides: overridesMap[skill_id] ?? {},
      }))
      const { error } = await supabase.from('agent_skill_assignments').insert(rows)
      if (error) return dbFail(error)
    }
    // Derive capabilities from skill slugs and persist — this is the single source of truth
    const capabilities: string[] = []
    if (skillIds.length > 0) {
      const { data: skillRows } = await supabase
        .from('agent_skills')
        .select('slug')
        .in('id', skillIds)
        .eq('entity_id', entityId)
      const slugs = (skillRows ?? []).map((r: { slug: string }) => r.slug)
      const caps = [...new Set(slugs.flatMap(slug => SKILL_CAPABILITIES[slug] ?? []))]
      capabilities.push(...caps)
    }
    await supabase.from('agents').update({ capabilities }).eq('id', agentId).eq('entity_id', entityId)
    await syncHttpApprovalRule(supabase, entityId, agentId)
    return ok(null)
  } catch (e) {
    return dbError(e)
  }
}

// Auto-assign skills to a newly-created agent based on connector slugs (used by templates)
export async function autoAssignTemplateSkillsAction(agentId: string, connectorSlugs: string[]): Promise<ActionResult<number>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    if (!connectorSlugs.length) return ok(0)

    // Find skills that have connectors with matching slugs in this entity
    const { data: linkRows, error } = await supabase
      .from('skill_connectors')
      .select('skill_id, connectors!inner(slug)')
      .eq('connectors.entity_id', entityId)
      .in('connectors.slug', connectorSlugs)

    if (error) return dbFail(error)
    const skillIds = [...new Set((linkRows ?? []).map((r: { skill_id: string }) => r.skill_id))]
    if (!skillIds.length) return ok(0)

    const result = await setAgentSkillAssignmentsAction(agentId, skillIds)
    if (!result.ok) return result as ActionResult<number>
    return ok(skillIds.length)
  } catch (e) { return dbError(e) }
}

// ─── Agent Assignments (orchestrator → sub-agents) ───────────────────────────

export async function getOrchestratorAssignmentsAction(orchestratorId: string): Promise<ActionResult<string[]>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agent_assignments')
      .select('sub_agent_id')
      .eq('orchestrator_id', orchestratorId)
      .eq('entity_id', entityId)
    if (error) return dbFail(error)
    return ok((data ?? []).map((r: { sub_agent_id: string }) => r.sub_agent_id))
  } catch (e) { return dbError(e) }
}

export async function getOrchestratorAssignmentDetailsAction(orchestratorId: string): Promise<ActionResult<{ sub_agent_id: string; instructions: string | null }[]>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agent_assignments')
      .select('sub_agent_id, instructions')
      .eq('orchestrator_id', orchestratorId)
      .eq('entity_id', entityId)
    if (error) return dbFail(error)
    return ok(data ?? [])
  } catch (e) { return dbError(e) }
}

export async function getAgentOrchestratorAction(agentId: string): Promise<ActionResult<string | null>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agent_assignments')
      .select('orchestrator_id')
      .eq('sub_agent_id', agentId)
      .eq('entity_id', entityId)
      .limit(1)
      .maybeSingle()
    if (error) return dbFail(error)
    return ok(data?.orchestrator_id ?? null)
  } catch (e) { return dbError(e) }
}

export async function setAgentOrchestratorAction(agentId: string, orchestratorId: string | null): Promise<ActionResult<null>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    // Remove existing orchestrator assignments for this agent
    await supabase.from('agent_assignments').delete().eq('sub_agent_id', agentId).eq('entity_id', entityId)
    if (orchestratorId) {
      const { error } = await supabase.from('agent_assignments').insert({
        orchestrator_id: orchestratorId, sub_agent_id: agentId, entity_id: entityId,
      })
      if (error) return dbFail(error)
      // Keep role in sync: mark orchestrator as role='orchestrator'
      await supabase.from('agents').update({ role: 'orchestrator' }).eq('id', orchestratorId).eq('entity_id', entityId)
    }
    return ok(null)
  } catch (e) { return dbError(e) }
}

export async function setOrchestratorAssignmentsAction(
  orchestratorId: string,
  assignments: { sub_agent_id: string; instructions?: string | null }[]
): Promise<ActionResult<null>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data: orch } = await supabase.from('agents').select('id').eq('id', orchestratorId).eq('entity_id', entityId).single()
    if (!orch) return fail('Orchestrator not found')
    await supabase.from('agent_assignments').delete().eq('orchestrator_id', orchestratorId).eq('entity_id', entityId)
    if (assignments.length > 0) {
      const rows = assignments.map(({ sub_agent_id, instructions }) => ({
        orchestrator_id: orchestratorId, sub_agent_id, entity_id: entityId,
        instructions: instructions || null,
      }))
      const { error } = await supabase.from('agent_assignments').insert(rows)
      if (error) return dbFail(error)
      // Keep role in sync: mark orchestrator as role='orchestrator'
      await supabase.from('agents').update({ role: 'orchestrator' }).eq('id', orchestratorId).eq('entity_id', entityId)
    }
    return ok(null)
  } catch (e) { return dbError(e) }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAllAgentAssignmentsAction(): Promise<ActionResult<{ orchestrator_id: string; sub_agent_id: string }[]>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agent_assignments')
      .select('orchestrator_id, sub_agent_id')
      .eq('entity_id', entityId)
    if (error) return dbFail(error)
    return ok(data ?? [])
  } catch (e) { return dbError(e) }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAllSkillAssignmentsAction(): Promise<ActionResult<{ agent_id: string; slug: string }[]>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agent_skill_assignments')
      .select('agent_id, agent_skills(slug)')
      .eq('entity_id', entityId)
    if (error) return dbFail(error)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ok((data ?? []).map((r: any) => ({ agent_id: r.agent_id, slug: r.agent_skills?.slug ?? '' })).filter((r: { agent_id: string; slug: string }) => r.slug))
  } catch (e) { return dbError(e) }
}

// ─── Task Board Actions ───────────────────────────────────────────────────────

export async function getTasksAction(orchestratorId?: string): Promise<unknown[]> {
  const { supabase, entityId } = await requireAuthWithEntity()
  let q = supabase
    .from('agent_tasks')
    .select('*, agents!agent_tasks_orchestrator_id_fkey(name, slug)')
    .eq('entity_id', entityId)
  if (orchestratorId) {
    q = q.eq('orchestrator_id', orchestratorId)
  }
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createTaskAction(raw: unknown): Promise<ActionResult<unknown>> {
  const parsed = CreateTaskSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agent_tasks')
      .insert({ ...parsed.data, entity_id: entityId })
      .select()
      .single()
    if (error) return dbFail(error)
    return ok(data)
  } catch (e) { return dbError(e) }
}

export async function updateTaskAction(id: string, raw: unknown): Promise<ActionResult<unknown>> {
  const parsed = UpdateTaskSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.message)
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('agent_tasks')
      .update(parsed.data)
      .eq('id', id)
      .eq('entity_id', entityId)
      .select()
      .single()
    if (error) return dbFail(error)
    return ok(data)
  } catch (e) { return dbError(e) }
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { error } = await supabase
      .from('agent_tasks')
      .delete()
      .eq('id', id)
      .eq('entity_id', entityId)
    if (error) return dbFail(error)
    return ok(undefined)
  } catch (e) { return dbError(e) }
}

export async function clearDoneTasksAction(orchestratorId?: string): Promise<ActionResult<{ count: number }>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    let query = supabase
      .from('agent_tasks')
      .select('id')
      .eq('entity_id', entityId)
      .eq('status', 'done')
    if (orchestratorId) query = query.eq('orchestrator_id', orchestratorId)
    const { data: doneTasks, error: fetchErr } = await query
    if (fetchErr) return dbFail(fetchErr)
    if (!doneTasks?.length) return ok({ count: 0 })
    const ids = doneTasks.map(t => t.id)
    const { error } = await supabase
      .from('agent_tasks')
      .delete()
      .in('id', ids)
    if (error) return dbFail(error)
    return ok({ count: ids.length })
  } catch (e) { return dbError(e) }
}

export async function startTaskAction(id: string): Promise<ActionResult<{ job_id: string | null }>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()

    // Load task + orchestrator slug + task_context_template
    const { data: task, error: taskErr } = await supabase
      .from('agent_tasks')
      .select('*, agents!agent_tasks_orchestrator_id_fkey(slug, task_context_template)')
      .eq('id', id)
      .eq('entity_id', entityId)
      .single()
    if (taskErr || !task) return fail('Task not found')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orchestrator = (task as any).agents as { slug: string; task_context_template: string | null } | null
    if (!orchestrator?.slug) return fail('Orchestrator not found')
    const orchestratorSlug = orchestrator.slug

    const taskText = [task.title, task.description].filter(Boolean).join('\n\n')

    // Kick off a job via the agent API
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL
    const apiKey = process.env.NEXT_PRIVATE_WORKER || process.env.WORKER_SECRET || process.env.API_SECRET_KEY
    let jobId: string | null = null

    // Append task context — use orchestrator's custom template if set, otherwise a safe default.
    // NOTE: the API secret is intentionally NOT injected into the LLM context.
    // task_id is passed separately in the job payload for the runner to handle callbacks.
    const DEFAULT_TASK_CONTEXT = 'When you finish this task, briefly summarize what you accomplished.'
    const contextBlock = (orchestrator.task_context_template ?? DEFAULT_TASK_CONTEXT).trim()
    const taskContext = contextBlock
      ? `${taskText}\n\n---\n${contextBlock}`
      : taskText

    if (agentUrl) {
      try {
        const res = await fetch(`${agentUrl}/api/agent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({ task: taskContext, task_id: id, async: true, agent_slug: orchestratorSlug, entity_id: entityId }),
        })
        if (!res.ok) return fail(`Agent API error ${res.status}: ${await res.text().catch(() => '')}`)
        const result = await res.json().catch(() => ({}))
        jobId = (result as { job_id?: string }).job_id ?? null
      } catch (e) {
        return fail(`Agent API unreachable: ${e instanceof Error ? e.message : String(e)}`)
      }
    } else {
      return fail('Agent API URL not configured (NEXT_PUBLIC_AGENT_API_URL)')
    }

    // Update task to in_progress and store job_id
    const { error: updateErr } = await supabase
      .from('agent_tasks')
      .update({ status: 'in_progress', ...(jobId ? { job_id: jobId } : {}) })
      .eq('id', id)
      .eq('entity_id', entityId)
    if (updateErr) return dbFail(updateErr)

    return ok({ job_id: jobId })
  } catch (e) { return dbError(e) }
}

// ─── MCP Token Actions ───────────────────────────────────────────────────────

export async function getMcpTokenAction(): Promise<ActionResult<{ token: string }>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase
      .from('entities')
      .select('mcp_token')
      .eq('id', entityId)
      .single()
    if (error || !data) return fail('Could not load MCP token')
    return ok({ token: data.mcp_token as string })
  } catch (e) { return dbError(e) }
}

export async function rotateMcpTokenAction(): Promise<ActionResult<{ token: string }>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()
    const { data, error } = await supabase.rpc('rotate_mcp_token', { p_entity_id: entityId })
    if (error) {
      // rpc not available — fallback to direct update
      const { data: updated, error: updateErr } = await supabase
        .from('entities')
        .update({ mcp_token: crypto.randomUUID() })
        .eq('id', entityId)
        .select('mcp_token')
        .single()
      if (updateErr || !updated) return dbFail(updateErr ?? { message: 'Update failed' })
      return ok({ token: updated.mcp_token as string })
    }
    return ok({ token: data as string })
  } catch (e) { return dbError(e) }
}

// ─── Billing Actions ─────────────────────────────────────────────────────────

export async function getBillingRunsAction(): Promise<any[]> {
  const { supabase, entityId } = await requireAuthWithEntity()
  const { data, error } = await supabase
    .from('agent_runs')
    .select('id, agent_id, input_tokens, output_tokens, tokens_used, key_source, created_at, success, agents(name, model)')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  return data ?? []
}

// ─── Pack Install ─────────────────────────────────────────────────────────────

export async function installPackAction(packId: string): Promise<ActionResult<{ agentIds: string[]; agentNames: string[] }>> {
  try {
    const { supabase, entityId } = await requireAuthWithEntity()

    const { AGENT_PACKS } = await import('@/lib/agent-packs')
    const { AGENT_TEMPLATES } = await import('@/lib/agent-templates')

    const pack = AGENT_PACKS.find(p => p.id === packId)
    if (!pack) return fail('Pack not found')

    const createdIds: Record<string, string> = {}
    const createdNames: string[] = []

    for (const templateId of pack.agents) {
      const template = AGENT_TEMPLATES.find(t => t.id === templateId)
      if (!template) continue

      const baseSlug = template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const suffix = Math.random().toString(36).slice(2, 6)
      const slug = `${baseSlug}-${suffix}`

      const { data, error } = await supabase
        .from('agents')
        .insert({
          entity_id: entityId,
          name: template.name,
          slug,
          personality: template.personality,
          model: template.model,
          role: template.role,
        })
        .select('id')
        .single()

      if (error || !data) {
        console.error('[installPackAction] failed to create agent', templateId, error)
        continue
      }
      createdIds[templateId] = data.id
      createdNames.push(template.name)
    }

    // Wire hierarchy: orchestrator -> sub-agents via agent_assignments
    const orchestratorDbId = createdIds[pack.orchestratorId]
    if (orchestratorDbId) {
      const subAgentIds = pack.agents
        .filter(id => id !== pack.orchestratorId)
        .map(id => createdIds[id])
        .filter(Boolean) as string[]

      if (subAgentIds.length > 0) {
        const rows = subAgentIds.map(subId => ({
          orchestrator_id: orchestratorDbId,
          sub_agent_id: subId,
          entity_id: entityId,
          instructions: null,
        }))
        await supabase.from('agent_assignments').insert(rows)
        await supabase.from('agents').update({ role: 'orchestrator' }).eq('id', orchestratorDbId).eq('entity_id', entityId)
      }
    }

    return ok({ agentIds: Object.values(createdIds), agentNames: createdNames })
  } catch (e) {
    return dbError(e)
  }
}
