'use client'

import { useState, useEffect, useRef } from 'react'
import {
  getMemoriesAction, updateMemoryAction, deleteMemoryAction, createMemoryAction,
  getMemoryCountAction, getAgentsAction, searchMemoriesSemanticAction,
  backfillEmbeddingsAction, archiveStaleMemoriesAction, unarchiveMemoryAction,
  listFilesForImportAction, importFileAsMemoryAction, importLocalFileAction, getConnectorsAction,
} from '@/lib/actions'
import { timeAgo } from '@/lib/utils'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/components/AuthProvider'
import PageHeader from '@/components/PageHeader'
import SidePanel from '@/components/SidePanel'
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
type Connector = { id: string; name: string; slug: string; active: boolean }
type ImportFile = { id: string; name: string; size?: number; modified?: string; mime?: string }

const CATEGORIES = ['preference', 'context', 'outcome', 'learned_rule'] as const
const SOURCES = ['all', 'agent', 'reflection', 'manual', 'import'] as const

const CAT_BADGE_STYLES: Record<string, string> = {
  preference: 'bg-purple-950/50 text-purple-400 border-purple-900/40',
  context: 'bg-blue-950/50 text-blue-400 border-blue-900/40',
  outcome: 'bg-emerald-950/50 text-emerald-400 border-emerald-900/40',
  learned_rule: 'bg-amber-950/50 text-amber-400 border-amber-900/40',
}

// ── Shared small components ─────────────────────────────────────────────────

function ImportanceDots({ value, max = 5, onChange }: { value: number; max?: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button key={n} onClick={onChange ? () => onChange(n) : undefined}
          className={`transition-colors duration-100 text-base leading-none ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'} ${n <= value ? 'text-amber-400' : 'text-neutral-800'}`}>
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

function decayInfo(m: Memory): { label: string; stale: boolean } {
  if (!m.last_accessed_at) return { label: 'never accessed', stale: true }
  const days = Math.floor((Date.now() - new Date(m.last_accessed_at).getTime()) / 86400000)
  const stale = days >= 30
  const label = days === 0 ? 'today' : days === 1 ? '1d ago' : `${days}d ago`
  return { label, stale }
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function MemoriesPage() {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

  // Filters
  const [search, setSearch] = useState('')
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic'>('keyword')
  const [semanticQuery, setSemanticQuery] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [agentFilter, setAgentFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Panels
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Add form
  const [newFact, setNewFact] = useState('')
  const [newCat, setNewCat] = useState('context')
  const [newImp, setNewImp] = useState(3)
  const [newAgentId, setNewAgentId] = useState('')
  const [newSkillTags, setNewSkillTags] = useState<string[]>([])
  const [newLayer, setNewLayer] = useState<'L1' | 'L2' | 'L3'>('L2')

  // Import state
  const [importConnector, setImportConnector] = useState('')
  const [importQuery, setImportQuery] = useState('')
  const [importFiles, setImportFiles] = useState<ImportFile[]>([])
  const [importSelected, setImportSelected] = useState<Set<string>>(new Set())
  const [importLoading, setImportLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importAgentId, setImportAgentId] = useState('')
  const [importCat, setImportCat] = useState('context')
  const [importImp, setImportImp] = useState(4)
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([])
  const [dragging, setDragging] = useState(false)

  // Data
  const { data: memoriesRaw = [], isLoading: loading, mutate } = useData(
    ['memories', eid, catFilter, agentFilter, showArchived],
    () => showArchived
      ? getMemoriesAction(undefined, agentFilter || undefined, true)
      : getMemoriesAction(catFilter || undefined, agentFilter || undefined, false)
  )
  const memories = memoriesRaw as Memory[]

  const semanticKey: unknown[] = searchMode === 'semantic' && semanticQuery.length > 0
    ? ['semantic-search', eid, semanticQuery, agentFilter] : ['semantic-search-idle']
  const { data: semanticRaw = [], isLoading: semanticLoading } = useData(
    semanticKey,
    () => searchMode === 'semantic' && semanticQuery.length > 0
      ? searchMemoriesSemanticAction(semanticQuery, agentFilter || undefined) : Promise.resolve([])
  )
  const semanticResults = semanticRaw as Memory[]

  const { data: counts = { total: 0 } as Record<string, number>, mutate: mutateCounts } = useData(['memory-counts', eid], getMemoryCountAction)
  const { data: agentsRaw = [] } = useData(['agents', eid], getAgentsAction)
  const agents = agentsRaw as Agent[]
  const { data: connectorsRaw = [] } = useData(['connectors', eid], getConnectorsAction)
  const connectors = (connectorsRaw as Connector[]).filter(c =>
    c.active && ['google-drive', 'notion'].includes(c.slug)
  )

  // Semantic search debounce
  useEffect(() => {
    if (searchMode !== 'semantic') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!search.trim()) { setSemanticQuery(''); return }
    debounceRef.current = setTimeout(() => setSemanticQuery(search.trim()), 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, searchMode])
  useEffect(() => { if (searchMode === 'keyword') setSemanticQuery('') }, [searchMode])

  // Filter memories
  const isSemanticActive = searchMode === 'semantic' && semanticQuery.length > 0
  let displayMemories: Memory[] = isSemanticActive
    ? semanticResults
    : search ? memories.filter(m => m.fact.toLowerCase().includes(search.toLowerCase())) : memories
  if (sourceFilter) displayMemories = displayMemories.filter(m => (m.source || 'agent') === sourceFilter)

  // Stats
  const globalCount = memories.filter(m => !m.agent_id).length
  const staleCount = memories.filter(m => decayInfo(m).stale).length
  const autoCount = memories.filter(m => m.source === 'reflection').length
  const importCount = memories.filter(m => m.source === 'import').length

  // Handlers
  async function handleAdd() {
    if (!newFact.trim()) return
    const result = await createMemoryAction({
      fact: newFact,
      category: newCat,
      importance: newImp,
      agent_id: newAgentId || null,
      skill_tags: newSkillTags,
      memory_layer: newLayer,
    })
    if (!result.ok) { toast.error(result.error); return }
    toast.success('Memory saved')
    setNewFact(''); setNewImp(3); setNewAgentId(''); setNewSkillTags([]); setNewLayer('L2'); setShowAdd(false)
    mutate(); mutateCounts()
  }

  async function handleSearchFiles(folderId?: string) {
    if (!importConnector) return
    setImportLoading(true)
    try {
      // For Drive: if inside a folder, list its contents
      const q = folderId
        ? `'${folderId}' in parents`
        : importQuery || undefined
      const result = await listFilesForImportAction(importConnector, q)
      if (!result.ok) { toast.error(result.error); return }
      setImportFiles(result.data)
      setImportSelected(new Set())
    } finally { setImportLoading(false) }
  }

  function handleOpenFolder(file: ImportFile) {
    setFolderPath(prev => [...prev, { id: file.id, name: file.name }])
    handleSearchFiles(file.id)
  }

  function handleBackToFolder(index: number) {
    if (index < 0) {
      setFolderPath([])
      setImportFiles([])
    } else {
      const target = folderPath[index]
      setFolderPath(prev => prev.slice(0, index + 1))
      handleSearchFiles(target.id)
    }
  }

  async function handleLocalFiles(files: FileList) {
    const supportedExts = ['.txt', '.md', '.json', '.csv', '.xml', '.html', '.yml', '.yaml', '.toml', '.log', '.pdf']
    let imported = 0
    for (const file of Array.from(files)) {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
      if (!supportedExts.includes(ext)) {
        toast.error(`${file.name}: unsupported format. For .docx, use the Google Drive import.`)
        continue
      }
      try {
        // Convert to base64 and send to server action for parsing
        const arrayBuffer = await file.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
        const base64 = btoa(binary)
        const result = await importLocalFileAction(
          base64, file.name, importAgentId || null, importCat || 'context', importImp || 4,
        )
        if (result.ok) imported++
        else toast.error(`${file.name}: ${result.error}`)
      } catch {
        toast.error(`${file.name}: failed to read file`)
      }
    }
    if (imported > 0) {
      toast.success(`Imported ${imported} file${imported > 1 ? 's' : ''}`)
      mutate(); mutateCounts()
    }
  }

  async function handleImport() {
    if (importSelected.size === 0) return
    setImporting(true)
    let success = 0
    for (const fileId of importSelected) {
      const file = importFiles.find(f => f.id === fileId)
      const result = await importFileAsMemoryAction({
        connector_slug: importConnector,
        file_id: fileId,
        file_name: file?.name,
        agent_id: importAgentId || null,
        category: importCat,
        importance: importImp,
      })
      if (result.ok) success++
      else toast.error(`Failed: ${file?.name || fileId} — ${result.error}`)
    }
    setImporting(false)
    if (success > 0) {
      toast.success(`Imported ${success} file${success > 1 ? 's' : ''} as memories`)
      setShowImport(false)
      setImportFiles([]); setImportSelected(new Set()); setImportQuery('')
      mutate(); mutateCounts()
    }
  }

  if (loading) return (
    <div className="space-y-6 max-w-7xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <PageHeader title="Knowledge Base" count={counts.total}>
        <button onClick={() => setShowImport(true)}
          className="px-4 py-2 text-xs font-semibold border border-neutral-800/60 text-neutral-300 rounded-lg hover:text-white hover:border-neutral-600 transition-all duration-150">
          Import file
        </button>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150">
          + Add memory
        </button>
      </PageHeader>

      <div className="flex gap-5 mt-6">
        {/* ── Sidebar ── */}
        <aside className="w-48 shrink-0 space-y-5 hidden lg:block">
          {/* Agents */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Agent</p>
            <div className="space-y-0.5">
              <SidebarBtn active={!agentFilter} onClick={() => setAgentFilter('')}>
                All agents
              </SidebarBtn>
              <SidebarBtn active={agentFilter === 'global'} onClick={() => setAgentFilter('global')}>
                Global <span className="text-neutral-600 ml-auto tabular-nums">{globalCount}</span>
              </SidebarBtn>
              {agents.map(a => {
                const cnt = memories.filter(m => m.agent_id === a.id).length
                return (
                  <SidebarBtn key={a.id} active={agentFilter === a.id} onClick={() => setAgentFilter(a.id)}>
                    {a.name} <span className="text-neutral-600 ml-auto tabular-nums">{cnt}</span>
                  </SidebarBtn>
                )
              })}
            </div>
          </div>

          {/* Categories */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Category</p>
            <div className="space-y-0.5">
              <SidebarBtn active={!catFilter} onClick={() => setCatFilter('')}>All</SidebarBtn>
              {CATEGORIES.map(c => (
                <SidebarBtn key={c} active={catFilter === c} onClick={() => setCatFilter(c)}>
                  {c.replace('_', ' ')} <span className="text-neutral-600 ml-auto tabular-nums">{counts[c] || 0}</span>
                </SidebarBtn>
              ))}
            </div>
          </div>

          {/* Source */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Source</p>
            <div className="space-y-0.5">
              {SOURCES.map(s => (
                <SidebarBtn key={s} active={sourceFilter === (s === 'all' ? '' : s)}
                  onClick={() => setSourceFilter(s === 'all' ? '' : s)}>
                  {s === 'all' ? 'All' : s === 'reflection' ? 'Auto-learned' : s === 'agent' ? 'Agent-saved' : s.charAt(0).toUpperCase() + s.slice(1)}
                </SidebarBtn>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="border-t border-neutral-800/60 pt-4">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Stats</p>
            <div className="space-y-1 text-xs text-neutral-500">
              <p>{counts.total || 0} total</p>
              <p>{autoCount} auto-learned</p>
              <p>{importCount} imported</p>
              {staleCount > 0 && <p className="text-amber-600">{staleCount} stale</p>}
            </div>
            <div className="flex gap-1.5 mt-3">
              <button onClick={async () => {
                const r = await backfillEmbeddingsAction()
                if (r.ok) toast.success(r.data.count === 0 ? 'All embedded' : `Embedded ${r.data.count}`)
                else toast.error(r.error)
              }} className="text-xs text-neutral-600 hover:text-neutral-300 transition-colors">Embed</button>
              <span className="text-neutral-800">·</span>
              <button onClick={async () => {
                if (!confirm('Archive memories not accessed in 90+ days?')) return
                const r = await archiveStaleMemoriesAction({})
                if (r.ok) { toast.success(`Archived ${r.data.archived}`); mutate(); mutateCounts() }
                else toast.error(r.error)
              }} className="text-xs text-neutral-600 hover:text-neutral-300 transition-colors">Archive stale</button>
            </div>
            <button onClick={() => setShowArchived(!showArchived)}
              className={`text-xs mt-2 transition-colors ${showArchived ? 'text-amber-500' : 'text-neutral-600 hover:text-neutral-300'}`}>
              {showArchived ? 'Hide archived' : 'Show archived'}
            </button>
          </div>
        </aside>

        {/* ── Content ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Search */}
          <div className="relative">
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && searchMode === 'semantic' && search.trim()) {
                  if (debounceRef.current) clearTimeout(debounceRef.current)
                  setSemanticQuery(search.trim())
                }
              }}
              placeholder={searchMode === 'semantic' ? 'Search by meaning...' : 'Filter memories...'}
              className="w-full bg-neutral-900 border border-neutral-800/60 rounded-lg pl-4 pr-16 py-2.5 text-sm text-neutral-300 focus:border-neutral-600 focus:outline-none transition-colors duration-150" />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {isSemanticActive && semanticLoading && <span className="text-xs text-violet-400 animate-pulse">...</span>}
              <button onClick={() => setSearchMode(searchMode === 'keyword' ? 'semantic' : 'keyword')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all duration-150 border ${
                  searchMode === 'semantic'
                    ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-900/50'
                    : 'bg-neutral-800 text-neutral-500 border-neutral-700 hover:text-white'
                }`}>AI</button>
            </div>
          </div>

          {/* Mobile filters */}
          <div className="flex flex-wrap gap-2 lg:hidden">
            <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
              className="bg-neutral-900 border border-neutral-800/60 rounded-lg px-3 py-2 text-xs text-neutral-300">
              <option value="">All agents</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="bg-neutral-900 border border-neutral-800/60 rounded-lg px-3 py-2 text-xs text-neutral-300">
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>

          {/* Memory cards */}
          <div className="space-y-2">
            {displayMemories.length === 0 ? (
              <EmptyState
                message={search ? 'No memories match your search' : 'No memories yet'}
                description={search ? undefined : 'Your agents remember important facts as they work. You can also add memories manually or import from your files.'}
                action={search ? undefined : { label: 'Add a memory', onClick: () => setShowAdd(true) }}
              />
            ) : displayMemories.map(m => (
              <MemoryCard key={m.id} m={m} agents={agents} expanded={expandedId === m.id}
                onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
                onUpdate={mutate} onDelete={() => { mutate(); mutateCounts() }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Add Memory Panel ── */}
      <SidePanel open={showAdd} onClose={() => setShowAdd(false)} title="New memory">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1.5">What should agents remember?</label>
            <textarea value={newFact} onChange={e => setNewFact(e.target.value)}
              placeholder="e.g. Quentin prefers the Design Leader CV for senior roles..." rows={4}
              className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white resize-none focus:border-neutral-600 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1.5">Category</label>
              <select value={newCat} onChange={e => setNewCat(e.target.value)}
                className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300">
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1.5">Agent</label>
              <select value={newAgentId} onChange={e => setNewAgentId(e.target.value)}
                className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300">
                <option value="">Global (all agents)</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1.5">Importance</label>
            <ImportanceDots value={newImp} onChange={setNewImp} />
          </div>

          {/* Skill tags — critical for routing memories into the right agent contexts */}
          <div>
            <label className="block text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1.5">Skill tags</label>
            <p className="text-[11px] text-neutral-600 mb-2 leading-snug">
              Which skill contexts should load this memory? E.g. <code className="text-neutral-500">google-drive</code> loads it when any agent is handling Drive tasks. Leave empty for general memories not tied to a skill.
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['google-drive', 'gmail', 'google-sheets', 'google-docs', 'notion', 'firecrawl', 'file-storage', 'job-search', 'task-board', 'general'].map(tag => {
                const active = newSkillTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setNewSkillTags(prev => active ? prev.filter(t => t !== tag) : [...prev, tag])}
                    className={`text-[11px] px-2 py-0.5 rounded-full font-mono transition-colors ${
                      active
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                        : 'bg-neutral-900 text-neutral-500 border border-neutral-800 hover:border-neutral-700 hover:text-neutral-300'
                    }`}
                  >
                    {active ? '✓ ' : ''}{tag}
                  </button>
                )
              })}
            </div>
            {newSkillTags.length > 0 && (
              <p className="text-[10px] text-neutral-600 font-mono">{newSkillTags.join(', ')}</p>
            )}
          </div>

          {/* Memory layer — loading strategy */}
          <div>
            <label className="block text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1.5">Loading strategy</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'L1' as const, label: 'Always', help: 'Loaded every time the matching skill is active. Use for critical/permanent context (e.g. "our DB id is X").' },
                { value: 'L2' as const, label: 'On match', help: 'Loaded when the user task mentions keywords from the memory. Default.' },
                { value: 'L3' as const, label: 'Semantic', help: 'Loaded only when semantically close to the query. Rare.' },
              ]).map(l => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setNewLayer(l.value)}
                  className={`text-left rounded-lg border p-2 transition-colors ${
                    newLayer === l.value
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                  }`}
                  title={l.help}
                >
                  <p className={`text-xs font-semibold ${newLayer === l.value ? 'text-violet-300' : 'text-neutral-400'}`}>{l.value} · {l.label}</p>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-600 mt-1.5 leading-snug">
              {newLayer === 'L1' && '⚡ Always loaded when this agent runs a matching skill task. Use for non-negotiable context.'}
              {newLayer === 'L2' && '🔍 Loaded when the user\'s task query matches a keyword from this memory.'}
              {newLayer === 'L3' && '🧠 Loaded only when semantically close to the task (embedding search).'}
            </p>
          </div>

          <button onClick={handleAdd} disabled={!newFact.trim()}
            className="w-full px-4 py-2.5 text-sm font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 disabled:opacity-40 transition-all duration-150">
            Save memory
          </button>
        </div>
      </SidePanel>

      {/* ── Import Panel ── */}
      <SidePanel open={showImport} onClose={() => setShowImport(false)} title="Import from file" width="lg">
        <div className="space-y-4">
          {/* Connector picker */}
          <div>
            <label className="block text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1.5">Source</label>
            {connectors.length === 0 ? (
              <p className="text-xs text-neutral-500">No file connectors configured. Add Google Drive or Notion in Connectors.</p>
            ) : (
              <div className="flex gap-2">
                {connectors.map(c => (
                  <button key={c.id} onClick={() => { setImportConnector(c.slug); setImportFiles([]); setImportSelected(new Set()) }}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                      importConnector === c.slug
                        ? 'bg-white text-black border-white'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-white'
                    }`}>{c.name}</button>
                ))}
              </div>
            )}
          </div>

          {/* File search */}
          {importConnector && (
            <div className="flex gap-2">
              <input value={importQuery} onChange={e => setImportQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchFiles()}
                placeholder={importConnector === 'notion' ? 'Search pages...' : 'Search files...'}
                className="flex-1 bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-white focus:border-neutral-600 focus:outline-none" />
              <button onClick={() => handleSearchFiles()} disabled={importLoading}
                className="px-4 py-2 text-xs font-semibold bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 transition-all">
                {importLoading ? 'Loading...' : 'Search'}
              </button>
            </div>
          )}

          {/* Folder breadcrumb */}
          {folderPath.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <button onClick={() => handleBackToFolder(-1)} className="hover:text-white transition-colors">Root</button>
              {folderPath.map((f, i) => (
                <span key={f.id} className="flex items-center gap-1">
                  <span className="text-neutral-700">/</span>
                  <button onClick={() => handleBackToFolder(i)}
                    className={`hover:text-white transition-colors ${i === folderPath.length - 1 ? 'text-neutral-200 font-medium' : ''}`}>
                    {f.name}
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* File list */}
          {importFiles.length > 0 && (
            <div className="border border-neutral-800/60 rounded-lg divide-y divide-neutral-800/40 max-h-64 overflow-y-auto">
              {importFiles.map(f => {
                const isFolder = f.mime === 'application/vnd.google-apps.folder'
                if (isFolder) {
                  return (
                    <button key={f.id} onClick={() => handleOpenFolder(f)}
                      className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-neutral-800/30 transition-colors">
                      <span className="text-lg">📁</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-200 truncate">{f.name}</p>
                        <p className="text-xs text-neutral-600">Folder{f.modified ? ` · ${f.modified}` : ''}</p>
                      </div>
                      <span className="text-neutral-600 text-xs">→</span>
                    </button>
                  )
                }
                return (
                  <label key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-800/30 cursor-pointer transition-colors">
                    <input type="checkbox" checked={importSelected.has(f.id)}
                      onChange={e => {
                        const next = new Set(importSelected)
                        e.target.checked ? next.add(f.id) : next.delete(f.id)
                        setImportSelected(next)
                      }}
                      className="accent-white rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-200 truncate">{f.name}</p>
                      <p className="text-xs text-neutral-600">
                        {f.size ? `${f.size}KB` : ''}{f.modified ? ` · ${f.modified}` : ''}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          {/* Drop zone for local files */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) handleLocalFiles(e.dataTransfer.files) }}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-150 ${
              dragging ? 'border-white bg-neutral-800/30 text-white' : 'border-neutral-800 text-neutral-600 hover:border-neutral-700 hover:text-neutral-500'
            }`}>
            <p className="text-sm">Drop files here to import as memories</p>
            <p className="text-xs mt-1">.pdf, .txt, .md, .json, .csv — for .docx use Drive import above</p>
            <input type="file" multiple accept=".txt,.md,.json,.csv,.xml,.pdf"
              onChange={e => { if (e.target.files?.length) handleLocalFiles(e.target.files); e.target.value = '' }}
              className="hidden" id="local-file-input" />
            <button onClick={() => document.getElementById('local-file-input')?.click()}
              className="mt-3 px-4 py-1.5 text-xs font-semibold border border-neutral-700 text-neutral-400 rounded-lg hover:text-white hover:border-neutral-500 transition-all">
              Or browse files
            </button>
          </div>

          {/* Import options — always visible */}
          <div className="border-t border-neutral-800/60 pt-4">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Memory settings</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1.5">Agent</label>
                <select value={importAgentId} onChange={e => setImportAgentId(e.target.value)}
                  className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300">
                  <option value="">Global</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1.5">Category</label>
                <select value={importCat} onChange={e => setImportCat(e.target.value)}
                  className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1.5">Importance</label>
                <ImportanceDots value={importImp} onChange={setImportImp} />
              </div>
            </div>
          </div>

          {/* Import button */}
          {importSelected.size > 0 && (
            <button onClick={handleImport} disabled={importing}
              className="w-full px-4 py-2.5 text-sm font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 disabled:opacity-50 transition-all duration-150">
              {importing ? 'Importing...' : `Import ${importSelected.size} file${importSelected.size > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </SidePanel>
    </div>
  )
}

// ── Sidebar Button ──────────────────────────────────────────────────────────

function SidebarBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 ${
        active
          ? 'bg-neutral-800/80 text-white font-semibold'
          : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/30'
      }`}>
      {children}
    </button>
  )
}

// ── Memory Card ─────────────────────────────────────────────────────────────

function MemoryCard({ m, agents, expanded, onToggle, onUpdate, onDelete }: {
  m: Memory; agents: Agent[]; expanded: boolean
  onToggle: () => void; onUpdate: () => void; onDelete: () => void
}) {
  const { label: accessedLabel, stale } = decayInfo(m)
  const agentName = m.agent_id ? agents.find(a => a.id === m.agent_id)?.name ?? 'Agent' : 'Global'

  // Split fact into title (first line) and body
  const lines = m.fact.split('\n')
  const title = lines[0].length > 100 ? lines[0].slice(0, 100) + '...' : lines[0]
  const body = lines.slice(1).join('\n').trim()
  const preview = body.length > 200 && !expanded ? body.slice(0, 200) + '...' : body

  return (
    <div className={`bg-neutral-900 border rounded-xl transition-all duration-150 group ${
      m.archived ? 'border-neutral-800/40 opacity-60' : 'border-neutral-800/60 hover:border-neutral-700/60'
    }`}>
      <div className="px-5 py-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 pt-0.5">
            <ImportanceDots value={m.importance}
              onChange={m.archived ? undefined : async (n) => {
                const r = await updateMemoryAction(m.id, { importance: n })
                if (!r.ok) toast.error(r.error); else onUpdate()
              }} />
          </div>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
            <p className={`text-sm font-medium leading-snug ${m.archived ? 'text-neutral-500 line-through' : 'text-neutral-100'}`}>
              {title}
            </p>
            {preview && (
              <p className={`text-xs leading-relaxed mt-1.5 whitespace-pre-wrap ${m.archived ? 'text-neutral-600' : 'text-neutral-400'}`}>
                {expanded ? body : preview}
              </p>
            )}
          </div>
          {/* Actions */}
          <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {m.archived ? (
              <button onClick={async () => {
                const r = await unarchiveMemoryAction(m.id)
                if (!r.ok) toast.error(r.error); else { toast.success('Unarchived'); onUpdate() }
              }} className="text-xs text-neutral-500 hover:text-emerald-400 border border-neutral-800 rounded-md px-2 py-1 transition-colors">
                Unarchive
              </button>
            ) : (
              <button onClick={async () => {
                if (confirm('Delete this memory?')) {
                  const r = await deleteMemoryAction(m.id)
                  if (!r.ok) toast.error(r.error); else { toast.success('Deleted'); onDelete() }
                }
              }} className="text-neutral-700 hover:text-red-400 transition-colors text-lg leading-none w-7 h-7 flex items-center justify-center rounded-md hover:bg-neutral-800/50">
                ×
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 ml-[68px]">
          <CategoryBadge category={m.category} />
          <span className="text-xs text-neutral-600">{agentName}</span>
          {m.source === 'reflection' && (
            <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-violet-950/40 text-violet-400 border border-violet-900/40">auto</span>
          )}
          {m.source === 'import' && (
            <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-950/40 text-blue-400 border border-blue-900/40">imported</span>
          )}
          {m.similarity != null && (
            <span className="text-xs font-semibold text-emerald-400">{Math.round(m.similarity * 100)}%</span>
          )}
          {m.access_count !== undefined && m.access_count > 0 && (
            <span className="text-xs text-neutral-700 tabular-nums">{m.access_count} reads</span>
          )}
          <span className={`text-xs ${stale ? 'text-amber-700' : 'text-neutral-700'}`}>{accessedLabel}</span>
        </div>
      </div>
    </div>
  )
}
