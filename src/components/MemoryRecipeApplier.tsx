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

type DraftMemory = {
  fact: string
  category: 'preference' | 'context' | 'learned_rule' | 'outcome'
  importance: number
  global: boolean
  skill_tags: string[]
}

/**
 * Inline widget shown in the agent edit panel. Lists memory recipes; clicking
 * one expands a form where the user fills placeholders AND can edit the raw
 * memory text before inserting. Nothing is fixed — everything in the template
 * is editable at apply time.
 */
export default function MemoryRecipeApplier({ agentId, agentName, onApplied }: Props) {
  const [selected, setSelected] = useState<MemoryRecipe | null>(null)
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({})
  const [drafts, setDrafts] = useState<DraftMemory[]>([])
  const [applying, setApplying] = useState(false)

  // Apply current placeholders to all draft facts (only for drafts that still
  // contain a {{KEY}} token — once the user edits manually we stop auto-substituting).
  function renderFactWithPlaceholders(template: string, values: Record<string, string>): string {
    let out = template
    for (const [k, v] of Object.entries(values)) {
      if (v.trim()) out = out.split(`{{${k}}}`).join(v.trim())
    }
    return out
  }

  function startRecipe(recipe: MemoryRecipe) {
    setSelected(recipe)
    const initP: Record<string, string> = {}
    for (const p of recipe.placeholders) initP[p.key] = p.example ?? ''
    setPlaceholders(initP)
    // Seed editable drafts from the recipe templates, with example values already substituted.
    setDrafts(recipe.memories.map(m => ({
      fact: renderFactWithPlaceholders(m.fact, initP),
      category: m.category,
      importance: m.importance,
      global: m.global,
      skill_tags: [...m.skill_tags],
    })))
  }

  function cancel() {
    setSelected(null)
    setPlaceholders({})
    setDrafts([])
  }

  // When user edits a placeholder, re-render any draft fact that still contains
  // that placeholder token (so the user sees the substitution happen live).
  // If the user has already manually edited a draft (no token left), leave it alone.
  function updatePlaceholder(key: string, value: string) {
    const newP = { ...placeholders, [key]: value }
    setPlaceholders(newP)
    if (!selected) return
    setDrafts(prev => prev.map((d, i) => {
      const template = selected.memories[i].fact
      // Re-render from the original template every time, using updated placeholders
      const autoRendered = renderFactWithPlaceholders(template, newP)
      const hasBeenManuallyEdited = d.fact !== renderFactWithPlaceholders(template, placeholders)
      return hasBeenManuallyEdited ? d : { ...d, fact: autoRendered }
    }))
  }

  async function apply() {
    if (!selected) return
    // Basic validation: no empty fact
    for (const d of drafts) {
      if (!d.fact.trim()) {
        toast.error('One of the memories has an empty fact — fill it or remove.')
        return
      }
    }
    setApplying(true)
    try {
      const res = await applyMemoryRecipeAction(agentId, drafts)
      if (!res.ok) { toast.error(res.error); return }
      toast.success(`Added ${res.data.inserted} memory${res.data.inserted > 1 ? 'ies' : ''} to ${agentName}`)
      cancel()
      onApplied?.()
    } finally {
      setApplying(false)
    }
  }

  function updateDraft(index: number, patch: Partial<DraftMemory>) {
    setDrafts(prev => prev.map((d, i) => i === index ? { ...d, ...patch } : d))
  }

  function removeDraft(index: number) {
    setDrafts(prev => prev.filter((_, i) => i !== index))
  }

  if (!selected) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-neutral-500 mb-2">
          Starter packs of pre-written memories. Pick one to customize and apply — nothing is fixed, edit the text before inserting.
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
        <button type="button" onClick={cancel} className="text-xs text-neutral-500 hover:text-white shrink-0">
          Cancel
        </button>
      </div>

      {selected.placeholders.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <p className="text-[11px] text-neutral-500 font-medium">Placeholders (auto-inserted into memories below)</p>
          {selected.placeholders.map(p => (
            <div key={p.key}>
              <label className="block text-xs text-neutral-400 mb-1">{p.label}</label>
              <input
                type="text"
                value={placeholders[p.key] ?? ''}
                onChange={e => updatePlaceholder(p.key, e.target.value)}
                placeholder={p.example}
                className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-700 focus:border-neutral-600 outline-none font-mono"
              />
              <p className="text-[10px] text-neutral-600 mt-0.5">{p.help}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-neutral-800/40">
        <p className="text-[11px] text-neutral-500 font-medium">Memories to insert — edit freely</p>
        {drafts.length === 0 && (
          <p className="text-[11px] text-neutral-600 italic">All memories removed. Cancel to start over.</p>
        )}
        {drafts.map((d, i) => (
          <div key={i} className="rounded-md border border-neutral-800 bg-neutral-900/60 p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${d.global ? 'bg-sky-950/60 text-sky-400' : 'bg-violet-950/60 text-violet-400'}`}>
                  {d.global ? 'global' : 'agent-scoped'}
                </span>
                <select
                  value={d.category}
                  onChange={e => updateDraft(i, { category: e.target.value as DraftMemory['category'] })}
                  className="text-[10px] bg-neutral-900 border border-neutral-800 rounded px-1 py-0.5 text-neutral-400 font-mono focus:border-neutral-600 outline-none"
                >
                  <option value="preference">preference</option>
                  <option value="context">context</option>
                  <option value="learned_rule">learned_rule</option>
                  <option value="outcome">outcome</option>
                </select>
                <label className="flex items-center gap-1 text-[10px] text-neutral-500">
                  imp
                  <input
                    type="number" min={1} max={5}
                    value={d.importance}
                    onChange={e => updateDraft(i, { importance: Math.min(5, Math.max(1, parseInt(e.target.value) || 3)) })}
                    className="w-10 bg-neutral-900 border border-neutral-800 rounded px-1 py-0.5 text-[10px] text-neutral-300 font-mono focus:border-neutral-600 outline-none"
                  />
                </label>
              </div>
              <button type="button" onClick={() => removeDraft(i)} className="text-[10px] text-neutral-600 hover:text-red-400">
                Remove
              </button>
            </div>
            <textarea
              value={d.fact}
              onChange={e => updateDraft(i, { fact: e.target.value })}
              rows={Math.min(8, Math.max(3, d.fact.split('\n').length))}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-[11px] text-neutral-300 font-mono leading-relaxed focus:border-neutral-600 outline-none resize-y"
            />
            <div className="flex items-center gap-2 text-[10px] text-neutral-600">
              <span>Tags:</span>
              <input
                type="text"
                value={d.skill_tags.join(', ')}
                onChange={e => updateDraft(i, { skill_tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5 text-[10px] text-neutral-400 font-mono focus:border-neutral-600 outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800/40">
        <button type="button" onClick={cancel} className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white">
          Cancel
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={applying || drafts.length === 0}
          className="px-3 py-1.5 text-xs font-medium bg-white text-black rounded-md hover:bg-neutral-200 disabled:opacity-50"
        >
          {applying ? 'Adding…' : `Apply ${drafts.length} memor${drafts.length > 1 ? 'ies' : 'y'}`}
        </button>
      </div>
    </div>
  )
}
