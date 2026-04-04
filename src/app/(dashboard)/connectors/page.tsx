'use client'

import { useState, useEffect } from 'react'
import { getConnectorsAction, createConnectorAction, updateConnectorAction, deleteConnectorAction, toggleConnectorActiveAction, createSkillAction, getSkillsAction } from '@/lib/actions'
import { SKILL_TEMPLATES, SKILL_CATEGORIES, SKILL_CAPABILITIES, type SkillTemplate } from '@/lib/skill-templates'
import { CONNECTOR_OAUTH } from '@/lib/oauth-providers'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/components/AuthProvider'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import CardSkeleton from '@/components/skeletons/CardSkeleton'
import { toast } from 'sonner'
import Toggle from '@/components/Toggle'

type Connector = {
  id: string; name: string; slug: string
  base_url: string | null; has_key: boolean
  active: boolean; created_at: string
  auth_type: string; oauth_scopes: string | null
  has_oauth_token: boolean; oauth_account_name: string | null
}

type AuthType = 'api_key' | 'oauth2' | 'bearer' | 'basic' | 'none'

const AUTH_TYPE_LABELS: Record<AuthType, string> = {
  api_key: 'API Key',
  oauth2: 'OAuth2',
  bearer: 'Bearer Token',
  basic: 'Basic Auth',
  none: 'No Auth',
}

// Auth type badge styles
const AUTH_BADGE: Record<string, string> = {
  api_key: 'bg-blue-950/50 text-blue-400 border-blue-900/40',
  oauth2:  'bg-violet-950/50 text-violet-400 border-violet-900/40',
  bearer:  'bg-emerald-950/50 text-emerald-400 border-emerald-900/40',
  basic:   'bg-neutral-800/80 text-neutral-400 border-neutral-700/60',
  none:    'bg-neutral-800/50 text-neutral-500 border-neutral-800',
}

function AuthBadge({ type }: { type: string }) {
  const style = AUTH_BADGE[type] ?? AUTH_BADGE.none
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${style}`}>
      {AUTH_TYPE_LABELS[type as AuthType] ?? type}
    </span>
  )
}

const ALL_CATEGORIES = 'All'

function parseEndpoints(content: string): { method: string; path: string }[] {
  const results: { method: string; path: string }[] = []
  for (const line of content.split('\n')) {
    const m = line.trim().match(/^(GET|POST|PUT|DELETE|PATCH)\s+(\/[^\s`]*)/)
    if (m) results.push({ method: m[1], path: m[2].split('?')[0] })
  }
  return results
}

const METHOD_STYLE: Record<string, string> = {
  GET:    'bg-emerald-950/60 text-emerald-400 border-emerald-800/40',
  POST:   'bg-sky-950/60 text-sky-400 border-sky-800/40',
  PUT:    'bg-amber-950/60 text-amber-400 border-amber-800/40',
  DELETE: 'bg-red-950/60 text-red-400 border-red-800/40',
  PATCH:  'bg-violet-950/60 text-violet-400 border-violet-800/40',
}

const emptyForm = () => ({
  name: '', slug: '', base_url: '',
  auth_type: 'api_key' as AuthType,
  api_key: '',
  oauth_client_id: '', oauth_client_secret: '', oauth_refresh_token: '',
  oauth_token_url: '', oauth_scopes: '',
})

export default function ConnectorsPage() {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const success = params.get('oauth_success')
    const error = params.get('oauth_error')
    if (success) toast.success(`${success} connected successfully`)
    if (error) toast.error(`OAuth error: ${error}`)
    if (success || error) {
      const url = new URL(window.location.href)
      url.searchParams.delete('oauth_success')
      url.searchParams.delete('oauth_error')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  const [tab, setTab] = useState<'connectors' | 'marketplace'>('connectors')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [installing, setInstalling] = useState<SkillTemplate | null>(null)
  const [installForm, setInstallForm] = useState<Record<string, string>>({})
  const [installLoading, setInstallLoading] = useState(false)
  const [installedSlug, setInstalledSlug] = useState<string | null>(null)

  const { data: connectorsRaw = [], isLoading: loading, mutate } = useData(['connectors', eid], getConnectorsAction)
  const connectors = connectorsRaw as Connector[]

  function startEdit(c: Connector) {
    setEditingId(c.id)
    setForm({
      name: c.name, slug: c.slug, base_url: c.base_url || '',
      auth_type: (c.auth_type as AuthType) || 'api_key',
      api_key: '',
      oauth_client_id: '', oauth_client_secret: '', oauth_refresh_token: '',
      oauth_token_url: '', oauth_scopes: c.oauth_scopes || '',
    })
    setShowAdd(false)
  }

  function startAdd() {
    setEditingId(null)
    setForm(emptyForm())
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
    setSaving(true)
    const base = { name: form.name, slug: form.slug, base_url: form.base_url || null, auth_type: form.auth_type }
    const creds: Record<string, unknown> = {}

    if (form.auth_type === 'api_key' || form.auth_type === 'bearer') {
      if (form.api_key) creds.api_key = form.api_key
    } else if (form.auth_type === 'oauth2') {
      if (form.oauth_client_id) creds.oauth_client_id = form.oauth_client_id
      if (form.oauth_client_secret) creds.oauth_client_secret = form.oauth_client_secret
      if (form.oauth_refresh_token) creds.oauth_refresh_token = form.oauth_refresh_token
      if (form.oauth_token_url) creds.oauth_token_url = form.oauth_token_url
      if (form.oauth_scopes) creds.oauth_scopes = form.oauth_scopes
    } else if (form.auth_type === 'basic') {
      if (form.api_key) creds.api_key = form.api_key
    }

    if (editingId) {
      const result = await updateConnectorAction(editingId, { ...base, ...creds })
      if (!result.ok) { toast.error(result.error); setSaving(false); return }
      toast.success('Connector updated')
      setEditingId(null)
    } else {
      const result = await createConnectorAction({ ...base, ...creds } as Parameters<typeof createConnectorAction>[0])
      if (!result.ok) { toast.error(result.error); setSaving(false); return }
      toast.success('Connector created')
      setShowAdd(false)
    }
    mutate()
    setSaving(false)
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
      let connectorId: string | null = null
      if (installing.connector) {
        const connPayload: Record<string, unknown> = {
          name: installing.name,
          slug: installing.connector.slug,
          base_url: installing.connector.base_url || undefined,
          auth_type: installing.connector.auth_type || 'api_key',
        }
        for (const field of installing.fields) {
          if (installForm[field.key]) connPayload[field.key] = installForm[field.key]
        }
        if (installing.connector.oauth_token_url) connPayload.oauth_token_url = installing.connector.oauth_token_url
        if (installing.connector.oauth_scopes) connPayload.oauth_scopes = installing.connector.oauth_scopes

        const connResult = await createConnectorAction(connPayload as Parameters<typeof createConnectorAction>[0])
        if (!connResult.ok) { toast.error(connResult.error); return }
        const freshConnectors = await getConnectorsAction()
        const created = (freshConnectors as Connector[]).find(c => c.slug === installing.connector!.slug)
        if (created) connectorId = created.id
      }

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

  const templateByConnectorSlug = Object.fromEntries(
    SKILL_TEMPLATES.flatMap(t => t.connector?.slug ? [[t.connector.slug, t]] : [])
  )

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
    return `text-sm font-medium transition-colors duration-150 pb-3 ${
      tab === t
        ? 'text-white border-b-2 border-violet-500'
        : 'text-neutral-500 hover:text-neutral-300 border-b-2 border-transparent'
    }`
  }

  const authType = form.auth_type as AuthType

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Connectors" count={tab === 'connectors' ? connectors.length : undefined}>
        {tab === 'connectors' && (
          <button onClick={startAdd} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150">
            Add connector
          </button>
        )}
      </PageHeader>

      {/* Tab bar */}
      <div className="flex gap-6 border-b border-neutral-800/60">
        <button onClick={() => setTab('connectors')} className={tabClass('connectors')}>
          Connectors
          {connectors.length > 0 && <span className="ml-1.5 text-xs text-neutral-600">({connectors.length})</span>}
        </button>
        <button onClick={() => setTab('marketplace')} className={tabClass('marketplace')}>
          Marketplace
          <span className="ml-1.5 text-xs text-neutral-600">({SKILL_TEMPLATES.length})</span>
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
                className={`bg-neutral-900 border rounded-xl p-5 transition-all duration-150 flex flex-col gap-3 ${
                  c.active ? 'border-neutral-800/60 hover:border-neutral-700/60' : 'border-neutral-800/30 opacity-60 hover:opacity-80'
                }`}>
                {/* Card header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const tpl = templateByConnectorSlug[c.slug]
                      if (tpl?.brandIcon) return (
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0${tpl.darkBrandIcon ? ' bg-white/10' : ''}`}>
                          <img src={tpl.brandIcon} alt={c.name} className="w-10 h-10" />
                        </div>
                      )
                      if (tpl?.icon) return (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-neutral-800/50">
                          <svg viewBox="0 0 24 24" className="w-6 h-6" fill={tpl.color ?? '#6b7280'}><path d={tpl.icon} /></svg>
                        </div>
                      )
                      return (
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.active ? 'bg-violet-950/40' : 'bg-neutral-800/50'}`}>
                          <svg className={`w-5 h-5 ${c.active ? 'text-violet-400' : 'text-neutral-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-6.364-6.364L4.5 8.25l4.5 4.5" />
                          </svg>
                        </div>
                      )
                    })()}
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{c.name}</p>
                      <p className="text-xs text-neutral-600 font-mono mt-0.5">{c.slug}</p>
                    </div>
                  </div>
                  <Toggle
                    checked={c.active}
                    aria-label={`Toggle ${c.name} active`}
                    onChange={() => handleToggle(c.id, c.active)}
                  />
                </div>

                {/* Auth type + status */}
                <div className="flex items-center gap-2 flex-wrap">
                  <AuthBadge type={c.auth_type} />
                  {c.has_key && (
                    <span className="inline-flex items-center gap-1 text-xs text-neutral-600">
                      <span className="font-mono tracking-widest">••••••</span>
                    </span>
                  )}
                  {c.has_oauth_token && c.oauth_account_name && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate max-w-[120px]">{c.oauth_account_name}</span>
                    </span>
                  )}
                </div>

                {/* Capabilities */}
                {(SKILL_CAPABILITIES[c.slug] ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {SKILL_CAPABILITIES[c.slug].map(cap => (
                      <span key={cap} className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-violet-950/60 text-violet-400 border border-violet-800/40 rounded-md leading-tight">
                        {cap}
                      </span>
                    ))}
                  </div>
                )}

                {/* Endpoints */}
                {(() => {
                  const tpl = templateByConnectorSlug[c.slug]
                  if (!tpl?.content) return null
                  const endpoints = parseEndpoints(tpl.content)
                  if (endpoints.length === 0) return null
                  const shown = endpoints.slice(0, 4)
                  const extra = endpoints.length - shown.length
                  return (
                    <div className="space-y-1">
                      {shown.map((ep, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded border leading-tight shrink-0 ${METHOD_STYLE[ep.method] ?? METHOD_STYLE.GET}`}>
                            {ep.method}
                          </span>
                          <span className="text-xs text-neutral-500 font-mono truncate">{ep.path}</span>
                        </div>
                      ))}
                      {extra > 0 && (
                        <p className="text-xs text-neutral-700 pl-0.5">+{extra} more endpoint{extra > 1 ? 's' : ''}</p>
                      )}
                    </div>
                  )
                })()}

                {/* Details */}
                {c.base_url && (
                  <p className="text-xs text-neutral-600 font-mono truncate">{c.base_url}</p>
                )}
                {c.oauth_scopes && (
                  <p className="text-xs text-neutral-700 truncate">{c.oauth_scopes}</p>
                )}

                {/* Footer actions */}
                <div className="flex gap-3 mt-auto pt-2.5 border-t border-neutral-800/40 items-center">
                  <button onClick={() => startEdit(c)} className="text-xs text-neutral-500 hover:text-white transition-colors duration-150">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="text-xs text-neutral-500 hover:text-red-400 transition-colors duration-150">Delete</button>
                  {CONNECTOR_OAUTH[c.slug] && (
                    <a
                      href={`/api/oauth/start?connector_id=${c.id}`}
                      className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors duration-150"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                      {c.has_oauth_token ? 'Reconnect' : 'Connect'}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {connectors.length === 0 && !isFormOpen && <EmptyState message="No connectors yet — install one from the Marketplace" />}

          {/* Connector form */}
          {isFormOpen && (
            <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{editingId ? 'Edit Connector' : 'New Connector'}</p>
                <button onClick={cancelForm} className="text-neutral-600 hover:text-neutral-300 transition-colors duration-150 p-1">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Name</label>
                  <input value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="e.g. GitHub"
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors duration-150" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Slug</label>
                  <input value={form.slug} onChange={(e) => updateForm('slug', e.target.value)} placeholder="e.g. github"
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors duration-150" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Base URL <span className="normal-case text-neutral-700 font-normal">(optional)</span></label>
                  <input value={form.base_url} onChange={(e) => updateForm('base_url', e.target.value)} placeholder="https://api.example.com"
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors duration-150" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Auth Type</label>
                  <select value={form.auth_type} onChange={(e) => updateForm('auth_type', e.target.value)}
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors duration-150">
                    {(Object.entries(AUTH_TYPE_LABELS) as [AuthType, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(authType === 'api_key' || authType === 'bearer' || authType === 'basic') && (
                <div>
                  <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">
                    {authType === 'bearer' ? 'Bearer Token' : authType === 'basic' ? 'Credentials (user:password)' : 'API Key'}
                    {' '}<span className="normal-case text-neutral-700 font-normal">{editingId ? '(leave empty to keep current)' : '(optional)'}</span>
                  </label>
                  <input value={form.api_key} onChange={(e) => updateForm('api_key', e.target.value)}
                    placeholder={authType === 'bearer' ? 'eyJ...' : authType === 'basic' ? 'username:password' : 'sk-...'}
                    type="password"
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors duration-150" />
                </div>
              )}

              {authType === 'oauth2' && (
                <div className="space-y-4 border border-neutral-800/60 rounded-xl p-4 bg-neutral-800/10">
                  <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">OAuth2 credentials</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Client ID</label>
                      <input value={form.oauth_client_id} onChange={(e) => updateForm('oauth_client_id', e.target.value)} placeholder="xxxxxx.apps.googleusercontent.com"
                        className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors duration-150" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Client Secret <span className="normal-case text-neutral-700 font-normal">{editingId ? '(leave empty to keep)' : ''}</span></label>
                      <input value={form.oauth_client_secret} onChange={(e) => updateForm('oauth_client_secret', e.target.value)} placeholder="GOCSPX-..."
                        type="password"
                        className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors duration-150" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Refresh Token <span className="normal-case text-neutral-700 font-normal">{editingId ? '(leave empty to keep)' : ''}</span></label>
                      <input value={form.oauth_refresh_token} onChange={(e) => updateForm('oauth_refresh_token', e.target.value)} placeholder="1//..."
                        type="password"
                        className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors duration-150" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Token URL</label>
                      <input value={form.oauth_token_url} onChange={(e) => updateForm('oauth_token_url', e.target.value)} placeholder="https://oauth2.googleapis.com/token"
                        className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors duration-150" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Scopes <span className="normal-case text-neutral-700 font-normal">(space-separated)</span></label>
                      <input value={form.oauth_scopes} onChange={(e) => updateForm('oauth_scopes', e.target.value)} placeholder="https://www.googleapis.com/auth/gmail.modify"
                        className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors duration-150" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150 disabled:opacity-60 disabled:pointer-events-none">
                  {saving && <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                  {editingId ? 'Save changes' : 'Create connector'}
                </button>
                <button onClick={cancelForm} className="px-4 py-2 text-xs font-medium border border-neutral-800 text-neutral-500 rounded-lg hover:text-white hover:border-neutral-700 transition-colors duration-150">
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
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="flex-1 min-w-[200px] max-w-sm bg-neutral-900 border border-neutral-800/60 rounded-lg px-4 py-2 text-sm text-neutral-300 placeholder-neutral-600 focus:border-neutral-600 focus:outline-none transition-colors duration-150"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150 border ${
                  categoryFilter === cat
                    ? 'bg-neutral-700 text-white border-neutral-600'
                    : 'border-neutral-800/60 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700'
                }`}>
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
                  className="bg-neutral-900 border border-neutral-800/60 rounded-xl p-5 hover:border-neutral-700/60 transition-all duration-150 flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">
                      <div className={`rounded-lg flex items-center justify-center${template.darkBrandIcon ? ' bg-white/10' : ''}`} style={{ width: 44, height: 44 }}>
                        {template.brandIcon
                          ? <img src={template.brandIcon} alt={template.name} style={{ width: 44, height: 44 }} />
                          : <svg viewBox="0 0 24 24" className="w-7 h-7" fill={template.color}><path d={template.icon} /></svg>}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white leading-tight">{template.name}</p>
                        {template.connector?.auth_type === 'oauth2' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-violet-950/50 text-violet-400 border border-violet-900/40">OAuth2</span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed line-clamp-3">{template.description}</p>
                      {(SKILL_CAPABILITIES[template.slug] ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {SKILL_CAPABILITIES[template.slug].map(cap => (
                            <span key={cap} className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-violet-950/60 text-violet-400 border border-violet-800/40 rounded leading-tight">
                              {cap}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Endpoints preview */}
                  {(() => {
                    const endpoints = parseEndpoints(template.content)
                    if (endpoints.length === 0) return null
                    const shown = endpoints.slice(0, 3)
                    const extra = endpoints.length - shown.length
                    return (
                      <div className="mt-3 pt-3 border-t border-neutral-800/40 space-y-1">
                        {shown.map((ep, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded border leading-tight shrink-0 ${METHOD_STYLE[ep.method] ?? METHOD_STYLE.GET}`}>
                              {ep.method}
                            </span>
                            <span className="text-xs text-neutral-500 font-mono truncate">{ep.path}</span>
                          </div>
                        ))}
                        {extra > 0 && (
                          <p className="text-xs text-neutral-700">+{extra} more</p>
                        )}
                      </div>
                    )
                  })()}

                  <div className="flex items-center justify-between mt-auto pt-1">
                    <Badge label={categoryLabel}
                      color={
                        (({ google: 'blue', design: 'purple', marketing: 'amber', finance: 'emerald', planning: 'amber', communication: 'purple', analytics: 'blue', storage: 'neutral', ai: 'purple', ecommerce: 'amber', dev: 'emerald', crm: 'blue', hr: 'emerald', search: 'red', media: 'red' } as Record<string, string>)[template.category] || 'neutral') as 'emerald' | 'red' | 'amber' | 'blue' | 'purple' | 'neutral'
                      } />
                    {isInstalled ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 rounded-lg">
                        <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" /></svg>
                        Installed
                      </span>
                    ) : (
                      <button onClick={() => openInstallModal(template)}
                        className="px-4 py-1.5 text-xs font-medium border border-neutral-800 text-neutral-400 rounded-lg hover:text-white hover:border-neutral-700 transition-colors duration-150">
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

      {/* Install modal */}
      {installing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f0f0f] border border-neutral-800/80 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-neutral-800/60">
              <div className={`rounded-lg flex items-center justify-center shrink-0${installing.darkBrandIcon ? ' bg-white/10' : ''}`} style={{ width: 44, height: 44 }}>
                {installing.brandIcon
                  ? <img src={installing.brandIcon} alt={installing.name} style={{ width: 44, height: 44 }} />
                  : <svg viewBox="0 0 24 24" className="w-7 h-7" fill={installing.color}><path d={installing.icon} /></svg>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{installing.name}</p>
                  {installing.connector?.auth_type === 'oauth2' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-violet-950/50 text-violet-400 border border-violet-900/40">OAuth2</span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 truncate mt-0.5">{installing.description}</p>
              </div>
              <button onClick={closeInstallModal} className="text-neutral-500 hover:text-white transition-colors duration-150 ml-2 shrink-0 p-1">
                <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor"><path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" /></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {installedSlug === installing.slug ? (
                <div className="text-center py-6 space-y-3">
                  <div className="flex justify-center">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-900/40">
                      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M20.285 6.709a1 1 0 00-1.414-1.418L9 15.163l-3.871-3.872a1 1 0 10-1.414 1.414l4.578 4.578a1 1 0 001.414 0l10.578-10.574z" /></svg>
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white">Installed successfully!</p>
                  <p className="text-xs text-neutral-500">{installing.name} connector + skill created.</p>
                  <button onClick={closeInstallModal} className="mt-2 px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150">Done</button>
                </div>
              ) : (
                <>
                  <div className="bg-neutral-800/30 border border-neutral-800/50 rounded-lg px-4 py-3">
                    <p className="text-xs text-neutral-400">
                      This will create a <span className="text-emerald-400 font-medium">connector</span> + a linked <span className="text-violet-400 font-medium">skill</span> with API documentation.
                    </p>
                  </div>
                  {installing.fields.length > 0 ? (
                    <div className="space-y-4">
                      {installing.fields.map(field => (
                        <div key={field.key}>
                          <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">{field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                          <input type={field.type === 'password' ? 'password' : 'text'} value={installForm[field.key] ?? ''}
                            onChange={e => setInstallForm(prev => ({ ...prev, [field.key]: e.target.value }))} placeholder={field.placeholder}
                            className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors duration-150" />
                          {field.help && <p className="text-xs text-neutral-600 mt-1">{field.help}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 py-2">No configuration needed. Click Deploy to install.</p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleDeploy} disabled={installLoading}
                      className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
                      {installLoading ? 'Deploying...' : 'Deploy'}
                    </button>
                    <button onClick={closeInstallModal}
                      className="px-4 py-2 text-xs font-medium border border-neutral-800 text-neutral-500 rounded-lg hover:text-white hover:border-neutral-700 transition-colors duration-150">
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
