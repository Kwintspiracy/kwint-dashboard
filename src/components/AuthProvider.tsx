'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { switchEntityAction, clearSessionCookiesAction } from '@/lib/actions'
import type { User } from '@supabase/supabase-js'

export type Entity = {
  id: string
  name: string
  slug: string
  icon: string
  description?: string | null
  industry?: string | null
  goal?: string | null
  user_id: string
  created_at: string
  updated_at?: string | null
}

type AuthContextType = {
  user: User | null
  loading: boolean
  entities: Entity[]
  activeEntity: Entity | null
  needsOnboarding: boolean
  signOut: () => Promise<void>
  switchEntity: (entity: Entity) => Promise<void>
  refreshEntities: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  entities: [],
  activeEntity: null,
  needsOnboarding: false,
  signOut: async () => {},
  switchEntity: async () => {},
  refreshEntities: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

// Wave 4.8 (audit 2026-04-23) — localStorage.kwint_active_entity removed.
// The server cookie set in actions.ts:switchEntityAction is the single source
// of truth. The server-rendered dashboard layout reads the cookie and passes
// its value as `initialEntityId`, so we still land on the user's last-active
// workspace on first mount — but the client-side mirror (which was always
// redundant since the cookie is httpOnly anyway) is gone.

export default function AuthProvider({
  children,
  initialEntityId = null,
}: {
  children: React.ReactNode
  initialEntityId?: string | null
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [entities, setEntities] = useState<Entity[]>([])
  const [activeEntity, setActiveEntity] = useState<Entity | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  const fetchEntities = useCallback(async (userId: string): Promise<Entity[]> => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('entities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at')
    if (error) {
      console.error('[AuthProvider] entities fetch failed:', error.message)
      return []
    }
    return (data || []) as Entity[]
  }, [])

  const resolveActiveEntity = useCallback((list: Entity[]): Entity | null => {
    if (list.length === 0) return null
    // Server-rendered cookie hint (Wave 4.8) — if the user's last-active
    // entity is still in their list, land on it; otherwise fall back to the
    // first workspace.
    const found = initialEntityId ? list.find(e => e.id === initialEntityId) ?? null : null
    return found ?? list[0]
  }, [initialEntityId])

  const refreshEntities = useCallback(async () => {
    if (!user) return
    const list = await fetchEntities(user.id)
    setEntities(list)
    if (list.length === 0) {
      setNeedsOnboarding(true)
      setActiveEntity(null)
    } else {
      setNeedsOnboarding(false)
      setActiveEntity(prev => {
        if (prev) {
          const updated = list.find(e => e.id === prev.id)
          return updated ?? resolveActiveEntity(list)
        }
        return resolveActiveEntity(list)
      })
    }
  }, [user, fetchEntities, resolveActiveEntity])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user }, error }) => {
      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('refresh token') || msg.includes('invalid token')) {
          // Stale cookie — clear local session and redirect to login
          await supabase.auth.signOut({ scope: 'local' })
          window.location.href = '/login'
          return
        }
      }
      setUser(user)
      if (user) {
        const list = await fetchEntities(user.id)
        setEntities(list)
        if (list.length === 0) {
          setNeedsOnboarding(true)
        } else {
          setNeedsOnboarding(false)
          const active = resolveActiveEntity(list)
          setActiveEntity(active)
          // Wave 4.8 — no client-side write. switchEntityAction updates the
          // server cookie when the user actively picks a workspace, and that
          // cookie is read server-side on the next page load (see layout.tsx).
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)
      if (!newUser) {
        setEntities([])
        setActiveEntity(null)
        setNeedsOnboarding(false)
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    await clearSessionCookiesAction()
    // Wave 4.8 — server cookie is cleared by clearSessionCookiesAction();
    // no localStorage to wipe anymore.
    window.location.href = '/login'
  }

  async function switchEntity(entity: Entity) {
    setActiveEntity(entity)
    // Wave 4.8 — only write to the server cookie. On next page load,
    // DashboardLayout reads it and seeds initialEntityId.
    await switchEntityAction(entity.id)
  }

  return (
    <AuthContext.Provider value={{ user, loading, entities, activeEntity, needsOnboarding, signOut, switchEntity, refreshEntities }}>
      {children}
    </AuthContext.Provider>
  )
}
