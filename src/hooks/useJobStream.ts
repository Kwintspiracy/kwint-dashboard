'use client'

import { useEffect, useRef, useState } from 'react'

type StreamEvent = {
  type: 'status' | 'tool_call' | 'done' | 'error'
  data: any
}

export function useJobStream(jobId: string | null) {
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [connected, setConnected] = useState(false)
  const sourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!jobId) return

    const source = new EventSource(`/api/jobs/${jobId}/stream`)
    sourceRef.current = source
    setConnected(true)
    setEvents([])

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
