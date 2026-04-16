'use client'

import { useEffect, useRef, useState } from 'react'

type StatusEventData = { status: string; [k: string]: unknown }
type ToolCallEventData = {
  tool_name: string
  duration_ms?: number | null
  created_at: string
  [k: string]: unknown
}
type DoneEventData = {
  result?: string
  error?: string
  [k: string]: unknown
}

export type StreamEvent =
  | { type: 'status'; data: StatusEventData }
  | { type: 'tool_call'; data: ToolCallEventData }
  | { type: 'done'; data: DoneEventData }
  | { type: 'error'; data: Record<string, unknown> }

export function useJobStream(jobId: string | null) {
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [connected, setConnected] = useState(false)
  const sourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!jobId) return

    const source = new EventSource(`/api/jobs/${jobId}/stream`)
    sourceRef.current = source
    // Reset state inside the async "open" handler so we don't call setState
    // synchronously during the effect body (react-hooks/set-state-in-effect).
    source.addEventListener('open', () => {
      setConnected(true)
      setEvents([])
    })

    source.addEventListener('status', (e) => {
      setEvents(prev => [...prev, { type: 'status', data: JSON.parse(e.data) }])
    })

    source.addEventListener('tool_call', (e) => {
      setEvents(prev => [...prev, { type: 'tool_call', data: JSON.parse(e.data) }])
    })

    source.addEventListener('done', (e) => {
      setEvents(prev => [...prev, { type: 'done', data: JSON.parse(e.data) }])
      source.close()
      setConnected(false)
    })

    source.addEventListener('error', () => {
      source.close()
      setConnected(false)
    })

    return () => { source.close(); setConnected(false) }
  }, [jobId])

  return { events, connected }
}
