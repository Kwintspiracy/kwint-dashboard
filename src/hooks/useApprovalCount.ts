'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtimeTable } from './useRealtimeTable'
import { useAuth } from '@/components/AuthProvider'

interface ApprovalRequest {
  id: string
  status: string
}

export function useApprovalCount(): number {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id
  const [count, setCount] = useState(0)

  useEffect(() => {
    // Async IIFE so every setCount happens outside the effect's sync
    // execution (React 19 rule react-hooks/set-state-in-effect).
    let cancelled = false
    ;(async () => {
      if (!eid) {
        if (!cancelled) setCount(0)
        return
      }
      const { count: initialCount } = await supabase
        .from('approval_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('entity_id', eid)
      if (!cancelled) setCount(initialCount ?? 0)
    })()
    return () => { cancelled = true }
  }, [eid])

  useRealtimeTable<ApprovalRequest>({
    table: 'approval_requests',
    filter: eid ? `entity_id=eq.${eid}` : undefined,
    onInsert: () => {
      setCount((c) => c + 1)
    },
    onUpdate: (row) => {
      if (row.status !== 'pending') {
        setCount((c) => Math.max(0, c - 1))
      }
    },
  })

  return count
}
