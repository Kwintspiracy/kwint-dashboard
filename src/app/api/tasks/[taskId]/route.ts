import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const VALID_STATUSES = ['todo', 'in_progress', 'done', 'cancelled'] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  // Auth: require shared worker secret
  const apiKey = process.env.NEXT_PRIVATE_WORKER || process.env.WORKER_SECRET || process.env.API_SECRET_KEY
  if (!apiKey) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  // Service-role client — external callers (runner) have no user session
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)

  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { taskId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { status, result } = body as { status?: string; result?: string }

  if (!status || !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  const update: Record<string, unknown> = { status }
  if (result !== undefined) update.result = result

  const { data, error } = await supabase
    .from('agent_tasks')
    .update(update)
    .eq('id', taskId)
    .select('id, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  return NextResponse.json({ ok: true, task: data })
}
