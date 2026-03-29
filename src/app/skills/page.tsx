'use client'

import { useEffect, useState } from 'react'
import { getSkills, toggleSkillActive, createSkill, updateSkill, deleteSkill } from '@/lib/queries'
import { SKILL_TEMPLATES, SKILL_CATEGORIES, type SkillTemplate } from '@/lib/skill-templates'

type Skill = {
  id: string; name: string; slug: string; content: string
  api_key: string | null; base_url: string | null; active: boolean; created_at: string
}

const ALL_CATEGORIES = 'All'

export default function SkillsPage() {
  const [tab, setTab] = useState<'installed' | 'marketplace'>('installed')
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)

  // Installed tab state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', content: '', api_key: '', base_url: '' })

  // Marketplace tab state
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES)
  const [installing, setInstalling] = useState<SkillTemplate | null>(null)
  const [installForm, setInstallForm] = useState<Record<string, string>>({})
  const [installLoading, setInstallLoading] = useState(false)
  const [installedSlug, setInstalledSlug] = useState<string | null>(null)

  async function load() { setSkills(await getSkills()); setLoading(false) }
  useEffect(() => { load() }, [])

  // ── Installed tab handlers ──────────────────────────

  function startEdit(s: Skill) {
    setEditingId(s.id)
    setForm({ name: s.name, slug: s.slug, content: s.content, api_key: s.api_key || '', base_url: s.base_url || '' })
    setShowAdd(false)
  }

  function startAdd() {
    setEditingId(null)
    setForm({ name: '', slug: '', content: '', api_key: '', base_url: '' })
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

  async function handleSave() {
    if (editingId) {
      await updateSkill(editingId, { name: form.name, slug: form.slug, content: form.content, api_key: form.api_key || null, base_url: form.base_url || null })
      setEditingId(null)
    } else {
      await createSkill({ name: form.name, slug: form.slug, content: form.content, api_key: form.api_key || undefined, base_url: form.base_url || undefined })
      setShowAdd(false)
    }
    load()
  }

  async function handleToggle(id: string, active: boolean) { await toggleSkillActive(id, !active); load() }
  async function handleDelete(id: string) { if (confirm('Delete this skill?')) { await deleteSkill(id); load() } }

  // ── Marketplace handlers ────────────────────────────

  function openInstallModal(template: SkillTemplate) {
    const defaults: Record<string, string> = {}
    for (const field of template.fields) {
      defaults[field.key] = ''
    }
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
      await createSkill({
        name: installing.name,
        slug: installing.slug,
        content: installing.content,
        api_key: installForm['api_key'] || undefined,
        base_url: installing.base_url || installForm['base_url'] || undefined,
      })
      await load()
      setInstalledSlug(installing.slug)
    } finally {
      setInstallLoading(false)
    }
  }

  // ── Derived state ───────────────────────────────────

  const installedSlugs = new Set(skills.map(s => s.slug))
  const isFormOpen = editingId !== null || showAdd

  const categories = [ALL_CATEGORIES, ...Object.keys(SKILL_CATEGORIES)]
  const filteredTemplates = categoryFilter === ALL_CATEGORIES
    ? SKILL_TEMPLATES
    : SKILL_TEMPLATES.filter(t => t.category === categoryFilter)

  if (loading) return <p className="text-neutral-500 text-sm">Loading...</p>

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Skills</h1>
        {tab === 'installed' && (
          <button onClick={startAdd} className="px-3 py-1.5 text-xs font-medium bg-white text-black rounded-md hover:bg-neutral-200">
            Add skill
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-6 border-b border-neutral-800">
        <button
          onClick={() => setTab('installed')}
          className={`pb-2 text-sm font-medium transition-colors ${
            tab === 'installed'
              ? 'text-white border-b-2 border-white -mb-px'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Installed ({skills.length})
        </button>
        <button
          onClick={() => setTab('marketplace')}
          className={`pb-2 text-sm font-medium transition-colors ${
            tab === 'marketplace'
              ? 'text-white border-b-2 border-white -mb-px'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Marketplace
        </button>
      </div>

      {/* ── Installed tab ── */}
      {tab === 'installed' && (
        <div className="space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-neutral-500 border-b border-neutral-800">
                  <th className="text-left px-4 py-2 font-medium w-10">On</th>
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Slug</th>
                  <th className="text-left px-4 py-2 font-medium">Base URL</th>
                  <th className="text-left px-4 py-2 font-medium">API Key</th>
                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((s) => (
                  <tr key={s.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                    <td className="px-4 py-2">
                      <button onClick={() => handleToggle(s.id, s.active)}
                        className={`w-8 h-4 rounded-full relative ${s.active ? 'bg-emerald-600' : 'bg-neutral-700'}`}>
                        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${s.active ? 'left-4' : 'left-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-2 text-neutral-200 font-medium">{s.name}</td>
                    <td className="px-4 py-2 text-neutral-500 font-mono text-xs">{s.slug}</td>
                    <td className="px-4 py-2 text-neutral-500 text-xs">{s.base_url || '—'}</td>
                    <td className="px-4 py-2 text-neutral-500 text-xs">{s.api_key ? '••••••' : '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => startEdit(s)} className="text-xs text-neutral-400 hover:text-white mr-3">Edit</button>
                      <button onClick={() => handleDelete(s.id)} className="text-xs text-neutral-400 hover:text-red-400">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {skills.length === 0 && <p className="px-4 py-8 text-center text-neutral-600 text-sm">No skills yet</p>}
          </div>

          {isFormOpen && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-4">
              <p className="text-sm font-medium text-white">{editingId ? 'Edit Skill' : 'New Skill'}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Name</label>
                  <input value={form.name} onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="e.g. GitHub API"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Slug</label>
                  <input value={form.slug} onChange={(e) => updateForm('slug', e.target.value)}
                    placeholder="e.g. github-api"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">API Key <span className="text-neutral-600">(optional)</span></label>
                  <input value={form.api_key} onChange={(e) => updateForm('api_key', e.target.value)}
                    placeholder="sk-..."
                    type="password"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Base URL <span className="text-neutral-600">(optional)</span></label>
                  <input value={form.base_url} onChange={(e) => updateForm('base_url', e.target.value)}
                    placeholder="https://api.example.com"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Content <span className="text-neutral-600">(markdown — this teaches the agent how to use the API)</span></label>
                <textarea value={form.content} onChange={(e) => updateForm('content', e.target.value)}
                  placeholder="# API Documentation&#10;&#10;Describe endpoints, auth, examples..."
                  rows={12}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white font-mono leading-relaxed" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} className="px-4 py-2 text-xs font-medium bg-white text-black rounded-md hover:bg-neutral-200">
                  {editingId ? 'Save changes' : 'Create skill'}
                </button>
                <button onClick={() => { setEditingId(null); setShowAdd(false) }} className="px-4 py-2 text-xs text-neutral-400 hover:text-white">
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
          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  categoryFilter === cat
                    ? 'bg-white text-black border-white'
                    : 'bg-transparent text-neutral-400 border-neutral-700 hover:border-neutral-500 hover:text-neutral-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Template grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => {
              const isInstalled = installedSlugs.has(template.slug)
              const categoryLabel = SKILL_CATEGORIES[template.category] ?? template.category
              return (
                <div
                  key={template.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col gap-3 hover:bg-neutral-800/30 transition-colors"
                  style={{ borderLeftColor: template.color, borderLeftWidth: '3px' }}
                >
                  {/* Icon + name */}
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      <svg viewBox="0 0 24 24" className="w-8 h-8" fill={template.color}>
                        <path d={template.icon} />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white leading-tight">{template.name}</p>
                      <p className="text-xs text-neutral-400 mt-1 leading-relaxed line-clamp-3">{template.description}</p>
                    </div>
                  </div>

                  {/* Category badge */}
                  <div>
                    <span
                      className="inline-block px-2 py-0.5 text-xs rounded-full font-medium"
                      style={{ backgroundColor: `${template.color}22`, color: template.color }}
                    >
                      {categoryLabel}
                    </span>
                  </div>

                  {/* Action */}
                  <div className="mt-auto pt-1">
                    {isInstalled ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-900/30 rounded-md">
                        <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
                          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                        </svg>
                        Installed
                      </span>
                    ) : (
                      <button
                        onClick={() => openInstallModal(template)}
                        className="px-3 py-1.5 text-xs font-medium bg-neutral-800 text-white border border-neutral-700 rounded-md hover:bg-neutral-700 hover:border-neutral-600 transition-colors"
                      >
                        Install
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <p className="text-center text-neutral-600 text-sm py-12">No templates in this category</p>
          )}
        </div>
      )}

      {/* ── Install modal ── */}
      {installing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-lg shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-800">
              <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0" fill={installing.color}>
                <path d={installing.icon} />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{installing.name}</p>
                <p className="text-xs text-neutral-400 truncate">{installing.description}</p>
              </div>
              <button
                onClick={closeInstallModal}
                className="text-neutral-500 hover:text-white transition-colors ml-2 shrink-0"
              >
                <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
                  <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="px-5 py-4 space-y-4">
              {installedSlug === installing.slug ? (
                <div className="text-center py-6 space-y-2">
                  <div className="flex justify-center">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-900/40 text-emerald-400">
                      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                        <path d="M20.285 6.709a1 1 0 00-1.414-1.418L9 15.163l-3.871-3.872a1 1 0 10-1.414 1.414l4.578 4.578a1 1 0 001.414 0l10.578-10.574z" />
                      </svg>
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white">Installed successfully!</p>
                  <p className="text-xs text-neutral-400">{installing.name} is now available in your skills.</p>
                  <button onClick={closeInstallModal} className="mt-3 px-4 py-2 text-xs font-medium bg-white text-black rounded-md hover:bg-neutral-200">
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {installing.fields.length > 0 ? (
                    <div className="space-y-3">
                      {installing.fields.map(field => (
                        <div key={field.key}>
                          <label className="block text-xs text-neutral-400 mb-1">
                            {field.label}
                            {field.required && <span className="text-red-400 ml-0.5">*</span>}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              value={installForm[field.key] ?? ''}
                              onChange={e => setInstallForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              rows={3}
                              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white font-mono"
                            />
                          ) : (
                            <input
                              type={field.type === 'password' ? 'password' : 'text'}
                              value={installForm[field.key] ?? ''}
                              onChange={e => setInstallForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white"
                            />
                          )}
                          {field.help && <p className="text-xs text-neutral-600 mt-1">{field.help}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 py-2">No configuration needed. Click Deploy to install.</p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleDeploy}
                      disabled={installLoading}
                      className="px-4 py-2 text-xs font-medium bg-white text-black rounded-md hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {installLoading ? 'Deploying...' : 'Deploy'}
                    </button>
                    <button
                      onClick={closeInstallModal}
                      className="px-4 py-2 text-xs text-neutral-400 hover:text-white"
                    >
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
