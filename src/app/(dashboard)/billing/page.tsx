'use client'

import { useData } from '@/hooks/useData'
import { getBillingRunsAction } from '@/lib/actions'
import { estimateCost, estimateCostBlended, timeAgo } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'

type Run = {
  id: string
  agent_id: string | null
  input_tokens: number | null
  output_tokens: number | null
  tokens_used: number | null
  key_source: 'entity' | 'operator' | null
  created_at: string
  success: boolean
  agents: { name: string; model: string } | null
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function runCost(run: Run): number {
  const model = run.agents?.model ?? 'claude-sonnet-4-6'
  const inp = run.input_tokens ?? 0
  const out = run.output_tokens ?? 0
  if (inp + out === 0) return 0
  // Replicate estimateCost logic as a number (not string)
  const rates: Record<string, { input: number; output: number }> = {
    'claude-opus-4-6':           { input: 15,   output: 75   },
    'claude-sonnet-4-6':         { input: 3,    output: 15   },
    'claude-haiku-4-5-20251001': { input: 0.80, output: 4    },
    'claude-haiku-4-5':          { input: 0.80, output: 4    },
  }
  const fallback = { input: 3, output: 15 }
  const r = rates[model] ?? fallback
  return (inp * r.input + out * r.output) / 1_000_000
}

function fmtCost(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`
  return `$${n.toFixed(2)}`
}

export default function BillingPage() {
  const { data: runsRaw = [], isLoading } = useData(['billing-runs'], getBillingRunsAction)
  const runs = runsRaw as Run[]

  const entityRuns = runs.filter(r => r.key_source === 'entity')
  const operatorRuns = runs.filter(r => r.key_source === 'operator')
  const unknownRuns = runs.filter(r => !r.key_source)

  const totalTokens = runs.reduce((s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0)
  const entityCost = entityRuns.reduce((s, r) => s + runCost(r), 0)
  const operatorCost = operatorRuns.reduce((s, r) => s + runCost(r), 0)

  const entityTokens = entityRuns.reduce((s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0)
  const operatorTokens = operatorRuns.reduce((s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0)

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <PageHeader
        title="Billing"
        subtitle={`${runs.length} runs · ${fmtTokens(totalTokens)} tokens used`}
      />

      {/* ── Summary cards ─────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <p className="text-xs text-neutral-500">Total tokens</p>
          <p className="text-2xl font-bold text-white mt-1">{fmtTokens(totalTokens)}</p>
          <p className="text-xs text-neutral-600 mt-1">{runs.length} runs</p>
        </div>
        <div className="rounded-xl border border-emerald-900/40 bg-neutral-950 p-4">
          <p className="text-xs text-neutral-500">Est. cost — own keys</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{fmtCost(entityCost)}</p>
          <p className="text-xs text-neutral-600 mt-1">billed directly to your provider</p>
        </div>
        <div className="rounded-xl border border-amber-900/40 bg-neutral-950 p-4">
          <p className="text-xs text-neutral-500">Est. cost — operator keys</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{fmtCost(operatorCost)}</p>
          <p className="text-xs text-neutral-600 mt-1">billed by KwintAgents</p>
        </div>
      </div>

      {/* ── Key source breakdown ───────────────────────── */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-emerald-900/30 bg-neutral-950 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <p className="text-sm font-semibold text-neutral-200">Your own keys</p>
            <span className="ml-auto text-xs text-emerald-500 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {entityRuns.length} runs
            </span>
          </div>
          <p className="text-xl font-bold text-white">{fmtCost(entityCost)}</p>
          <p className="text-xs text-neutral-500 mt-1">{fmtTokens(entityTokens)} tokens · paid to your provider</p>
          <p className="text-[11px] text-neutral-600 mt-3">
            These runs used an API key you configured in Settings. KwintAgents does not charge for these.
          </p>
        </div>
        <div className="rounded-xl border border-amber-900/30 bg-neutral-950 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <p className="text-sm font-semibold text-neutral-200">Operator keys</p>
            <span className="ml-auto text-xs text-amber-500 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full">
              {operatorRuns.length} runs
            </span>
          </div>
          <p className="text-xl font-bold text-white">{fmtCost(operatorCost)}</p>
          <p className="text-xs text-neutral-500 mt-1">{fmtTokens(operatorTokens)} tokens · billed by KwintAgents</p>
          <p className="text-[11px] text-neutral-600 mt-3">
            These runs used KwintAgents' shared API key. Add your own key in{' '}
            <a href="/settings" className="text-emerald-500 hover:underline">Settings</a>{' '}
            to reduce your bill.
          </p>
        </div>
      </div>

      {/* ── Recent runs table ─────────────────────────── */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-neutral-300 mb-3">Recent runs</h2>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-neutral-900 animate-pulse" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-neutral-600 py-6 text-center">No runs yet.</p>
        ) : (
          <div className="rounded-xl border border-neutral-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/50">
                  <th className="text-left px-4 py-2.5 text-neutral-500 font-medium">Date</th>
                  <th className="text-left px-4 py-2.5 text-neutral-500 font-medium">Agent</th>
                  <th className="text-right px-4 py-2.5 text-neutral-500 font-medium">Tokens</th>
                  <th className="text-right px-4 py-2.5 text-neutral-500 font-medium">Est. cost</th>
                  <th className="text-center px-4 py-2.5 text-neutral-500 font-medium">Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {runs.map((run) => {
                  const tokens = (run.input_tokens ?? 0) + (run.output_tokens ?? 0)
                  const cost = runCost(run)
                  return (
                    <tr key={run.id} className="hover:bg-neutral-900/30 transition-colors">
                      <td className="px-4 py-2.5 text-neutral-500 whitespace-nowrap">
                        {timeAgo(run.created_at)}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-300">
                        {run.agents?.name ?? <span className="text-neutral-600">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-neutral-400 font-mono">
                        {tokens > 0 ? fmtTokens(tokens) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-neutral-400 font-mono">
                        {cost > 0 ? fmtCost(cost) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {run.key_source === 'entity' ? (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                            own key
                          </span>
                        ) : run.key_source === 'operator' ? (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                            operator
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-700">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
