import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// ── MCP tool definitions ──────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'list_tasks',
    description: 'List tasks on the Kanban board. Optionally filter by status or priority.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'cancelled'], description: 'Filter by status' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Filter by priority' },
        limit: { type: 'number', description: 'Max tasks to return (default 50)' },
      },
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task on the board.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', description: 'Short, action-oriented title' },
        description: { type: 'string', description: 'Optional details, links, or context' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Default: medium' },
      },
    },
  },
  {
    name: 'update_task',
    description: 'Update the status or result of a task.',
    inputSchema: {
      type: 'object',
      required: ['task_id'],
      properties: {
        task_id: { type: 'string', description: 'Task UUID' },
        status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'cancelled'] },
        result: { type: 'string', description: 'Summary of work done (shown in the dashboard)' },
      },
    },
  },
]

// ── Auth helper ───────────────────────────────────────────────────────────────

async function resolveEntityId(token: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data } = await supabase
    .from('entities')
    .select('id')
    .eq('mcp_token', token)
    .single()
  return data?.id ?? null
}

// ── Tool executors ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function listTasks(supabase: any, entityId: string, args: Record<string, unknown>) {
  const { status, priority, limit = 50 } = args as {
    status?: string; priority?: string; limit?: number
  }

  let q = supabase
    .from('agent_tasks')
    .select('id, title, description, priority, status, result, created_at')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(Math.min(Number(limit) || 50, 200))

  if (status) q = q.eq('status', status)
  if (priority) q = q.eq('priority', priority)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createTask(supabase: any, entityId: string, args: Record<string, unknown>) {
  const { title, description, priority = 'medium' } = args as {
    title: string; description?: string; priority?: string
  }
  if (!title?.trim()) throw new Error('title is required')

  // Find first active orchestrator for the entity (optional FK)
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('entity_id', entityId)
    .eq('active', true)
    .eq('role', 'orchestrator')
    .order('created_at')
    .limit(1)
    .single()

  const { data, error } = await supabase
    .from('agent_tasks')
    .insert({
      entity_id: entityId,
      orchestrator_id: agent?.id ?? null,
      title: title.trim(),
      description: (description as string | undefined)?.trim() ?? null,
      priority: priority as 'low' | 'medium' | 'high',
      status: 'todo',
    })
    .select('id, title, description, priority, status, result, created_at')
    .single()

  if (error) throw new Error(error.message)
  return data
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateTask(supabase: any, entityId: string, args: Record<string, unknown>) {
  const { task_id, status, result } = args as {
    task_id: string; status?: string; result?: string
  }
  if (!task_id) throw new Error('task_id is required')

  const patch: Record<string, unknown> = {}
  if (status) patch.status = status
  if (result !== undefined) patch.result = result
  if (Object.keys(patch).length === 0) throw new Error('Provide at least one of: status, result')

  const { data, error } = await supabase
    .from('agent_tasks')
    .update(patch)
    .eq('id', task_id)
    .eq('entity_id', entityId)   // prevents cross-tenant writes
    .select('id, title, description, priority, status, result, created_at')
    .single()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Task not found or not owned by this workspace')
  return data
}

// ── JSON-RPC helpers ──────────────────────────────────────────────────────────

function rpcOk(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result })
}

function rpcErr(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } })
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return rpcErr(null, -32600, 'Missing Authorization header')

  const entityId = await resolveEntityId(token)
  if (!entityId) return rpcErr(null, -32600, 'Invalid token')

  // Parse body
  let body: { jsonrpc?: string; id?: unknown; method?: string; params?: unknown }
  try {
    body = await request.json()
  } catch {
    return rpcErr(null, -32700, 'Parse error')
  }

  const { id = null, method, params } = body

  // Route methods
  if (method === 'initialize') {
    return rpcOk(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'kwint-tasks', version: '1.0' },
    })
  }

  if (method === 'notifications/initialized') {
    return rpcOk(id, {})
  }

  if (method === 'tools/list') {
    return rpcOk(id, { tools: TOOLS })
  }

  if (method === 'tools/call') {
    const { name, arguments: args = {} } = (params ?? {}) as { name?: string; arguments?: Record<string, unknown> }
    if (!name) return rpcErr(id, -32602, 'Missing tool name')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    try {
      let result: unknown
      if (name === 'list_tasks') result = await listTasks(supabase, entityId, args)
      else if (name === 'create_task') result = await createTask(supabase, entityId, args)
      else if (name === 'update_task') result = await updateTask(supabase, entityId, args)
      else return rpcErr(id, -32601, `Unknown tool: ${name}`)

      return rpcOk(id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Tool execution failed'
      return rpcErr(id, -32603, msg)
    }
  }

  return rpcErr(id, -32601, `Method not found: ${method}`)
}

// MCP clients do a GET first to check the server is alive
export async function GET() {
  return NextResponse.json({
    name: 'kwint-tasks',
    version: '1.0',
    description: 'Kwint task board — list, create, and update Kanban tasks',
    tools: TOOLS.map(t => t.name),
  })
}
