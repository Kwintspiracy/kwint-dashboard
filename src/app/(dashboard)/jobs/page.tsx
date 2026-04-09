'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getSessionsAction, retryJobAction, cancelPendingJobsAction, deleteFailedJobsAction, deleteJobAction, getAgentsAction, analyzeJobFailureAction, applyPromptSuggestionAction, getJobTraceAction } from '@/lib/actions'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { useData } from '@/hooks/useData'
import { useJobStream } from '@/hooks/useJobStream'
import { useAuth } from '@/components/AuthProvider'
import { truncate, timeAgo, estimateCost, formatDuration } from '@/lib/utils'
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

type Session = {
  session_id: string
  entity_id: string
  task: string
  original_task: string | null
  channel: string
  agent_id: string | null
  chat_id: string | null
  root_status: string
  created_at: string
  completed_at: string | null
  result: string | null
  error: string | null
  child_count: number
  total_input_tokens: number
  total_output_tokens: number
  total_duration_ms: number
  session_status: string
  child_agent_ids: string[] | null
}

type Agent = { id: string; name: string; model: string; is_default: boolean; role: string }

type ChildJob = {
  id: string; task: string; result: string | null; status: string
  total_duration_ms: number | null; chain_count: number
  agent_id: string | null; agents: { name: string } | null
  created_at: string; completed_at: string | null
  input_tokens: number | null; output_tokens: number | null
}

// Inline status pill with pulse for running sessions
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

// Agent breakdown for session overview
function SessionBreakdown({ sessionId, agentMap, agentModelMap }: { sessionId: string; agentMap: Record<string, string>; agentModelMap: Record<string, string> }) {
  const [children, setChildren] = useState<ChildJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getJobTraceAction(sessionId).then(result => {
      if (result.ok) setChildren(result.data.children as unknown as ChildJob[])
      setLoading(false)
    })
  }, [sessionId])

  if (loading) return <p className="text-xs text-neutral-600">Loading breakdown...</p>
  if (children.length === 0) return <p className="text-xs text-neutral-600">No delegations in this session.</p>

  return (
    <div className="space-y-1">
      <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-2">Agent Breakdown</p>
      <div className="bg-neutral-900 border border-neutral-800/50 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-neutral-800/50">
              <th className="text-left px-3 py-2 text-neutral-600 font-medium">Agent</th>
              <th className="text-right px-3 py-2 text-neutral-600 font-medium">Tokens</th>
              <th className="text-right px-3 py-2 text-neutral-600 font-medium">Cost</th>
              <th className="text-right px-3 py-2 text-neutral-600 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {children.map(child => {
              const model = (child.agent_id && agentModelMap[child.agent_id]) || 'claude-sonnet-4-6'
              const cost = (child.input_tokens || child.output_tokens)
                ? estimateCost(child.input_tokens ?? 0, child.output_tokens ?? 0, model)
                : null
              return (
                <tr key={child.id} className="border-b border-neutral-800/30 last:border-0">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 text-neutral-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500/60 shrink-0" />
                      {child.agents?.name || (child.agent_id ? agentMap[child.agent_id] || child.agent_id.slice(0, 8) : '?')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-neutral-500">
                    {(child.input_tokens || child.output_tokens)
                      ? `${(child.input_tokens ?? 0).toLocaleString()} / ${(child.output_tokens ?? 0).toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-400">{cost ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <StatusPill status={child.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SessionsPage() {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [extraSessions, setExtraSessions] = useState<Session[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [panelTab, setPanelTab] = useState<'overview' | 'flow' | 'result'>('overview')
  const [statusFilter, setStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [agentFilter, setAgentFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [suggestion, setSuggestion] = useState<{ diagnosis: string; suggestion: string } | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [applying, setApplying] = useState(false)

  const { data: agentsData = [] } = useData(['agents', eid], getAgentsAction)
  const agents = agentsData as Agent[]
  const agentMap: Record<string, string> = {}
  const agentModelMap: Record<string, string> = {}
  for (const a of agents) { agentMap[a.id] = a.name; agentModelMap[a.id] = a.model }

  const { data: sessionResult, isLoading: loading, mutate } = useData(
    ['sessions', eid, statusFilter, channelFilter, agentFilter],
    () => {
      const params: { cursor: string | null; limit: number; status?: string; channel?: string; agent_id?: string } = {
        cursor: null,
        limit: 30,
      }
      if (statusFilter) params.status = statusFilter
      if (channelFilter) params.channel = channelFilter
      if (agentFilter) params.agent_id = agentFilter
      return getSessionsAction(params)
    }
  )

  useEffect(() => {
    setExtraSessions([])
    setCursor(null)
    setHasMore(false)
  }, [statusFilter, channelFilter, agentFilter])

  useEffect(() => {
    if (sessionResult) {
      setCursor(sessionResult.nextCursor ?? null)
      setHasMore(sessionResult.hasMore ?? false)
    }
  }, [sessionResult])

  const baseSessions = sessionResult?.items ?? []
  const sessions = [...baseSessions, ...extraSessions] as Session[]

  async function loadMore() {
    if (!cursor) return
    setBusy(true)
    try {
      const params: { cursor: string | null; limit: number; status?: string; channel?: string; agent_id?: string } = {
        cursor,
        limit: 30,
      }
      if (statusFilter) params.status = statusFilter
      if (channelFilter) params.channel = channelFilter
      if (agentFilter) params.agent_id = agentFilter
      const result = await getSessionsAction(params)
      setExtraSessions(prev => [...prev, ...result.items as Session[]])
      setCursor(result.nextCursor ?? null)
      setHasMore(result.hasMore ?? false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load more sessions')
    } finally {
      setBusy(false)
    }
  }

  useRealtimeTable({
    table: 'agent_jobs',
    onInsert: () => mutate(),
    onUpdate: () => mutate(),
  })

  const stuckCount = sessions.filter(s => ['pending', 'processing'].includes(s.session_status)).length
  const failedCount = sessions.filter(s => s.session_status === 'failed').length
  const activeFilterCount = [statusFilter, channelFilter, agentFilter].filter(Boolean).length

  async function act(fn: () => Promise<void>) {
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setExtraSessions([])
      mutate()
      setBusy(false)
    }
  }

  function openPanel(sessionId: string) {
    setSuggestion(null)
    setPanelTab('overview')
    setExpandedId(sessionId)
  }

  if (loading) return <TableSkeleton rows={8} cols={7} />

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Sessions" count={sessions.length}>
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
          {agents.filter(a => a.role !== 'system').map(a => (
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

      {/* Sessions table */}
      <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800/60">
                <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider hidden md:table-cell">Agent</th>
                <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider hidden md:table-cell">Channel</th>
                <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Request</th>
                <th className="text-center px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider hidden lg:table-cell">Jobs</th>
                <th className="text-right px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider hidden xl:table-cell">Cost</th>
                <th className="text-right px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Duration</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => {
                const durMs = session.total_duration_ms || null
                const sessionModel = (session.agent_id && agentModelMap[session.agent_id]) || 'claude-sonnet-4-6'
                const sessionCost = (session.total_input_tokens || session.total_output_tokens)
                  ? estimateCost(session.total_input_tokens ?? 0, session.total_output_tokens ?? 0, sessionModel)
                  : null
                const isExpanded = expandedId === session.session_id
                const jobCount = (session.child_count ?? 0) + 1
                return (
                  <tr
                    key={session.session_id}
                    role="button"
                    tabIndex={0}
                    className={`border-b border-neutral-800/40 transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500/30 ${
                      isExpanded ? 'bg-neutral-800/40' : 'hover:bg-neutral-800/25'
                    }`}
                    onClick={() => openPanel(session.session_id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(session.session_id) } }}
                  >
                    <td className="px-5 py-3">
                      <StatusPill status={session.session_status} />
                    </td>
                    <td className="hidden md:table-cell px-5 py-3">
                      {session.agent_id ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500/60 shrink-0" />
                          {agentMap[session.agent_id] || session.agent_id.slice(0, 8)}
                        </span>
                      ) : <span className="text-neutral-600 text-xs">—</span>}
                    </td>
                    <td className="hidden md:table-cell px-5 py-3">
                      <Badge label={session.channel === 'api' ? 'Dashboard' : session.channel} color="neutral" />
                    </td>
                    <td className="px-5 py-3 max-w-[300px]">
                      <span className="text-neutral-300 text-sm truncate block" title={session.original_task ?? session.task}>{truncate(session.original_task ?? session.task, 60)}</span>
                    </td>
                    <td className="hidden lg:table-cell px-5 py-3 text-center">
                      {jobCount > 1 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-950/40 border border-violet-900/30 text-xs font-medium text-violet-400">
                          {jobCount}
                        </span>
                      ) : (
                        <span className="text-neutral-700 text-xs">1</span>
                      )}
                    </td>
                    <td className="hidden xl:table-cell px-5 py-3 text-right">
                      <span className="font-mono text-xs text-neutral-500">{sessionCost ?? '—'}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono text-xs text-neutral-500">
                        {durMs ? formatDuration(durMs) : timeAgo(session.created_at)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {sessions.length === 0 && <EmptyState message="No sessions found" />}
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
        const session = sessions.find(s => s.session_id === expandedId) ?? null
        return (
          <div className={`fixed top-0 right-0 h-full w-[520px] max-w-[calc(100vw-2rem)] z-50 flex flex-col bg-[#0f0f0f] border-l border-neutral-800/80 shadow-2xl transition-transform duration-300 ease-in-out ${expandedId ? 'translate-x-0' : 'translate-x-full'}`}>
            {session && (
              <>
                {/* Header */}
                <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-neutral-800/60 shrink-0">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusPill status={session.session_status} />
                      {session.agent_id && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500/60" />
                          {agentMap[session.agent_id] || session.agent_id.slice(0, 8)}
                        </span>
                      )}
                      <Badge label={session.channel} color="neutral" />
                      {(session.child_count ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-950/40 border border-violet-900/30 text-xs font-medium text-violet-400">
                          {(session.child_count ?? 0) + 1} jobs
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-200 font-medium leading-snug truncate pr-4" title={session.original_task ?? session.task}>
                      {truncate(session.original_task ?? session.task, 80)}
                    </p>
                    <p className="text-xs text-neutral-600">{timeAgo(session.created_at)}</p>
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
                  <PanelTab label="Overview" active={panelTab === 'overview'} onClick={() => setPanelTab('overview')} />
                  <PanelTab label="Flow" active={panelTab === 'flow'} onClick={() => setPanelTab('flow')} />
                  <PanelTab label="Result" active={panelTab === 'result'} onClick={() => setPanelTab('result')} />
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                  {/* Overview tab */}
                  {panelTab === 'overview' && (
                    <>
                      <div>
                        <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-2">Request</p>
                        <pre className="text-sm text-neutral-300 whitespace-pre-wrap bg-neutral-900 rounded-lg p-4 border border-neutral-800/60 leading-relaxed">{session.original_task ?? session.task}</pre>
                      </div>

                      {/* Session stats grid */}
                      {(() => {
                        const panelModel = (session.agent_id && agentModelMap[session.agent_id]) || 'claude-sonnet-4-6'
                        const panelCost = (session.total_input_tokens || session.total_output_tokens)
                          ? estimateCost(session.total_input_tokens ?? 0, session.total_output_tokens ?? 0, panelModel)
                          : null
                        const panelDurMs = session.total_duration_ms || null
                        const jobCount = (session.child_count ?? 0) + 1
                        return (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-neutral-900 border border-neutral-800/50 rounded-lg px-3 py-2.5">
                              <p className="text-xs text-neutral-600 uppercase tracking-wider mb-0.5">Session ID</p>
                              <button
                                className="font-mono text-neutral-400 hover:text-neutral-200 transition-colors text-left"
                                title="Click to copy"
                                onClick={() => { navigator.clipboard.writeText(session.session_id); toast.success('ID copied') }}
                              >
                                {session.session_id.slice(0, 8)}…
                              </button>
                            </div>
                            <div className="bg-neutral-900 border border-neutral-800/50 rounded-lg px-3 py-2.5">
                              <p className="text-xs text-neutral-600 uppercase tracking-wider mb-0.5">Jobs</p>
                              <p className="font-mono text-neutral-400">{jobCount} job{jobCount > 1 ? 's' : ''}</p>
                            </div>
                            {panelDurMs ? (
                              <div className="bg-neutral-900 border border-neutral-800/50 rounded-lg px-3 py-2.5">
                                <p className="text-xs text-neutral-600 uppercase tracking-wider mb-0.5">Duration</p>
                                <p className="font-mono text-neutral-400">{formatDuration(panelDurMs)}</p>
                              </div>
                            ) : null}
                            {(session.total_input_tokens || session.total_output_tokens) ? (
                              <div className="bg-neutral-900 border border-neutral-800/50 rounded-lg px-3 py-2.5">
                                <p className="text-xs text-neutral-600 uppercase tracking-wider mb-0.5">Total Tokens</p>
                                <p className="font-mono text-neutral-400">
                                  <span title="input">{(session.total_input_tokens ?? 0).toLocaleString()}</span>
                                  <span className="text-neutral-700"> / </span>
                                  <span title="output">{(session.total_output_tokens ?? 0).toLocaleString()}</span>
                                </p>
                              </div>
                            ) : null}
                            {panelCost ? (
                              <div className="bg-neutral-900 border border-neutral-800/50 rounded-lg px-3 py-2.5">
                                <p className="text-xs text-neutral-600 uppercase tracking-wider mb-0.5">Total Cost</p>
                                <p className="font-mono text-emerald-400 font-semibold">{panelCost}</p>
                              </div>
                            ) : null}
                            {session.chat_id && (
                              <div className="bg-neutral-900 border border-neutral-800/50 rounded-lg px-3 py-2.5">
                                <p className="text-xs text-neutral-600 uppercase tracking-wider mb-0.5">Chat ID</p>
                                <p className="font-mono text-neutral-400 truncate">{session.chat_id}</p>
                              </div>
                            )}
                          </div>
                        )
                      })()}

                      {/* Agent breakdown */}
                      {(session.child_count ?? 0) > 0 && (
                        <SessionBreakdown sessionId={session.session_id} agentMap={agentMap} agentModelMap={agentModelMap} />
                      )}

                      {session.session_status === 'processing' && (
                        <div className="border-t border-neutral-800/50 pt-4">
                          <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-3">Live Progress</p>
                          <LiveJobStream jobId={session.session_id} />
                        </div>
                      )}
                    </>
                  )}

                  {/* Flow tab */}
                  {panelTab === 'flow' && (
                    <div>
                      <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-3">Execution Flow</p>
                      <TraceTree jobId={session.session_id} />
                    </div>
                  )}

                  {/* Result tab */}
                  {panelTab === 'result' && (
                    <>
                      {session.result ? (
                        <div>
                          <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-2">Result</p>
                          <pre className="text-sm text-neutral-300 whitespace-pre-wrap bg-neutral-900 rounded-lg p-4 border border-neutral-800/60 max-h-96 overflow-auto leading-relaxed">{session.result}</pre>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-12 text-neutral-600 text-sm">
                          No result yet
                        </div>
                      )}

                      {session.error && (
                        <div>
                          <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-2">Error</p>
                          <pre className="text-sm text-red-300 whitespace-pre-wrap bg-red-950/20 rounded-lg p-4 border border-red-900/40 leading-relaxed">{session.error}</pre>
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
                                if (!session.agent_id) return
                                setApplying(true)
                                const result = await applyPromptSuggestionAction(session.agent_id, suggestion.suggestion)
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
                </div>

                {/* Footer actions */}
                <div className="flex gap-2 px-5 py-4 border-t border-neutral-800/60 shrink-0">
                  {session.session_status === 'failed' && (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => act(async () => {
                          const result = await retryJobAction(session.task)
                          if (!result.ok) toast.error(result.error ?? 'Failed to retry')
                          else toast.success('Session retried')
                        })}
                        className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150 disabled:opacity-50"
                      >
                        Retry
                      </button>
                      <button
                        disabled={analyzing || !session.agent_id}
                        onClick={async () => {
                          setSuggestion(null)
                          setAnalyzing(true)
                          setPanelTab('result')
                          const result = await analyzeJobFailureAction(session.session_id)
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
                      if (confirm('Delete this session and all its jobs?')) {
                        const result = await deleteJobAction(session.session_id)
                        if (!result.ok) toast.error(result.error ?? 'Failed to delete')
                        else { toast.success('Session deleted'); setExpandedId(null) }
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
