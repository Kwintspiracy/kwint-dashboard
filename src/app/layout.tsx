import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kwint Agents',
  description: 'Agent Management Dashboard',
}

// Parse the Supabase host once at build time so <link rel="preconnect"> can kick off
// the TLS handshake in parallel with HTML parsing — saves 100-300ms on first auth/DB call.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ORIGIN = SUPABASE_URL ? new URL(SUPABASE_URL).origin : ''

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {SUPABASE_ORIGIN && (
          <>
            <link rel="preconnect" href={SUPABASE_ORIGIN} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={SUPABASE_ORIGIN} />
          </>
        )}
      </head>
      <body className="flex min-h-screen overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}
