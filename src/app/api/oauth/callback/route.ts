import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { OAUTH_PROVIDERS, CONNECTOR_OAUTH } from '@/lib/oauth-providers'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const OAUTH_ENV: Record<string, string | undefined> = {
  GOOGLE_CLIENT_ID:        process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET:    process.env.GOOGLE_CLIENT_SECRET,
  SLACK_CLIENT_ID:         process.env.SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET:     process.env.SLACK_CLIENT_SECRET,
  GITHUB_CLIENT_ID:        process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET:    process.env.GITHUB_CLIENT_SECRET,
  NOTION_CLIENT_ID:        process.env.NOTION_CLIENT_ID,
  NOTION_CLIENT_SECRET:    process.env.NOTION_CLIENT_SECRET,
  LINEAR_CLIENT_ID:        process.env.LINEAR_CLIENT_ID,
  LINEAR_CLIENT_SECRET:    process.env.LINEAR_CLIENT_SECRET,
  HUBSPOT_CLIENT_ID:       process.env.HUBSPOT_CLIENT_ID,
  HUBSPOT_CLIENT_SECRET:   process.env.HUBSPOT_CLIENT_SECRET,
  MICROSOFT_CLIENT_ID:     process.env.MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const connectorsUrl = new URL('/connectors', origin)

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const providerError = request.nextUrl.searchParams.get('error')

  if (providerError) {
    connectorsUrl.searchParams.set('oauth_error', providerError)
    return NextResponse.redirect(connectorsUrl)
  }

  if (!code || !state) {
    connectorsUrl.searchParams.set('oauth_error', 'missing_params')
    return NextResponse.redirect(connectorsUrl)
  }

  try {
    // Use anon key + SECURITY DEFINER RPCs — service role key is not available in Vercel env
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!anonKey) return NextResponse.json({ error: 'Server misconfigured: missing anon key' }, { status: 500 })
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey)

    // Verify HMAC to ensure state wasn't tampered with
    const workerSecret = process.env.WORKER_SECRET || process.env.API_SECRET_KEY
    if (!workerSecret) return NextResponse.json({ error: 'Server misconfigured: WORKER_SECRET required' }, { status: 500 })
    const dotIdx = state.lastIndexOf('.')
    if (dotIdx === -1) {
      connectorsUrl.searchParams.set('oauth_error', 'invalid_state')
      return NextResponse.redirect(connectorsUrl)
    }
    const payloadB64 = state.slice(0, dotIdx)
    const sig = state.slice(dotIdx + 1)
    const expectedSig = createHmac('sha256', workerSecret).update(payloadB64).digest('hex')

    let sigMatch = false
    try {
      sigMatch = timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))
    } catch {
      sigMatch = false
    }
    if (!sigMatch) {
      connectorsUrl.searchParams.set('oauth_error', 'invalid_state')
      return NextResponse.redirect(connectorsUrl)
    }

    const { connector_id, entity_id, user_id, ts } = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    ) as { connector_id: string; entity_id: string; user_id?: string; ts: number }

    if (Date.now() - ts > 15 * 60 * 1000) {
      connectorsUrl.searchParams.set('oauth_error', 'state_expired')
      return NextResponse.redirect(connectorsUrl)
    }

    // Wave 1.7 — session binding. Require that the browser completing the
    // callback is the same user who started the flow. If user_id is absent
    // (pre-Wave-1.7 state still in flight) we tolerate it for a grace window;
    // after ts < Date.now() - 15min the state is rejected by the expiry check
    // above anyway, so the grace is bounded.
    if (user_id) {
      const sessionSupabase = await createServerSupabaseClient()
      const { data: { user: sessionUser } } = await sessionSupabase.auth.getUser()
      if (!sessionUser || sessionUser.id !== user_id) {
        connectorsUrl.searchParams.set('oauth_error', 'session_mismatch')
        return NextResponse.redirect(connectorsUrl)
      }
    }

    // Load connector via SECURITY DEFINER RPC (entity_id is HMAC-verified above)
    const { data: connectorRows } = await supabase.rpc('get_connector_for_oauth_callback', {
      p_connector_id: connector_id,
      p_entity_id: entity_id,
    })
    const connector = Array.isArray(connectorRows) ? connectorRows[0] : connectorRows

    if (!connector) {
      connectorsUrl.searchParams.set('oauth_error', 'connector_not_found')
      return NextResponse.redirect(connectorsUrl)
    }

    const oauthConfig = CONNECTOR_OAUTH[connector.slug]
    if (!oauthConfig) {
      connectorsUrl.searchParams.set('oauth_error', 'no_provider_config')
      return NextResponse.redirect(connectorsUrl)
    }

    const provider = OAUTH_PROVIDERS[oauthConfig.provider]
    const clientId = OAUTH_ENV[provider.clientIdEnv]!
    const clientSecret = OAUTH_ENV[provider.clientSecretEnv]!
    const redirectUri = `${origin}/api/oauth/callback`
    const tokenUrl = connector.oauth_token_url || provider.tokenUrl

    // Exchange authorization code for tokens
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    })

    const tokens = await tokenRes.json()
    if (!tokenRes.ok || tokens.error) {
      // Redact: never log access_token / refresh_token / id_token payloads; only log
      // error code and response shape so we can debug without leaking creds.
      console.error('[oauth/callback] token exchange failed', {
        status: tokenRes.status,
        error: tokens?.error,
        error_description: tokens?.error_description,
        keys: Object.keys(tokens ?? {}),
      })
      connectorsUrl.searchParams.set('oauth_error', 'token_exchange_failed')
      return NextResponse.redirect(connectorsUrl)
    }

    // Normalize token fields across providers
    // Slack v2: tokens are nested under authed_user for user tokens
    const accessToken: string = tokens.access_token || tokens.authed_user?.access_token
    const refreshToken: string | null = tokens.refresh_token || tokens.authed_user?.refresh_token || null
    const expiresIn: number | null = tokens.expires_in ? Number(tokens.expires_in) : null
    const expiresAt: string | null = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null

    // Resolve account name/email for display
    let accountName: string | null =
      tokens.email || tokens.authed_user?.email || tokens.authed_user?.name || null

    if (!accountName && oauthConfig.provider === 'google' && accessToken) {
      try {
        const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const info = await r.json()
        accountName = info.email || null
      } catch {}
    }

    if (!accountName && oauthConfig.provider === 'github' && accessToken) {
      try {
        const r = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
          },
        })
        const emails = await r.json() as Array<{ primary: boolean; email: string }>
        accountName = emails?.find(e => e.primary)?.email || null
      } catch {}
    }

    if (!accountName && oauthConfig.provider === 'microsoft' && accessToken) {
      try {
        const r = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const info = await r.json()
        accountName = info.mail || info.userPrincipalName || null
      } catch {}
    }

    // Persist tokens via SECURITY DEFINER RPC
    await supabase.rpc('store_oauth_tokens', {
      p_connector_id: connector_id,
      p_entity_id: entity_id,
      p_access_token: accessToken,
      p_refresh_token: refreshToken ?? null,
      p_expires_at: expiresAt ?? null,
      p_token_url: connector.oauth_token_url || provider.tokenUrl,
      p_account_name: accountName ?? null,
    })

    connectorsUrl.searchParams.set('oauth_success', connector.slug)
    return NextResponse.redirect(connectorsUrl)
  } catch (e) {
    console.error('[oauth/callback]', e)
    connectorsUrl.searchParams.set('oauth_error', 'internal')
    return NextResponse.redirect(connectorsUrl)
  }
}
