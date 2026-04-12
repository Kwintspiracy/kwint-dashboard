'use client'

import { useState, useEffect } from 'react'
import { getMemoriesAction, updateMemoryAction, deleteMemoryAction, getAgentsAction } from '@/lib/actions'
import { useData } from '@/hooks/useData'
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

type Agent = { id: string; name: string; slug: string }

interface Props {
  agentId: string
  onChanged?: () => void
}

const CATEGORIES = ['preference', 'context', 'learned_rule', 'outcome'] as const
const LAYERS = ['L1', 'L2', 'L3'] as const
// Tag suggestions — user can also type free-form tags
const COMMON_TAGS = ['notion', 'gmail', 'google-drive', 'google-sheets', 'google-docs', 'firecrawl', 'file-storage', 'task-board', 'job-search', 'general']

type Draft = {
  fact: string
  category: string
  importance: number
  agent_id: string | null  // null = global
  skill_tags: string[]
  memory_layer: 'L1' | 'L2' | 'L3'
}

export default function AgentMemoriesList({ agentId, onChanged }: Props) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>({ fact: '', category: 'context', importance: 3, agent_id: null, skill_tags: [], memory_layer: 'L2' })
  const [saving, setSaving] = useState(false)
  const [newTag, setNewTag] = useState('')

  const { data: agentsRaw = [] } = useData(['agents-for-memory-edit'], getAgentsAction)
  const agents = agentsRaw as Agent[]

  async function load() {
    setLoading(true)
    try {
      const rows = await getMemoriesAction(undefined, agentId, false)
      setMemories(rows as Memory[])
    } catch {
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
    setDraft({
      fact: m.fact,
      category: m.category,
      importance: m.importance,
      agent_id: m.agent_id,
      skill_tags: m.skill_tags ?? [],
      memory_layer: (m.memory_layer as 'L1' | 'L2' | 'L3') ?? 'L2',
    })
    setNewTag('')
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    try {
      const res = await updateMemoryAction(id, {
        fact: draft.fact,
        category: draft.category,
        importance: draft.importance,
        agent_id: draft.agent_id,
        skill_tags: draft.skill_tags,
        memory_layer: draft.memory_layer,
      })
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
    if (!confirm('Delete this memory? Permanent.')) return
    const res = await deleteMemoryAction(id)
    if (!res.ok) { toast.error(res.error); return }
    toast.success('Memory deleted')
    await load()
    onChanged?.()
  }

  function toggleTag(tag: string) {
    setDraft(d => d.skill_tags.includes(tag)
      ? { ...d, skill_tags: d.skill_tags.filter(t => t !== tag) }
      : { ...d, skill_tags: [...d.skill_tags, tag] })
  }

  function addCustomTag() {
    const t = newTag.trim()
    if (!t || draft.skill_tags.includes(t)) return
    setDraft(d => ({ ...d, skill_tags: [...d.skill_tags, t] }))
    setNewTag('')
  }

  if (loading) {
    return <div className="h-16 bg-neutral-900/40 rounded-lg animate-pulse" />
  }

  if (memories.length === 0) {
    return (
      <p className="text-xs text-neutral-600 italic">
        No memories scoped to this agent yet. Add some from the Memories page.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {memories.map(m => {
        const isEditing = editingId === m.id
        return (
          <div key={m.id} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3 space-y-2">
            {isEditing ? (
              <>
                {/* Fact */}
                <div>
                  <label className="text-[10px] text-neutral-600 uppercase tracking-wider mb-1 block">Fact</label>
                  <textarea
                    value={draft.fact}
                    onChange={e => setDraft(d => ({ ...d, fact: e.target.value }))}
                    rows={Math.min(12, Math.max(3, draft.fact.split('\n').length))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-2 text-xs text-white font-mono leading-relaxed focus:border-neutral-600 outline-none resize-y"
                  />
                </div>

                {/* Row: category / layer / importance / scope */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-neutral-600 uppercase tracking-wider mb-1 block">Category</label>
                    <select
                      value={draft.category}
                      onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-white focus:border-neutral-600 outline-none"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-600 uppercase tracking-wider mb-1 block">Layer</label>
                    <select
                      value={draft.memory_layer}
                      onChange={e => setDraft(d => ({ ...d, memory_layer: e.target.value as 'L1' | 'L2' | 'L3' }))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-white focus:border-neutral-600 outline-none"
                      title="L1 = always loaded, L2 = keyword match, L3 = semantic only"
                    >
                      {LAYERS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-600 uppercase tracking-wider mb-1 block">Importance</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={draft.importance}
                      onChange={e => setDraft(d => ({ ...d, importance: Math.min(5, Math.max(1, parseInt(e.target.value) || 3)) }))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-white focus:border-neutral-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-600 uppercase tracking-wider mb-1 block">Scope</label>
                    <select
                      value={draft.agent_id ?? ''}
                      onChange={e => setDraft(d => ({ ...d, agent_id: e.target.value || null }))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-white focus:border-neutral-600 outline-none"
                    >
                      <option value="">Global (all agents)</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Skill tags */}
                <div>
                  <label className="text-[10px] text-neutral-600 uppercase tracking-wider mb-1 block">Skill tags</label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {COMMON_TAGS.map(tag => {
                      const active = draft.skill_tags.includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${active ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40' : 'bg-neutral-900 text-neutral-500 border border-neutral-800 hover:border-neutral-700'}`}
                        >
                          {active ? '✓ ' : ''}{tag}
                        </button>
                      )
                    })}
                  </div>
                  {/* Custom tag input */}
                  <div className="flex gap-1 items-center">
                    <input
                      type="text"
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
                      placeholder="Add custom tag…"
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-0.5 text-[11px] text-white font-mono focus:border-neutral-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={addCustomTag}
                      disabled={!newTag.trim()}
                      className="text-[10px] text-neutral-400 hover:text-white px-2 py-0.5 rounded border border-neutral-800 disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                  {draft.skill_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {draft.skill_tags.map(t => (
                        <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/40 inline-flex items-center gap-1">
                          {t}
                          <button type="button" onClick={() => toggleTag(t)} className="hover:text-white">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-1 border-t border-neutral-800/40">
                  <button type="button" onClick={cancelEdit} className="text-[11px] text-neutral-500 hover:text-white">
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
              </>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded ${
                      m.category === 'preference' ? 'bg-violet-950/60 text-violet-400' :
                      m.category === 'context' ? 'bg-sky-950/60 text-sky-400' :
                      m.category === 'learned_rule' ? 'bg-amber-950/60 text-amber-400' :
                      'bg-neutral-800 text-neutral-500'
                    }`}>
                      {m.category}
                    </span>
                    {m.memory_layer && (
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-500">{m.memory_layer}</span>
                    )}
                    <span className="text-neutral-700">imp {m.importance}/5</span>
                    <span className={`text-[10px] ${m.agent_id ? 'text-emerald-600' : 'text-sky-600'}`}>
                      {m.agent_id ? 'agent' : 'global'}
                    </span>
                    {(m.skill_tags && m.skill_tags.length > 0) && (
                      <span className="text-neutral-600 truncate">· {m.skill_tags.join(', ')}</span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap line-clamp-3">{m.fact}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button type="button" onClick={() => startEdit(m)} className="text-[11px] text-neutral-500 hover:text-white px-2 py-0.5">Edit</button>
                  <button type="button" onClick={() => handleDelete(m.id)} className="text-[11px] text-neutral-600 hover:text-red-400 px-2 py-0.5">Delete</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
