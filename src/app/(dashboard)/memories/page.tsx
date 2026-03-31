'use client'

import { useState, useEffect, useRef } from 'react'
import { getMemoriesAction, updateMemoryAction, deleteMemoryAction, createMemoryAction, getMemoryCountAction, getAgentsAction, searchMemoriesSemanticAction, backfillEmbeddingsAction } from '@/lib/actions'
import { timeAgo } from '@/lib/utils'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/components/AuthProvider'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import StatCardSkeleton from '@/components/skeletons/StatCardSkeleton'
import { toast } from 'sonner'

type Memory = { id: string; fact: string; category: string; importance: number; agent_id: string | null; source?: string; created_at: string; updated_at: string; similarity?: number }
type Agent = { id: string; name: string; slug: string; is_default: boolean }

const CATEGORIES = ['preference', 'context', 'outcome', 'learned_rule'] as const
const CAT_COLORS: Record<string, 'purple' | 'blue' | 'emerald' | 'amber'> = { preference: 'purple', context: 'blue', outcome: 'emerald', learned_rule: 'amber' }
const CAT_ICONS: Record<string, string> = { preference: '💜', context: '🔵', outcome: '🟢', learned_rule: '🟡' }

export default function MemoriesPage() {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

  // ── State ────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic'>('keyword')
  const [semanticQuery, setSemanticQuery] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [agentFilter, setAgentFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newFact, setNewFact] = useState('')
  const [newCat, setNewCat] = useState('context')
  const [newImp, setNewImp] = useState(3)
  const [newAgentId, setNewAgentId] = useState('')
  const [backfilling, setBackfilling] = useState(false)
  const [view, setView] = useState<'all' | 'by-agent' | 'timeline'>('all')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Data ─────────────────────────────────────────────────────
  const { data: memoriesRaw = [], isLoading: loading, mutate } = useData(
    ['memories', eid, catFilter, agentFilter],
    () => getMemoriesAction(catFilter || undefined, agentFilter || undefined)
  )
  const memories = memoriesRaw as Memory[]

  const semanticKey: unknown[] = searchMode === 'semantic' && semanticQuery.length > 0
    ? ['semantic-search', eid, semanticQuery, agentFilter]
    : ['semantic-search-idle']
  const { data: semanticRaw = [], isLoading: semanticLoading } = useData(
    semanticKey,
    () => searchMode === 'semantic' && semanticQuery.length > 0
      ? searchMemoriesSemanticAction(semanticQuery, agentFilter || undefined)
      : Promise.resolve([])
  )
  const semanticResults = semanticRaw as Memory[]

  const { data: counts = { total: 0 } as Record<string, number>, mutate: mutateCounts } = useData(['memory-counts', eid], getMemoryCountAction)
  const { data: agentsRaw = [] } = useData(['agents', eid], getAgentsAction)
  const agents = agentsRaw as Agent[]

  // ── Semantic search debounce ─────────────────────────────────
  useEffect(() => {
    if (searchMode !== 'semantic') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!search.trim()) { setSemanticQuery(''); return }
    debounceRef.current = setTimeout(() => setSemanticQuery(search.trim()), 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, searchMode])

  useEffect(() => { if (searchMode === 'keyword') setSemanticQuery('') }, [searchMode])

  // ── Computed ─────────────────────────────────────────────────
  const isSemanticActive = searchMode === 'semantic' && semanticQuery.length > 0
  let displayMemories: Memory[] = isSemanticActive
    ? semanticResults
    : search
      ? memories.filter(m => m.fact.toLowerCase().includes(search.toLowerCase()))
      : memories

  if (sourceFilter) {
    displayMemories = displayMemories.filter(m => (m.source || 'agent') === sourceFilter)
  }

  const autoLearnedCount = memories.filter(m => m.source === 'reflection').length
  const withEmbeddings = memories.length // We don't have this data yet, but we show total
  const agentMemoryCounts = agents.map(a => ({
    ...a,
    count: memories.filter(m => m.agent_id === a.id).length,
  }))
  const globalCount = memories.filter(m => !m.agent_id).length

  // ── Handlers ─────────────────────────────────────────────────
  async function handleAdd() {
    if (!newFact.trim()) return
    const result = await createMemoryAction({ fact: newFact, category: newCat, importance: newImp, agent_id: newAgentId || null })
    if (!result.ok) { toast.error(result.error); return }
    toast.success('Memory saved')
    setNewFact(''); setNewImp(3); setNewAgentId(''); setShowAdd(false)
    mutate(); mutateCounts()
  }

  async function handleBackfill() {
    setBackfilling(true)
    try {
      const result = await backfillEmbeddingsAction()
      if (!result.ok) { toast.error(result.error); return }
      toast.success(result.data.count === 0 ? 'All memories have embeddings' : `Embedded ${result.data.count} memories`)
    } finally { setBackfilling(false) }
  }

  // ── Loading ──────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-5 max-w-7xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
      </div>
    </div>
  )

  return (
    <div className="space-y-5 max-w-7xl">

      {/* ── Header ─────────────────────────────────────────── */}
      <PageHeader title="Knowledge Base" count={counts.total}>
        <button onClick={handleBackfill} disabled={backfilling}
          className="px-3 py-2 text-xs text-neutral-400 hover:text-white border border-neutral-800 rounded-lg hover:border-neutral-600 transition-colors disabled:opacity-50">
          {backfilling ? 'Embedding...' : '⚡ Embed all'}
        </button>
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors">
          + Add memory
        </button>
      </PageHeader>

      {/* ── Stats Bar ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-neutral-900/50 border border-neutral-800/30 rounded-xl p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Total memories</p>
          <p className="text-2xl font-bold text-white mt-1">{counts.total || 0}</p>
          <p className="text-xs text-neutral-600 mt-1">
            {CATEGORIES.map(c => `${counts[c] || 0} ${c.replace('_', ' ')}`).join(' · ')}
          </p>
        </div>
        <div className="bg-neutral-900/50 border border-neutral-800/30 rounded-xl p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Auto-learned</p>
          <p className="text-2xl font-bold text-violet-400 mt-1">{autoLearnedCount}</p>
          <p className="text-xs text-neutral-600 mt-1">from agent reflection</p>
        </div>
        <div className="bg-neutral-900/50 border border-neutral-800/30 rounded-xl p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Agents with memory</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{agentMemoryCounts.filter(a => a.count > 0).length}/{agents.length}</p>
          <p className="text-xs text-neutral-600 mt-1">{globalCount} global</p>
        </div>
        <div className="bg-neutral-900/50 border border-neutral-800/30 rounded-xl p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Categories</p>
          <div className="flex gap-2 mt-2">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCatFilter(catFilter === c ? '' : c)}
                className={`text-lg transition-transform ${catFilter === c ? 'scale-125' : 'opacity-50 hover:opacity-100'}`}
                title={`${c.replace('_', ' ')} (${counts[c] || 0})`}>
                {CAT_ICONS[c]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Add Memory Form ────────────────────────────────── */}
      {showAdd && (
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-5 space-y-4">
          <textarea value={newFact} onChange={e => setNewFact(e.target.value)}
            placeholder="What should the agent remember?" rows={2}
            className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white resize-none focus:border-neutral-600 focus:outline-none" />
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[10px] text-neutral-600 uppercase tracking-wider mb-1">Category</label>
              <select value={newCat} onChange={e => setNewCat(e.target.value)}
                className="bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300">
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-neutral-600 uppercase tracking-wider mb-1">Importance</label>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setNewImp(n)}
                    className={`text-base ${n <= newImp ? 'text-amber-400' : 'text-neutral-700 hover:text-amber-400'}`}>★</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-neutral-600 uppercase tracking-wider mb-1">Agent</label>
              <select value={newAgentId} onChange={e => setNewAgentId(e.target.value)}
                className="bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300">
                <option value="">Global</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-neutral-500 hover:text-white">Cancel</button>
              <button onClick={handleAdd} className="px-4 py-1.5 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Search + Filters + View Toggle ─────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && searchMode === 'semantic' && search.trim()) {
                if (debounceRef.current) clearTimeout(debounceRef.current)
                setSemanticQuery(search.trim())
              }
            }}
            placeholder={searchMode === 'semantic' ? 'Search by meaning...' : 'Filter memories...'}
            className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg pl-4 pr-12 py-2 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none" />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex">
            <button onClick={() => setSearchMode(searchMode === 'keyword' ? 'semantic' : 'keyword')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border ${searchMode === 'semantic' ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-900/50' : 'bg-neutral-700/80 text-neutral-400 border-neutral-600 hover:bg-neutral-600 hover:text-white hover:border-neutral-500'}`}>
              {searchMode === 'semantic' ? '✦ AI' : '✦ AI'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
          className="bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300">
          <option value="">All agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          className="bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300">
          <option value="">All sources</option>
          <option value="agent">Agent-saved</option>
          <option value="reflection">Auto-learned</option>
          <option value="manual">Manual</option>
        </select>

        {/* View toggle */}
        <div className="flex bg-neutral-800/50 border border-neutral-800 rounded-lg overflow-hidden text-[10px] ml-auto">
          {(['all', 'by-agent', 'timeline'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-2 transition-colors capitalize ${view === v ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
              {v === 'by-agent' ? 'By Agent' : v === 'timeline' ? 'Timeline' : 'All'}
            </button>
          ))}
        </div>

        {isSemanticActive && semanticLoading && <span className="text-xs text-neutral-500 animate-pulse">Searching...</span>}
      </div>

      {/* ── View: All ──────────────────────────────────────── */}
      {view === 'all' && (
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-hidden divide-y divide-neutral-800/50">
          {displayMemories.length === 0 ? (
            <EmptyState message={search ? 'No memories match your search' : 'No memories yet'} />
          ) : displayMemories.map(m => (
            <MemoryRow key={m.id} m={m} agents={agents} onUpdate={mutate} onDelete={() => { mutate(); mutateCounts() }} />
          ))}
        </div>
      )}

      {/* ── View: By Agent ─────────────────────────────────── */}
      {view === 'by-agent' && (
        <div className="space-y-4">
          {/* Global memories */}
          <AgentMemoryGroup
            title="Global memories" subtitle="Available to all agents"
            icon="🌐" memories={displayMemories.filter(m => !m.agent_id)}
            agents={agents} onUpdate={mutate} onDelete={() => { mutate(); mutateCounts() }}
          />
          {/* Per-agent */}
          {agents.map(a => (
            <AgentMemoryGroup key={a.id}
              title={a.name} subtitle={a.slug} icon="🤖"
              memories={displayMemories.filter(m => m.agent_id === a.id)}
              agents={agents} onUpdate={mutate} onDelete={() => { mutate(); mutateCounts() }}
            />
          ))}
        </div>
      )}

      {/* ── View: Timeline ─────────────────────────────────── */}
      {view === 'timeline' && (
        <div className="relative pl-6 space-y-0">
          <div className="absolute left-2.5 top-2 bottom-2 w-px bg-neutral-800" />
          {displayMemories.length === 0 ? (
            <EmptyState message="No memories to show" />
          ) : displayMemories.map(m => (
            <div key={m.id} className="relative pb-4">
              <div className={`absolute left-[-18px] top-1.5 w-3 h-3 rounded-full border-2 border-neutral-900 ${m.source === 'reflection' ? 'bg-violet-500' : m.source === 'manual' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
              <div className="bg-neutral-900/50 border border-neutral-800/30 rounded-lg p-3 ml-2 hover:bg-neutral-800/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-neutral-200 leading-relaxed flex-1">{m.fact}</p>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={async () => { const r = await updateMemoryAction(m.id, { importance: n }); if (!r.ok) toast.error(r.error); else mutate() }}
                        className={`text-xs ${n <= m.importance ? 'text-amber-400' : 'text-neutral-800 hover:text-amber-400'}`}>★</button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge label={m.category.replace('_', ' ')} color={CAT_COLORS[m.category] ?? 'neutral'} />
                  {m.source === 'reflection' && (
                    <span className="text-[10px] font-semibold text-violet-400">✦ Auto-learned</span>
                  )}
                  {m.similarity != null && (
                    <span className="text-[10px] font-semibold text-emerald-400">{Math.round(m.similarity * 100)}% match</span>
                  )}
                  <span className="text-[10px] text-neutral-600">
                    {m.agent_id ? agents.find(a => a.id === m.agent_id)?.name ?? 'Agent' : 'Global'}
                    {' · '}
                    {timeAgo(m.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Memory Row Component ─────────────────────────────────────────────────────

function MemoryRow({ m, agents, onUpdate, onDelete }: {
  m: Memory; agents: Agent[]
  onUpdate: () => void; onDelete: () => void
}) {
  return (
    <div className="px-5 py-4 flex items-start gap-4 hover:bg-neutral-800/20 transition-colors group">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-200 leading-relaxed">{m.fact}</p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge label={m.category.replace('_', ' ')} color={CAT_COLORS[m.category] ?? 'neutral'} />
          <span className="text-[10px] text-neutral-500">
            {m.agent_id ? agents.find(a => a.id === m.agent_id)?.name ?? 'Agent' : 'Global'}
          </span>
          {m.source === 'reflection' && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-900/40 text-violet-400 border border-violet-800/50">
              ✦ Auto-learned
            </span>
          )}
          {m.similarity != null && (
            <span className="text-[10px] font-semibold text-emerald-400">{Math.round(m.similarity * 100)}% match</span>
          )}
          <span className="text-[10px] text-neutral-700">{timeAgo(m.updated_at)}</span>
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n}
            onClick={async () => { const r = await updateMemoryAction(m.id, { importance: n }); if (!r.ok) toast.error(r.error); else onUpdate() }}
            className={`text-base leading-none transition-colors ${n <= m.importance ? 'text-amber-400' : 'text-neutral-800 group-hover:text-neutral-700 hover:text-amber-400'}`}>
            ★
          </button>
        ))}
        <button
          onClick={async () => { if (confirm('Delete this memory?')) { const r = await deleteMemoryAction(m.id); if (!r.ok) toast.error(r.error); else { toast.success('Deleted'); onDelete() } } }}
          className="ml-2 text-sm text-neutral-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
          ×
        </button>
      </div>
    </div>
  )
}

// ── Agent Memory Group ───────────────────────────────────────────────────────

function AgentMemoryGroup({ title, subtitle, icon, memories, agents, onUpdate, onDelete }: {
  title: string; subtitle: string; icon: string; memories: Memory[]; agents: Agent[]
  onUpdate: () => void; onDelete: () => void
}) {
  const [open, setOpen] = useState(memories.length > 0)

  if (memories.length === 0 && title !== 'Global memories') return null

  return (
    <div className="bg-neutral-900/50 border border-neutral-800/30 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-neutral-800/20 transition-colors">
        <span className="text-lg">{icon}</span>
        <div className="flex-1">
          <span className="text-sm font-medium text-white">{title}</span>
          <span className="text-xs text-neutral-600 ml-2">{subtitle}</span>
        </div>
        <Badge label={`${memories.length}`} color={memories.length > 0 ? 'emerald' : 'neutral'} />
        <span className={`text-neutral-600 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && memories.length > 0 && (
        <div className="divide-y divide-neutral-800/30 border-t border-neutral-800/30">
          {memories.map(m => (
            <MemoryRow key={m.id} m={m} agents={agents} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
      )}
      {open && memories.length === 0 && (
        <div className="px-5 py-3 text-xs text-neutral-600 border-t border-neutral-800/30">No memories</div>
      )}
    </div>
  )
}
