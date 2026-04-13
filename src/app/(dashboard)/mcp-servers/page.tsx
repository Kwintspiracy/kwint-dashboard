'use client'

import { useState, useEffect } from 'react'
import {
  getMcpServersAction,
  createMcpServerAction,
  updateMcpServerAction,
  deleteMcpServerAction,
  toggleMcpServerActiveAction,
  testMcpServerAction,
  installMcpFromCatalogAction,
} from '@/lib/actions'
import { MCP_CATALOG } from '@/lib/mcp-catalog'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/components/AuthProvider'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import CardSkeleton from '@/components/skeletons/CardSkeleton'
import { toast } from 'sonner'
import Toggle from '@/components/Toggle'
import SidePanel from '@/components/SidePanel'

type McpServer = {
  id: string
  name: string
  slug: string
  transport: 'http' | 'stdio'
  url: string | null
  command: string | null
  active: boolean
  created_at: string
}

type TestResult = {
  tool_count: number
  tools: string[]
}

const emptyForm = {
  name: '',
  slug: '',
  transport: 'http' as 'http' | 'stdio',
  url: '',
  command: '',
  active: true,
}

export default function McpServersPage() {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestResult | string>>({})
  const [tab, setTab] = useState<'installed' | 'marketplace'>('installed')
  const [installingSlug, setInstallingSlug] = useState<string | null>(null)

  const { data: serversRaw = [], isLoading: loading, mutate } = useData(
    ['mcp-servers', eid],
    getMcpServersAction,
  )
  const servers = serversRaw as McpServer[]

  function updateForm(field: string, value: string | boolean) {
    if (field === 'slug') {
      setSlugManuallyEdited(true)
      setForm(prev => ({ ...prev, slug: String(value) }))
      return
    }
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'name' && !slugManuallyEdited) {
        next.slug = String(value)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      }
      return next
    })
  }

  function startAdd() {
    setEditingId(null)
    setForm({ ...emptyForm })
    setSlugManuallyEdited(false)
    setShowAdd(true)
  }

  function startEdit(s: McpServer) {
    setEditingId(s.id)
    setForm({
      name: s.name,
      slug: s.slug,
      transport: s.transport,
      url: s.url || '',
      command: s.command || '',
      active: s.active,
    })
    setSlugManuallyEdited(false)
    setShowAdd(false)
  }

  function cancelForm() {
    setShowAdd(false)
    setEditingId(null)
    setSlugManuallyEdited(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        transport: form.transport,
        url: form.transport === 'http' ? form.url || null : null,
        command: form.transport === 'stdio' ? form.command || null : null,
        active: form.active,
      }

      if (editingId) {
        const result = await updateMcpServerAction(editingId, payload)
        if (!result.ok) { toast.error(result.error); return }
        toast.success('Tool server updated')
        setEditingId(null)
      } else {
        const result = await createMcpServerAction(payload)
        if (!result.ok) { toast.error(result.error); return }
        toast.success('Tool server added')
        setShowAdd(false)
      }
      mutate()
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(id: string, active: boolean) {
    const result = await toggleMcpServerActiveAction(id, !active)
    if (!result.ok) { toast.error(result.error); return }
    mutate()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this tool server? Agents will lose access to its tools.')) return
    const result = await deleteMcpServerAction(id)
    if (!result.ok) { toast.error(result.error); return }
    toast.success('Tool server deleted')
    mutate()
  }

  async function handleTest(id: string) {
    setTestingId(id)
    setTestResults(prev => ({ ...prev, [id]: '' }))
    try {
      const result = await testMcpServerAction(id)
      if (!result.ok) {
        setTestResults(prev => ({ ...prev, [id]: result.error }))
        toast.error(result.error)
      } else {
        setTestResults(prev => ({ ...prev, [id]: result.data }))
        toast.success(`Connected — ${result.data.tool_count} tool${result.data.tool_count === 1 ? '' : 's'} discovered`)
      }
    } finally {
      setTestingId(null)
    }
  }

  async function handleInstallCatalog(slug: string) {
    setInstallingSlug(slug)
    try {
      const result = await installMcpFromCatalogAction(slug)
      if (!result.ok) { toast.error(result.error); return }
      if (result.data.needs_oauth) {
        const popup = window.open(`/api/mcp/oauth/start?server_id=${result.data.id}`, '_blank')
        if (!popup) {
          toast.error('Popup blocked — allow popups for this site and retry')
          return
        }
        toast.info('Complete the authorization in the new tab, then come back here.')
        setTab('installed')
        // Refresh when the user returns to this tab (OAuth callback ran in the popup)
        const onFocus = () => { mutate(); }
        window.addEventListener('focus', onFocus, { once: true })
        return
      }
      toast.success('Installed from marketplace')
      setTab('installed')
      mutate()
    } finally {
      setInstallingSlug(null)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const success = params.get('mcp_oauth_success')
    const error = params.get('mcp_oauth_error')
    if (success) toast.success(`${success} connected via OAuth`)
    if (error) toast.error(`MCP OAuth failed: ${error}`)
    if (success || error) {
      const url = new URL(window.location.href)
      url.searchParams.delete('mcp_oauth_success')
      url.searchParams.delete('mcp_oauth_error')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  if (loading) return <CardSkeleton />

  const isFormOpen = showAdd || editingId !== null
  const installedSlugs = new Set(servers.map(s => s.slug))

  const tabClass = (t: typeof tab) =>
    `px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
      tab === t
        ? 'bg-neutral-800 text-white border-neutral-700'
        : 'text-neutral-500 border-transparent hover:text-neutral-300'
    }`

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Tool Servers" count={tab === 'installed' ? servers.length : undefined}>
        {tab === 'installed' && (
          <button
            onClick={startAdd}
            className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150"
          >
            Add tool server
          </button>
        )}
      </PageHeader>

      <div className="flex items-center gap-2">
        <button onClick={() => setTab('installed')} className={tabClass('installed')}>
          Installed
          {servers.length > 0 && <span className="ml-1.5 text-xs text-neutral-600">({servers.length})</span>}
        </button>
        <button onClick={() => setTab('marketplace')} className={tabClass('marketplace')}>
          Marketplace
        </button>
      </div>

      {tab === 'installed' && (
      <>
      <p className="text-xs text-neutral-500">
        Connect your agents to external tool services via MCP.
        Only HTTP transport is supported in serverless environments.
      </p>

      {/* Server list */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {servers.map(s => {
          const tr = testResults[s.id]
          const trData = typeof tr === 'object' ? tr as TestResult : null
          const trError = typeof tr === 'string' && tr ? tr : null

          return (
            <div
              key={s.id}
              className={`bg-neutral-900/50 border rounded-xl p-5 flex flex-col gap-3 transition-all ${
                s.active
                  ? 'border-neutral-800/50 hover:border-neutral-700'
                  : 'border-neutral-800/30 opacity-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${s.active ? 'bg-violet-900/30' : 'bg-neutral-800/50'}`}>
                    <svg className={`w-5 h-5 ${s.active ? 'text-violet-400' : 'text-neutral-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                    <p className="text-xs text-neutral-500 font-mono">{s.slug}</p>
                  </div>
                </div>
                {/* Active toggle */}
                <Toggle
                  checked={s.active}
                  aria-label={`Toggle ${s.name} active`}
                  color="violet"
                  onChange={() => handleToggle(s.id, s.active)}
                />
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-neutral-400">
                  <span className="text-neutral-600 w-20 shrink-0">Transport</span>
                  <span className="uppercase font-mono text-xs tracking-wider text-violet-400">{s.transport}</span>
                </div>
                {s.transport === 'http' && (
                  <div className="flex items-center gap-2 text-neutral-400">
                    <span className="text-neutral-600 w-20 shrink-0">URL</span>
                    <span className="truncate">{s.url || '—'}</span>
                  </div>
                )}
                {s.transport === 'stdio' && (
                  <div className="flex items-center gap-2 text-neutral-400">
                    <span className="text-neutral-600 w-20 shrink-0">Command</span>
                    <span className="truncate font-mono">{s.command || '—'}</span>
                  </div>
                )}
              </div>

              {/* Test result */}
              {trData && (
                <div className="bg-emerald-950/40 border border-emerald-900/30 rounded-lg px-3 py-2">
                  <p className="text-xs text-emerald-400 font-medium mb-1">
                    {trData.tool_count} tool{trData.tool_count === 1 ? '' : 's'} available
                  </p>
                  {trData.tools.length > 0 && (
                    <p className="text-xs text-neutral-500 truncate">{trData.tools.slice(0, 5).join(', ')}{trData.tools.length > 5 ? ` +${trData.tools.length - 5} more` : ''}</p>
                  )}
                </div>
              )}
              {trError && (
                <div className="bg-red-950/40 border border-red-900/30 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-400">{trError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 mt-auto pt-2 border-t border-neutral-800/30">
                {s.transport === 'http' && (
                  <button
                    onClick={() => handleTest(s.id)}
                    disabled={testingId === s.id}
                    title="Test connection"
                    className="p-2 rounded-lg text-neutral-500 hover:text-violet-400 hover:bg-neutral-800 transition-all duration-150 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => startEdit(s)}
                  title="Edit"
                  className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all duration-150"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  title="Delete"
                  className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-all duration-150"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {servers.length === 0 && !isFormOpen && (
        <EmptyState
          message="No tool servers yet"
          description="Browse the Marketplace for one-click installs, or add a custom server manually."
          action={{ label: 'Browse Marketplace', onClick: () => setTab('marketplace') }}
        />
      )}
      </>
      )}

      {tab === 'marketplace' && (
      <>
        <p className="text-xs text-neutral-500">
          Curated catalog of remote MCP servers. One click installs the server and reuses
          the linked connector's OAuth token — no extra auth step required.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {MCP_CATALOG.map((entry) => {
            const installed = installedSlugs.has(entry.slug)
            return (
              <div key={entry.slug} className="bg-neutral-900/50 border border-neutral-800/50 hover:border-neutral-700 rounded-xl p-5 flex flex-col gap-3 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-900/30 flex items-center justify-center shrink-0 text-lg">
                    {entry.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{entry.name}</p>
                    <p className="text-xs text-neutral-500 font-mono">{entry.category}</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 line-clamp-4">{entry.description}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2 text-neutral-500">
                    <span className="text-neutral-600 w-24 shrink-0">Endpoint</span>
                    <span className="truncate font-mono text-neutral-400">{entry.mcp_url}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-500">
                    <span className="text-neutral-600 w-24 shrink-0">Reuses auth</span>
                    <span className="font-mono text-neutral-400">{entry.requires_connector_slug}</span>
                  </div>
                </div>
                <div className="mt-auto pt-2 border-t border-neutral-800/30 flex items-center justify-between gap-2">
                  {entry.docs_url && (
                    <a href={entry.docs_url} target="_blank" rel="noreferrer" className="text-xs text-neutral-500 hover:text-neutral-300">
                      Docs ↗
                    </a>
                  )}
                  <button
                    onClick={() => handleInstallCatalog(entry.slug)}
                    disabled={installed || installingSlug === entry.slug}
                    className={`ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      installed
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 cursor-default'
                        : 'bg-white text-black hover:bg-neutral-200 disabled:opacity-50'
                    }`}
                  >
                    {installed ? 'Installed' : installingSlug === entry.slug ? 'Installing…' : 'Install'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </>
      )}

      <SidePanel
        open={isFormOpen}
        onClose={cancelForm}
        title={editingId ? 'Edit Tool Server' : 'New Tool Server'}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs text-neutral-500 mb-1.5">Name</label>
            <input
              value={form.name}
              onChange={e => updateForm('name', e.target.value)}
              placeholder="e.g. GitHub Tools"
              className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors"
            />
            <p className="text-xs text-[--text-muted] mt-1">ID: {form.slug || '—'}</p>
            <details className="mt-1">
              <summary className="text-xs text-neutral-500 cursor-pointer select-none">Advanced</summary>
              <div className="mt-2">
                <label className="block text-xs text-neutral-500 mb-1.5">Slug</label>
                <input
                  value={form.slug}
                  onChange={e => updateForm('slug', e.target.value)}
                  placeholder="e.g. github-tools"
                  className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors"
                />
              </div>
            </details>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5">Transport</label>
            <select
              value={form.transport}
              onChange={e => updateForm('transport', e.target.value)}
              className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors"
            >
              <option value="http">HTTP</option>
              <option value="stdio">stdio (local only)</option>
            </select>
          </div>

          {form.transport === 'http' && (
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Server URL</label>
              <input
                value={form.url}
                onChange={e => updateForm('url', e.target.value)}
                placeholder="https://mcp.example.com"
                className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors"
              />
            </div>
          )}

          {form.transport === 'stdio' && (
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Command</label>
              <input
                value={form.command}
                onChange={e => updateForm('command', e.target.value)}
                placeholder="npx -y @modelcontextprotocol/server-github"
                className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors"
              />
              <p className="text-xs text-amber-500/80 mt-1.5">
                stdio transport is not available in serverless environments.
              </p>
            </div>
          )}
        </div>

        {/* Active toggle row */}
        <div className="flex items-center gap-3">
          <Toggle
            checked={form.active}
            color="violet"
            onChange={() => updateForm('active', !form.active)}
          />
          <span className="text-xs text-neutral-400">Active</span>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150 disabled:opacity-50"
          >
            {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add tool server'}
          </button>
          <button
            onClick={cancelForm}
            className="px-4 py-2 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:text-white hover:border-neutral-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </SidePanel>
    </div>
  )
}
