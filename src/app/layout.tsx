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
      <body className="flex min-h-screen overflow-x-hidden">
        <ThemeProvider>
          <Sidebar />
          <main className="flex-1 w-full lg:ml-56 pt-[72px] lg:pt-0 p-3 sm:p-5 lg:p-8 min-w-0">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
