'use client'

import { useEffect, useState } from 'react'
import { getConnectors, createConnector, updateConnector, deleteConnector, toggleConnectorActive } from '@/lib/queries'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'

type Connector = {
  id: string; name: string; slug: string
  base_url: string | null; has_key: boolean
  active: boolean; created_at: string
}

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(true)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', base_url: '', api_key: '' })

  async function load() {
    const c = await getConnectors()
    setConnectors(c as Connector[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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

  function cancelForm() {
    setEditingId(null)
    setShowAdd(false)
  }

  async function handleSave() {
    if (editingId) {
      const patch: Record<string, unknown> = { name: form.name, slug: form.slug, base_url: form.base_url || null }
      if (form.api_key) patch.api_key = form.api_key  // Only update key if provided
      await updateConnector(editingId, patch)
      setEditingId(null)
    } else {
      await createConnector({
        name: form.name, slug: form.slug,
        base_url: form.base_url || undefined, api_key: form.api_key || undefined,
      })
      setShowAdd(false)
    }
    load()
  }

  async function handleToggle(id: string, active: boolean) { await toggleConnectorActive(id, !active); load() }
  async function handleDelete(id: string) {
    if (confirm('Delete this connector? Skills linked to it will be unlinked.')) { await deleteConnector(id); load() }
  }

  const isFormOpen = editingId !== null || showAdd

  if (loading) return <p className="text-neutral-500 text-sm">Loading...</p>

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Connectors" count={connectors.length}>
        <button
          onClick={startAdd}
          className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors"
        >
          Add connector
        </button>
      </PageHeader>

      <p className="text-xs text-neutral-500">
        API credentials and endpoints. Link connectors to skills to give your agents API access.
      </p>

      {/* Connector tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {connectors.map(c => (
          <div
            key={c.id}
            className={`bg-neutral-900/50 border rounded-xl p-5 transition-all flex flex-col gap-3 ${
              c.active ? 'border-neutral-800/50 hover:border-neutral-700' : 'border-neutral-800/30 opacity-50'
            }`}
          >
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
                onClick={() => handleToggle(c.id, c.active)}
                className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${c.active ? 'bg-emerald-600' : 'bg-neutral-700'}`}
              >
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

      {connectors.length === 0 && !isFormOpen && <EmptyState message="No connectors yet — add one or install a skill from the Marketplace" />}

      {isFormOpen && (
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-6 space-y-5">
          <p className="text-sm font-semibold text-white">{editingId ? 'Edit Connector' : 'New Connector'}</p>
          <div className="grid grid-cols-2 gap-4">
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
  )
}
