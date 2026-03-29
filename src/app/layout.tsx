import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import ThemeProvider from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'Kwint Agents',
  description: 'Agent Management Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen">
        <ThemeProvider>
          <Sidebar />
          <main className="flex-1 lg:ml-56 pt-18 lg:pt-0 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
