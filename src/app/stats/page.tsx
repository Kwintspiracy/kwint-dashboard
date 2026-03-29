'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import Badge from '@/components/Badge'
import JobsPerDayChart from '@/components/JobsPerDayChart'
import ToolUsageChart from '@/components/ToolUsageChart'
import {
  getJobCounts,
  getTotalTokens,
  getJobsPerDay,
  getToolUsage,
  getAverageDuration,
  getSuccessRate,
  getChannelBreakdown,
  getJobs,
  getAgents,
  getCostByAgent,
} from '@/lib/queries'
import { estimateCost, formatDuration, truncate, timeAgo } from '@/lib/utils'

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
  const [loading, setLoading] = useState(true)
  const [jobCounts, setJobCounts] = useState({ completed: 0, failed: 0, pending: 0, processing: 0, total: 0 })
  const [totalTokens, setTotalTokens] = useState(0)
  const [avgDuration, setAvgDuration] = useState(0)
  const [successRate, setSuccessRate] = useState(100)
  const [channels, setChannels] = useState<{ name: string; value: number }[]>([])
  const [jobsPerDay, setJobsPerDay] = useState<{ date: string; completed: number; failed: number; pending: number }[]>([])
  const [toolUsage, setToolUsage] = useState<{ name: string; count: number }[]>([])
  const [recentJobs, setRecentJobs] = useState<{ id: string; status: string; task: string; channel: string; agent_id: string | null; created_at: string }[]>([])
  const [agentMap, setAgentMap] = useState<Record<string, string>>({})
  const [costByAgent, setCostByAgent] = useState<{ name: string; input_tokens: number; output_tokens: number; total_tokens: number; runs: number }[]>([])

  useEffect(() => {
    async function load() {
      const [counts, tokens, jpd, tools, dur, rate, chans, recent, agents, costs] = await Promise.all([
        getJobCounts(), getTotalTokens(), getJobsPerDay(), getToolUsage(),
        getAverageDuration(), getSuccessRate(), getChannelBreakdown(), getJobs(undefined, 8), getAgents(), getCostByAgent(),
      ])
      setJobCounts(counts); setTotalTokens(tokens); setJobsPerDay(jpd); setToolUsage(tools)
      setAvgDuration(dur); setSuccessRate(rate); setChannels(chans); setRecentJobs(recent); setCostByAgent(costs)
      const map: Record<string, string> = {}
      for (const a of agents) map[a.id] = a.name
      setAgentMap(map)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-neutral-500 text-sm">Loading...</p>

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Jobs"
          value={jobCounts.total}
          detail={`${jobCounts.completed} done · ${jobCounts.failed} failed`}
          color="emerald"
        />
        <StatCard
          label="Tokens"
          value={tokenDisplay}
          detail={estimateCost(totalTokens)}
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
              const cost = (agent.input_tokens * 3 + agent.output_tokens * 15) / 1_000_000
              return (
                <div key={agent.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300 font-medium">{agent.name}</span>
                    <div className="flex items-center gap-3 text-neutral-500">
                      <span>{agent.runs} runs</span>
                      <span>{(agent.total_tokens / 1000).toFixed(1)}K tokens</span>
                      <span className="text-emerald-500">${cost.toFixed(3)}</span>
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

      {/* Recent jobs table */}
      <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-800/50">
          <p className="text-sm font-medium text-neutral-300">Recent jobs</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800/50">
              <th className="text-left px-5 py-3 text-xs text-neutral-500 font-medium uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs text-neutral-500 font-medium uppercase tracking-wider">Agent</th>
              <th className="text-left px-5 py-3 text-xs text-neutral-500 font-medium uppercase tracking-wider">Task</th>
              <th className="text-left px-5 py-3 text-xs text-neutral-500 font-medium uppercase tracking-wider">Channel</th>
              <th className="text-right px-5 py-3 text-xs text-neutral-500 font-medium uppercase tracking-wider">Time</th>
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
                <td className="px-5 py-3 text-neutral-400 text-sm">
                  {job.agent_id ? agentMap[job.agent_id] || '—' : '—'}
                </td>
                <td className="px-5 py-3 text-neutral-300">{truncate(job.task, 50)}</td>
                <td className="px-5 py-3">
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
