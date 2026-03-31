'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface UseRealtimeTableOptions<T> {
  table: string
  event?: RealtimeEvent
  filter?: string
  onInsert?: (row: T) => void
  onUpdate?: (row: T) => void
  onDelete?: (row: T) => void
  onChange?: (payload: { eventType: string; new: T; old: T }) => void
  enabled?: boolean
}

export function useRealtimeTable<T = Record<string, unknown>>(
  options: UseRealtimeTableOptions<T>
) {
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    if (options.enabled === false) return

    const channelName = `realtime:${options.table}:${Date.now()}`

    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as Parameters<RealtimeChannel['on']>[0],
        {
          event: options.event ?? '*',
          schema: 'public',
          table: options.table,
          ...(options.filter ? { filter: options.filter } : {}),
        },
        (payload: { eventType: string; new: unknown; old: unknown }) => {
          const { onInsert, onUpdate, onDelete, onChange } = optionsRef.current
          const newRow = payload.new as T
          const oldRow = payload.old as T

          if (onChange) {
            onChange({ eventType: payload.eventType, new: newRow, old: oldRow })
          }

          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(newRow)
              break
            case 'UPDATE':
              onUpdate?.(newRow)
              break
            case 'DELETE':
              onDelete?.(oldRow)
              break
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [options.table, options.event, options.filter, options.enabled])
}
