import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'
import { assertSafeOutboundUrl, UrlGuardError } from '@/lib/url-guard'

// OAuth 2.1 + PKCE + Dynamic Client Registration flow for remote MCP servers.
//
// 1. Discover auth endpoints from {mcp_url_origin}/.well-known/oauth-authorization-server
// 2. If we don't already have a client_id stored, register dynamically (RFC 7591)
// 3. Generate PKCE code_verifier + S256 challenge, HMAC-sign state with verifier embedded
// 4. Redirect user to the authorization endpoint
//
// The callback route verifies state, exchanges code for tokens, persists them in
// mcp_servers.env_vars, then redirects back to /connectors.

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function GET(request: NextRequest) {
  const serverId = request.nextUrl.searchParams.get('server_id')
  if (!serverId) return NextResponse.json({ error: 'Missing server_id' }, { status: 400 })

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/login', request.url))

    const cookieStore = await cookies()
    const entityId = cookieStore.get('kwint_active_entity')?.value
    if (!entityId) return NextResponse.json({ error: 'No active workspace' }, { status: 400 })

    const { data: server } = await supabase
      .from('mcp_servers')
      .select('id, url, env_vars')
      .eq('id', serverId)
      .eq('entity_id', entityId)
      .single()
    if (!server || !server.url) return NextResponse.json({ error: 'MCP server not found' }, { status: 404 })

    // Wave 4.3 — SSRF guard. Before this check, a malicious admin-configured
    // MCP URL could be e.g. http://169.254.169.254/ (AWS IMDS) and we'd
    // happily fetch it. assertSafeOutboundUrl rejects loopback / private /
    // link-local / cloud-metadata hosts and (in production) non-https.
    let mcpOrigin: string
    try {
      mcpOrigin = assertSafeOutboundUrl(server.url).origin
    } catch (e) {
      const reason = e instanceof UrlGuardError ? e.reason : 'invalid URL'
      return NextResponse.json({ error: `MCP server URL rejected: ${reason}` }, { status: 400 })
    }
    const discoveryUrl = `${mcpOrigin}/.well-known/oauth-authorization-server`
    const disc = await fetch(discoveryUrl, { headers: { 'User-Agent': 'KwintAgents/1.0' }, signal: AbortSignal.timeout(10_000) })
    if (!disc.ok) return NextResponse.json({ error: `Discovery failed: HTTP ${disc.status} at ${discoveryUrl}` }, { status: 502 })
    const meta = await disc.json() as {
      authorization_endpoint: string
      token_endpoint: string
      registration_endpoint?: string
      code_challenge_methods_supported?: string[]
      scopes_supported?: string[]
    }
    if (!meta.authorization_endpoint || !meta.token_endpoint) {
      return NextResponse.json({ error: 'MCP server discovery incomplete' }, { status: 502 })
    }

    const redirectUri = `${request.nextUrl.origin}/api/mcp/oauth/callback`
    const env = (server.env_vars as Record<string, unknown>) || {}

    // Register client dynamically if we don't have one yet
    let clientId = typeof env.client_id === 'string' ? env.client_id : null
    if (!clientId) {
      if (!meta.registration_endpoint) {
        return NextResponse.json({ error: 'MCP server has no DCR endpoint and no client_id is configured' }, { status: 502 })
      }
      const regRes = await fetch(meta.registration_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'KwintAgents/1.0' },
        body: JSON.stringify({
          client_name: 'KwintAgents',
          redirect_uris: [redirectUri],
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          token_endpoint_auth_method: 'none',
        }),
        signal: AbortSignal.timeout(10_000),
      })
      if (!regRes.ok) {
        const body = await regRes.text().catch(() => '')
        return NextResponse.json({ error: `DCR failed: HTTP ${regRes.status} ${body.slice(0, 200)}` }, { status: 502 })
      }
      const reg = await regRes.json() as { client_id: string; client_secret?: string }
      clientId = reg.client_id
      const mergedEnv = {
        ...env,
        auth_mode: 'mcp_oauth',
        client_id: clientId,
        ...(reg.client_secret ? { client_secret: reg.client_secret } : {}),
        authorization_endpoint: meta.authorization_endpoint,
        token_endpoint: meta.token_endpoint,
        registration_endpoint: meta.registration_endpoint,
      }
      await supabase
        .from('mcp_servers')
        .update({ env_vars: mergedEnv, updated_at: new Date().toISOString() })
        .eq('id', serverId)
        .eq('entity_id', entityId)
    } else if (!env.token_endpoint || env.token_endpoint !== meta.token_endpoint) {
      // Pre-registered client: persist discovered endpoints for token refresh
      const endpointEnv = { ...env, token_endpoint: meta.token_endpoint, authorization_endpoint: meta.authorization_endpoint }
      await supabase
        .from('mcp_servers')
        .update({ env_vars: endpointEnv, updated_at: new Date().toISOString() })
        .eq('id', serverId)
        .eq('entity_id', entityId)
    }

    // PKCE
    const codeVerifier = b64url(randomBytes(32))
    const codeChallenge = b64url(createHash('sha256').update(codeVerifier).digest())

    // Signed state carrying verifier + server id + entity id
    const workerSecret = process.env.WORKER_SECRET || process.env.API_SECRET_KEY
    if (!workerSecret) return NextResponse.json({ error: 'Server misconfigured: WORKER_SECRET required' }, { status: 500 })
    const payload = Buffer.from(
      JSON.stringify({ server_id: serverId, entity_id: entityId, verifier: codeVerifier, ts: Date.now() })
    ).toString('base64url')
    const hmac = createHmac('sha256', workerSecret).update(payload).digest('hex')
    const state = `${payload}.${hmac}`

    const params = new URLSearchParams({
      client_id: clientId!,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    return NextResponse.redirect(`${meta.authorization_endpoint}?${params.toString()}`)
  } catch (e) {
    console.error('[mcp/oauth/start]', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg.slice(0, 300) }, { status: 500 })
  }
}
