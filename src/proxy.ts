import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })

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
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/onboarding')

  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/stats', request.url))
  }

  // Onboarding gate — users without entities must complete onboarding
  if (user && !isPublicPath && !pathname.startsWith('/onboarding')) {
    const hasEntities = request.cookies.get('kwint_has_entities')?.value
    if (!hasEntities) {
      // Check DB
      const { count } = await supabase.from('entities').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      if (!count || count === 0) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      // Set cookie so we don't check DB every request
      response.cookies.set('kwint_has_entities', '1', { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: true, secure: true, sameSite: 'lax' })
    }
  }

  // If user has entities and visits /onboarding without ?mode=add, redirect to /stats
  if (user && pathname.startsWith('/onboarding')) {
    const mode = request.nextUrl.searchParams.get('mode')
    if (mode !== 'add') {
      const hasEntities = request.cookies.get('kwint_has_entities')?.value
      if (hasEntities) {
        return NextResponse.redirect(new URL('/stats', request.url))
      }
      // Check DB to confirm
      const { count } = await supabase.from('entities').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      if (count && count > 0) {
        response.cookies.set('kwint_has_entities', '1', { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: true, secure: true, sameSite: 'lax' })
        return NextResponse.redirect(new URL('/stats', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
}
