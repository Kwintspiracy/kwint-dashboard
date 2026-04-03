'use client'

import React, { useState } from 'react'
import { getToolCallsAction } from '@/lib/actions'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/components/AuthProvider'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import TableSkeleton from '@/components/skeletons/TableSkeleton'

type ToolCall = {
  id: string
  job_id: string | null
  tool_name: string
  tool_input: Record<string, unknown> | null
  tool_output: string | null
  duration_ms: number | null
  turn: number | null
  created_at: string
  agent_jobs: { task: string; agent_id: string | null; channel: string } | null
}

export default function LogsPage() {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const { data: callsRaw = [], isLoading: loading, mutate } = useData(['tool-calls', eid], () => getToolCallsAction(200))
  const calls = callsRaw as ToolCall[]

  const filtered = filter
    ? calls.filter(c => c.tool_name.includes(filter))
    : calls

  if (loading) return <TableSkeleton rows={10} cols={5} />

  const toolNames = [...new Set(calls.map(c => c.tool_name))].sort()

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Logs" count={filtered.length}>
        <button onClick={() => mutate()} className="px-4 py-2 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:text-white hover:border-neutral-600 transition-colors">
          Refresh
        </button>
      </PageHeader>

      {/* Tool name filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !filter ? 'bg-white text-black' : 'border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
          }`}
        >
          All
        </button>
        {toolNames.map(name => (
          <button
            key={name}
            onClick={() => setFilter(name)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === name ? 'bg-white text-black' : 'border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800/50">
              <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Tool</th>
              <th className="text-left hidden md:table-cell px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Input</th>
              <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Duration</th>
              <th className="text-left hidden md:table-cell px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Channel</th>
              <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(call => {
              const expanded = expandedId === call.id
              const inputStr = call.tool_input ? JSON.stringify(call.tool_input) : ''
              return (
                <React.Fragment key={call.id}>
                  <tr
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId(expanded ? null : call.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(expanded ? null : call.id) } }}
                    className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  >
                    <td className="px-5 py-3">
                      <Badge
                        label={call.tool_name}
                        color={
                          call.tool_name === 'http_request' ? 'blue' :
                          call.tool_name === 'delegate_task' ? 'purple' :
                          call.tool_name === 'web_search' ? 'red' :
                          call.tool_name === 'save_memory' ? 'amber' :
                          'neutral'
                        }
                      />
                    </td>
                    <td className="px-5 py-3 text-neutral-400 text-xs font-mono truncate max-w-xs hidden md:table-cell">
                      {inputStr.slice(0, 80)}{inputStr.length > 80 ? '...' : ''}
                    </td>
                    <td className="px-5 py-3 text-neutral-500 text-xs">
                      {call.duration_ms != null ? `${call.duration_ms}ms` : '—'}
                    </td>
                    <td className="px-5 py-3 text-neutral-500 text-xs">
                      {call.agent_jobs?.channel || '—'}
                    </td>
                    <td className="px-5 py-3 text-neutral-600 text-xs">
                      {new Date(call.created_at).toLocaleString()}
                    </td>
                  </tr>
                  {expanded && (
                    <tr key={`${call.id}-detail`} className="border-b border-neutral-800/50 bg-neutral-900/80">
                      <td colSpan={5} className="px-5 py-4 space-y-3">
                        <div>
                          <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Input</p>
                          <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap bg-neutral-800/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                            {call.tool_input ? JSON.stringify(call.tool_input, null, 2) : '—'}
                          </pre>
                        </div>
                        <div>
                          <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Output</p>
                          <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap bg-neutral-800/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                            {call.tool_output || '—'}
                          </pre>
                        </div>
                        {call.agent_jobs && (
                          <div>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Task</p>
                            <p className="text-xs text-neutral-400">{call.agent_jobs.task.slice(0, 200)}</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState message="No tool calls logged yet" />}
      </div>
    </div>
  )
}
