import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kwint Agents',
  description: 'Agent Management Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}
