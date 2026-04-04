import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { OAUTH_PROVIDERS, CONNECTOR_OAUTH } from '@/lib/oauth-providers'

// Service role client — callback arrives from provider with no user session
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
    // Verify HMAC to ensure state wasn't tampered with
    const workerSecret = process.env.WORKER_SECRET || process.env.API_SECRET_KEY || ''
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

    const { connector_id, entity_id, ts } = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    )

    if (Date.now() - ts > 15 * 60 * 1000) {
      connectorsUrl.searchParams.set('oauth_error', 'state_expired')
      return NextResponse.redirect(connectorsUrl)
    }

    // Load connector
    const { data: connector } = await supabase
      .from('connectors')
      .select('id, slug, oauth_token_url')
      .eq('id', connector_id)
      .eq('entity_id', entity_id)
      .single()

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
    const clientId = process.env[provider.clientIdEnv]!
    const clientSecret = process.env[provider.clientSecretEnv]!
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
      console.error('[oauth/callback] token exchange failed', tokens)
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

    // Persist tokens
    await supabase.from('connectors').update({
      auth_type: 'oauth2',
      oauth_access_token: accessToken,
      oauth_refresh_token: refreshToken,
      oauth_token_expires_at: expiresAt,
      oauth_token_url: connector.oauth_token_url || provider.tokenUrl,
      oauth_account_name: accountName,
    }).eq('id', connector_id)

    connectorsUrl.searchParams.set('oauth_success', connector.slug)
    return NextResponse.redirect(connectorsUrl)
  } catch (e) {
    console.error('[oauth/callback]', e)
    connectorsUrl.searchParams.set('oauth_error', 'internal')
    return NextResponse.redirect(connectorsUrl)
  }
}
