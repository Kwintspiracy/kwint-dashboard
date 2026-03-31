import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use service role to bypass RLS — webhooks are external (no user session)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Look up trigger — return generic 403 for both not-found and wrong-secret to prevent enumeration
  const { data: trigger, error } = await supabase
    .from('webhook_triggers')
    .select('*, agents(slug)')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (error || !trigger) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Secret is REQUIRED — reject if trigger has no secret configured
  if (!trigger.secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify secret — same 403 response to avoid enumeration
  const providedSecret = request.headers.get('X-Webhook-Secret')
  if (providedSecret !== trigger.secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get request body
  let rawPayload = '{}'
  try {
    rawPayload = JSON.stringify(await request.json())
  } catch {
    rawPayload = await request.text()
  }

  // Sanitize payload: truncate to 5000 chars and strip control characters
  const sanitized = rawPayload
    .slice(0, 5000)
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Interpolate task template
  const task = trigger.task_template.replace(/\{\{payload\}\}/g, sanitized)

  // Create job via agent API
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL
  const apiKey = process.env.API_SECRET_KEY

  const res = await fetch(`${agentUrl}/api/agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      task,
      async: true,
      agent_slug: (trigger.agents as { slug: string } | null)?.slug,
      entity_id: (trigger as { entity_id?: string }).entity_id ?? null,
    }),
  })

  const result = await res.json().catch(() => ({}))

  // Update trigger stats
  await supabase
    .from('webhook_triggers')
    .update({
      last_triggered_at: new Date().toISOString(),
      trigger_count: (trigger.trigger_count || 0) + 1,
    })
    .eq('id', trigger.id)

  return NextResponse.json({
    ok: true,
    job_id: (result as { job_id?: string }).job_id,
    message: 'Trigger fired',
  })
}
