'use client'

import { useEffect, useState } from 'react'
import { getSkills, getConnectors, toggleSkillActive, createSkill, updateSkill, updateSkillConnectors, deleteSkill } from '@/lib/queries'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'

type ConnectorRef = { id: string; name: string; slug: string }
type Connector = ConnectorRef & { base_url: string | null; has_key: boolean; active: boolean }
type Skill = {
  id: string; name: string; slug: string; content: string
  active: boolean; created_at: string
  skill_connectors: { connector_id: string; connectors: ConnectorRef }[]
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(true)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', content: '' })
  const [selectedConnectorIds, setSelectedConnectorIds] = useState<string[]>([])

  async function load() {
    const [s, c] = await Promise.all([getSkills(), getConnectors()])
    setSkills(s as Skill[])
    setConnectors(c as Connector[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startEdit(s: Skill) {
    setEditingId(s.id)
    setForm({ name: s.name, slug: s.slug, content: s.content })
    setSelectedConnectorIds((s.skill_connectors || []).map(sc => sc.connector_id))
    setShowAdd(false)
  }

  function startAdd() {
    setEditingId(null)
    setForm({ name: '', slug: '', content: '' })
    setSelectedConnectorIds([])
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

  function toggleConnector(id: string) {
    setSelectedConnectorIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  function cancelForm() { setEditingId(null); setShowAdd(false) }

  async function handleSave() {
    if (editingId) {
      await updateSkill(editingId, { name: form.name, slug: form.slug, content: form.content })
      await updateSkillConnectors(editingId, selectedConnectorIds)
      setEditingId(null)
    } else {
      await createSkill({ name: form.name, slug: form.slug, content: form.content }, selectedConnectorIds)
      setShowAdd(false)
    }
    load()
  }

  async function handleToggle(id: string, active: boolean) { await toggleSkillActive(id, !active); load() }
  async function handleDelete(id: string) {
    if (confirm('Delete this skill?')) { await deleteSkill(id); load() }
  }

  const isFormOpen = editingId !== null || showAdd

  if (loading) return <p className="text-neutral-500 text-sm">Loading...</p>

  function Toggle({ id, active }: { id: string; active: boolean }) {
    return (
      <button onClick={() => handleToggle(id, active)}
        className={`w-9 h-5 rounded-full relative transition-colors ${active ? 'bg-emerald-600' : 'bg-neutral-700'}`}>
        <span className={`absolute top-1 w-3.5 h-3.5 bg-white rounded-full transition-all shadow-sm ${active ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    )
  }

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Skills" count={skills.length}>
        <button onClick={startAdd} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors">
          Add skill
        </button>
      </PageHeader>

      <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800/50">
              <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider w-12">On</th>
              <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Name</th>
              <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Slug</th>
              <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Connectors</th>
              <th className="text-right px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((s) => {
              const linked = (s.skill_connectors || []).map(sc => sc.connectors).filter(Boolean)
              return (
                <tr key={s.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                  <td className="px-5 py-3.5"><Toggle id={s.id} active={s.active} /></td>
                  <td className="px-5 py-3.5 text-neutral-200 font-medium">{s.name}</td>
                  <td className="px-5 py-3.5 text-neutral-500 font-mono text-xs">{s.slug}</td>
                  <td className="px-5 py-3.5">
                    {linked.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {linked.map(c => (
                          <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-emerald-400 bg-emerald-900/20 border border-emerald-900/30 rounded-md">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-3">
                    <button onClick={() => startEdit(s)} className="text-xs text-neutral-400 hover:text-white transition-colors">Edit</button>
                    <button onClick={() => handleDelete(s.id)} className="text-xs text-neutral-400 hover:text-red-400 transition-colors">Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {skills.length === 0 && <EmptyState message="No skills yet — add one manually or install a connector from the Marketplace" />}
      </div>

      {isFormOpen && (
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-6 space-y-5">
          <p className="text-sm font-semibold text-white">{editingId ? 'Edit Skill' : 'New Skill'}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Name</label>
              <input value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="e.g. Google Sheets"
                className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Slug</label>
              <input value={form.slug} onChange={(e) => updateForm('slug', e.target.value)} placeholder="e.g. google-sheets"
                className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-2">
              Connectors <span className="text-neutral-600">(click to link/unlink)</span>
            </label>
            {connectors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {connectors.map(c => {
                  const selected = selectedConnectorIds.includes(c.id)
                  return (
                    <button key={c.id} type="button" onClick={() => toggleConnector(c.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        selected
                          ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700'
                          : 'bg-neutral-800/30 text-neutral-500 border-neutral-800 hover:text-neutral-300 hover:border-neutral-700'
                      }`}>
                      {selected && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                      {c.name}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-neutral-600">No connectors available. Create one in the Connectors page first.</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1.5">
              Content <span className="text-neutral-600">(markdown — knowledge, procedures, or API documentation)</span>
            </label>
            <textarea value={form.content} onChange={(e) => updateForm('content', e.target.value)}
              placeholder={'# Skill Documentation\n\nDescribe what this skill teaches the agent...'}
              rows={16}
              className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white font-mono leading-relaxed focus:border-neutral-600 focus:outline-none transition-colors resize-y" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors">
              {editingId ? 'Save changes' : 'Create skill'}
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
