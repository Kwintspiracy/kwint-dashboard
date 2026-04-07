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
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Live</span>
          </>
        ) : doneEvent ? (
          <>
            <span className="inline-block w-2 h-2 rounded-full bg-neutral-500" />
            <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Stream closed</span>
          </>
        ) : (
          <>
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Connecting...</span>
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
          <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">Result</p>
          <pre className="text-xs text-neutral-300 whitespace-pre-wrap">{doneEvent.data.result}</pre>
        </div>
      )}
      {doneEvent && doneEvent.data.error && (
        <div className="pt-2 border-t border-neutral-800/50">
          <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-1">Error</p>
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

// Inline status pill with pulse for running jobs
function StatusPill({ status }: { status: string }) {
  const configs: Record<string, { bg: string; text: string; border: string; dot: string; pulse: boolean }> = {
    completed: { bg: 'bg-emerald-950/50', text: 'text-emerald-400', border: 'border-emerald-900/50', dot: 'bg-emerald-500', pulse: false },
    failed:    { bg: 'bg-red-950/50',     text: 'text-red-400',     border: 'border-red-900/50',     dot: 'bg-red-500',     pulse: false },
    processing:{ bg: 'bg-amber-950/50',   text: 'text-amber-400',   border: 'border-amber-900/50',   dot: 'bg-amber-400',   pulse: true  },
    pending:   { bg: 'bg-neutral-800/60', text: 'text-neutral-400', border: 'border-neutral-700/50', dot: 'bg-neutral-500', pulse: false },
  }
  const cfg = configs[status] ?? configs.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  )
}

// Panel tab component
function PanelTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
        active
          ? 'border-violet-500 text-white'
          : 'border-transparent text-neutral-500 hover:text-neutral-300'
      }`}
    >
      {label}
    </button>
  )
}

export default function JobsPage() {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [extraJobs, setExtraJobs] = useState<Job[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [panelTab, setPanelTab] = useState<'task' | 'result' | 'trace'>('task')
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

  useEffect(() => {
    setExtraJobs([])
    setCursor(null)
    setHasMore(false)
  }, [statusFilter, channelFilter, agentFilter])

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

  const stuckCount = jobs.filter(j => ['pending', 'processing', 'awaiting_delegation'].includes(j.status)).length
  const failedCount = jobs.filter(j => j.status === 'failed').length
  const activeFilterCount = [statusFilter, channelFilter, agentFilter].filter(Boolean).length

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

  function openPanel(jobId: string) {
    setSuggestion(null)
    setPanelTab('task')
    setExpandedId(jobId)
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
            className="px-4 py-2 text-xs font-medium border border-amber-800/60 text-amber-400 rounded-lg hover:bg-amber-950/40 transition-colors duration-150 disabled:opacity-50"
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
            className="px-4 py-2 text-xs font-medium border border-red-800/60 text-red-400 rounded-lg hover:bg-red-950/40 transition-colors duration-150 disabled:opacity-50"
          >
            Clear {failedCount} failed
          </button>
        )}
      </PageHeader>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}
          className="bg-neutral-900 border border-neutral-800/60 rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none transition-colors duration-150 cursor-pointer hover:border-neutral-700"
        >
          <option value="">All agents</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.name}{a.is_default ? ' (default)' : ''}</option>
          ))}
        </select>
        <select
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-neutral-900 border border-neutral-800/60 rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none transition-colors duration-150 cursor-pointer hover:border-neutral-700"
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
        </select>
        <select
          value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}
          className="bg-neutral-900 border border-neutral-800/60 rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none transition-colors duration-150 cursor-pointer hover:border-neutral-700"
        >
          <option value="">All channels</option>
          <option value="telegram">Telegram</option>
          <option value="api">API</option>
        </select>
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-violet-950/50 text-violet-400 border border-violet-900/40">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
            <button
              onClick={() => { setStatusFilter(''); setChannelFilter(''); setAgentFilter('') }}
              className="ml-0.5 hover:text-white transition-colors"
            >
              ×
            </button>
          </span>
        )}
      </div>

      {/* Jobs table */}
      <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800/60">
                <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider hidden md:table-cell">Agent</th>
                <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider hidden md:table-cell">Channel</th>
                <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Task</th>
                <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider hidden lg:table-cell">Result</th>
                <th className="text-right px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Actions</th>
                <th className="text-right px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Duration</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const dur = job.completed_at
                  ? Math.round((new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()) / 1000)
                  : null
                const isExpanded = expandedId === job.id
                return (
                  <tr
                    key={job.id}
                    role="button"
                    tabIndex={0}
                    className={`border-b border-neutral-800/40 transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500/30 ${
                      isExpanded ? 'bg-neutral-800/40' : 'hover:bg-neutral-800/25'
                    }`}
                    onClick={() => openPanel(job.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(job.id) } }}
                  >
                    <td className="px-5 py-3">
                      <StatusPill status={job.status} />
                    </td>
                    <td className="hidden md:table-cell px-5 py-3">
                      {job.agent_id ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500/60 shrink-0" />
                          {agentMap[job.agent_id] || job.agent_id.slice(0, 8)}
                        </span>
                      ) : <span className="text-neutral-600 text-xs">—</span>}
                    </td>
                    <td className="hidden md:table-cell px-5 py-3">
                      <Badge label={job.channel === 'api' ? 'Dashboard' : job.channel} color="neutral" />
                    </td>
                    <td className="px-5 py-3 max-w-[300px]">
                      <span className="text-neutral-300 text-sm truncate block" title={job.task}>{truncate(job.task, 60)}</span>
                    </td>
                    <td className="hidden lg:table-cell px-5 py-3 max-w-[200px]">
                      {job.result
                        ? <span className="text-neutral-500 text-xs truncate block" title={job.result}>{job.result.length > 60 ? job.result.slice(0, 60) + '…' : job.result}</span>
                        : <span className="text-neutral-700 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono text-xs text-neutral-500">{job.tools_used?.length || 0}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono text-xs text-neutral-500">
                        {dur ? `${dur}s` : timeAgo(job.created_at)}
                      </span>
                    </td>
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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px]"
          onClick={() => { setExpandedId(null); setSuggestion(null) }}
        />
      )}

      {/* Side panel */}
      {(() => {
        const job = jobs.find(j => j.id === expandedId) ?? null
        return (
          <div className={`fixed top-0 right-0 h-full w-[520px] max-w-[calc(100vw-2rem)] z-50 flex flex-col bg-[#0f0f0f] border-l border-neutral-800/80 shadow-2xl transition-transform duration-300 ease-in-out ${expandedId ? 'translate-x-0' : 'translate-x-full'}`}>
            {job && (
              <>
                {/* Header */}
                <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-neutral-800/60 shrink-0">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusPill status={job.status} />
                      {job.agent_id && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500/60" />
                          {agentMap[job.agent_id] || job.agent_id.slice(0, 8)}
                        </span>
                      )}
                      <Badge label={job.channel} color="neutral" />
                    </div>
                    <p className="text-sm text-neutral-200 font-medium leading-snug truncate pr-4" title={job.task}>
                      {truncate(job.task, 80)}
                    </p>
                    <p className="text-xs text-neutral-600">{timeAgo(job.created_at)}</p>
                  </div>
                  <button
                    onClick={() => { setExpandedId(null); setSuggestion(null) }}
                    className="text-neutral-500 hover:text-neutral-200 transition-colors duration-150 p-1 -mr-1 shrink-0 mt-0.5"
                    aria-label="Close"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>

                {/* Tab bar */}
                <div className="flex border-b border-neutral-800/60 shrink-0 px-1">
                  <PanelTab label="Task" active={panelTab === 'task'} onClick={() => setPanelTab('task')} />
                  <PanelTab label="Result" active={panelTab === 'result'} onClick={() => setPanelTab('result')} />
                  <PanelTab label="Trace" active={panelTab === 'trace'} onClick={() => setPanelTab('trace')} />
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                  {/* Task tab */}
                  {panelTab === 'task' && (
                    <>
                      <div>
                        <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-2">Task</p>
                        <pre className="text-sm text-neutral-300 whitespace-pre-wrap bg-neutral-900 rounded-lg p-4 border border-neutral-800/60 leading-relaxed">{job.task}</pre>
                      </div>

                      {/* Meta info row */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-neutral-900 border border-neutral-800/50 rounded-lg px-3 py-2.5">
                          <p className="text-xs text-neutral-600 uppercase tracking-wider mb-0.5">Job ID</p>
                          <button
                            className="font-mono text-neutral-400 hover:text-neutral-200 transition-colors text-left"
                            title="Click to copy"
                            onClick={() => { navigator.clipboard.writeText(job.id); toast.success('ID copied') }}
                          >
                            {job.id.slice(0, 8)}…
                          </button>
                        </div>
                        <div className="bg-neutral-900 border border-neutral-800/50 rounded-lg px-3 py-2.5">
                          <p className="text-xs text-neutral-600 uppercase tracking-wider mb-0.5">Turns / Chains</p>
                          <p className="font-mono text-neutral-400">{job.turn} / {job.chain_count}</p>
                        </div>
                        {job.chat_id && (
                          <div className="bg-neutral-900 border border-neutral-800/50 rounded-lg px-3 py-2.5">
                            <p className="text-xs text-neutral-600 uppercase tracking-wider mb-0.5">Chat ID</p>
                            <p className="font-mono text-neutral-400 truncate">{job.chat_id}</p>
                          </div>
                        )}
                        {job.tools_used?.length ? (
                          <div className="bg-neutral-900 border border-neutral-800/50 rounded-lg px-3 py-2.5 col-span-2">
                            <p className="text-xs text-neutral-600 uppercase tracking-wider mb-0.5">Tools used</p>
                            <p className="text-neutral-400 font-mono">{job.tools_used.join(', ')}</p>
                          </div>
                        ) : null}
                      </div>

                      {job.status === 'processing' && (
                        <div className="border-t border-neutral-800/50 pt-4">
                          <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-3">Live Progress</p>
                          <LiveJobStream jobId={job.id} />
                        </div>
                      )}
                    </>
                  )}

                  {/* Result tab */}
                  {panelTab === 'result' && (
                    <>
                      {job.result ? (
                        <div>
                          <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-2">Result</p>
                          <pre className="text-sm text-neutral-300 whitespace-pre-wrap bg-neutral-900 rounded-lg p-4 border border-neutral-800/60 max-h-96 overflow-auto leading-relaxed">{job.result}</pre>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-12 text-neutral-600 text-sm">
                          No result yet
                        </div>
                      )}

                      {job.error && (
                        <div>
                          <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-2">Error</p>
                          <pre className="text-sm text-red-300 whitespace-pre-wrap bg-red-950/20 rounded-lg p-4 border border-red-900/40 leading-relaxed">{job.error}</pre>
                        </div>
                      )}

                      {suggestion && (
                        <div className="border border-amber-800/40 bg-amber-950/20 rounded-lg p-4 space-y-3">
                          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Prompt Analysis</p>
                          <div>
                            <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">Diagnosis</p>
                            <p className="text-xs text-neutral-300">{suggestion.diagnosis}</p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">Suggested addition</p>
                            <pre className="text-xs text-amber-200 whitespace-pre-wrap bg-neutral-900 rounded-lg p-3 border border-neutral-800/50">{suggestion.suggestion}</pre>
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
                              className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition-colors duration-150 disabled:opacity-50"
                            >
                              {applying ? 'Applying…' : 'Apply to agent'}
                            </button>
                            <button
                              onClick={() => setSuggestion(null)}
                              className="px-3 py-1.5 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:border-neutral-600 transition-colors duration-150"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Trace tab */}
                  {panelTab === 'trace' && (
                    <div>
                      <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-3">Execution Trace</p>
                      <TraceTree jobId={job.id} />
                    </div>
                  )}
                </div>

                {/* Footer actions */}
                <div className="flex gap-2 px-5 py-4 border-t border-neutral-800/60 shrink-0">
                  {job.status === 'failed' && (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => act(async () => {
                          const result = await retryJobAction(job.task)
                          if (!result.ok) toast.error(result.error ?? 'Failed to retry job')
                          else toast.success('Job retried')
                        })}
                        className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150 disabled:opacity-50"
                      >
                        Retry
                      </button>
                      <button
                        disabled={analyzing || !job.agent_id}
                        onClick={async () => {
                          setSuggestion(null)
                          setAnalyzing(true)
                          setPanelTab('result')
                          const result = await analyzeJobFailureAction(job.id)
                          setAnalyzing(false)
                          if (!result.ok) toast.error(result.error ?? 'Analysis failed')
                          else setSuggestion(result.data)
                        }}
                        className="px-4 py-2 text-xs font-semibold border border-amber-800/50 text-amber-400 rounded-lg hover:bg-amber-950/30 transition-colors duration-150 disabled:opacity-50"
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
                    className="ml-auto px-4 py-2 text-xs font-medium border border-neutral-800 text-neutral-500 rounded-lg hover:border-red-800/60 hover:text-red-400 transition-colors duration-150"
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
            className="px-5 py-2 text-xs font-medium border border-neutral-800 text-neutral-500 rounded-lg hover:border-neutral-700 hover:text-neutral-300 transition-colors duration-150 disabled:opacity-50"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
