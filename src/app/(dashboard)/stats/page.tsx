'use client'

import { useState } from 'react'
import { useData } from '@/hooks/useData'
import { toast } from 'sonner'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import StatCardSkeleton from '@/components/skeletons/StatCardSkeleton'
import Badge from '@/components/Badge'
import JobsPerDayChart from '@/components/JobsPerDayChart'
import ToolUsageChart from '@/components/ToolUsageChart'
import {
  getAllStatsAction,
  getBudgetsAction,
  getAgentUsageAction,
  upsertBudgetAction,
  deleteBudgetAction,
} from '@/lib/actions'
import { estimateCost, estimateCostBlended, formatDuration, truncate, timeAgo } from '@/lib/utils'
import { useAuth } from '@/components/AuthProvider'

// ─── Budget types ─────────────────────────────────────────────────────────────

type Budget = {
  id: string
  agent_id: string
  daily_token_limit: number
  monthly_token_limit: number
  alert_threshold_pct: number
  auto_pause: boolean
  agents: { name: string; slug: string } | null
}

type AgentUsage = { daily: number; monthly: number }

// ─── Budget form modal ────────────────────────────────────────────────────────

function BudgetModal({
  agents,
  existing,
  onClose,
  onSaved,
}: {
  agents: { id: string; name: string }[]
  existing: Budget | null
  onClose: () => void
  onSaved: (budget: { agent_id: string; daily_token_limit: number; monthly_token_limit: number; alert_threshold_pct: number; auto_pause: boolean }) => void
}) {
  const [agentId, setAgentId] = useState(existing?.agent_id ?? agents[0]?.id ?? '')
  const [dailyLimit, setDailyLimit] = useState(String(existing?.daily_token_limit ?? 0))
  const [monthlyLimit, setMonthlyLimit] = useState(String(existing?.monthly_token_limit ?? 0))
  const [threshold, setThreshold] = useState(String(existing?.alert_threshold_pct ?? 80))
  const [autoPause, setAutoPause] = useState(existing?.auto_pause ?? false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const result = await upsertBudgetAction({
        agent_id: agentId,
        daily_token_limit: Number(dailyLimit),
        monthly_token_limit: Number(monthlyLimit),
        alert_threshold_pct: Number(threshold),
        auto_pause: autoPause,
      })
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Budget saved')
      onSaved({
        agent_id: agentId,
        daily_token_limit: Number(dailyLimit),
        monthly_token_limit: Number(monthlyLimit),
        alert_threshold_pct: Number(threshold),
        auto_pause: autoPause,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-neutral-200 mb-5">{existing ? 'Edit budget' : 'Add budget'}</h3>
        <div className="space-y-4">
          {/* Agent selector */}
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Agent</label>
            <select
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
              disabled={!!existing}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 disabled:opacity-50"
            >
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Daily token limit */}
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Daily token limit <span className="text-neutral-600">(0 = unlimited)</span></label>
            <input
              type="number"
              min="0"
              value={dailyLimit}
              onChange={e => setDailyLimit(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200"
            />
          </div>

          {/* Monthly token limit */}
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Monthly token limit <span className="text-neutral-600">(0 = unlimited)</span></label>
            <input
              type="number"
              min="0"
              value={monthlyLimit}
              onChange={e => setMonthlyLimit(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200"
            />
          </div>

          {/* Alert threshold */}
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Alert threshold: <span className="text-neutral-300">{threshold}%</span></label>
            <input
              type="range"
              min="0"
              max="100"
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
              className="w-full accent-amber-500"
            />
          </div>

          {/* Auto-pause */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoPause}
              onChange={e => setAutoPause(e.target.checked)}
              className="w-4 h-4 accent-red-500"
            />
            <span className="text-sm text-neutral-300">Auto-pause agent when limit is reached</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-white hover:bg-neutral-200 disabled:opacity-50 text-black rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Budget usage bar ─────────────────────────────────────────────────────────

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  if (limit === 0) return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[11px] text-neutral-600">
        <span>{label}</span><span>unlimited</span>
      </div>
    </div>
  )
  const pct = Math.min((used / limit) * 100, 100)
  const overLimit = used > limit
  const barColor = overLimit ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
  const textColor = overLimit ? 'text-red-400' : pct >= 80 ? 'text-amber-400' : 'text-neutral-500'
  const usedStr = used > 1_000_000 ? `${(used / 1_000_000).toFixed(1)}M` : used > 1000 ? `${(used / 1000).toFixed(1)}K` : String(used)
  const limitStr = limit > 1_000_000 ? `${(limit / 1_000_000).toFixed(1)}M` : limit > 1000 ? `${(limit / 1000).toFixed(1)}K` : String(limit)
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[11px]">
        <span className="text-neutral-500">{label}</span>
        <span className={textColor}>{usedStr} / {limitStr}</span>
      </div>
      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

type StatusColor = 'emerald' | 'red' | 'amber' | 'blue'

function statusColor(status: string): StatusColor {
  if (status === 'completed') return 'emerald'
  if (status === 'failed') return 'red'
  if (status === 'processing') return 'blue'
  return 'amber'
}

function channelColor(channel: string): 'blue' | 'purple' | 'neutral' {
  if (channel === 'slack') return 'blue'
  if (channel === 'discord') return 'purple'
  return 'neutral'
}

export default function StatsPage() {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

  const { data: stats, isLoading } = useData(['stats', eid], getAllStatsAction)

  const { data: budgets, mutate: mutateBudgets } = useData(['budgets', eid], async () => {
    const data = await getBudgetsAction() as Budget[]
    const usages = await Promise.all(
      data.map(async b => ({ id: b.agent_id, usage: await getAgentUsageAction(b.agent_id) }))
    )
    const usageMap: Record<string, AgentUsage> = {}
    for (const { id, usage } of usages) usageMap[id] = usage
    return { budgets: data, usageMap }
  })

  const [budgetModal, setBudgetModal] = useState<{ open: boolean; budget: Budget | null }>({ open: false, budget: null })

  if (isLoading && !stats) return (
    <div className="space-y-6 max-w-7xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    </div>
  )

  const jobCounts = stats?.jobCounts ?? { completed: 0, failed: 0, pending: 0, processing: 0, total: 0 }
  const totalTokens = stats?.totalTokens ?? 0
  const avgDuration = stats?.avgDuration ?? 0
  const successRate = stats?.successRate ?? 100
  const channels = stats?.channels ?? []
  const jobsPerDay = stats?.jobsPerDay ?? []
  const toolUsage = stats?.toolUsage ?? []
  const recentJobs = stats?.recentJobs ?? []
  const agentMap = stats?.agentMap ?? {}
  const costByAgent = stats?.costByAgent ?? []
  const allAgents = stats?.allAgents ?? []
  const usageMap = budgets?.usageMap ?? {}
  const budgetList: Budget[] = budgets?.budgets ?? []

  const channelStr = channels.map(c => `${c.name} ${c.value}`).join(' · ')
  const tokenDisplay = totalTokens > 1_000_000
    ? `${(totalTokens / 1_000_000).toFixed(1)}M`
    : totalTokens > 1000
    ? `${(totalTokens / 1000).toFixed(1)}K`
    : String(totalTokens)

  const successRateColor: 'emerald' | 'amber' | 'red' =
    successRate > 90 ? 'emerald' : successRate > 70 ? 'amber' : 'red'

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader title="Overview" />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Jobs"
          value={jobCounts.total}
          detail={`${jobCounts.completed} done · ${jobCounts.failed} failed`}
          color="emerald"
        />
        <StatCard
          label="Tokens"
          value={tokenDisplay}
          detail={estimateCostBlended(totalTokens)}
          color="blue"
        />
        <StatCard
          label="Avg latency"
          value={formatDuration(avgDuration)}
          detail={channelStr}
          color="purple"
        />
        <StatCard
          label="Success"
          value={`${successRate}%`}
          detail={`${jobCounts.failed} failures`}
          color={successRateColor}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-5">
          <p className="text-sm font-medium text-neutral-300 mb-4">Jobs per day</p>
          <JobsPerDayChart data={jobsPerDay} />
        </div>
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-5">
          <p className="text-sm font-medium text-neutral-300 mb-4">Tool usage</p>
          <ToolUsageChart data={toolUsage} />
        </div>
      </div>

      {/* Cost by agent */}
      {costByAgent.length > 0 && (
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-5">
          <p className="text-sm font-medium text-neutral-300 mb-4">Cost by agent</p>
          <div className="space-y-3">
            {costByAgent.map(agent => {
              const maxTokens = costByAgent[0]?.total_tokens || 1
              const barWidth = Math.max((agent.total_tokens / maxTokens) * 100, 2)
              const cost = estimateCost(agent.input_tokens || 0, agent.output_tokens || 0)
              return (
                <div key={agent.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300 font-medium">{agent.name}</span>
                    <div className="flex items-center gap-3 text-neutral-500">
                      <span>{agent.runs} runs</span>
                      <span>{(agent.total_tokens / 1000).toFixed(1)}K tokens</span>
                      <span className="text-emerald-500">{cost}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full flex">
                      <div className="bg-blue-500/70 h-full" style={{ width: `${(agent.input_tokens / maxTokens) * 100}%` }} />
                      <div className="bg-purple-500/70 h-full" style={{ width: `${(agent.output_tokens / maxTokens) * 100}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
            <div className="flex items-center gap-4 text-[10px] text-neutral-600 pt-1">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500/70" /> Input</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500/70" /> Output</span>
            </div>
          </div>
        </div>
      )}

      {/* Agent Budgets */}
      <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-neutral-300">Agent Budgets</p>
          <button
            onClick={() => setBudgetModal({ open: true, budget: null })}
            className="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors border border-neutral-700"
          >
            + Add budget
          </button>
        </div>

        {budgetList.length === 0 ? (
          <p className="text-sm text-neutral-600 py-4 text-center">No budgets configured yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetList.map(budget => {
              const usage = usageMap[budget.agent_id] ?? { daily: 0, monthly: 0 }
              const agentName = budget.agents?.name ?? agentMap[budget.agent_id] ?? 'Unknown'
              const dailyOver = budget.daily_token_limit > 0 && usage.daily >= budget.daily_token_limit
              const monthlyOver = budget.monthly_token_limit > 0 && usage.monthly >= budget.monthly_token_limit
              return (
                <div key={budget.id} className={`bg-neutral-800/50 border rounded-lg p-4 space-y-3 ${dailyOver || monthlyOver ? 'border-red-500/40' : 'border-neutral-700/50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-neutral-200">{agentName}</span>
                      {budget.auto_pause && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-medium">
                          auto-pause
                        </span>
                      )}
                      {(dailyOver || monthlyOver) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-medium">
                          limit reached
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setBudgetModal({ open: true, budget })}
                        className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors px-2 py-1 rounded hover:bg-neutral-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          const res = await deleteBudgetAction(budget.id)
                          if (!res.ok) { toast.error(res.error); return }
                          toast.success('Budget removed')
                          mutateBudgets()
                        }}
                        className="text-xs text-neutral-600 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-neutral-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <UsageBar used={usage.daily} limit={budget.daily_token_limit} label="Daily" />
                    <UsageBar used={usage.monthly} limit={budget.monthly_token_limit} label="Monthly" />
                  </div>
                  <p className="text-[10px] text-neutral-600">Alert at {budget.alert_threshold_pct}%</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Budget modal */}
      {budgetModal.open && (
        <BudgetModal
          agents={allAgents}
          existing={budgetModal.budget}
          onClose={() => setBudgetModal({ open: false, budget: null })}
          onSaved={(savedBudget) => {
            // Optimistic update — show new tile instantly
            if (budgets) {
              const optimistic = { ...budgets }
              const existing = optimistic.budgets.findIndex((b: Budget) => b.agent_id === savedBudget.agent_id)
              if (existing >= 0) {
                optimistic.budgets[existing] = { ...optimistic.budgets[existing], ...savedBudget }
              } else {
                const agentName = allAgents.find(a => a.id === savedBudget.agent_id)?.name ?? 'Agent'
                optimistic.budgets.push({ ...savedBudget, id: 'temp', agents: { name: agentName, slug: '' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Budget)
              }
              mutateBudgets(optimistic, { revalidate: true })
            } else {
              mutateBudgets()
            }
          }}
        />
      )}

      {/* Recent jobs table */}
      <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-x-auto">
        <div className="px-5 py-4 border-b border-neutral-800/50">
          <p className="text-sm font-medium text-neutral-300">Recent jobs</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800/50">
              <th className="text-left px-5 py-3 text-[11px] text-neutral-500 font-medium uppercase tracking-wider">Status</th>
              <th className="text-left hidden md:table-cell px-5 py-3 text-[11px] text-neutral-500 font-medium uppercase tracking-wider">Agent</th>
              <th className="text-left px-5 py-3 text-[11px] text-neutral-500 font-medium uppercase tracking-wider">Task</th>
              <th className="text-left hidden md:table-cell px-5 py-3 text-[11px] text-neutral-500 font-medium uppercase tracking-wider">Channel</th>
              <th className="text-right px-5 py-3 text-[11px] text-neutral-500 font-medium uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody>
            {recentJobs.map((job) => (
              <tr
                key={job.id}
                className="border-b border-neutral-800/30 hover:bg-neutral-800/30 transition-colors last:border-0"
              >
                <td className="px-5 py-3">
                  <Badge label={job.status} color={statusColor(job.status)} dot />
                </td>
                <td className="hidden md:table-cell px-5 py-3 text-neutral-400 text-sm">
                  {job.agent_id ? agentMap[job.agent_id] || '—' : '—'}
                </td>
                <td className="px-5 py-3 text-neutral-300">{truncate(job.task, 50)}</td>
                <td className="hidden md:table-cell px-5 py-3">
                  <Badge label={job.channel} color={channelColor(job.channel)} />
                </td>
                <td className="px-5 py-3 text-right text-neutral-500 text-xs">{timeAgo(job.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {recentJobs.length === 0 && (
          <p className="px-5 py-8 text-center text-neutral-600 text-sm">No jobs yet</p>
        )}
      </div>
    </div>
  )
}
