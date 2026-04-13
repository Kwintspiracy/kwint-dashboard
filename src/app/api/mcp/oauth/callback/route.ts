import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const targetUrl = new URL('/connectors', origin)

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const authError = request.nextUrl.searchParams.get('error')

  if (authError) {
    targetUrl.searchParams.set('mcp_oauth_error', authError)
    return NextResponse.redirect(targetUrl)
  }
  if (!code || !state) {
    targetUrl.searchParams.set('mcp_oauth_error', 'missing_code_or_state')
    return NextResponse.redirect(targetUrl)
  }

  try {
    const workerSecret = process.env.WORKER_SECRET || process.env.API_SECRET_KEY
    if (!workerSecret) {
      targetUrl.searchParams.set('mcp_oauth_error', 'server_misconfigured')
      return NextResponse.redirect(targetUrl)
    }

    const [payload, signature] = state.split('.')
    if (!payload || !signature) {
      targetUrl.searchParams.set('mcp_oauth_error', 'invalid_state')
      return NextResponse.redirect(targetUrl)
    }
    const expected = createHmac('sha256', workerSecret).update(payload).digest('hex')
    if (!timingSafeEqual(expected, signature)) {
      targetUrl.searchParams.set('mcp_oauth_error', 'invalid_state_signature')
      return NextResponse.redirect(targetUrl)
    }
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      server_id: string
      entity_id: string
      verifier: string
      ts: number
    }
    // State expires after 15 minutes
    if (Date.now() - decoded.ts > 15 * 60 * 1000) {
      targetUrl.searchParams.set('mcp_oauth_error', 'state_expired')
      return NextResponse.redirect(targetUrl)
    }

    const supabase = await createServerSupabaseClient()
    const { data: server } = await supabase
      .from('mcp_servers')
      .select('id, name, env_vars')
      .eq('id', decoded.server_id)
      .eq('entity_id', decoded.entity_id)
      .single()
    if (!server) {
      targetUrl.searchParams.set('mcp_oauth_error', 'server_not_found')
      return NextResponse.redirect(targetUrl)
    }
    const env = (server.env_vars as Record<string, unknown>) || {}
    const tokenEndpoint = env.token_endpoint as string | undefined
    const clientId = env.client_id as string | undefined
    const clientSecret = env.client_secret as string | undefined
    if (!tokenEndpoint || !clientId) {
      targetUrl.searchParams.set('mcp_oauth_error', 'missing_oauth_config')
      return NextResponse.redirect(targetUrl)
    }

    const redirectUri = `${origin}/api/mcp/oauth/callback`
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: decoded.verifier,
    })
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'KwintAgents/1.0',
    }
    if (clientSecret) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    }
    const tokenRes = await fetch(tokenEndpoint, { method: 'POST', headers, body: body.toString(), signal: AbortSignal.timeout(15_000) })
    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => '')
      console.error('[mcp/oauth/callback] token exchange failed', tokenRes.status, text)
      targetUrl.searchParams.set('mcp_oauth_error', `token_exchange_${tokenRes.status}`)
      return NextResponse.redirect(targetUrl)
    }
    const tokens = await tokenRes.json() as {
      access_token: string
      refresh_token?: string
      expires_in?: number
      token_type?: string
      scope?: string
    }
    if (!tokens.access_token) {
      targetUrl.searchParams.set('mcp_oauth_error', 'no_access_token')
      return NextResponse.redirect(targetUrl)
    }

    const now = Math.floor(Date.now() / 1000)
    const mergedEnv = {
      ...env,
      auth_mode: 'mcp_oauth',
      access_token: tokens.access_token,
      ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
      ...(tokens.expires_in ? { token_expires_at: now + tokens.expires_in } : {}),
      ...(tokens.scope ? { scope: tokens.scope } : {}),
    }
    const { error: updErr } = await supabase
      .from('mcp_servers')
      .update({ env_vars: mergedEnv, updated_at: new Date().toISOString() })
      .eq('id', decoded.server_id)
      .eq('entity_id', decoded.entity_id)
    if (updErr) {
      console.error('[mcp/oauth/callback] persist failed', updErr)
      targetUrl.searchParams.set('mcp_oauth_error', 'persist_failed')
      return NextResponse.redirect(targetUrl)
    }

    targetUrl.searchParams.set('mcp_oauth_success', server.name || decoded.server_id)
    return NextResponse.redirect(targetUrl)
  } catch (e) {
    console.error('[mcp/oauth/callback]', e)
    targetUrl.searchParams.set('mcp_oauth_error', 'internal')
    return NextResponse.redirect(targetUrl)
  }
}
