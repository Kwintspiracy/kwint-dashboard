'use client'

import { useState, useEffect, useRef } from 'react'
import { getMemoriesAction, updateMemoryAction, deleteMemoryAction, createMemoryAction, getMemoryCountAction, getAgentsAction, searchMemoriesSemanticAction, backfillEmbeddingsAction, archiveStaleMemoriesAction, unarchiveMemoryAction } from '@/lib/actions'
import { timeAgo } from '@/lib/utils'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/components/AuthProvider'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import StatCardSkeleton from '@/components/skeletons/StatCardSkeleton'
import { toast } from 'sonner'

type Memory = {
  id: string; fact: string; category: string; importance: number;
  agent_id: string | null; source?: string; archived?: boolean;
  access_count?: number; last_accessed_at?: string;
  created_at: string; updated_at: string; similarity?: number
}
type Agent = { id: string; name: string; slug: string; is_default: boolean }

const CATEGORIES = ['preference', 'context', 'outcome', 'learned_rule'] as const

const CAT_COLORS: Record<string, 'purple' | 'blue' | 'emerald' | 'amber'> = {
  preference: 'purple',
  context: 'blue',
  outcome: 'emerald',
  learned_rule: 'amber',
}

const CAT_BADGE_STYLES: Record<string, string> = {
  preference: 'bg-purple-950/50 text-purple-400 border-purple-900/40',
  context:    'bg-blue-950/50 text-blue-400 border-blue-900/40',
  outcome:    'bg-emerald-950/50 text-emerald-400 border-emerald-900/40',
  learned_rule: 'bg-amber-950/50 text-amber-400 border-amber-900/40',
}

function ImportanceDots({ value, max = 5, onChange }: { value: number; max?: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          onClick={onChange ? () => onChange(n) : undefined}
          className={`transition-colors duration-100 text-base leading-none ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'} ${n <= value ? 'text-amber-400' : 'text-neutral-800'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const style = CAT_BADGE_STYLES[category] ?? 'bg-neutral-800 text-neutral-400 border-neutral-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${style}`}>
      {category.replace('_', ' ')}
    </span>
  )
}

export default function MemoriesPage() {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

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
  const [archiving, setArchiving] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [view, setView] = useState<'all' | 'by-agent' | 'timeline'>('all')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: memoriesRaw = [], isLoading: loading, mutate } = useData(
    ['memories', eid, catFilter, agentFilter, showArchived],
    () => showArchived
      ? getMemoriesAction(undefined, agentFilter || undefined, true)
      : getMemoriesAction(catFilter || undefined, agentFilter || undefined, false)
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

  useEffect(() => {
    if (searchMode !== 'semantic') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!search.trim()) { setSemanticQuery(''); return }
    debounceRef.current = setTimeout(() => setSemanticQuery(search.trim()), 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, searchMode])

  useEffect(() => { if (searchMode === 'keyword') setSemanticQuery('') }, [searchMode])

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
  const agentMemoryCounts = agents.map(a => ({
    ...a,
    count: memories.filter(m => m.agent_id === a.id).length,
  }))
  const globalCount = memories.filter(m => !m.agent_id).length

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

  async function handleArchiveStale() {
    if (!confirm('Archive memories not accessed in 90+ days with importance ≤ 2?')) return
    setArchiving(true)
    try {
      const result = await archiveStaleMemoriesAction({})
      if (!result.ok) { toast.error(result.error); return }
      const n = result.data.archived
      toast.success(n === 0 ? 'No stale memories to archive' : `Archived ${n} stale ${n === 1 ? 'memory' : 'memories'}`)
      mutate(); mutateCounts()
    } finally { setArchiving(false) }
  }

  if (loading) return (
    <div className="space-y-6 max-w-7xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <PageHeader title="Knowledge Base" count={counts.total}>
        <button onClick={handleBackfill} disabled={backfilling}
          className="px-3 py-2 text-xs text-neutral-400 hover:text-white border border-neutral-800/60 rounded-lg hover:border-neutral-600 transition-colors duration-150 disabled:opacity-50">
          {backfilling ? 'Embedding...' : 'Embed all'}
        </button>
        <button onClick={handleArchiveStale} disabled={archiving}
          className="px-3 py-2 text-xs text-neutral-400 hover:text-white border border-neutral-800/60 rounded-lg hover:border-neutral-600 transition-colors duration-150 disabled:opacity-50">
          {archiving ? 'Archiving...' : 'Archive stale'}
        </button>
        <button onClick={() => setShowArchived(!showArchived)}
          className={`px-3 py-2 text-xs border rounded-lg transition-colors duration-150 ${showArchived ? 'border-amber-700/60 text-amber-400 bg-amber-950/30' : 'border-neutral-800/60 text-neutral-400 hover:text-white hover:border-neutral-600'}`}>
          {showArchived ? 'Hide archived' : 'Show archived'}
        </button>
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150">
          + Add memory
        </button>
      </PageHeader>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Total</p>
          <p className="text-2xl font-bold text-white mt-1.5 tabular-nums">{counts.total || 0}</p>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5">
            {CATEGORIES.map(c => (
              <span key={c} className="text-xs text-neutral-600">
                {counts[c] || 0} <span className="text-neutral-700">{c.replace('_', ' ')}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Auto-learned</p>
          <p className="text-2xl font-bold text-violet-400 mt-1.5 tabular-nums">{autoLearnedCount}</p>
          <p className="text-xs text-neutral-600 mt-1.5">from reflection</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Agent memory</p>
          <p className="text-2xl font-bold text-blue-400 mt-1.5 tabular-nums">{agentMemoryCounts.filter(a => a.count > 0).length}<span className="text-sm text-neutral-600 font-normal">/{agents.length}</span></p>
          <p className="text-xs text-neutral-600 mt-1.5">{globalCount} global</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-2.5">Filter by category</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCatFilter(catFilter === c ? '' : c)}
                className={`transition-all duration-150 text-xs font-semibold px-2 py-0.5 rounded border ${
                  catFilter === c
                    ? CAT_BADGE_STYLES[c] ?? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                    : 'bg-neutral-800/40 text-neutral-600 border-neutral-800 hover:text-neutral-400 hover:border-neutral-700'
                }`}
                title={`${c.replace('_', ' ')} (${counts[c] || 0})`}>
                {c.replace('_', ' ')} <span className="opacity-60">{counts[c] || 0}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add Memory Form */}
      {showAdd && (
        <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">New memory</p>
          <textarea value={newFact} onChange={e => setNewFact(e.target.value)}
            placeholder="What should the agent remember?" rows={2}
            className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white resize-none focus:border-neutral-600 focus:outline-none transition-colors duration-150" />
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-neutral-600 uppercase tracking-wider mb-1.5">Category</label>
              <select value={newCat} onChange={e => setNewCat(e.target.value)}
                className="bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-600 uppercase tracking-wider mb-1.5">Importance</label>
              <ImportanceDots value={newImp} onChange={setNewImp} />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 uppercase tracking-wider mb-1.5">Agent</label>
              <select value={newAgentId} onChange={e => setNewAgentId(e.target.value)}
                className="bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none">
                <option value="">Global</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-neutral-500 hover:text-white transition-colors duration-150">Cancel</button>
              <button onClick={handleAdd} className="px-4 py-1.5 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Search + Filters + View Toggle */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && searchMode === 'semantic' && search.trim()) {
                if (debounceRef.current) clearTimeout(debounceRef.current)
                setSemanticQuery(search.trim())
              }
            }}
            placeholder={searchMode === 'semantic' ? 'Search by meaning...' : 'Filter memories...'}
            className="w-full bg-neutral-900 border border-neutral-800/60 rounded-lg pl-4 pr-14 py-2 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none transition-colors duration-150" />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
            <button onClick={() => setSearchMode(searchMode === 'keyword' ? 'semantic' : 'keyword')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all duration-150 border ${
                searchMode === 'semantic'
                  ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-900/50'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700 hover:text-white'
              }`}>
              ✦ AI
            </button>
          </div>
        </div>

        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
          className="bg-neutral-900 border border-neutral-800/60 rounded-lg px-3 py-2 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none transition-colors duration-150">
          <option value="">All agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          className="bg-neutral-900 border border-neutral-800/60 rounded-lg px-3 py-2 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none transition-colors duration-150">
          <option value="">All sources</option>
          <option value="agent">Agent-saved</option>
          <option value="reflection">Auto-learned</option>
          <option value="manual">Manual</option>
        </select>

        <div className="flex bg-neutral-900 border border-neutral-800/60 rounded-lg overflow-hidden text-xs ml-auto">
          {(['all', 'by-agent', 'timeline'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-2 transition-colors duration-150 capitalize ${view === v ? 'bg-neutral-700/80 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
              {v === 'by-agent' ? 'By Agent' : v === 'timeline' ? 'Timeline' : 'All'}
            </button>
          ))}
        </div>

        {isSemanticActive && semanticLoading && (
          <span className="text-xs text-violet-400 animate-pulse">Searching…</span>
        )}
      </div>

      {/* View: All */}
      {view === 'all' && (
        <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl overflow-hidden divide-y divide-neutral-800/40">
          {displayMemories.length === 0 ? (
            <EmptyState
              message={search ? 'No memories match your search' : 'No memories yet'}
              description={search ? undefined : 'Your agents will remember important facts here as they work. You can also add facts manually.'}
              action={search ? undefined : { label: 'Add a memory', onClick: () => setShowAdd(true) }}
            />
          ) : displayMemories.map(m => (
            <MemoryRow key={m.id} m={m} agents={agents} onUpdate={mutate} onDelete={() => { mutate(); mutateCounts() }} />
          ))}
        </div>
      )}

      {/* View: By Agent */}
      {view === 'by-agent' && (
        <div className="space-y-3">
          <AgentMemoryGroup
            title="Global memories" subtitle="Available to all agents"
            icon="🌐" memories={displayMemories.filter(m => !m.agent_id)}
            agents={agents} onUpdate={mutate} onDelete={() => { mutate(); mutateCounts() }}
          />
          {agents.map(a => (
            <AgentMemoryGroup key={a.id}
              title={a.name} subtitle={a.slug} icon="🤖"
              memories={displayMemories.filter(m => m.agent_id === a.id)}
              agents={agents} onUpdate={mutate} onDelete={() => { mutate(); mutateCounts() }}
            />
          ))}
        </div>
      )}

      {/* View: Timeline */}
      {view === 'timeline' && (
        <div className="relative pl-6 space-y-0">
          <div className="absolute left-2.5 top-2 bottom-2 w-px bg-neutral-800/80" />
          {displayMemories.length === 0 ? (
            <EmptyState message="No memories to show" />
          ) : displayMemories.map(m => (
            <div key={m.id} className="relative pb-3">
              <div className={`absolute left-[-18px] top-2 w-2.5 h-2.5 rounded-full border-2 border-[#0f0f0f] ${
                m.source === 'reflection' ? 'bg-violet-500' : m.source === 'manual' ? 'bg-emerald-500' : 'bg-blue-500'
              }`} />
              <div className="bg-neutral-900 border border-neutral-800/60 rounded-lg p-3 ml-2 hover:bg-neutral-800/30 transition-colors duration-150">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-neutral-200 leading-relaxed flex-1">{m.fact}</p>
                  <ImportanceDots
                    value={m.importance}
                    onChange={async (n) => { const r = await updateMemoryAction(m.id, { importance: n }); if (!r.ok) toast.error(r.error); else mutate() }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <CategoryBadge category={m.category} />
                  {m.source === 'reflection' && (
                    <span className="text-xs font-semibold text-violet-400">✦ Auto-learned</span>
                  )}
                  {m.similarity != null && (
                    <span className="text-xs font-semibold text-emerald-400">{Math.round(m.similarity * 100)}% match</span>
                  )}
                  <span className="text-xs text-neutral-600">
                    {m.agent_id ? agents.find(a => a.id === m.agent_id)?.name ?? 'Agent' : 'Global'}
                    {' · '}{timeAgo(m.created_at)}
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

// ── decayInfo ────────────────────────────────────────────────────────────────

function decayInfo(m: Memory): { label: string; stale: boolean } {
  if (!m.last_accessed_at) return { label: 'never accessed', stale: true }
  const days = Math.floor((Date.now() - new Date(m.last_accessed_at).getTime()) / 86400000)
  const stale = days >= 30
  const label = days === 0 ? 'accessed today' : days === 1 ? 'accessed 1d ago' : `accessed ${days}d ago`
  return { label, stale }
}

// ── MemoryRow ────────────────────────────────────────────────────────────────

function MemoryRow({ m, agents, onUpdate, onDelete }: {
  m: Memory; agents: Agent[]
  onUpdate: () => void; onDelete: () => void
}) {
  const { label: accessedLabel, stale } = decayInfo(m)
  const agentName = m.agent_id ? agents.find(a => a.id === m.agent_id)?.name ?? 'Agent' : 'Global'

  return (
    <div className="px-5 py-4 flex items-start gap-4 hover:bg-neutral-800/20 transition-colors duration-150 group">
      {/* Importance column */}
      <div className="shrink-0 pt-0.5">
        {!m.archived ? (
          <ImportanceDots
            value={m.importance}
            onChange={async (n) => { const r = await updateMemoryAction(m.id, { importance: n }); if (!r.ok) toast.error(r.error); else onUpdate() }}
          />
        ) : (
          <div className="w-[60px]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-relaxed ${m.archived ? 'text-neutral-500 line-through decoration-neutral-700' : 'text-neutral-200'}`}>
          {m.fact}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <CategoryBadge category={m.category} />
          <span className="text-xs text-neutral-600 font-medium">{agentName}</span>
          {m.source === 'reflection' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-violet-950/40 text-violet-400 border border-violet-900/40">
              ✦ Auto-learned
            </span>
          )}
          {m.archived && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-neutral-800 text-neutral-500 border border-neutral-700">
              archived
            </span>
          )}
          {m.similarity != null && (
            <span className="text-xs font-semibold text-emerald-400">{Math.round(m.similarity * 100)}% match</span>
          )}
          {m.access_count !== undefined && (
            <span className="text-xs text-neutral-700 tabular-nums">{m.access_count} {m.access_count === 1 ? 'read' : 'reads'}</span>
          )}
          <span className={`text-xs ${stale ? 'text-amber-700/80' : 'text-neutral-700'}`}>
            {stale && '⚠ '}{accessedLabel}
          </span>
          <span className="text-xs text-neutral-700">{timeAgo(m.updated_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {m.archived ? (
          <button
            onClick={async () => { const r = await unarchiveMemoryAction(m.id); if (!r.ok) toast.error(r.error); else { toast.success('Unarchived'); onUpdate() } }}
            className="text-xs font-medium text-neutral-500 hover:text-emerald-400 transition-colors duration-150 border border-neutral-800 rounded-md px-2 py-1">
            Unarchive
          </button>
        ) : (
          <button
            onClick={async () => { if (confirm('Delete this memory?')) { const r = await deleteMemoryAction(m.id); if (!r.ok) toast.error(r.error); else { toast.success('Deleted'); onDelete() } } }}
            className="text-neutral-700 hover:text-red-400 transition-colors duration-150 text-lg leading-none w-6 h-6 flex items-center justify-center">
            ×
          </button>
        )}
      </div>
    </div>
  )
}

// ── AgentMemoryGroup ─────────────────────────────────────────────────────────

function AgentMemoryGroup({ title, subtitle, icon, memories, agents, onUpdate, onDelete }: {
  title: string; subtitle: string; icon: string; memories: Memory[]; agents: Agent[]
  onUpdate: () => void; onDelete: () => void
}) {
  const [open, setOpen] = useState(memories.length > 0)

  if (memories.length === 0 && title !== 'Global memories') return null

  return (
    <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-neutral-800/20 transition-colors duration-150">
        <span className="text-base">{icon}</span>
        <div className="flex-1">
          <span className="text-sm font-medium text-white">{title}</span>
          <span className="text-xs text-neutral-600 ml-2">{subtitle}</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${memories.length > 0 ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' : 'bg-neutral-800 text-neutral-600 border-neutral-700'}`}>
          {memories.length}
        </span>
        <span className={`text-neutral-600 text-xs transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && memories.length > 0 && (
        <div className="divide-y divide-neutral-800/40 border-t border-neutral-800/40">
          {memories.map(m => (
            <MemoryRow key={m.id} m={m} agents={agents} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
      )}
      {open && memories.length === 0 && (
        <div className="px-5 py-3 text-xs text-neutral-600 border-t border-neutral-800/40">No memories</div>
      )}
    </div>
  )
}
