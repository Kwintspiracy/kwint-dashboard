import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
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
    // Skip middleware entirely for: Next.js internals, API routes (handled by their own auth),
    // static images, and SVG/icon assets. This avoids a Supabase auth round-trip on every
    // asset/api request and cuts TTFB on navigation.
    '/((?!_next/static|_next/image|favicon\\.ico|api/|app-icons/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|map)$).*)',
  ],
}
