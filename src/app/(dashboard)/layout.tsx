import { cookies } from 'next/headers'
import Sidebar from '@/components/Sidebar'
import ThemeProvider from '@/components/ThemeProvider'
import AuthProvider from '@/components/AuthProvider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Wave 4.8 — server-render the "last active entity" hint so AuthProvider
  // can pick the right entity on first mount without reading localStorage.
  // The cookie is httpOnly from the client's side, so we forward its value
  // here (server component) as a plain prop. Removing the client-side
  // localStorage was the whole point of Wave 4.8; this preserves the
  // "land on last workspace" UX without the duplicate client-side state.
  const cookieStore = await cookies()
  const initialEntityId = cookieStore.get('kwint_active_entity')?.value ?? null

  return (
    <AuthProvider initialEntityId={initialEntityId}>
      <ThemeProvider>
        <Sidebar />
        <main className="flex-1 w-full lg:ml-56 pt-[72px] lg:pt-4 p-3 sm:p-5 lg:p-8 min-w-0">
          {children}
        </main>
      </ThemeProvider>
    </AuthProvider>
  )
}
