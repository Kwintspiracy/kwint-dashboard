'use client'

import { useState } from 'react'
import { getConnectorsAction, createConnectorAction, updateConnectorAction, deleteConnectorAction, toggleConnectorActiveAction, createSkillAction, getSkillsAction } from '@/lib/actions'
import { SKILL_TEMPLATES, SKILL_CATEGORIES, type SkillTemplate } from '@/lib/skill-templates'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/components/AuthProvider'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import CardSkeleton from '@/components/skeletons/CardSkeleton'
import { toast } from 'sonner'

type Connector = {
  id: string; name: string; slug: string
  base_url: string | null; has_key: boolean
  active: boolean; created_at: string
}

const ALL_CATEGORIES = 'All'

export default function ConnectorsPage() {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

  const [tab, setTab] = useState<'connectors' | 'marketplace'>('connectors')

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', base_url: '', api_key: '' })

  // Marketplace state
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES)
  const [search, setSearch] = useState('')
  const [installing, setInstalling] = useState<SkillTemplate | null>(null)
  const [installForm, setInstallForm] = useState<Record<string, string>>({})
  const [installLoading, setInstallLoading] = useState(false)
  const [installedSlug, setInstalledSlug] = useState<string | null>(null)

  const { data: connectorsRaw = [], isLoading: loading, mutate } = useData(['connectors', eid], getConnectorsAction)
  const connectors = connectorsRaw as Connector[]

  function startEdit(c: Connector) {
    setEditingId(c.id)
    setForm({ name: c.name, slug: c.slug, base_url: c.base_url || '', api_key: '' })
    setShowAdd(false)
  }

  function startAdd() {
    setEditingId(null)
    setForm({ name: '', slug: '', base_url: '', api_key: '' })
    setShowAdd(true)
  }

  function updateForm(field: string, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'name' && !editingId) {
        next.slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      }
      return next
    })
  }

  function cancelForm() { setEditingId(null); setShowAdd(false) }

  async function handleSave() {
    if (editingId) {
      const patch: Record<string, unknown> = { name: form.name, slug: form.slug, base_url: form.base_url || null }
      if (form.api_key) patch.api_key = form.api_key
      const result = await updateConnectorAction(editingId, patch)
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Connector updated')
      setEditingId(null)
    } else {
      const result = await createConnectorAction({
        name: form.name, slug: form.slug,
        base_url: form.base_url || undefined, api_key: form.api_key || undefined,
      })
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Connector created')
      setShowAdd(false)
    }
    mutate()
  }

  async function handleToggle(id: string, active: boolean) {
    const result = await toggleConnectorActiveAction(id, !active)
    if (!result.ok) { toast.error(result.error); return }
    mutate()
  }
  async function handleDelete(id: string) {
    if (confirm('Delete this connector? Skills linked to it will be unlinked.')) {
      const result = await deleteConnectorAction(id)
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Connector deleted')
      mutate()
    }
  }

  // ── Marketplace handlers ──────────────────────────

  function openInstallModal(template: SkillTemplate) {
    const defaults: Record<string, string> = {}
    for (const field of template.fields) { defaults[field.key] = '' }
    setInstallForm(defaults)
    setInstalling(template)
    setInstalledSlug(null)
  }

  function closeInstallModal() {
    setInstalling(null)
    setInstallForm({})
    setInstalledSlug(null)
  }

  async function handleDeploy() {
    if (!installing) return
    setInstallLoading(true)
    try {
      // Create the connector
      let connectorId: string | null = null
      if (installing.connector) {
        const connResult = await createConnectorAction({
          name: installing.name,
          slug: installing.connector.slug,
          base_url: installing.connector.base_url || undefined,
          api_key: installForm['api_key'] || undefined,
        })
        if (!connResult.ok) { toast.error(connResult.error); return }
        const freshConnectors = await getConnectorsAction()
        const created = (freshConnectors as Connector[]).find(c => c.slug === installing.connector!.slug)
        if (created) connectorId = created.id
      }

      // Also create the skill linked to the connector
      const skillResult = await createSkillAction({
        name: installing.name, slug: installing.slug, content: installing.content,
        connector_ids: connectorId ? [connectorId] : [],
      })
      if (!skillResult.ok) { toast.error(skillResult.error); return }
      toast.success(`${installing.name} installed successfully`)
      await mutate()
      setInstalledSlug(installing.slug)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Deploy failed')
    } finally {
      setInstallLoading(false)
    }
  }

  // ── Derived state ────────────────────────────────────

  const installedSlugs = new Set(connectors.map(c => c.slug))
  const isFormOpen = editingId !== null || showAdd
  const categories = [ALL_CATEGORIES, ...Object.keys(SKILL_CATEGORIES)]
  const filteredTemplates = SKILL_TEMPLATES
    .filter(t => categoryFilter === ALL_CATEGORIES || t.category === categoryFilter)
    .filter(t => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  if (loading) return <CardSkeleton />

  function tabClass(t: typeof tab) {
    return `text-sm font-medium transition-colors ${
      tab === t
        ? 'text-white border-b-2 border-emerald-500 pb-3'
        : 'text-neutral-500 hover:text-neutral-300 pb-3'
    }`
  }

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Connectors" count={tab === 'connectors' ? connectors.length : undefined}>
        {tab === 'connectors' && (
          <button onClick={startAdd} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors">
            Add connector
          </button>
        )}
      </PageHeader>

      {/* Tab bar */}
      <div className="flex gap-6 border-b border-neutral-800">
        <button onClick={() => setTab('connectors')} className={tabClass('connectors')}>
          Connectors
          {connectors.length > 0 && <span className="ml-1.5 text-xs text-neutral-500">({connectors.length})</span>}
        </button>
        <button onClick={() => setTab('marketplace')} className={tabClass('marketplace')}>
          Marketplace
          <span className="ml-1.5 text-xs text-neutral-500">({SKILL_TEMPLATES.length})</span>
        </button>
      </div>

      {/* ── Connectors tab ── */}
      {tab === 'connectors' && (
        <div className="space-y-5">
          <p className="text-xs text-neutral-500">
            API credentials and endpoints. Link connectors to skills to give your agents API access.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {connectors.map(c => (
              <div key={c.id}
                className={`bg-neutral-900/50 border rounded-xl p-5 transition-all flex flex-col gap-3 ${
                  c.active ? 'border-neutral-800/50 hover:border-neutral-700' : 'border-neutral-800/30 opacity-50'
                }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.active ? 'bg-emerald-900/30' : 'bg-neutral-800/50'}`}>
                      <svg className={`w-5 h-5 ${c.active ? 'text-emerald-400' : 'text-neutral-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-6.364-6.364L4.5 8.25l4.5 4.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{c.name}</p>
                      <p className="text-xs text-neutral-500 font-mono">{c.slug}</p>
                    </div>
                  </div>
                  <button
                    role="switch"
                    aria-checked={c.active}
                    aria-label={`Toggle ${c.name} active`}
                    onClick={() => handleToggle(c.id, c.active)}
                    className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${c.active ? 'bg-emerald-600' : 'bg-neutral-700'}`}>
                    <span className={`absolute top-1 w-3.5 h-3.5 bg-white rounded-full transition-all shadow-sm ${c.active ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <span className="text-neutral-600 w-14 shrink-0">URL</span>
                    <span className="truncate">{c.base_url || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-400">
                    <span className="text-neutral-600 w-14 shrink-0">Key</span>
                    <span>{c.has_key ? '••••••' : '—'}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-auto pt-2 border-t border-neutral-800/30">
                  <button onClick={() => startEdit(c)} className="text-xs text-neutral-400 hover:text-white transition-colors">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="text-xs text-neutral-400 hover:text-red-400 transition-colors">Delete</button>
                </div>
              </div>
            ))}
          </div>

          {connectors.length === 0 && !isFormOpen && <EmptyState message="No connectors yet — install one from the Marketplace" />}

          {isFormOpen && (
            <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-6 space-y-5">
              <p className="text-sm font-semibold text-white">{editingId ? 'Edit Connector' : 'New Connector'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5">Name</label>
                  <input value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="e.g. GitHub"
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5">Slug</label>
                  <input value={form.slug} onChange={(e) => updateForm('slug', e.target.value)} placeholder="e.g. github"
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5">Base URL <span className="text-neutral-600">(optional)</span></label>
                  <input value={form.base_url} onChange={(e) => updateForm('base_url', e.target.value)} placeholder="https://api.example.com"
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5">API Key <span className="text-neutral-600">{editingId ? '(leave empty to keep current)' : '(optional)'}</span></label>
                  <input value={form.api_key} onChange={(e) => updateForm('api_key', e.target.value)} placeholder="sk-..." type="password"
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleSave} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors">
                  {editingId ? 'Save changes' : 'Create connector'}
                </button>
                <button onClick={cancelForm} className="px-4 py-2 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:text-white hover:border-neutral-600 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Marketplace tab ── */}
      {tab === 'marketplace' && (
        <div className="space-y-5">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full max-w-sm bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-neutral-300 placeholder-neutral-600 focus:border-neutral-600 focus:outline-none transition-colors"
          />
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={categoryFilter === cat
                  ? 'bg-white text-black rounded-full px-3 py-1 text-xs font-medium'
                  : 'border border-neutral-800 text-neutral-400 rounded-full px-3 py-1 text-xs hover:text-white hover:border-neutral-700 transition-colors'
                }>
                {cat === ALL_CATEGORIES ? 'All' : SKILL_CATEGORIES[cat]?.label ?? cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTemplates.map(template => {
              const isInstalled = installedSlugs.has(template.connector?.slug || template.slug)
              const categoryLabel = SKILL_CATEGORIES[template.category]?.label ?? template.category
              return (
                <div key={template.id}
                  className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-5 hover:border-neutral-700 transition-all flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">
                      <div className={`rounded-lg flex items-center justify-center${template.darkBrandIcon ? ' bg-white/10' : ''}`} style={{ width: 46, height: 46 }}>
                        {template.brandIcon
                          ? <img src={template.brandIcon} alt={template.name} style={{ width: 46, height: 46 }} />
                          : <svg viewBox="0 0 24 24" className="w-7 h-7" fill={template.color}><path d={template.icon} /></svg>}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white leading-tight">{template.name}</p>
                      <p className="text-xs text-neutral-400 mt-1 leading-relaxed line-clamp-3">{template.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-1">
                    <Badge label={categoryLabel}
                      color={
                        (({ google: 'blue', design: 'purple', marketing: 'amber', finance: 'emerald', planning: 'amber', communication: 'purple', analytics: 'blue', storage: 'neutral', ai: 'purple', ecommerce: 'amber', dev: 'emerald', crm: 'blue', hr: 'emerald', search: 'red' })[template.category] || 'neutral') as 'emerald' | 'red' | 'amber' | 'blue' | 'purple' | 'neutral'
                      } />
                    {isInstalled ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-900/30 border border-emerald-900/40 rounded-lg">
                        <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" /></svg>
                        Installed
                      </span>
                    ) : (
                      <button onClick={() => openInstallModal(template)}
                        className="px-4 py-2 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:text-white hover:border-neutral-600 transition-colors">
                        Install
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {filteredTemplates.length === 0 && <EmptyState message="No templates in this category" />}
        </div>
      )}

      {/* ── Install modal ── */}
      {installing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800/50 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-neutral-800/50">
              <div className={`rounded-lg flex items-center justify-center shrink-0${installing.darkBrandIcon ? ' bg-white/10' : ''}`} style={{ width: 46, height: 46 }}>
                {installing.brandIcon
                  ? <img src={installing.brandIcon} alt={installing.name} style={{ width: 46, height: 46 }} />
                  : <svg viewBox="0 0 24 24" className="w-7 h-7" fill={installing.color}><path d={installing.icon} /></svg>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{installing.name}</p>
                <p className="text-xs text-neutral-400 truncate">{installing.description}</p>
              </div>
              <button onClick={closeInstallModal} className="text-neutral-500 hover:text-white transition-colors ml-2 shrink-0">
                <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor"><path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" /></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {installedSlug === installing.slug ? (
                <div className="text-center py-6 space-y-3">
                  <div className="flex justify-center">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-900/40 text-emerald-400">
                      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M20.285 6.709a1 1 0 00-1.414-1.418L9 15.163l-3.871-3.872a1 1 0 10-1.414 1.414l4.578 4.578a1 1 0 001.414 0l10.578-10.574z" /></svg>
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white">Installed successfully!</p>
                  <p className="text-xs text-neutral-400">{installing.name} connector + skill created.</p>
                  <button onClick={closeInstallModal} className="mt-2 px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors">Done</button>
                </div>
              ) : (
                <>
                  <div className="bg-neutral-800/30 border border-neutral-800/50 rounded-lg px-4 py-3">
                    <p className="text-xs text-neutral-400">
                      This will create a <span className="text-emerald-400 font-medium">connector</span> + a linked <span className="text-blue-400 font-medium">skill</span> with API documentation.
                    </p>
                  </div>
                  {installing.fields.length > 0 ? (
                    <div className="space-y-4">
                      {installing.fields.map(field => (
                        <div key={field.key}>
                          <label className="block text-xs text-neutral-400 mb-1.5">{field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                          <input type={field.type === 'password' ? 'password' : 'text'} value={installForm[field.key] ?? ''}
                            onChange={e => setInstallForm(prev => ({ ...prev, [field.key]: e.target.value }))} placeholder={field.placeholder}
                            className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors" />
                          {field.help && <p className="text-xs text-neutral-600 mt-1">{field.help}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 py-2">No configuration needed. Click Deploy to install.</p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleDeploy} disabled={installLoading}
                      className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {installLoading ? 'Deploying...' : 'Deploy'}
                    </button>
                    <button onClick={closeInstallModal}
                      className="px-4 py-2 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:text-white hover:border-neutral-600 transition-colors">
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
