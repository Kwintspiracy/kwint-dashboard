'use client'

import { useState, useEffect } from 'react'
import { getMemoriesAction, updateMemoryAction, deleteMemoryAction } from '@/lib/actions'
import { toast } from 'sonner'

type Memory = {
  id: string
  fact: string
  category: string
  importance: number
  agent_id: string | null
  skill_tags: string[] | null
  memory_layer: string | null
  source: string | null
  created_at: string
  updated_at: string
}

interface Props {
  agentId: string
  /** Called after a memory was edited or deleted so counts can refresh */
  onChanged?: () => void
}

/**
 * Inline list of memories scoped to a given agent. Lets the user view, edit
 * the fact text inline, change importance, and delete. Used inside the agent
 * edit panel so the user doesn't have to navigate to /memories separately.
 */
export default function AgentMemoriesList({ agentId, onChanged }: Props) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ fact: string; importance: number }>({ fact: '', importance: 3 })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      // getMemoriesAction(category?, agentId?, includeArchived?)
      const rows = await getMemoriesAction(undefined, agentId, false)
      setMemories(rows as Memory[])
    } catch (e) {
      toast.error('Failed to load memories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (agentId) load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId])

  function startEdit(m: Memory) {
    setEditingId(m.id)
    setDraft({ fact: m.fact, importance: m.importance })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    try {
      const res = await updateMemoryAction(id, { fact: draft.fact, importance: draft.importance })
      if (!res.ok) { toast.error(res.error); return }
      toast.success('Memory updated')
      setEditingId(null)
      await load()
      onChanged?.()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this memory? This is permanent.')) return
    const res = await deleteMemoryAction(id)
    if (!res.ok) { toast.error(res.error); return }
    toast.success('Memory deleted')
    await load()
    onChanged?.()
  }

  if (loading) {
    return <div className="h-16 bg-neutral-900/40 rounded-lg animate-pulse" />
  }

  if (memories.length === 0) {
    return (
      <p className="text-xs text-neutral-600 italic">
        No memories scoped to this agent yet. Apply a starter recipe below or add one from the Memories page.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {memories.map(m => (
        <div key={m.id} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3 space-y-2">
          {editingId === m.id ? (
            <>
              <textarea
                value={draft.fact}
                onChange={e => setDraft(d => ({ ...d, fact: e.target.value }))}
                rows={Math.min(10, Math.max(3, draft.fact.split('\n').length))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-2 text-xs text-white font-mono leading-relaxed focus:border-neutral-600 outline-none resize-y"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[11px] text-neutral-500">
                  Importance
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={draft.importance}
                    onChange={e => setDraft(d => ({ ...d, importance: Math.min(5, Math.max(1, parseInt(e.target.value) || 3)) }))}
                    className="w-12 bg-neutral-950 border border-neutral-800 rounded px-1.5 py-0.5 text-xs text-white focus:border-neutral-600 outline-none"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-[11px] text-neutral-500 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => saveEdit(m.id)}
                    disabled={saving}
                    className="text-[11px] font-medium bg-white text-black px-2 py-0.5 rounded hover:bg-neutral-200 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono">
                    <span className={`px-1.5 py-0.5 rounded ${
                      m.category === 'preference' ? 'bg-violet-950/60 text-violet-400' :
                      m.category === 'context' ? 'bg-sky-950/60 text-sky-400' :
                      m.category === 'learned_rule' ? 'bg-amber-950/60 text-amber-400' :
                      'bg-neutral-800 text-neutral-500'
                    }`}>
                      {m.category}
                    </span>
                    {m.memory_layer && (
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-500">
                        {m.memory_layer}
                      </span>
                    )}
                    <span className="text-neutral-700">imp {m.importance}/5</span>
                    {(m.skill_tags && m.skill_tags.length > 0) && (
                      <span className="text-neutral-600 truncate">
                        · {m.skill_tags.join(', ')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap line-clamp-3">
                    {m.fact}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(m)}
                    className="text-[11px] text-neutral-500 hover:text-white px-2 py-0.5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    className="text-[11px] text-neutral-600 hover:text-red-400 px-2 py-0.5"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
