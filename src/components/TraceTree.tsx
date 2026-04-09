'use client'

import { useEffect, useState } from 'react'
import { getJobTraceAction } from '@/lib/actions'
import { estimateCost } from '@/lib/utils'
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
  input_tokens: number | null; output_tokens: number | null
}

// Recursive: renders one job's tool calls + its delegated children
function JobTrace({ jobId, depth = 0 }: { jobId: string; depth?: number }) {
  const [calls, setCalls] = useState<ToolCall[]>([])
  const [children, setChildren] = useState<ChildJob[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCall, setExpandedCall] = useState<string | null>(null)
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set())

  useEffect(() => {
    getJobTraceAction(jobId).then(result => {
      if (result.ok) {
        setCalls(result.data.calls as ToolCall[])
        setChildren(result.data.children as unknown as ChildJob[])
      }
      setLoading(false)
    })
  }, [jobId])

  const toggleChild = (id: string) => {
    setExpandedChildren(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) return <p className="text-xs text-neutral-500 py-1 pl-2">Loading...</p>
  if (calls.length === 0 && children.length === 0) {
    return depth === 0
      ? <p className="text-xs text-neutral-600 py-2">No trace data for this job.</p>
      : null
  }

  const totalDuration = calls.reduce((sum, c) => sum + (c.duration_ms || 0), 0)
  const maxDuration = Math.max(...calls.map(c => c.duration_ms || 0), 1)
  const indent = depth * 20

  return (
    <div className="space-y-3" style={{ paddingLeft: indent > 0 ? indent : undefined }}>
      {depth === 0 && (
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span>{calls.length} tool call{calls.length !== 1 ? 's' : ''}</span>
          <span className="text-neutral-700">|</span>
          <span>{totalDuration}ms tool time</span>
          {children.length > 0 && (
            <>
              <span className="text-neutral-700">|</span>
              <span>{children.length} delegation{children.length !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {depth > 0 && (
          <div className="absolute -left-3 top-0 bottom-0 w-px bg-purple-500/30" />
        )}
        <div className="absolute left-[11px] top-0 bottom-0 w-px bg-neutral-800" />

        <div className="space-y-1">
          {calls.map((call, i) => {
            const isExpanded = expandedCall === call.id
            const barWidth = Math.max(((call.duration_ms || 0) / maxDuration) * 100, 2)
            const isDelegation = call.tool_name === 'delegate_task' || call.tool_name === 'delegate_parallel'

            // Match this tool call to a child job by tool_use_id or positional order
            const matchedChild = isDelegation
              ? children[calls.filter((c, ci) => ci < i && (c.tool_name === 'delegate_task' || c.tool_name === 'delegate_parallel')).length]
              : null

            return (
              <div key={call.id}>
                <button
                  onClick={() => setExpandedCall(isExpanded ? null : call.id)}
                  className="w-full flex items-center gap-3 py-1.5 px-0 hover:bg-neutral-800/30 rounded transition-colors text-left"
                >
                  {/* Dot */}
                  <div className={`w-[23px] h-[23px] rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${
                    isDelegation ? 'border-purple-500 bg-purple-500/20' :
                    call.tool_name.includes('http_request') ? 'border-blue-500 bg-blue-500/20' :
                    call.tool_name === 'save_memory' ? 'border-amber-500 bg-amber-500/20' :
                    call.tool_name === 'return_result' ? 'border-emerald-500 bg-emerald-500/20' :
                    'border-neutral-600 bg-neutral-800'
                  }`}>
                    <span className="text-[8px] font-bold text-neutral-400">{(call.turn || i + 1)}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-200">{call.tool_name}</span>
                      {call.duration_ms != null && (
                        <span className="text-xs text-neutral-600">{call.duration_ms}ms</span>
                      )}
                      {isDelegation && matchedChild && (
                        <Badge label={matchedChild.agents?.name || '?'} color="purple" />
                      )}
                      {isDelegation && matchedChild && (
                        <Badge
                          label={matchedChild.status}
                          color={matchedChild.status === 'completed' ? 'emerald' : matchedChild.status === 'failed' ? 'red' : 'amber'}
                        />
                      )}
                      {isDelegation && matchedChild && (matchedChild.input_tokens || matchedChild.output_tokens) ? (
                        <span className="text-xs font-mono text-emerald-600">
                          {estimateCost(matchedChild.input_tokens ?? 0, matchedChild.output_tokens ?? 0)}
                        </span>
                      ) : null}
                    </div>
                    {/* Duration bar */}
                    <div className="mt-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isDelegation ? 'bg-purple-500/50' :
                          call.tool_name.includes('http_request') ? 'bg-blue-500/50' :
                          call.tool_name === 'return_result' ? 'bg-emerald-500/50' :
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
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Input</p>
                      <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap bg-neutral-800/50 rounded-lg p-2.5 max-h-32 overflow-y-auto">
                        {call.tool_input ? JSON.stringify(call.tool_input, null, 2) : '—'}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Output</p>
                      <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap bg-neutral-800/50 rounded-lg p-2.5 max-h-32 overflow-y-auto">
                        {call.tool_output?.slice(0, 1000) || '—'}
                      </pre>
                    </div>
                    {/* Inline child trace for delegation calls */}
                    {isDelegation && matchedChild && expandedChildren.has(matchedChild.id) && (
                      <div className="border-l-2 border-purple-500/40 pl-3">
                        <JobTrace jobId={matchedChild.id} depth={depth + 1} />
                      </div>
                    )}
                    {isDelegation && matchedChild && (
                      <button
                        onClick={() => toggleChild(matchedChild.id)}
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        {expandedChildren.has(matchedChild.id) ? '▲ Hide sub-agent trace' : '▼ Show sub-agent trace'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Child delegations summary (top-level only) */}
      {depth === 0 && children.length > 0 && (
        <div className="border-t border-neutral-800/50 pt-3 mt-3">
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Delegated Jobs</p>
          <div className="space-y-2">
            {children.map(child => (
              <div key={child.id} className="bg-neutral-800/30 border border-neutral-800/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleChild(child.id)}
                  className="w-full flex items-center gap-2 p-3 text-left hover:bg-neutral-800/50 transition-colors"
                >
                  <Badge label={child.agents?.name || 'Unknown'} color="purple" />
                  <Badge label={child.status} color={child.status === 'completed' ? 'emerald' : child.status === 'failed' ? 'red' : 'amber'} />
                  {child.total_duration_ms != null && child.total_duration_ms > 0 && (
                    <span className="text-xs text-neutral-600">{child.total_duration_ms}ms</span>
                  )}
                  {(child.input_tokens || child.output_tokens) ? (
                    <span className="text-xs font-mono text-emerald-600">
                      {estimateCost(child.input_tokens ?? 0, child.output_tokens ?? 0)}
                    </span>
                  ) : null}
                  {child.chain_count > 0 && (
                    <span className="text-xs text-neutral-600">{child.chain_count + 1} chains</span>
                  )}
                  <span className="ml-auto text-xs text-neutral-600">
                    {expandedChildren.has(child.id) ? '▲' : '▼'}
                  </span>
                </button>
                <div className="px-3 pb-2">
                  <p className="text-xs text-neutral-400 truncate">{child.task.slice(0, 150)}</p>
                  {child.result && !expandedChildren.has(child.id) && (
                    <p className="text-xs text-neutral-500 truncate mt-0.5">{child.result.slice(0, 150)}</p>
                  )}
                </div>
                {expandedChildren.has(child.id) && (
                  <div className="border-t border-neutral-800/50 px-3 py-2">
                    <JobTrace jobId={child.id} depth={1} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TraceTree({ jobId }: { jobId: string }) {
  return <JobTrace jobId={jobId} depth={0} />
}
