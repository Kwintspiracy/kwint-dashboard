'use client'

import { useEffect, useState } from 'react'
import { getSkills, toggleSkillActive, createSkill, updateSkill, deleteSkill } from '@/lib/queries'
import { SKILL_TEMPLATES, SKILL_CATEGORIES, type SkillTemplate } from '@/lib/skill-templates'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'

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
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <PageHeader
        title="Skills"
        count={tab === 'installed' ? skills.length : undefined}
      >
        {tab === 'installed' && (
          <button onClick={startAdd} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors">
            Add skill
          </button>
        )}
      </PageHeader>

      {/* Tab bar */}
      <div className="flex gap-6 border-b border-neutral-800">
        <button
          onClick={() => setTab('installed')}
          className={`text-sm font-medium transition-colors ${
            tab === 'installed'
              ? 'text-white border-b-2 border-emerald-500 pb-3'
              : 'text-neutral-500 hover:text-neutral-300 pb-3 transition-colors'
          }`}
        >
          Installed
        </button>
        <button
          onClick={() => setTab('marketplace')}
          className={`text-sm font-medium transition-colors ${
            tab === 'marketplace'
              ? 'text-white border-b-2 border-emerald-500 pb-3'
              : 'text-neutral-500 hover:text-neutral-300 pb-3 transition-colors'
          }`}
        >
          Marketplace
        </button>
      </div>

      {/* ── Installed tab ── */}
      {tab === 'installed' && (
        <div className="space-y-4">
          <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800/50">
                  <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider w-12">On</th>
                  <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Slug</th>
                  <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Base URL</th>
                  <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">API Key</th>
                  <th className="text-right px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((s) => (
                  <tr key={s.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggle(s.id, s.active)}
                        className={`w-9 h-5 rounded-full relative transition-colors ${s.active ? 'bg-emerald-600' : 'bg-neutral-700'}`}
                      >
                        <span className={`absolute top-1 w-3.5 h-3.5 bg-white rounded-full transition-all shadow-sm ${s.active ? 'left-[18px]' : 'left-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-200 font-medium">{s.name}</td>
                    <td className="px-5 py-3.5 text-neutral-500 font-mono text-xs">{s.slug}</td>
                    <td className="px-5 py-3.5 text-neutral-500 text-xs">{s.base_url || '—'}</td>
                    <td className="px-5 py-3.5 text-neutral-500 text-xs">{s.api_key ? '••••••' : '—'}</td>
                    <td className="px-5 py-3.5 text-right space-x-3">
                      <button onClick={() => startEdit(s)} className="text-xs text-neutral-400 hover:text-white transition-colors">Edit</button>
                      <button onClick={() => handleDelete(s.id)} className="text-xs text-neutral-400 hover:text-red-400 transition-colors">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {skills.length === 0 && <EmptyState message="No skills yet" />}
          </div>

          {isFormOpen && (
            <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-6 space-y-5">
              <p className="text-sm font-semibold text-white">{editingId ? 'Edit Skill' : 'New Skill'}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="e.g. GitHub API"
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5">Slug</label>
                  <input
                    value={form.slug}
                    onChange={(e) => updateForm('slug', e.target.value)}
                    placeholder="e.g. github-api"
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5">
                    API Key <span className="text-neutral-600">(optional)</span>
                  </label>
                  <input
                    value={form.api_key}
                    onChange={(e) => updateForm('api_key', e.target.value)}
                    placeholder="sk-..."
                    type="password"
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5">
                    Base URL <span className="text-neutral-600">(optional)</span>
                  </label>
                  <input
                    value={form.base_url}
                    onChange={(e) => updateForm('base_url', e.target.value)}
                    placeholder="https://api.example.com"
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1.5">
                  Content <span className="text-neutral-600">(markdown — this teaches the agent how to use the API)</span>
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => updateForm('content', e.target.value)}
                  placeholder={'# API Documentation\n\nDescribe endpoints, auth, examples...'}
                  rows={14}
                  className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white font-mono leading-relaxed focus:border-neutral-600 focus:outline-none resize-y"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleSave} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors">
                  {editingId ? 'Save changes' : 'Create skill'}
                </button>
                <button
                  onClick={() => { setEditingId(null); setShowAdd(false) }}
                  className="px-4 py-2 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:text-white hover:border-neutral-600 transition-colors"
                >
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
          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={
                  categoryFilter === cat
                    ? 'bg-white text-black rounded-full px-3 py-1 text-xs font-medium'
                    : 'border border-neutral-800 text-neutral-400 rounded-full px-3 py-1 text-xs hover:text-white hover:border-neutral-700 transition-colors'
                }
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Template grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTemplates.map(template => {
              const isInstalled = installedSlugs.has(template.slug)
              const categoryLabel = SKILL_CATEGORIES[template.category]?.label ?? template.category
              return (
                <div
                  key={template.id}
                  className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-5 hover:border-neutral-700 transition-all flex flex-col gap-4"
                  style={{ borderLeftColor: template.color, borderLeftWidth: '4px' }}
                >
                  {/* Icon + name + description */}
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${template.color}18` }}>
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill={template.color}>
                          <path d={template.icon} />
                        </svg>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white leading-tight">{template.name}</p>
                      <p className="text-xs text-neutral-400 mt-1 leading-relaxed line-clamp-3">{template.description}</p>
                    </div>
                  </div>

                  {/* Footer: category badge + action */}
                  <div className="flex items-center justify-between mt-auto pt-1">
                    <Badge
                      label={categoryLabel}
                      color={
                        template.category === 'google' ? 'blue' :
                        template.category === 'communication' ? 'purple' :
                        template.category === 'dev' ? 'emerald' :
                        template.category === 'productivity' ? 'amber' :
                        template.category === 'search' ? 'red' :
                        'neutral'
                      }
                    />

                    {isInstalled ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-900/30 border border-emerald-900/40 rounded-lg">
                        <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
                          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                        </svg>
                        Installed
                      </span>
                    ) : (
                      <button
                        onClick={() => openInstallModal(template)}
                        className="px-4 py-2 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:text-white hover:border-neutral-600 transition-colors"
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
            <EmptyState message="No templates in this category" />
          )}
        </div>
      )}

      {/* ── Install modal ── */}
      {installing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800/50 rounded-2xl w-full max-w-md shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-neutral-800/50">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${installing.color}18` }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill={installing.color}>
                  <path d={installing.icon} />
                </svg>
              </div>
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
            <div className="px-6 py-5 space-y-4">
              {installedSlug === installing.slug ? (
                <div className="text-center py-6 space-y-3">
                  <div className="flex justify-center">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-900/40 text-emerald-400">
                      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                        <path d="M20.285 6.709a1 1 0 00-1.414-1.418L9 15.163l-3.871-3.872a1 1 0 10-1.414 1.414l4.578 4.578a1 1 0 001.414 0l10.578-10.574z" />
                      </svg>
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white">Installed successfully!</p>
                  <p className="text-xs text-neutral-400">{installing.name} is now available in your skills.</p>
                  <button onClick={closeInstallModal} className="mt-2 px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors">
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {installing.fields.length > 0 ? (
                    <div className="space-y-4">
                      {installing.fields.map(field => (
                        <div key={field.key}>
                          <label className="block text-xs text-neutral-400 mb-1.5">
                            {field.label}
                            {field.required && <span className="text-red-400 ml-0.5">*</span>}
                          </label>
                          <input
                            type={field.type === 'password' ? 'password' : 'text'}
                            value={installForm[field.key] ?? ''}
                            onChange={e => setInstallForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                            placeholder={field.placeholder}
                            className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none"
                          />
                          {field.help && <p className="text-xs text-neutral-600 mt-1">{field.help}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 py-2">No configuration needed. Click Deploy to install.</p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleDeploy}
                      disabled={installLoading}
                      className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {installLoading ? 'Deploying...' : 'Deploy'}
                    </button>
                    <button
                      onClick={closeInstallModal}
                      className="px-4 py-2 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:text-white hover:border-neutral-600 transition-colors"
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
