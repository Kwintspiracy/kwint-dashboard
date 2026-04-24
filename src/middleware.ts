/**
 * Wave 4.2 (audit 2026-04-23) — request-rate limiting for abuse-prone routes.
 *
 * Before this middleware, `/api/oauth/*`, `/api/webhook/[slug]`, `/api/mcp/tasks`,
 * and `/api/configurator` accepted unlimited requests. The routes are otherwise
 * gated (HMAC / bearer / session), so a real DoS from random internet traffic
 * is hard, but a COMPROMISED credential could hammer any of them. Rate limits
 * bound that blast radius.
 *
 * Uses the existing Postgres RPC `check_rate_limit(key, max, window_seconds)`
 * declared in base_schema.sql. Per-route limits below err on the generous side
 * for dev/staging — tighten when real traffic patterns emerge.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type RouteLimit = { max: number; windowSeconds: number }

const LIMITS: Record<string, RouteLimit> = {
  // 30 OAuth starts/callbacks per 60s per IP — tight because each start
  // hits external discovery + DCR endpoints.
  oauth: { max: 30, windowSeconds: 60 },
  // 120 webhook fires per 60s per slug — generous; real webhooks burst.
  webhook: { max: 120, windowSeconds: 60 },
  // 60 MCP task ops per 60s per token — per-token keying catches token-abuse
  // without penalising well-behaved clients.
  mcp_tasks: { max: 60, windowSeconds: 60 },
  // 30 configurator calls per 60s per user — configurator is interactive,
  // user won't realistically exceed this.
  configurator: { max: 30, windowSeconds: 60 },
}

function ipKey(req: NextRequest): string {
  // Vercel sets x-forwarded-for; fall back to x-real-ip.
  const fwd = req.headers.get('x-forwarded-for') || ''
  const first = fwd.split(',')[0]?.trim()
  return first || req.headers.get('x-real-ip') || 'unknown'
}

function classify(pathname: string, req: NextRequest): { bucket: keyof typeof LIMITS; key: string } | null {
  if (pathname.startsWith('/api/oauth/')) {
    return { bucket: 'oauth', key: `oauth:${ipKey(req)}` }
  }
  if (pathname.startsWith('/api/webhook/')) {
    // Slug is the second-to-last segment. Key by slug so one slug's abuse
    // doesn't block another entity's webhooks.
    const slug = pathname.split('/').filter(Boolean).pop() || 'unknown'
    return { bucket: 'webhook', key: `webhook:${slug}` }
  }
  if (pathname === '/api/mcp/tasks' || pathname.startsWith('/api/mcp/tasks/')) {
    // Key by bearer token so each MCP client is throttled independently.
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7, 7 + 36) : ipKey(req)
    return { bucket: 'mcp_tasks', key: `mcp:${token}` }
  }
  if (pathname.startsWith('/api/configurator')) {
    // Configurator requires an authed session, but we don't have the user id
    // here without a round-trip to auth.getUser(). IP keying is acceptable
    // for a dev/staging posture; tighten to user-id keying when real traffic
    // warrants the extra latency.
    return { bucket: 'configurator', key: `configurator:${ipKey(req)}` }
  }
  return null
}

export async function middleware(req: NextRequest) {
  const cls = classify(req.nextUrl.pathname, req)
  if (!cls) return NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    // Misconfigured — don't block traffic, but log server-side.
    console.error('[middleware] rate-limit disabled: missing Supabase env')
    return NextResponse.next()
  }

  const { max, windowSeconds } = LIMITS[cls.bucket]
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: cls.key,
      p_max: max,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      // Rate-limit check failed — log but let the request through rather
      // than 500 the API on a Supabase hiccup.
      console.error('[middleware] check_rate_limit error', error.message)
      return NextResponse.next()
    }
    if (data === false) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Retry in a moment.' },
        { status: 429, headers: { 'Retry-After': String(windowSeconds) } },
      )
    }
  } catch (e) {
    console.error('[middleware] rate-limit exception', e)
  }
  return NextResponse.next()
}

export const config = {
  // Scope the middleware tightly to the four routes from the audit. All
  // other requests skip this entirely for zero overhead.
  matcher: [
    '/api/oauth/:path*',
    '/api/webhook/:path*',
    '/api/mcp/tasks/:path*',
    '/api/mcp/tasks',
    '/api/configurator/:path*',
    '/api/configurator',
  ],
}
