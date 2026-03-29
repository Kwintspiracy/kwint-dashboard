'use client'

import { useEffect, useState } from 'react'
import { getMemories, updateMemory, deleteMemory, createMemory, getMemoryCount, getAgents } from '@/lib/queries'
import { timeAgo } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'

type Memory = { id: string; fact: string; category: string; importance: number; agent_id: string | null; created_at: string; updated_at: string }
type Agent = { id: string; name: string; is_default: boolean }

const catBadgeColor: Record<string, 'purple' | 'blue' | 'emerald' | 'amber'> = {
  preference: 'purple',
  context: 'blue',
  outcome: 'emerald',
  learned_rule: 'amber',
}

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('')
  const [agentFilter, setAgentFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newFact, setNewFact] = useState('')
  const [newCat, setNewCat] = useState('context')
  const [newImp, setNewImp] = useState(3)
  const [newAgentId, setNewAgentId] = useState<string>('')
  const [counts, setCounts] = useState<Record<string, number>>({ total: 0 })

  async function load() {
    const [data, c, ag] = await Promise.all([
      getMemories(catFilter || undefined, agentFilter || undefined),
      getMemoryCount(),
      getAgents(),
    ])
    setMemories(data); setCounts(c); setAgents(ag); setLoading(false)
  }
  useEffect(() => { load() }, [catFilter, agentFilter])

  const filtered = search ? memories.filter(m => m.fact.toLowerCase().includes(search.toLowerCase())) : memories

  async function handleAdd() {
    if (!newFact.trim()) return
    await createMemory({ fact: newFact, category: newCat, importance: newImp, agent_id: newAgentId || null })
    setNewFact(''); setNewImp(3); setNewAgentId(''); setShowAdd(false); load()
  }

  if (loading) return <p className="text-neutral-500 text-sm">Loading...</p>

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Memories" count={counts.total}>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors"
        >
          Add memory
        </button>
      </PageHeader>

      {showAdd && (
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-xs text-neutral-500 font-medium uppercase tracking-wider mb-2">Fact</label>
            <textarea
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              placeholder="What should the agent remember?"
              rows={3}
              className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white resize-none focus:border-neutral-600 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-neutral-500 font-medium uppercase tracking-wider mb-2">Category</label>
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                className="bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300"
              >
                <option value="context">Context</option>
                <option value="preference">Preference</option>
                <option value="outcome">Outcome</option>
                <option value="learned_rule">Learned Rule</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 font-medium uppercase tracking-wider mb-2">Importance</label>
              <select
                value={newImp}
                onChange={(e) => setNewImp(Number(e.target.value))}
                className="bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300"
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 font-medium uppercase tracking-wider mb-2">Agent</label>
              <select
                value={newAgentId}
                onChange={(e) => setNewAgentId(e.target.value)}
                className="bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300"
              >
                <option value="">Global (all agents)</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search memories..."
          className="bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none w-64"
        />
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300"
        >
          <option value="">All agents</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.name}{a.is_default ? ' (default)' : ''}</option>
          ))}
        </select>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300"
        >
          <option value="">All categories</option>
          <option value="preference">Preference ({counts.preference || 0})</option>
          <option value="context">Context ({counts.context || 0})</option>
          <option value="outcome">Outcome ({counts.outcome || 0})</option>
          <option value="learned_rule">Learned Rule ({counts.learned_rule || 0})</option>
        </select>
        <Badge label={`${filtered.length} shown`} color="neutral" />
      </div>

      <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-hidden divide-y divide-neutral-800/50">
        {filtered.length === 0 ? (
          <EmptyState message={search ? 'No memories match your search' : 'No memories'} />
        ) : (
          filtered.map((m) => (
            <div key={m.id} className="px-5 py-4 flex items-start gap-4 hover:bg-neutral-800/30 transition-colors group">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-200 leading-relaxed">{m.fact}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge
                    label={m.category.replace('_', ' ')}
                    color={catBadgeColor[m.category] ?? 'neutral'}
                  />
                  <Badge
                    label={m.agent_id ? (agents.find(a => a.id === m.agent_id)?.name ?? 'Unknown agent') : 'Global'}
                    color={m.agent_id ? 'blue' : 'neutral'}
                  />
                  <span className="text-xs text-neutral-600">{timeAgo(m.updated_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => { updateMemory(m.id, { importance: n }); load() }}
                    className={`text-base leading-none transition-colors ${n <= m.importance ? 'text-amber-400' : 'text-neutral-800 group-hover:text-neutral-700 hover:text-amber-400'}`}
                  >
                    ★
                  </button>
                ))}
                <button
                  onClick={() => { if (confirm('Delete this memory?')) { deleteMemory(m.id); load() } }}
                  className="ml-2 text-sm text-neutral-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
