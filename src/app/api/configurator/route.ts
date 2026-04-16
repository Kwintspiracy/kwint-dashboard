import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { CONFIGURATOR_SYSTEM_PROMPT } from '@/lib/configurator/systemPrompt'
import { CONFIGURATOR_TOOLS, executeTool, type ToolContext } from '@/lib/configurator/tools'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_TURNS = 20
const MODEL = 'claude-opus-4-6'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: Anthropic.ContentBlock[] | string | Array<{ type: string; [k: string]: unknown }>
}

async function getEntityId(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string): Promise<string | null> {
  const cookieStore = await cookies()
  const cookieId = cookieStore.get('kwint_active_entity')?.value ?? null
  const { data: entities } = await supabase.from('entities').select('id').eq('user_id', userId).order('created_at')
  const ids = new Set((entities ?? []).map(e => e.id))
  if (cookieId && ids.has(cookieId)) return cookieId
  return entities?.[0]?.id ?? null
}

async function getAnthropicKey(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  entityId: string,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('entity_llm_keys')
    .select('api_key')
    .eq('entity_id', entityId)
    .eq('provider', 'anthropic')
    .eq('is_active', true)
    .maybeSingle()
  if (data?.api_key) return data.api_key

  // Operator fallback
  const operatorIds = (process.env.OPERATOR_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (operatorIds.includes(userId) && process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const entityId = await getEntityId(supabase, user.id)
    if (!entityId) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

    const apiKey = await getAnthropicKey(supabase, entityId, user.id)
    if (!apiKey) {
      return NextResponse.json({
        error: 'No Anthropic API key. Add one in Settings → LLM Keys (provider: anthropic).',
      }, { status: 400 })
    }

    const body = await req.json() as {
      sessionId?: string
      agentId?: string | null
      userMessage?: string
    }

    // Load or create session
    type Session = { id: string; messages: ChatMessage[]; agent_id: string | null; turn_count: number; status: string }
    let session: Session | null = null
    if (body.sessionId) {
      const { data } = await supabase
        .from('configurator_sessions')
        .select('id, messages, agent_id, turn_count, status')
        .eq('id', body.sessionId)
        .eq('entity_id', entityId)
        .maybeSingle()
      session = (data as unknown as Session | null) ?? null
    }
    if (!session) {
      const { data, error } = await supabase
        .from('configurator_sessions')
        .insert({ entity_id: entityId, agent_id: body.agentId ?? null, messages: [], status: 'active', turn_count: 0 })
        .select('id, messages, agent_id, turn_count, status')
        .single()
      if (error || !data) return NextResponse.json({ error: 'Session create failed' }, { status: 500 })
      session = data as unknown as Session
    }
    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Session is closed' }, { status: 400 })
    }

    const messages: ChatMessage[] = (session.messages as ChatMessage[]) ?? []
    if (body.userMessage) {
      messages.push({ role: 'user', content: body.userMessage })
    }
    if (!messages.length) {
      return NextResponse.json({ sessionId: session.id, messages, agentId: session.agent_id })
    }

    const client = new Anthropic({ apiKey })
    const ctx: ToolContext = { supabase, entityId, userId: user.id, sessionId: session.id }

    let turn = session.turn_count
    let currentAgentId = session.agent_id
    const toolEvents: Array<{ name: string; input: unknown; result: unknown }> = []
    let consecutivePolls = 0

    // Tool loop
    while (turn < MAX_TURNS) {
      turn++
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: CONFIGURATOR_SYSTEM_PROMPT,
        tools: CONFIGURATOR_TOOLS as Anthropic.Tool[],
        messages: messages as Anthropic.MessageParam[],
      })

      messages.push({ role: 'assistant', content: response.content as Anthropic.ContentBlock[] })

      if (response.stop_reason !== 'tool_use') break

      const toolUses = response.content.filter(c => c.type === 'tool_use') as Array<Anthropic.ToolUseBlock>
      const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }> = []

      const isPollOnly = toolUses.every(tu => tu.name === 'poll_test_result')
      if (isPollOnly) consecutivePolls++; else consecutivePolls = 0

      for (const tu of toolUses) {
        // Force-stop runaway poll loops
        if (tu.name === 'poll_test_result' && consecutivePolls > 3) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: JSON.stringify({ ok: true, data: { status: 'still_running', hint: 'Poll limit reached. Tell the user the test is still running and they can check the Sessions page later.' } }),
            is_error: false,
          })
          continue
        }

        const result = await executeTool(ctx, tu.name, tu.input as Record<string, unknown>)
        toolEvents.push({ name: tu.name, input: tu.input, result })
        if (tu.name === 'create_agent' && result.ok) {
          const data = result.data as { id?: string } | null
          if (data?.id) currentAgentId = data.id
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(result),
          is_error: !result.ok,
        })
      }
      messages.push({ role: 'user', content: toolResults })

      // Break after poll limit so the LLM can produce a final text response
      if (consecutivePolls > 3) break
    }

    const budgetExceeded = turn >= MAX_TURNS
    const sessionStatus = budgetExceeded ? 'exhausted' : 'active'

    await supabase
      .from('configurator_sessions')
      .update({
        messages,
        agent_id: currentAgentId,
        turn_count: turn,
        status: sessionStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    return NextResponse.json({
      sessionId: session.id,
      messages,
      agentId: currentAgentId,
      turnCount: turn,
      status: sessionStatus,
      toolEvents,
    })
  } catch (e) {
    console.error('[configurator] route error', e)
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const entityId = await getEntityId(supabase, user.id)
    if (!entityId) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

    const url = new URL(req.url)
    const sessionId = url.searchParams.get('sessionId')
    const agentId = url.searchParams.get('agentId')

    if (sessionId) {
      const { data } = await supabase
        .from('configurator_sessions')
        .select('id, messages, agent_id, status, turn_count')
        .eq('id', sessionId)
        .eq('entity_id', entityId)
        .maybeSingle()
      if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ session: data })
    }
    if (agentId) {
      // Most recent session for this agent
      const { data } = await supabase
        .from('configurator_sessions')
        .select('id, messages, agent_id, status, turn_count')
        .eq('agent_id', agentId)
        .eq('entity_id', entityId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return NextResponse.json({ session: data ?? null })
    }
    return NextResponse.json({ error: 'Provide sessionId or agentId' }, { status: 400 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
