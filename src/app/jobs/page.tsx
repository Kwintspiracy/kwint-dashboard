'use client'

import { useEffect, useState } from 'react'
import { getJobs, retryJob, cancelPendingJobs, deleteFailedJobs, deleteJob, getAgents } from '@/lib/queries'
import { truncate, timeAgo } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import TraceTree from '@/components/TraceTree'

type Job = {
  id: string; status: string; channel: string; task: string; chat_id: string | null
  tools_used: string[] | null; turn: number; result: string | null; error: string | null
  chain_count: number; agent_id: string | null; created_at: string; completed_at: string | null
}
type Agent = { id: string; name: string; is_default: boolean }

function statusColor(status: string): 'emerald' | 'red' | 'blue' | 'amber' | 'neutral' {
  if (status === 'completed') return 'emerald'
  if (status === 'failed') return 'red'
  if (status === 'processing') return 'blue'
  if (status === 'pending') return 'amber'
  return 'neutral'
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentMap, setAgentMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [agentFilter, setAgentFilter] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const f: { status?: string; channel?: string; agent_id?: string } = {}
    if (statusFilter) f.status = statusFilter
    if (channelFilter) f.channel = channelFilter
    if (agentFilter) f.agent_id = agentFilter
    const [jobData, agentData] = await Promise.all([getJobs(f), getAgents()])
    setJobs(jobData)
    setAgents(agentData)
    const map: Record<string, string> = {}
    for (const a of agentData) map[a.id] = a.name
    setAgentMap(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter, channelFilter, agentFilter])

  const stuckCount = jobs.filter(j => j.status === 'pending' || j.status === 'processing').length
  const failedCount = jobs.filter(j => j.status === 'failed').length

  async function act(fn: () => Promise<void>) { setBusy(true); await fn(); await load(); setBusy(false) }

  if (loading) return <p className="text-neutral-500 text-sm">Loading...</p>

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Jobs" count={jobs.length}>
        {stuckCount > 0 && (
          <button
            disabled={busy}
            onClick={() => act(cancelPendingJobs)}
            className="px-4 py-2 text-xs font-medium border border-amber-800 text-amber-400 rounded-lg hover:bg-amber-950 transition-colors disabled:opacity-50"
          >
            Cancel {stuckCount} stuck
          </button>
        )}
        {failedCount > 0 && (
          <button
            disabled={busy}
            onClick={() => act(async () => { if (confirm('Delete all failed?')) await deleteFailedJobs() })}
            className="px-4 py-2 text-xs font-medium border border-red-800 text-red-400 rounded-lg hover:bg-red-950 transition-colors disabled:opacity-50"
          >
            Clear {failedCount} failed
          </button>
        )}
      </PageHeader>

      <div className="flex items-center gap-2">
        <select
          value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}
          className="bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none transition-colors"
        >
          <option value="">All agents</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.name}{a.is_default ? ' (default)' : ''}</option>
          ))}
        </select>
        <select
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none transition-colors"
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
        </select>
        <select
          value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}
          className="bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none transition-colors"
        >
          <option value="">All channels</option>
          <option value="telegram">Telegram</option>
          <option value="api">API</option>
        </select>
      </div>

      <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800/50">
              <th className="text-left px-5 py-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Status</th>
              <th className="text-left hidden md:table-cell px-5 py-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Agent</th>
              <th className="text-left hidden md:table-cell px-5 py-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Channel</th>
              <th className="text-left px-5 py-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Task</th>
              <th className="text-right px-5 py-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Tools</th>
              <th className="text-right px-5 py-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Turns</th>
              <th className="text-right px-5 py-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const dur = job.completed_at
                ? Math.round((new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()) / 1000)
                : null
              return (
                <tr
                  key={job.id}
                  className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                >
                  <td className="px-5 py-3.5">
                    <Badge label={job.status} color={statusColor(job.status)} dot />
                  </td>
                  <td className="px-5 py-3.5 text-neutral-500 text-xs">
                    {job.agent_id ? (agentMap[job.agent_id] || job.agent_id.slice(0, 8)) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge label={job.channel} color="neutral" />
                  </td>
                  <td className="px-5 py-3.5 text-neutral-300 text-sm">{truncate(job.task, 50)}</td>
                  <td className="px-5 py-3.5 text-right text-neutral-500 text-xs">{job.tools_used?.length || 0}</td>
                  <td className="px-5 py-3.5 text-right text-neutral-500 text-xs">{job.turn}</td>
                  <td className="px-5 py-3.5 text-right text-neutral-500 text-xs">{dur ? `${dur}s` : timeAgo(job.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {expandedId && (() => {
          const job = jobs.find(j => j.id === expandedId)
          if (!job) return null
          return (
            <div className="border-t border-neutral-800/50 bg-neutral-950/50 px-5 py-5 space-y-4">
              <div>
                <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider mb-2">Task</p>
                <pre className="text-sm text-neutral-300 whitespace-pre-wrap bg-neutral-900/80 rounded-lg p-4 border border-neutral-800/50">{job.task}</pre>
              </div>
              {job.result && (
                <div>
                  <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider mb-2">Result</p>
                  <pre className="text-sm text-neutral-300 whitespace-pre-wrap bg-neutral-900/80 rounded-lg p-4 border border-neutral-800/50 max-h-60 overflow-auto">{job.result}</pre>
                </div>
              )}
              {job.error && (
                <div>
                  <p className="text-[11px] text-red-400 font-semibold uppercase tracking-wider mb-2">Error</p>
                  <pre className="text-sm text-red-300 whitespace-pre-wrap bg-red-950/30 rounded-lg p-4 border border-red-900/50">{job.error}</pre>
                </div>
              )}
              <div className="flex gap-4 text-xs text-neutral-600">
                <span>id: {job.id.slice(0, 8)}</span>
                <span>agent: {job.agent_id ? (agentMap[job.agent_id] || job.agent_id.slice(0, 8)) : '—'}</span>
                <span>chat: {job.chat_id || '—'}</span>
                <span>chains: {job.chain_count}</span>
                {job.tools_used?.length ? <span>tools: {job.tools_used.join(', ')}</span> : null}
              </div>

              {/* Trace tree */}
              <div className="border-t border-neutral-800/50 pt-4">
                <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider mb-3">Execution Trace</p>
                <TraceTree jobId={job.id} />
              </div>

              <div className="flex gap-2 pt-1">
                {job.status === 'failed' && (
                  <button
                    disabled={busy}
                    onClick={(e) => { e.stopPropagation(); act(() => retryJob(job.task)) }}
                    className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
                  >
                    Retry
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); act(async () => { if (confirm('Delete?')) await deleteJob(job.id) }) }}
                  className="px-4 py-2 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:border-red-800 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })()}

        {jobs.length === 0 && <EmptyState message="No jobs found" />}
      </div>
    </div>
  )
}
