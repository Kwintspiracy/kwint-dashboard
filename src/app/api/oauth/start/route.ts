import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { cookies } from 'next/headers'
import { OAUTH_PROVIDERS, CONNECTOR_OAUTH } from '@/lib/oauth-providers'

// Must be in a server-only file — client bundle cannot access these
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
  const connectorId = request.nextUrl.searchParams.get('connector_id')
  if (!connectorId) {
    return NextResponse.json({ error: 'Missing connector_id' }, { status: 400 })
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const cookieStore = await cookies()
    const entityId = cookieStore.get('kwint_active_entity')?.value
    if (!entityId) {
      return NextResponse.json({ error: 'No active workspace' }, { status: 400 })
    }

    const { data: connector } = await supabase
      .from('connectors')
      .select('id, slug, name, oauth_token_url')
      .eq('id', connectorId)
      .eq('entity_id', entityId)
      .single()

    if (!connector) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 })
    }

    const oauthConfig = CONNECTOR_OAUTH[connector.slug]
    if (!oauthConfig) {
      return NextResponse.json(
        { error: `No OAuth provider configured for connector slug "${connector.slug}"` },
        { status: 400 }
      )
    }

    const provider = OAUTH_PROVIDERS[oauthConfig.provider]
    if (!provider) {
      return NextResponse.json({ error: `Unknown provider "${oauthConfig.provider}"` }, { status: 400 })
    }

    const clientId = OAUTH_ENV[provider.clientIdEnv]
    if (!clientId) {
      return NextResponse.json(
        { error: `${provider.clientIdEnv} is not configured on this server` },
        { status: 500 }
      )
    }

    // Sign state to prevent CSRF
    const workerSecret = process.env.WORKER_SECRET || process.env.API_SECRET_KEY || ''
    const payload = Buffer.from(
      JSON.stringify({ connector_id: connectorId, entity_id: entityId, ts: Date.now() })
    ).toString('base64url')
    const hmac = createHmac('sha256', workerSecret).update(payload).digest('hex')
    const state = `${payload}.${hmac}`

    const redirectUri = `${request.nextUrl.origin}/api/oauth/callback`
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: oauthConfig.scopes.join(' '),
      state,
      ...provider.extraAuthParams,
    })

    return NextResponse.redirect(`${provider.authUrl}?${params.toString()}`)
  } catch (e) {
    console.error('[oauth/start]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
