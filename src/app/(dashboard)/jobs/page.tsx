'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getJobsAction, retryJobAction, cancelPendingJobsAction, deleteFailedJobsAction, deleteJobAction, getAgentsAction, analyzeJobFailureAction, applyPromptSuggestionAction } from '@/lib/actions'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { useData } from '@/hooks/useData'
import { useJobStream } from '@/hooks/useJobStream'
import { useAuth } from '@/components/AuthProvider'
import { truncate, timeAgo } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import TraceTree from '@/components/TraceTree'
import TableSkeleton from '@/components/skeletons/TableSkeleton'

function LiveJobStream({ jobId }: { jobId: string }) {
  const { events, connected } = useJobStream(jobId)
  const toolCalls = events.filter(e => e.type === 'tool_call')
  const doneEvent = events.find(e => e.type === 'done')

  return (
    <div className="rounded-lg bg-neutral-950 border border-neutral-800/50 p-4 space-y-2">
      <div className="flex items-center gap-2">
        {connected ? (
          <>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">Live</span>
          </>
        ) : doneEvent ? (
          <>
            <span className="inline-block w-2 h-2 rounded-full bg-neutral-500" />
            <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Stream closed</span>
          </>
        ) : (
          <>
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider">Connecting...</span>
          </>
        )}
      </div>

      {toolCalls.length > 0 && (
        <ul className="space-y-1">
          {toolCalls.map((e, i) => (
            <li key={i} className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-mono">{e.data.tool_name}</span>
              <span className="text-neutral-600">
                {e.data.duration_ms != null ? `${e.data.duration_ms}ms` : new Date(e.data.created_at).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      )}

      {toolCalls.length === 0 && connected && (
        <p className="text-xs text-neutral-600">Waiting for tool calls...</p>
      )}

      {doneEvent && doneEvent.data.result && (
        <div className="pt-2 border-t border-neutral-800/50">
          <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider mb-1">Result</p>
          <pre className="text-xs text-neutral-300 whitespace-pre-wrap">{doneEvent.data.result}</pre>
        </div>
      )}
      {doneEvent && doneEvent.data.error && (
        <div className="pt-2 border-t border-neutral-800/50">
          <p className="text-[11px] text-red-400 font-semibold uppercase tracking-wider mb-1">Error</p>
          <pre className="text-xs text-red-300 whitespace-pre-wrap">{doneEvent.data.error}</pre>
        </div>
      )}
    </div>
  )
}

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
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [extraJobs, setExtraJobs] = useState<Job[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [agentFilter, setAgentFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [suggestion, setSuggestion] = useState<{ diagnosis: string; suggestion: string } | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [applying, setApplying] = useState(false)

  const { data: agentsData = [], } = useData(['agents', eid], getAgentsAction)
  const agents = agentsData as Agent[]
  const agentMap: Record<string, string> = {}
  for (const a of agents) agentMap[a.id] = a.name

  const { data: jobResult, isLoading: loading, mutate } = useData(
    ['jobs', eid, statusFilter, channelFilter, agentFilter],
    () => {
      const params: { cursor: string | null; limit: number; status?: string; channel?: string; agent_id?: string } = {
        cursor: null,
        limit: 50,
      }
      if (statusFilter) params.status = statusFilter
      if (channelFilter) params.channel = channelFilter
      if (agentFilter) params.agent_id = agentFilter
      return getJobsAction(params)
    }
  )

  // When filters change, reset pagination extras
  useEffect(() => {
    setExtraJobs([])
    setCursor(null)
    setHasMore(false)
  }, [statusFilter, channelFilter, agentFilter])

  // Sync pagination state from SWR result
  useEffect(() => {
    if (jobResult) {
      setCursor(jobResult.nextCursor ?? null)
      setHasMore(jobResult.hasMore ?? false)
    }
  }, [jobResult])

  const baseJobs = jobResult?.items ?? []
  const jobs = [...baseJobs, ...extraJobs]

  async function loadMore() {
    if (!cursor) return
    setBusy(true)
    try {
      const params: { cursor: string | null; limit: number; status?: string; channel?: string; agent_id?: string } = {
        cursor,
        limit: 50,
      }
      if (statusFilter) params.status = statusFilter
      if (channelFilter) params.channel = channelFilter
      if (agentFilter) params.agent_id = agentFilter
      const result = await getJobsAction(params)
      setExtraJobs(prev => [...prev, ...result.items])
      setCursor(result.nextCursor ?? null)
      setHasMore(result.hasMore ?? false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load more jobs')
    } finally {
      setBusy(false)
    }
  }

  useRealtimeTable({
    table: 'agent_jobs',
    onInsert: () => mutate(),
    onUpdate: () => mutate(),
  })

  const stuckCount = jobs.filter(j => j.status === 'pending' || j.status === 'processing').length
  const failedCount = jobs.filter(j => j.status === 'failed').length

  async function act(fn: () => Promise<void>) {
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setExtraJobs([])
      mutate()
      setBusy(false)
    }
  }

  if (loading) return <TableSkeleton rows={8} cols={7} />

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Jobs" count={jobs.length}>
        {stuckCount > 0 && (
          <button
            disabled={busy}
            onClick={() => act(async () => {
            const result = await cancelPendingJobsAction()
            if (!result.ok) toast.error(result.error ?? 'Failed to cancel jobs')
            else toast.success('Stuck jobs cancelled')
          })}
            className="px-4 py-2 text-xs font-medium border border-amber-800 text-amber-400 rounded-lg hover:bg-amber-950 transition-colors disabled:opacity-50"
          >
            Cancel {stuckCount} stuck
          </button>
        )}
        {failedCount > 0 && (
          <button
            disabled={busy}
            onClick={() => act(async () => {
              if (confirm('Delete all failed?')) {
                const result = await deleteFailedJobsAction()
                if (!result.ok) toast.error(result.error ?? 'Failed to delete failed jobs')
                else toast.success('Failed jobs cleared')
              }
            })}
            className="px-4 py-2 text-xs font-medium border border-red-800 text-red-400 rounded-lg hover:bg-red-950 transition-colors disabled:opacity-50"
          >
            Clear {failedCount} failed
          </button>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
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

      <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800/50">
              <th className="text-left px-5 py-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Status</th>
              <th className="text-left hidden lg:table-cell px-5 py-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">ID</th>
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
                  role="button"
                  tabIndex={0}
                  className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  onClick={() => { setSuggestion(null); setExpandedId(job.id) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSuggestion(null); setExpandedId(job.id) } }}
                >
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5">
                      {job.status === 'processing' && (
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                      <Badge label={job.status} color={statusColor(job.status)} dot />
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-neutral-500 text-xs">
                    {job.agent_id ? (agentMap[job.agent_id] || job.agent_id.slice(0, 8)) : '—'}
                  </td>
                  <td className="hidden lg:table-cell px-5 py-3.5 text-neutral-600 font-mono text-[11px]">{job.id.slice(0, 8)}</td>
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
        </div>

        {jobs.length === 0 && <EmptyState message="No jobs found" />}
      </div>

      {/* Side panel backdrop */}
      {expandedId && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => { setExpandedId(null); setSuggestion(null) }}
        />
      )}

      {/* Side panel */}
      {(() => {
        const job = jobs.find(j => j.id === expandedId) ?? null
        return (
          <div className={`fixed top-0 right-0 h-full w-[500px] max-w-[calc(100vw-2rem)] z-50 flex flex-col bg-neutral-900 border-l border-neutral-800 shadow-2xl transition-transform duration-300 ease-in-out ${expandedId ? 'translate-x-0' : 'translate-x-full'}`}>
            {job && (
              <>
                {/* Header */}
                <div className="flex items-start justify-between px-5 py-4 border-b border-neutral-800/50 shrink-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge label={job.status} color={statusColor(job.status)} dot />
                      {job.agent_id && <span className="text-xs text-neutral-500">{agentMap[job.agent_id] || job.agent_id.slice(0, 8)}</span>}
                    </div>
                    <p className="text-[11px] text-neutral-600">{timeAgo(job.created_at)}</p>
                  </div>
                  <button
                    onClick={() => { setExpandedId(null); setSuggestion(null) }}
                    className="text-neutral-500 hover:text-neutral-200 transition-colors p-1 -mr-1"
                    aria-label="Close"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                  <div>
                    <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider mb-2">Task</p>
                    <pre className="text-sm text-neutral-300 whitespace-pre-wrap bg-neutral-950/80 rounded-lg p-4 border border-neutral-800/50">{job.task}</pre>
                  </div>

                  {job.result && (
                    <div>
                      <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider mb-2">Result</p>
                      <pre className="text-sm text-neutral-300 whitespace-pre-wrap bg-neutral-950/80 rounded-lg p-4 border border-neutral-800/50 max-h-60 overflow-auto">{job.result}</pre>
                    </div>
                  )}

                  {job.error && (
                    <div>
                      <p className="text-[11px] text-red-400 font-semibold uppercase tracking-wider mb-2">Error</p>
                      <pre className="text-sm text-red-300 whitespace-pre-wrap bg-red-950/30 rounded-lg p-4 border border-red-900/50">{job.error}</pre>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
                    <button
                      className="font-mono hover:text-neutral-400 transition-colors text-left"
                      title="Click to copy full ID"
                      onClick={() => { navigator.clipboard.writeText(job.id); toast.success('ID copied') }}
                    >
                      id: {job.id.slice(0, 8)}
                    </button>
                    <span>chat: {job.chat_id || '—'}</span>
                    <span>chains: {job.chain_count}</span>
                    <span>turns: {job.turn}</span>
                    {job.tools_used?.length ? <span>tools: {job.tools_used.join(', ')}</span> : null}
                  </div>

                  {job.status === 'processing' && (
                    <div className="border-t border-neutral-800/50 pt-4">
                      <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider mb-3">Live Progress</p>
                      <LiveJobStream jobId={job.id} />
                    </div>
                  )}

                  <div className="border-t border-neutral-800/50 pt-4">
                    <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider mb-3">Execution Trace</p>
                    <TraceTree jobId={job.id} />
                  </div>

                  {suggestion && (
                    <div className="border border-amber-800/50 bg-amber-950/20 rounded-lg p-4 space-y-3">
                      <p className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider">Prompt Analysis</p>
                      <div>
                        <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider mb-1">Diagnosis</p>
                        <p className="text-xs text-neutral-300">{suggestion.diagnosis}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider mb-1">Suggested addition</p>
                        <pre className="text-xs text-amber-200 whitespace-pre-wrap bg-neutral-900/80 rounded-lg p-3 border border-neutral-800/50">{suggestion.suggestion}</pre>
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={applying}
                          onClick={async () => {
                            if (!job.agent_id) return
                            setApplying(true)
                            const result = await applyPromptSuggestionAction(job.agent_id, suggestion.suggestion)
                            setApplying(false)
                            if (!result.ok) toast.error(result.error ?? 'Failed to apply suggestion')
                            else { toast.success('Prompt updated'); setSuggestion(null) }
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
                        >
                          {applying ? 'Applying…' : 'Apply to agent'}
                        </button>
                        <button
                          onClick={() => setSuggestion(null)}
                          className="px-3 py-1.5 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:border-neutral-600 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer actions */}
                <div className="flex gap-2 px-5 py-4 border-t border-neutral-800/50 shrink-0">
                  {job.status === 'failed' && (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => act(async () => {
                          const result = await retryJobAction(job.task)
                          if (!result.ok) toast.error(result.error ?? 'Failed to retry job')
                          else toast.success('Job retried')
                        })}
                        className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
                      >
                        Retry
                      </button>
                      <button
                        disabled={analyzing || !job.agent_id}
                        onClick={async () => {
                          setSuggestion(null)
                          setAnalyzing(true)
                          const result = await analyzeJobFailureAction(job.id)
                          setAnalyzing(false)
                          if (!result.ok) toast.error(result.error ?? 'Analysis failed')
                          else setSuggestion(result.data)
                        }}
                        className="px-4 py-2 text-xs font-semibold border border-amber-800/50 text-amber-400 rounded-lg hover:bg-amber-950/30 transition-colors disabled:opacity-50"
                      >
                        {analyzing ? 'Analyzing…' : 'Analyze failure'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => act(async () => {
                      if (confirm('Delete?')) {
                        const result = await deleteJobAction(job.id)
                        if (!result.ok) toast.error(result.error ?? 'Failed to delete job')
                        else { toast.success('Job deleted'); setExpandedId(null) }
                      }
                    })}
                    className="ml-auto px-4 py-2 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:border-red-800 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )
      })()}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            disabled={busy}
            onClick={() => loadMore()}
            className="px-5 py-2 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:border-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-50"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
