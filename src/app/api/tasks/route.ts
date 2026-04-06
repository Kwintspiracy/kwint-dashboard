import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const VALID_PRIORITIES = ['low', 'medium', 'high'] as const

export async function POST(request: NextRequest) {
  // Auth — same secret as the rest of the worker API
  const workerSecret = process.env.NEXT_PRIVATE_WORKER || process.env.WORKER_SECRET || process.env.API_SECRET_KEY
  if (!workerSecret) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${workerSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { title, description, priority = 'medium', agent_slug } = body as {
    title?: string
    description?: string
    priority?: string
    agent_slug?: string
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (!agent_slug || typeof agent_slug !== 'string') {
    return NextResponse.json({ error: 'agent_slug is required' }, { status: 400 })
  }
  if (!VALID_PRIORITIES.includes(priority as typeof VALID_PRIORITIES[number])) {
    return NextResponse.json({ error: 'priority must be low, medium, or high' }, { status: 400 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)

  // Resolve agent_slug → orchestrator_id + entity_id
  const { data: agent, error: agentErr } = await supabase
    .from('agents')
    .select('id, entity_id, role')
    .eq('slug', agent_slug)
    .single()

  if (agentErr || !agent) {
    return NextResponse.json({ error: `Agent '${agent_slug}' not found` }, { status: 404 })
  }

  // Create task
  const { data: task, error: taskErr } = await supabase
    .from('agent_tasks')
    .insert({
      orchestrator_id: agent.id,
      entity_id: agent.entity_id,
      title: title.trim(),
      description: description?.trim() ?? null,
      priority: priority as typeof VALID_PRIORITIES[number],
      status: 'todo',
    })
    .select('id, title, description, priority, status, created_at')
    .single()

  if (taskErr) {
    console.error('[POST /api/tasks]', taskErr.message)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, task })
}
