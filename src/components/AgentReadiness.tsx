'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type MinimalAgent = {
  id: string
  role: string
}

export type ReadinessInput = {
  agent: MinimalAgent
  skillCount: number
  teammateCount: number       // for orchestrators: # of sub-agents assigned
  teammateWithInstructions: number // for orchestrators: # of sub-agents with non-empty instructions
  memoryCount: number         // memories scoped to this agent
  globalMemoryCount: number   // global (agent_id NULL) memories for the entity
}

type Check = {
  id: string
  label: string
  ok: boolean
  hint: string  // what to do to tick this
}

export function computeReadinessChecks({ agent, skillCount, teammateCount, teammateWithInstructions, memoryCount, globalMemoryCount }: ReadinessInput): Check[] {
  const isOrchestrator = agent.role === 'orchestrator'

  const checks: Check[] = []

  // 1. Memories (scoped OR global counts)
  const effectiveMemoryCount = memoryCount + globalMemoryCount
  checks.push({
    id: 'memories',
    label: `Memories (${effectiveMemoryCount})`,
    ok: effectiveMemoryCount >= 1,
    hint: effectiveMemoryCount === 0
      ? 'Add at least 1 memory — your agent starts from zero without context about your setup (DB ids, folders, conventions).'
      : effectiveMemoryCount < 3
      ? 'Add more memories — 3+ help the agent converge faster.'
      : 'Good — memories will be auto-injected into prompts.',
  })

  // 2. Skills / capabilities
  if (isOrchestrator) {
    checks.push({
      id: 'team',
      label: `Team (${teammateCount})`,
      ok: teammateCount >= 1,
      hint: teammateCount === 0
        ? 'Assign at least 1 sub-agent — orchestrators without a team can only produce text, not execute work.'
        : 'Good — your team is set up.',
    })
  } else {
    checks.push({
      id: 'skills',
      label: `Skills (${skillCount})`,
      ok: skillCount >= 1,
      hint: skillCount === 0
        ? 'Assign at least 1 skill — otherwise your agent has no external tools (Notion, Drive, Gmail, etc.).'
        : 'Good — tools are wired.',
    })
  }

  // 3. For orchestrators: per-teammate instructions
  if (isOrchestrator) {
    const coverage = teammateCount > 0 ? teammateWithInstructions / teammateCount : 0
    checks.push({
      id: 'instructions',
      label: `Team instructions (${teammateWithInstructions}/${teammateCount})`,
      ok: teammateCount > 0 && coverage >= 1,
      hint: teammateCount === 0
        ? 'Add team members first.'
        : coverage === 0
        ? 'Write 1-sentence instructions for each teammate — tells the orchestrator WHEN to delegate to them.'
        : coverage < 1
        ? `Add instructions for the remaining ${teammateCount - teammateWithInstructions} teammate(s).`
        : 'Good — every teammate has a briefing.',
    })
  } else {
    // For workers: having scoped memories is more valuable than global
    checks.push({
      id: 'scoped-memory',
      label: `Agent-specific memory (${memoryCount})`,
      ok: memoryCount >= 1,
      hint: memoryCount === 0
        ? 'Add at least 1 memory scoped to this agent — global memories are fine, but scoped ones give the tightest context.'
        : 'Good — this agent has its own persistent context.',
    })
  }

  return checks
}

export function readinessScore(checks: Check[]): { score: number; total: number; pct: number } {
  const score = checks.filter(c => c.ok).length
  const total = checks.length
  const pct = total === 0 ? 0 : Math.round((score / total) * 100)
  return { score, total, pct }
}

// ─── Badge component ──────────────────────────────────────────────────────────

interface BadgeProps {
  input: ReadinessInput
  /** When true, renders a small pill badge. Otherwise a full checklist. */
  compact?: boolean
}

export function AgentReadinessBadge({ input, compact = true }: BadgeProps) {
  const [hovered, setHovered] = useState(false)
  const checks = computeReadinessChecks(input)
  const { score, total, pct } = readinessScore(checks)

  const tone =
    pct === 100 ? { bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-800/40', dot: 'bg-emerald-500' } :
    pct >= 66 ? { bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-800/40', dot: 'bg-amber-500' } :
    { bg: 'bg-red-950/60', text: 'text-red-400', border: 'border-red-800/40', dot: 'bg-red-500' }

  if (compact) {
    return (
      <div
        className="relative inline-block"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span
          className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full ${tone.bg} ${tone.text} border ${tone.border} font-mono leading-tight cursor-help`}
          title={`Agent readiness: ${score}/${total} checks passed`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
          {score}/{total}
        </span>
        {hovered && (
          <div className="absolute left-0 top-full mt-1.5 z-50 w-72 rounded-lg border border-neutral-700 bg-neutral-900 shadow-lg shadow-black/60 p-3 space-y-2 text-left">
            <p className="text-xs font-semibold text-neutral-300 mb-2">Readiness · {pct}%</p>
            {checks.map(c => (
              <div key={c.id} className="flex items-start gap-2">
                <span className={`mt-0.5 w-3 h-3 rounded-full shrink-0 flex items-center justify-center text-[9px] ${c.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-600'}`}>
                  {c.ok ? '✓' : '·'}
                </span>
                <div className="min-w-0">
                  <p className={`text-xs font-medium ${c.ok ? 'text-neutral-300' : 'text-neutral-400'}`}>{c.label}</p>
                  <p className="text-[11px] text-neutral-600 leading-snug mt-0.5">{c.hint}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Full checklist view (used in edit panel)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-300">Agent readiness</span>
        <span className={`text-xs font-mono ${tone.text}`}>{pct}%</span>
      </div>
      <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
        <div className={`h-full transition-all ${tone.dot}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-1.5 pt-1">
        {checks.map(c => (
          <div key={c.id} className="flex items-start gap-2">
            <span className={`mt-0.5 w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center text-[10px] ${c.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-600'}`}>
              {c.ok ? '✓' : '·'}
            </span>
            <div className="min-w-0">
              <p className={`text-xs font-medium ${c.ok ? 'text-neutral-300' : 'text-neutral-400'}`}>{c.label}</p>
              <p className="text-[11px] text-neutral-600 leading-snug mt-0.5">{c.hint}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
