/**
 * Combined proxy: rate-limiting (Wave 4.2) + auth gating.
 *
 * Request classification:
 *  1. If the pathname targets a rate-limited API route (/api/oauth/*, /api/webhook/*,
 *     /api/mcp/tasks, /api/configurator), run check_rate_limit via a service-role
 *     Supabase client and return 429 if exceeded. Fail-open on Supabase errors.
 *  2. Otherwise fall through to the existing auth-gating logic (session check,
 *     login redirect, onboarding gate, entity cookies).
 *
 * Next.js 16 renamed middleware.ts → proxy.ts. Both files cannot coexist, so
 * the Wave 4.2 rate-limit middleware (previously src/middleware.ts) is merged here.
 */

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Rate-limit helpers (Wave 4.2 — verbatim from the deleted middleware.ts)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Proxy entry point
// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ------------------------------------------------------------------
  // 1. Rate-limit check — runs BEFORE auth gating for API routes.
  //    Uses a service-role Supabase client (not the SSR anon-key client).
  // ------------------------------------------------------------------
  const cls = classify(pathname, request)
  if (cls) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      // Misconfigured — don't block traffic, but log server-side.
      console.error('[proxy] rate-limit disabled: missing Supabase env')
    } else {
      const { max, windowSeconds } = LIMITS[cls.bucket]
      const srClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      try {
        const { data, error } = await srClient.rpc('check_rate_limit', {
          p_key: cls.key,
          p_max: max,
          p_window_seconds: windowSeconds,
        })
        if (error) {
          // Fail-open: log but let the request through on a Supabase hiccup.
          console.error('[proxy] check_rate_limit error', error.message)
        } else if (data === false) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Retry in a moment.' },
            { status: 429, headers: { 'Retry-After': String(windowSeconds) } },
          )
        }
      } catch (e) {
        console.error('[proxy] rate-limit exception', e)
      }
    }
    // Rate-limited routes are pure API routes — no auth gating needed.
    return NextResponse.next()
  }

  // ------------------------------------------------------------------
  // 2. Auth gating — unchanged from the original proxy.ts logic.
  // ------------------------------------------------------------------

  const response = NextResponse.next({ request })

  // Server Action calls (POST with Next-Action header) cannot handle HTTP redirects —
  // the client expects RSC wire-format data, not HTML. Skip all redirect logic for them;
  // the action's own requireAuth() guard handles auth failures instead.
  const isServerAction = request.headers.has('next-action')
  if (isServerAction) return response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use getSession() (cookie-only, no network) instead of getUser() (hits Supabase
  // /auth/v1/user endpoint, 300-800ms per nav). Middleware only needs to know if
  // the user is authed for redirect gating — the real security check happens
  // in requireAuth() inside server actions, which uses getUser().
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  const isPublicPath =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/mcp') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/docs')

  if (!user && !isPublicPath) {
    // Clear entity cookies so a future login starts fresh
    const redirect = NextResponse.redirect(new URL('/login', request.url))
    redirect.cookies.delete('kwint_active_entity')
    redirect.cookies.delete('kwint_has_entities')
    return redirect
  }

  if (user && (pathname === '/login' || pathname === '/')) {
    return NextResponse.redirect(new URL('/stats', request.url))
  }

  // Onboarding gate — users without entities must complete onboarding
  if (user && !isPublicPath && !pathname.startsWith('/onboarding')) {
    const hasEntities = request.cookies.get('kwint_has_entities')?.value
    // Cookie is valid only if it matches the current user's ID
    if (hasEntities !== user.id) {
      // Check DB
      const { count } = await supabase.from('entities').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      if (!count || count === 0) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      // Store user.id so this cookie can never belong to another user
      response.cookies.set('kwint_has_entities', user.id, { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: true, secure: true, sameSite: 'lax' })
    }
  }

  // If user has entities and visits /onboarding without ?mode=add, redirect to /stats
  if (user && pathname.startsWith('/onboarding')) {
    const mode = request.nextUrl.searchParams.get('mode')
    if (mode !== 'add') {
      const hasEntities = request.cookies.get('kwint_has_entities')?.value
      if (hasEntities === user.id) {
        return NextResponse.redirect(new URL('/stats', request.url))
      }
      // Check DB to confirm
      const { count } = await supabase.from('entities').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      if (count && count > 0) {
        response.cookies.set('kwint_has_entities', user.id, { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: true, secure: true, sameSite: 'lax' })
        return NextResponse.redirect(new URL('/stats', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    // Auth gating: skip Next.js internals, static assets. API routes (except
    // the rate-limited ones below) are excluded — they handle their own auth.
    '/((?!_next/static|_next/image|favicon\\.ico|api/|app-icons/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|map)$).*)',
    // Rate-limited API routes (Wave 4.2). The auth-gating pattern above
    // excludes all /api/* via "api/" in the negative lookahead, so we add
    // these explicitly so the proxy function receives them.
    '/api/oauth/:path*',
    '/api/webhook/:path*',
    '/api/mcp/tasks',
    '/api/mcp/tasks/:path*',
    '/api/configurator',
    '/api/configurator/:path*',
  ],
}
