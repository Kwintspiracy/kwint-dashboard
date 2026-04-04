'use client'

import { useState } from 'react'
import {
  getSkillsAction,
  getConnectorsAction,
  getSkillVersionsAction,
  toggleSkillActiveAction,
  createSkillAction,
  updateSkillAction,
  updateSkillConnectorsAction,
  deleteSkillAction,
  rollbackSkillAction,
  retryJobAction,
} from '@/lib/actions'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/components/AuthProvider'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import { toast } from 'sonner'
import Toggle from '@/components/Toggle'

type ConnectorRef = { id: string; name: string; slug: string }
type Connector = ConnectorRef & { base_url: string | null; has_key: boolean; active: boolean }
type Skill = {
  id: string; name: string; slug: string; content: string
  active: boolean; created_at: string
  skill_connectors: { connector_id: string; connectors: ConnectorRef }[]
}
type SkillVersion = {
  id: string; skill_id: string; version: number; content: string; name: string; created_at: string
}

function formatVersionDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SkillsPage() {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', content: '' })
  const [selectedConnectorIds, setSelectedConnectorIds] = useState<string[]>([])
  const [versionCounts, setVersionCounts] = useState<Record<string, number>>({})

  // Version history state
  const [versions, setVersions] = useState<SkillVersion[]>([])
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [rollingBack, setRollingBack] = useState<string | null>(null)

  // Test skill modal state
  const [testSkill, setTestSkill] = useState<Skill | null>(null)
  const [testPrompt, setTestPrompt] = useState('')
  const [testRunning, setTestRunning] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

  const { data: skillsRaw = [], isLoading: loading, mutate } = useData(['skills', eid], getSkillsAction)
  const skills = skillsRaw as Skill[]

  const { data: connectorsRaw = [] } = useData(['connectors', eid], getConnectorsAction)
  const connectors = connectorsRaw as Connector[]

  async function load() {
    // Reload skills and update version counts
    await mutate()
    const loadedSkills = (await getSkillsAction()) as Skill[]
    const counts: Record<string, number> = {}
    await Promise.all(
      loadedSkills.map(async (s) => {
        try {
          const v = await getSkillVersionsAction(s.id)
          counts[s.id] = v.length
        } catch {
          counts[s.id] = 0
        }
      })
    )
    setVersionCounts(counts)
  }

  async function loadVersions(skillId: string) {
    setVersionsLoading(true)
    try {
      const v = await getSkillVersionsAction(skillId)
      setVersions(v as SkillVersion[])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load versions')
    } finally {
      setVersionsLoading(false)
    }
  }

  function startEdit(s: Skill) {
    setEditingId(s.id)
    setForm({ name: s.name, slug: s.slug, content: s.content })
    setSelectedConnectorIds((s.skill_connectors || []).map(sc => sc.connector_id))
    setShowAdd(false)
    setVersionsOpen(false)
    setVersions([])
  }

  function startAdd() {
    setEditingId(null)
    setForm({ name: '', slug: '', content: '' })
    setSelectedConnectorIds([])
    setShowAdd(true)
    setVersionsOpen(false)
    setVersions([])
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

  function cancelForm() {
    setEditingId(null)
    setShowAdd(false)
    setVersionsOpen(false)
    setVersions([])
  }

  async function handleSave() {
    if (editingId) {
      const [updateResult, connResult] = await Promise.all([
        updateSkillAction(editingId, { name: form.name, slug: form.slug, content: form.content }),
        updateSkillConnectorsAction(editingId, selectedConnectorIds),
      ])
      if (!updateResult.ok) { toast.error(updateResult.error); return }
      if (!connResult.ok) { toast.error(connResult.error); return }
      toast.success('Skill updated')
      setEditingId(null)
    } else {
      const result = await createSkillAction({ name: form.name, slug: form.slug, content: form.content, connector_ids: selectedConnectorIds })
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Skill created')
      setShowAdd(false)
    }
    load()
  }

  async function handleToggleVersions() {
    const next = !versionsOpen
    setVersionsOpen(next)
    if (next && editingId) {
      await loadVersions(editingId)
    }
  }

  async function handleRollback(versionId: string) {
    if (!editingId) return
    if (!confirm('Restore this version? Current content will be saved as a new version.')) return
    setRollingBack(versionId)
    try {
      const result = await rollbackSkillAction(editingId, versionId)
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Version restored')
      // Reload skill data and refresh versions
      await load()
      // Find the updated skill and re-populate the form
      const updated = skills.find(s => s.id === editingId)
      if (updated) {
        const v = await getSkillVersionsAction(editingId)
        const restoredVersion = (v as SkillVersion[]).find(vv => vv.id === versionId)
        if (restoredVersion) {
          setForm(prev => ({ ...prev, name: restoredVersion.name, content: restoredVersion.content }))
        }
        setVersions(v as SkillVersion[])
      }
    } finally {
      setRollingBack(null)
    }
  }

  async function handleToggle(id: string, active: boolean) {
    const result = await toggleSkillActiveAction(id, !active)
    if (!result.ok) { toast.error(result.error); return }
    mutate()
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this skill?')) {
      const result = await deleteSkillAction(id)
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Skill deleted')
      mutate()
    }
  }

  function openTestModal(s: Skill) {
    setTestSkill(s)
    setTestPrompt('')
    setTestResult(null)
    setTestError(null)
  }

  function closeTestModal() {
    setTestSkill(null)
    setTestPrompt('')
    setTestResult(null)
    setTestError(null)
    setTestRunning(false)
  }

  async function handleRunTest() {
    if (!testSkill || !testPrompt.trim()) return
    setTestRunning(true)
    setTestResult(null)
    setTestError(null)
    try {
      const task = `Using the skill '${testSkill.name}', answer this: ${testPrompt.trim()}`
      const result = await retryJobAction(task)
      if (!result.ok) {
        setTestError(result.error)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = result.data as any
        const output = data?.result ?? data?.output ?? data?.message ?? JSON.stringify(data, null, 2)
        setTestResult(typeof output === 'string' ? output : JSON.stringify(output, null, 2))
      }
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setTestRunning(false)
    }
  }

  const isFormOpen = editingId !== null || showAdd

  if (loading) return <TableSkeleton rows={5} cols={5} />

  function SkillToggle({ id, active, name }: { id: string; active: boolean; name: string }) {
    return (
      <Toggle
        checked={active}
        aria-label={`Toggle ${name} active`}
        onChange={() => handleToggle(id, active)}
      />
    )
  }

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Skills" count={skills.length}>
        <button onClick={startAdd} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors">
          Add skill
        </button>
      </PageHeader>

      <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800/50">
              <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider w-12">On</th>
              <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Name</th>
              <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider hidden md:table-cell">Slug</th>
              <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider hidden md:table-cell">Connectors</th>
              <th className="text-right px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((s) => {
              const linked = (s.skill_connectors || []).map(sc => sc.connectors).filter(Boolean)
              const vCount = versionCounts[s.id] ?? 0
              return (
                <tr key={s.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                  <td className="px-5 py-3.5"><SkillToggle id={s.id} active={s.active} name={s.name} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-200 font-medium">{s.name}</span>
                      {vCount > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400 bg-neutral-800 border border-neutral-700 rounded">
                          v{vCount + 1}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-neutral-500 font-mono text-xs hidden md:table-cell">{s.slug}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
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
                    <button onClick={() => openTestModal(s)} className="text-xs text-neutral-400 hover:text-violet-400 transition-colors">Test</button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Version History — only shown when editing an existing skill */}
          {editingId && (
            <div className="border border-neutral-800 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={handleToggleVersions}
                className="w-full flex items-center justify-between px-4 py-3 bg-neutral-800/30 hover:bg-neutral-800/50 transition-colors text-left"
              >
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Version History</span>
                <svg
                  className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${versionsOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {versionsOpen && (
                <div className="px-4 py-3 space-y-1">
                  {versionsLoading ? (
                    <p className="text-xs text-neutral-500 py-2">Loading versions…</p>
                  ) : versions.length === 0 ? (
                    <p className="text-xs text-neutral-600 py-2">No previous versions yet. Save changes to start tracking history.</p>
                  ) : (
                    versions.map(v => (
                      <div key={v.id} className="flex items-center justify-between py-2 border-b border-neutral-800/50 last:border-0">
                        <div>
                          <span className="text-xs font-mono text-neutral-300">v{v.version}</span>
                          <span className="text-xs text-neutral-600 ml-2">— {formatVersionDate(v.created_at)}</span>
                          {v.name !== form.name && (
                            <span className="ml-2 text-[10px] text-neutral-500 italic">{v.name}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRollback(v.id)}
                          disabled={rollingBack === v.id}
                          className="text-[11px] text-neutral-400 hover:text-amber-400 transition-colors disabled:opacity-50"
                        >
                          {rollingBack === v.id ? 'Restoring…' : 'Restore'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

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

      {/* Test Skill Modal */}
      {testSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
              <div>
                <p className="text-sm font-semibold text-white">Test skill</p>
                <p className="text-xs text-neutral-500 mt-0.5">{testSkill.name}</p>
              </div>
              <button onClick={closeTestModal} className="text-neutral-500 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-neutral-500 mb-1.5">Test prompt</label>
                <input
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRunTest() } }}
                  placeholder={`Ask something that exercises this skill…`}
                  className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              <button
                onClick={handleRunTest}
                disabled={testRunning || !testPrompt.trim()}
                className="w-full px-4 py-2.5 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {testRunning ? 'Running…' : 'Run test'}
              </button>

              {testError && (
                <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/40">
                  <p className="text-xs text-red-400 font-medium mb-1">Error</p>
                  <p className="text-xs text-red-300/80 font-mono whitespace-pre-wrap">{testError}</p>
                </div>
              )}

              {testResult && (
                <div className="p-3 rounded-lg bg-neutral-800/50 border border-neutral-800">
                  <p className="text-xs text-neutral-500 font-medium mb-2">Result</p>
                  <p className="text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed">{testResult}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
