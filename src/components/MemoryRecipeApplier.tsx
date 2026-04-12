'use client'

import { useState } from 'react'
import { MEMORY_RECIPES, type MemoryRecipe } from '@/lib/memory-recipes'
import { applyMemoryRecipeAction } from '@/lib/actions'
import { toast } from 'sonner'

interface Props {
  agentId: string
  agentName: string
  onApplied?: () => void
}

/**
 * Inline widget shown in the agent edit panel. Lists memory recipes; clicking
 * one expands a form where the user fills placeholders (DB ids, folder URLs,
 * etc.) before insert. Each recipe bundles 1-3 memories covering a common
 * failure pattern.
 */
export default function MemoryRecipeApplier({ agentId, agentName, onApplied }: Props) {
  const [selected, setSelected] = useState<MemoryRecipe | null>(null)
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({})
  const [applying, setApplying] = useState(false)

  function startRecipe(recipe: MemoryRecipe) {
    setSelected(recipe)
    const init: Record<string, string> = {}
    for (const p of recipe.placeholders) init[p.key] = ''
    setPlaceholders(init)
  }

  function cancel() {
    setSelected(null)
    setPlaceholders({})
  }

  async function apply() {
    if (!selected) return
    // Validate placeholders
    for (const p of selected.placeholders) {
      if (!placeholders[p.key]?.trim()) {
        toast.error(`"${p.label}" is required`)
        return
      }
    }
    // Substitute placeholders in each memory
    const rendered = selected.memories.map(m => {
      let fact = m.fact
      for (const [k, v] of Object.entries(placeholders)) {
        fact = fact.split(`{{${k}}}`).join(v.trim())
      }
      return {
        fact,
        category: m.category,
        importance: m.importance,
        global: m.global,
        skill_tags: m.skill_tags,
      }
    })
    setApplying(true)
    try {
      const res = await applyMemoryRecipeAction(agentId, rendered)
      if (!res.ok) { toast.error(res.error); return }
      toast.success(`Added ${res.data.inserted} memory${res.data.inserted > 1 ? 'ies' : ''} to ${agentName}`)
      cancel()
      onApplied?.()
    } finally {
      setApplying(false)
    }
  }

  if (!selected) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-neutral-500 mb-2">
          Starter packs of pre-written memories. Pick one that matches a workflow your agent handles — saves the agent from exploring blindly.
        </p>
        <div className="space-y-1.5">
          {MEMORY_RECIPES.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => startRecipe(r)}
              className="w-full text-left rounded-lg border border-neutral-800 hover:border-neutral-600 bg-neutral-900/40 hover:bg-neutral-800/40 transition-colors px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium">{r.name}</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">{r.description}</p>
                </div>
                <span className="text-[11px] text-neutral-700 font-mono shrink-0">
                  {r.memories.length} mem
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-violet-800/40 bg-violet-950/10 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-white font-medium">{selected.name}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">{selected.description}</p>
        </div>
        <button
          type="button"
          onClick={cancel}
          className="text-xs text-neutral-500 hover:text-white shrink-0"
        >
          Cancel
        </button>
      </div>

      {selected.placeholders.length > 0 && (
        <div className="space-y-2.5 pt-1">
          {selected.placeholders.map(p => (
            <div key={p.key}>
              <label className="block text-xs text-neutral-400 mb-1">{p.label}</label>
              <input
                type="text"
                value={placeholders[p.key] ?? ''}
                onChange={e => setPlaceholders(prev => ({ ...prev, [p.key]: e.target.value }))}
                placeholder={p.example}
                className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-700 focus:border-neutral-600 outline-none font-mono"
              />
              <p className="text-[10px] text-neutral-600 mt-0.5">{p.help}</p>
            </div>
          ))}
        </div>
      )}

      <details className="text-[11px] text-neutral-500">
        <summary className="cursor-pointer hover:text-neutral-300">Preview memories ({selected.memories.length})</summary>
        <div className="mt-2 space-y-2 pl-2 border-l border-neutral-800">
          {selected.memories.map((m, i) => (
            <div key={i} className="text-[11px] text-neutral-600 leading-relaxed">
              <span className={`text-[10px] font-mono px-1 py-px rounded ${m.global ? 'bg-sky-950/60 text-sky-400' : 'bg-violet-950/60 text-violet-400'}`}>
                {m.global ? 'global' : 'agent-scoped'}
              </span>{' '}
              {m.fact.slice(0, 180)}{m.fact.length > 180 ? '…' : ''}
            </div>
          ))}
        </div>
      </details>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={cancel}
          className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={applying}
          className="px-3 py-1.5 text-xs font-medium bg-white text-black rounded-md hover:bg-neutral-200 disabled:opacity-50"
        >
          {applying ? 'Adding…' : `Apply ${selected.memories.length} memor${selected.memories.length > 1 ? 'ies' : 'y'}`}
        </button>
      </div>
    </div>
  )
}
