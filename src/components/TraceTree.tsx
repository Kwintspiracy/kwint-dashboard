'use client'

import { useEffect, useState } from 'react'
import { getJobTrace } from '@/lib/queries'
import Badge from '@/components/Badge'

type ToolCall = {
  id: string; tool_name: string; tool_input: Record<string, unknown> | null
  tool_output: string | null; duration_ms: number | null; turn: number | null
  created_at: string
}
type ChildJob = {
  id: string; task: string; result: string | null; status: string
  total_duration_ms: number | null; chain_count: number
  agent_id: string | null; agents: { name: string } | null
  created_at: string; completed_at: string | null
}

export default function TraceTree({ jobId }: { jobId: string }) {
  const [calls, setCalls] = useState<ToolCall[]>([])
  const [children, setChildren] = useState<ChildJob[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCall, setExpandedCall] = useState<string | null>(null)

  useEffect(() => {
    getJobTrace(jobId).then(({ calls, children }) => {
      setCalls(calls as ToolCall[])
      setChildren(children as unknown as ChildJob[])
      setLoading(false)
    })
  }, [jobId])

  if (loading) return <p className="text-xs text-neutral-500 py-2">Loading trace...</p>
  if (calls.length === 0 && children.length === 0) return <p className="text-xs text-neutral-600 py-2">No trace data for this job.</p>

  const totalDuration = calls.reduce((sum, c) => sum + (c.duration_ms || 0), 0)
  const maxDuration = Math.max(...calls.map(c => c.duration_ms || 0), 1)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-neutral-500">
        <span>{calls.length} tool call{calls.length !== 1 ? 's' : ''}</span>
        <span className="text-neutral-700">|</span>
        <span>{totalDuration}ms total tool time</span>
        {children.length > 0 && (
          <>
            <span className="text-neutral-700">|</span>
            <span>{children.length} delegation{children.length !== 1 ? 's' : ''}</span>
          </>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-0 bottom-0 w-px bg-neutral-800" />

        <div className="space-y-1">
          {calls.map((call, i) => {
            const isExpanded = expandedCall === call.id
            const barWidth = Math.max(((call.duration_ms || 0) / maxDuration) * 100, 2)
            const isDelegation = call.tool_name === 'delegate_task' || call.tool_name === 'delegate_parallel'
            const childJob = isDelegation ? children.find(c => {
              const input = call.tool_input as Record<string, unknown> | null
              return input?.agent_slug && c.agents?.name
            }) : null

            return (
              <div key={call.id}>
                <button
                  onClick={() => setExpandedCall(isExpanded ? null : call.id)}
                  className="w-full flex items-center gap-3 py-1.5 px-0 hover:bg-neutral-800/30 rounded transition-colors text-left"
                >
                  {/* Dot */}
                  <div className={`w-[23px] h-[23px] rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${
                    isDelegation ? 'border-purple-500 bg-purple-500/20' :
                    call.tool_name === 'http_request' ? 'border-blue-500 bg-blue-500/20' :
                    call.tool_name === 'save_memory' ? 'border-amber-500 bg-amber-500/20' :
                    'border-neutral-600 bg-neutral-800'
                  }`}>
                    <span className="text-[8px] font-bold text-neutral-400">{(call.turn || i + 1)}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-200">{call.tool_name}</span>
                      {call.duration_ms != null && (
                        <span className="text-[10px] text-neutral-600">{call.duration_ms}ms</span>
                      )}
                      {isDelegation && childJob && (
                        <Badge label={childJob.agents?.name || '?'} color="purple" />
                      )}
                    </div>
                    {/* Duration bar */}
                    <div className="mt-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isDelegation ? 'bg-purple-500/50' :
                          call.tool_name === 'http_request' ? 'bg-blue-500/50' :
                          'bg-neutral-600'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="ml-10 mb-2 space-y-2">
                    <div>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Input</p>
                      <pre className="text-[11px] text-neutral-300 font-mono whitespace-pre-wrap bg-neutral-800/50 rounded-lg p-2.5 max-h-32 overflow-y-auto">
                        {call.tool_input ? JSON.stringify(call.tool_input, null, 2) : '—'}
                      </pre>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Output</p>
                      <pre className="text-[11px] text-neutral-300 font-mono whitespace-pre-wrap bg-neutral-800/50 rounded-lg p-2.5 max-h-32 overflow-y-auto">
                        {call.tool_output?.slice(0, 1000) || '—'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Child delegations */}
      {children.length > 0 && (
        <div className="border-t border-neutral-800/50 pt-3 mt-3">
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">Delegated Jobs</p>
          <div className="space-y-2">
            {children.map(child => (
              <div key={child.id} className="bg-neutral-800/30 border border-neutral-800/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge label={child.agents?.name || 'Unknown'} color="purple" />
                  <Badge label={child.status} color={child.status === 'completed' ? 'emerald' : child.status === 'failed' ? 'red' : 'amber'} />
                  {child.total_duration_ms != null && child.total_duration_ms > 0 && (
                    <span className="text-[10px] text-neutral-600">{child.total_duration_ms}ms</span>
                  )}
                  {child.chain_count > 0 && (
                    <span className="text-[10px] text-neutral-600">{child.chain_count + 1} chains</span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 truncate">{child.task.slice(0, 150)}</p>
                {child.result && (
                  <p className="text-xs text-neutral-500 truncate">{child.result.slice(0, 150)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
