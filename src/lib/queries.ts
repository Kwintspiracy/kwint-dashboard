import { supabase } from './supabase'

// ═══════════════════════════════════════════════════
// STATS QUERIES
// ═══════════════════════════════════════════════════

export async function getJobCounts() {
  const { data } = await supabase
    .from('agent_jobs')
    .select('status')

  const counts = { completed: 0, failed: 0, pending: 0, processing: 0, total: 0 }
  for (const row of data || []) {
    counts[row.status as keyof typeof counts] = (counts[row.status as keyof typeof counts] || 0) + 1
    counts.total++
  }
  return counts
}

export async function getTotalTokens() {
  const { data } = await supabase
    .from('agent_runs')
    .select('tokens_used')

  let total = 0
  for (const row of data || []) {
    total += row.tokens_used || 0
  }
  return total
}

export async function getJobsPerDay(days: number = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data } = await supabase
    .from('agent_jobs')
    .select('created_at, status')
    .gte('created_at', since.toISOString())
    .order('created_at')

  const buckets: Record<string, { date: string; completed: number; failed: number; pending: number }> = {}

  for (const row of data || []) {
    const date = new Date(row.created_at).toISOString().split('T')[0]
    if (!buckets[date]) {
      buckets[date] = { date, completed: 0, failed: 0, pending: 0 }
    }
    if (row.status === 'completed') buckets[date].completed++
    else if (row.status === 'failed') buckets[date].failed++
    else buckets[date].pending++
  }

  return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date))
}

export async function getToolUsage() {
  const { data } = await supabase
    .from('agent_runs')
    .select('tools_used')

  const counts: Record<string, number> = {}
  for (const row of data || []) {
    for (const tool of row.tools_used || []) {
      counts[tool] = (counts[tool] || 0) + 1
    }
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

export async function getAverageDuration() {
  const { data } = await supabase
    .from('agent_runs')
    .select('duration_ms')
    .not('duration_ms', 'is', null)

  if (!data || data.length === 0) return 0
  const sum = data.reduce((acc, row) => acc + (row.duration_ms || 0), 0)
  return Math.round(sum / data.length)
}

export async function getSuccessRate() {
  const { data } = await supabase
    .from('agent_runs')
    .select('success')

  if (!data || data.length === 0) return 100
  const successes = data.filter(r => r.success).length
  return Math.round((successes / data.length) * 100)
}

export async function getChannelBreakdown() {
  const { data } = await supabase
    .from('agent_jobs')
    .select('channel')

  const counts: Record<string, number> = {}
  for (const row of data || []) {
    counts[row.channel] = (counts[row.channel] || 0) + 1
  }

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
}

// ═══════════════════════════════════════════════════
// SKILLS QUERIES
// ═══════════════════════════════════════════════════

export async function getSkills(type?: 'connector' | 'skill') {
  let query = supabase
    .from('agent_skills')
    .select('*')
    .order('name')

  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function toggleSkillActive(id: string, active: boolean) {
  const { error } = await supabase
    .from('agent_skills')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function createSkill(data: {
  name: string
  slug: string
  content: string
  api_key?: string
  base_url?: string
  type?: 'connector' | 'skill'
}) {
  const { error } = await supabase
    .from('agent_skills')
    .insert({ ...data, type: data.type || 'connector', active: true })

  if (error) throw error
}

export async function updateSkill(id: string, data: Record<string, unknown>) {
  const { error } = await supabase
    .from('agent_skills')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function deleteSkill(id: string) {
  const { error } = await supabase
    .from('agent_skills')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ═══════════════════════════════════════════════════
// JOBS QUERIES
// ═══════════════════════════════════════════════════

export async function getJobs(filters?: { status?: string; channel?: string; agent_id?: string }, limit = 100) {
  let query = supabase
    .from('agent_jobs')
    .select('id, status, channel, task, chat_id, tools_used, turn, result, error, chain_count, agent_id, created_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.channel) query = query.eq('channel', filters.channel)
  if (filters?.agent_id) query = query.eq('agent_id', filters.agent_id)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function retryJob(task: string) {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL
  const res = await fetch(`${agentUrl}/api/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, async: true }),
  })
  return res.json()
}

// ═══════════════════════════════════════════════════
// MEMORIES QUERIES
// ═══════════════════════════════════════════════════

export async function getMemories(category?: string, agentId?: string) {
  let query = supabase
    .from('agent_memory')
    .select('*')
    .order('updated_at', { ascending: false })

  if (category) query = query.eq('category', category)
  if (agentId) query = query.eq('agent_id', agentId)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function updateMemory(id: string, data: Record<string, unknown>) {
  const { error } = await supabase
    .from('agent_memory')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function deleteMemory(id: string) {
  const { error } = await supabase
    .from('agent_memory')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function createMemory(data: {
  fact: string
  category: string
  importance: number
  agent_id?: string | null
}) {
  const insertData: Record<string, unknown> = {
    fact: data.fact,
    category: data.category,
    importance: data.importance,
  }
  if (data.agent_id) {
    insertData.agent_id = data.agent_id
  }

  const { error } = await supabase
    .from('agent_memory')
    .insert(insertData)

  if (error) throw error
}

// ═══════════════════════════════════════════════════
// AGENTS QUERIES
// ═══════════════════════════════════════════════════

export async function getAgents() {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name')

  if (error) throw error
  return data || []
}

export async function createAgent(data: {
  name: string
  slug: string
  personality: string
  model?: string
  role?: string
  telegram_bot_token?: string | null
  telegram_bot_username?: string | null
}) {
  const { error } = await supabase
    .from('agents')
    .insert({ ...data, active: true, is_default: false })

  if (error) throw error
}

export async function updateAgent(id: string, data: Record<string, unknown>) {
  const { error } = await supabase
    .from('agents')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function deleteAgent(id: string) {
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function setDefaultAgent(id: string) {
  // Unset all defaults first
  await supabase
    .from('agents')
    .update({ is_default: false })
    .eq('is_default', true)

  // Set the new default
  const { error } = await supabase
    .from('agents')
    .update({ is_default: true })
    .eq('id', id)

  if (error) throw error
}

export async function activateTelegram(agentSlug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_AGENT_API_URL}/api/telegram_setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_slug: agentSlug, action: 'register' }),
  })
  return res.json()
}

export async function deactivateTelegram(agentSlug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_AGENT_API_URL}/api/telegram_setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_slug: agentSlug, action: 'deregister' }),
  })
  return res.json()
}

// ═══════════════════════════════════════════════════
// SCHEDULES QUERIES
// ═══════════════════════════════════════════════════

export async function getSchedules() {
  const { data, error } = await supabase
    .from('agent_schedules')
    .select('*, agents(name)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createSchedule(data: {
  agent_id: string
  type: string
  name: string
  cron_expr: string
  task?: string | null
  objectives?: string | null
  chat_id?: string | null
}) {
  const { error } = await supabase
    .from('agent_schedules')
    .insert({ ...data, active: true })

  if (error) throw error
}

export async function updateSchedule(id: string, data: Record<string, unknown>) {
  const { error } = await supabase
    .from('agent_schedules')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function deleteSchedule(id: string) {
  const { error } = await supabase
    .from('agent_schedules')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ═══════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════

export async function cancelPendingJobs() {
  const { error } = await supabase
    .from('agent_jobs')
    .update({ status: 'failed', error: 'Cancelled from dashboard', updated_at: new Date().toISOString() })
    .in('status', ['pending', 'processing'])

  if (error) throw error
}

export async function deleteFailedJobs() {
  const { error } = await supabase
    .from('agent_jobs')
    .delete()
    .eq('status', 'failed')

  if (error) throw error
}

export async function deleteJob(id: string) {
  const { error } = await supabase
    .from('agent_jobs')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getMemoryCount() {
  const { data } = await supabase
    .from('agent_memory')
    .select('category')

  const counts: Record<string, number> = { total: 0 }
  for (const row of data || []) {
    counts[row.category] = (counts[row.category] || 0) + 1
    counts.total++
  }
  return counts
}
