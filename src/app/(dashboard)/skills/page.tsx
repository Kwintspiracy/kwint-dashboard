'use client'

import { useState } from 'react'
import SidePanel from '@/components/SidePanel'
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
  resetSkillToDefaultAction,
  retryJobAction,
} from '@/lib/actions'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/components/AuthProvider'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import { toast } from 'sonner'
import Toggle from '@/components/Toggle'
import { SKILL_TEMPLATES } from '@/lib/skill-templates'

type ConnectorRef = { id: string; name: string; slug: string }
type Connector = ConnectorRef & { base_url: string | null; has_key: boolean; active: boolean }
type RequiredConfigItem = { label: string; description: string; type: 'connector_slug' | 'manual'; value?: string; critical: boolean }
type OperationItem = { name: string; slug: string; risk: 'read' | 'write' | 'destructive'; requires_approval: boolean }
type Skill = {
  id: string; name: string; slug: string; content: string
  description: string | null
  default_content: string | null
  content_overridden: boolean
  required_config: RequiredConfigItem[] | null
  operations: OperationItem[] | null
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
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', content: '', description: '', default_content: '', content_overridden: false, required_config: null as RequiredConfigItem[] | null, operations: null as OperationItem[] | null })
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [selectedConnectorIds, setSelectedConnectorIds] = useState<string[]>([])
  const [versionCounts, setVersionCounts] = useState<Record<string, number>>({})

  const [versions, setVersions] = useState<SkillVersion[]>([])
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [rollingBack, setRollingBack] = useState<string | null>(null)

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
    setForm({
      name: s.name, slug: s.slug, content: s.content,
      description: s.description ?? '',
      default_content: s.default_content ?? '',
      content_overridden: s.content_overridden ?? false,
      required_config: s.required_config ?? null,
      operations: s.operations ?? null,
    })
    setSlugManuallyEdited(false)
    setSelectedConnectorIds((s.skill_connectors || []).map(sc => sc.connector_id))
    setShowAdd(false)
    setVersionsOpen(false)
    setVersions([])
  }

  function startAdd() {
    setEditingId(null)
    setForm({ name: '', slug: '', content: '', description: '', default_content: '', content_overridden: false, required_config: null, operations: null })
    setSlugManuallyEdited(false)
    setSelectedConnectorIds([])
    setShowAdd(true)
    setVersionsOpen(false)
    setVersions([])
  }

  function updateForm(field: string, value: string) {
    if (field === 'slug') {
      setSlugManuallyEdited(true)
      setForm(prev => ({ ...prev, slug: value }))
      return
    }
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'name' && !slugManuallyEdited) {
        next.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
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
    setSlugManuallyEdited(false)
    setVersionsOpen(false)
    setVersions([])
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (editingId) {
        const [updateResult, connResult] = await Promise.all([
          updateSkillAction(editingId, {
            name: form.name, slug: form.slug, content: form.content,
            description: form.description || null,
            operations: form.operations || null,
          }),
          updateSkillConnectorsAction(editingId, selectedConnectorIds),
        ])
        if (!updateResult.ok) { toast.error(updateResult.error); return }
        if (!connResult.ok) { toast.error(connResult.error); return }
        toast.success('Skill updated')
        setEditingId(null)
      } else {
        const result = await createSkillAction({
          name: form.name, slug: form.slug, content: form.content,
          description: form.description || null,
          default_content: form.default_content || null,
          required_config: form.required_config || null,
          operations: form.operations || null,
          connector_ids: selectedConnectorIds,
        })
        if (!result.ok) { toast.error(result.error); return }
        toast.success('Skill created')
        setShowAdd(false)
      }
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleResetToDefault() {
    if (!editingId) return
    if (!confirm('Reset skill content to the original template? Your customizations will be saved in version history.')) return
    setResetting(true)
    try {
      const result = await resetSkillToDefaultAction(editingId)
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Content reset to default')
      const resetData = result.data as unknown as Skill
      setForm(prev => ({ ...prev, content: resetData.content, content_overridden: false }))
      await load()
    } finally {
      setResetting(false)
    }
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
      await load()
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

  const activeCount = skills.filter(s => s.active).length

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Skills" count={skills.length}>
        <button onClick={startAdd} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150">
          Add skill
        </button>
      </PageHeader>

      {/* Stats row */}
      {skills.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span><span className="text-emerald-400 font-semibold">{activeCount}</span> active</span>
          <span><span className="text-neutral-400 font-semibold">{skills.length - activeCount}</span> inactive</span>
          <span className="text-neutral-700">·</span>
          <span><span className="text-violet-400 font-semibold">{skills.filter(s => (s.skill_connectors || []).length > 0).length}</span> with connectors</span>
        </div>
      )}

      {/* Skills table */}
      <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800/60">
              <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider w-14">Active</th>
              <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Name</th>
              <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider hidden md:table-cell">Slug</th>
              <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider hidden md:table-cell">Connectors</th>
              <th className="text-right px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((s) => {
              const linked = (s.skill_connectors || []).map(sc => sc.connectors).filter(Boolean)
              const vCount = versionCounts[s.id] ?? 0
              return (
                <tr key={s.id} className="border-b border-neutral-800/40 hover:bg-neutral-800/20 transition-colors duration-150">
                  <td className="px-5 py-3.5">
                    <SkillToggle id={s.id} active={s.active} name={s.name} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium ${s.active ? 'text-neutral-200' : 'text-neutral-500'}`}>{s.name}</span>
                      {s.default_content && !s.content_overridden && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 rounded-md">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                          Validated
                        </span>
                      )}
                      {s.content_overridden && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-amber-400 bg-amber-950/20 border border-amber-900/30 rounded-md">
                          Customized
                        </span>
                      )}
                      {(s.operations ?? []).slice(0, 4).map(op => (
                        <span key={op.slug} className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border ${
                          op.risk === 'read' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' :
                          op.risk === 'write' ? 'bg-amber-950/40 text-amber-400 border-amber-900/30' :
                          'bg-red-950/40 text-red-400 border-red-900/30'
                        }`}>{op.name}</span>
                      ))}
                      {(s.operations ?? []).length > 4 && (
                        <span className="text-xs text-neutral-600">+{(s.operations ?? []).length - 4} more</span>
                      )}
                      {vCount > 0 && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-neutral-500 bg-neutral-800/80 border border-neutral-700/60 rounded-md">
                          v{vCount + 1}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="text-neutral-600 font-mono text-xs bg-neutral-800/50 px-2 py-0.5 rounded">{s.slug}</span>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    {linked.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {linked.map(c => (
                          <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 rounded-md">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <button onClick={() => openTestModal(s)} title="Test skill" className="p-2 rounded-lg text-neutral-500 hover:text-violet-400 hover:bg-neutral-800 transition-all duration-150">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                      </button>
                      <button onClick={() => startEdit(s)} title="Edit skill" className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all duration-150">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(s.id)} title="Delete skill" className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-all duration-150">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {skills.length === 0 && <EmptyState message="No skills yet — add one manually or install a connector from the Marketplace" />}
      </div>

      {/* Edit / Add — right side panel */}
      <SidePanel
        open={isFormOpen}
        onClose={cancelForm}
        title={editingId ? 'Edit Skill' : 'New Skill'}
        subtitle={editingId ? skills.find(s => s.id === editingId)?.name : undefined}
        width="lg"
      >
          {/* Template picker — new skills only */}
          {!editingId && (
            <div>
              <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">
                Load from template <span className="normal-case text-neutral-700 font-normal">(optional)</span>
              </label>
              <select
                defaultValue=""
                onChange={e => {
                  const tpl = SKILL_TEMPLATES.find(t => t.id === e.target.value)
                  if (!tpl) return
                  setForm({
                    name: tpl.name, slug: tpl.slug, content: tpl.content,
                    description: tpl.description || '',
                    default_content: tpl.content,
                    content_overridden: false,
                    required_config: tpl.required_config ? tpl.required_config.map(r => ({
                      label: r.label, description: r.description, type: r.type, value: r.value, critical: r.critical,
                    })) : null,
                    operations: tpl.operations ? tpl.operations.map(o => ({
                      name: o.name, slug: o.slug, risk: o.risk, requires_approval: o.requires_approval,
                    })) : null,
                  })
                  setSlugManuallyEdited(true)
                  // auto-select connector if already installed
                  if (tpl.connector?.slug) {
                    const match = connectors.find(c => c.slug === tpl.connector!.slug)
                    if (match) setSelectedConnectorIds([match.id])
                  }
                }}
                className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors duration-150"
              >
                <option value="">— select a template —</option>
                {SKILL_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Name</label>
            <input value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="e.g. Google Sheets"
              className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors duration-150" />
            <p className="text-xs text-[--text-muted] mt-1">ID: {form.slug || '—'}</p>
            <details className="mt-1">
              <summary className="text-xs text-neutral-500 cursor-pointer select-none">Advanced</summary>
              <div className="mt-2">
                <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Slug</label>
                <input value={form.slug} onChange={(e) => updateForm('slug', e.target.value)} placeholder="e.g. google-sheets"
                  className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors duration-150" />
              </div>
            </details>
          </div>

          {form.description && (
            <div>
              <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">About</label>
              <p className="text-xs text-neutral-400 bg-neutral-900/40 rounded-lg px-3 py-2.5 border border-neutral-800/40 leading-relaxed">
                {form.description}
              </p>
            </div>
          )}

          {/* Required configuration callout */}
          {form.required_config && form.required_config.length > 0 && (
            <div className="border border-amber-900/40 bg-amber-950/10 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Required setup</p>
              {form.required_config.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${item.critical ? 'bg-amber-400' : 'bg-neutral-500'}`} />
                  <div>
                    <p className="text-xs font-medium text-neutral-300">{item.label}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Operations — pills + approval toggles */}
          {form.operations && form.operations.length > 0 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-2">What this skill can do</label>
                <div className="flex flex-wrap gap-1.5">
                  {form.operations.map(op => (
                    <span key={op.slug} className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border ${
                      op.risk === 'read' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' :
                      op.risk === 'write' ? 'bg-amber-950/40 text-amber-400 border-amber-900/30' :
                      'bg-red-950/40 text-red-400 border-red-900/30'
                    }`}>
                      {op.risk === 'destructive' && <span>⚠</span>}
                      {op.name}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-neutral-700 mt-1.5">Green = read-only · Amber = creates/modifies · Red = irreversible or external action</p>
              </div>
              {form.operations.filter(op => op.risk !== 'read').length > 0 && (
                <div className="border border-neutral-800/60 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Default approval requirements</p>
                  <p className="text-xs text-neutral-600">These defaults apply to all agents. You can override them per-agent on the Agents page.</p>
                  <div className="space-y-1.5 pt-1">
                    {form.operations.filter(op => op.risk !== 'read').map((op, i) => {
                      const fullIdx = form.operations!.indexOf(op)
                      return (
                        <label key={op.slug} className="flex items-center gap-2.5 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={op.requires_approval}
                            onChange={() => {
                              setForm(prev => {
                                const ops = [...(prev.operations ?? [])]
                                ops[fullIdx] = { ...ops[fullIdx], requires_approval: !ops[fullIdx].requires_approval }
                                return { ...prev, operations: ops }
                              })
                            }}
                            className="rounded border-neutral-700 bg-neutral-800 accent-amber-500 shrink-0 cursor-pointer"
                          />
                          <span className={`text-xs transition-colors ${op.requires_approval ? 'text-amber-400' : 'text-neutral-500 group-hover:text-neutral-300'}`}>
                            Require approval before: <span className="font-medium">{op.name}</span>
                          </span>
                          {op.risk === 'destructive' && <span className="text-xs text-red-500/60">⚠</span>}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-2">
              Connectors <span className="normal-case text-neutral-600 font-normal">(click to link/unlink)</span>
            </label>
            {connectors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {connectors.map(c => {
                  const selected = selectedConnectorIds.includes(c.id)
                  return (
                    <button key={c.id} type="button" onClick={() => toggleConnector(c.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150 ${
                        selected
                          ? 'bg-emerald-950/30 text-emerald-400 border-emerald-700/60'
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs text-neutral-500 uppercase tracking-wider">
                Content <span className="normal-case text-neutral-600 font-normal">(markdown — knowledge, procedures, or API documentation)</span>
              </label>
              {editingId && form.content_overridden && form.default_content && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  disabled={resetting}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors duration-150 disabled:opacity-50 flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  {resetting ? 'Resetting…' : 'Reset to default'}
                </button>
              )}
            </div>
            <textarea value={form.content} onChange={(e) => updateForm('content', e.target.value)}
              placeholder={'# Skill Documentation\n\nDescribe what this skill teaches the agent...'}
              rows={16}
              className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white font-mono leading-relaxed focus:border-neutral-600 focus:outline-none transition-colors duration-150 resize-y" />
          </div>

          {/* Version History */}
          {editingId && (
            <div className="border border-neutral-800/60 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={handleToggleVersions}
                className="w-full flex items-center justify-between px-4 py-3 bg-neutral-800/20 hover:bg-neutral-800/40 transition-colors duration-150 text-left"
              >
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Version History</span>
                <svg
                  className={`w-3.5 h-3.5 text-neutral-600 transition-transform duration-150 ${versionsOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {versionsOpen && (
                <div className="px-4 py-3 space-y-1 border-t border-neutral-800/60">
                  {versionsLoading ? (
                    <p className="text-xs text-neutral-500 py-2">Loading versions…</p>
                  ) : versions.length === 0 ? (
                    <p className="text-xs text-neutral-600 py-2">No previous versions yet. Save changes to start tracking history.</p>
                  ) : (
                    versions.map(v => (
                      <div key={v.id} className="flex items-center justify-between py-2 border-b border-neutral-800/40 last:border-0">
                        <div>
                          <span className="text-xs font-mono text-neutral-300">v{v.version}</span>
                          <span className="text-xs text-neutral-600 ml-2">— {formatVersionDate(v.created_at)}</span>
                          {v.name !== form.name && (
                            <span className="ml-2 text-xs text-neutral-500 italic">{v.name}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRollback(v.id)}
                          disabled={rollingBack === v.id}
                          className="text-xs text-neutral-400 hover:text-amber-400 transition-colors duration-150 disabled:opacity-50"
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
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150 disabled:opacity-60 disabled:pointer-events-none">
              {saving && <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
              {editingId ? 'Save changes' : 'Create skill'}
            </button>
            <button onClick={cancelForm} className="px-4 py-2 text-xs font-medium border border-neutral-800 text-neutral-500 rounded-lg hover:text-white hover:border-neutral-700 transition-colors duration-150">
              Cancel
            </button>
          </div>
      </SidePanel>

      {/* Test Skill Modal */}
      {testSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f0f0f] border border-neutral-800/80 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/60">
              <div>
                <p className="text-sm font-semibold text-white">Test skill</p>
                <p className="text-xs text-neutral-500 mt-0.5">{testSkill.name}</p>
              </div>
              <button onClick={closeTestModal} className="text-neutral-500 hover:text-white transition-colors duration-150 p-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Test prompt</label>
                <input
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRunTest() } }}
                  placeholder={`Ask something that exercises this skill…`}
                  className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors duration-150"
                  autoFocus
                />
              </div>

              <button
                onClick={handleRunTest}
                disabled={testRunning || !testPrompt.trim()}
                className="w-full px-4 py-2.5 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {testRunning ? 'Running…' : 'Run test'}
              </button>

              {testError && (
                <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/40">
                  <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-1">Error</p>
                  <p className="text-xs text-red-300/80 font-mono whitespace-pre-wrap">{testError}</p>
                </div>
              )}

              {testResult && (
                <div className="p-3 rounded-lg bg-neutral-800/40 border border-neutral-800/60">
                  <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-2">Result</p>
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
