'use client'

import { useState } from 'react'
import {
  getSchedulesAction,
  createScheduleAction,
  updateScheduleAction,
  deleteScheduleAction,
  getAgentsAction,
  getTriggersAction,
  createTriggerAction,
  updateTriggerAction,
  deleteTriggerAction,
  toggleTriggerActiveAction,
} from '@/lib/actions'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/components/AuthProvider'
import { timeAgo } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import { toast } from 'sonner'

type Agent = { id: string; name: string; slug: string }

type Schedule = {
  id: string
  name: string
  type: string
  agent_id: string
  cron_expr: string
  active: boolean
  task: string | null
  objectives: string | null
  chat_id: string | null
  last_run_at: string | null
  last_run_status: string | null
  next_run_at: string | null
  created_at: string
  agents: { name: string } | null
}

type Trigger = {
  id: string
  name: string
  slug: string
  agent_id: string
  task_template: string
  active: boolean
  secret: string
  last_triggered_at: string | null
  trigger_count: number
  created_at: string
  agents: { name: string; slug: string } | null
}

function describeCron(expr: string): string {
  if (expr.startsWith('*/')) {
    const mins = expr.split(' ')[0].replace('*/', '')
    return `Every ${mins} min`
  }
  const parts = expr.split(' ')
  if (parts[1]?.startsWith('*/')) return `Every ${parts[1].replace('*/', '')}h`
  if (parts.length >= 5) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const h = parts[1], d = parts[4]
    if (d !== '*') return `${days[+d] || d} at ${h}:${parts[0].padStart(2, '0')}`
    return `Daily at ${h}:${parts[0].padStart(2, '0')}`
  }
  return expr
}

const CRON_EXAMPLES = [
  { expr: '*/30 * * * *', label: 'Every 30 min' },
  { expr: '0 */2 * * *', label: 'Every 2 hours' },
  { expr: '0 9 * * *', label: 'Daily at 9:00' },
  { expr: '0 9 * * 1', label: 'Monday at 9:00' },
]

const EMPTY_FORM = {
  name: '',
  type: 'cron',
  agent_id: '',
  cron_expr: '',
  task: '',
  objectives: '',
  chat_id: '',
}

const EMPTY_TRIGGER_FORM = {
  name: '',
  slug: '',
  agent_id: '',
  task_template: '',
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

const WEBHOOK_BASE_URL = 'https://kwint-dashboard.vercel.app'

function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handleCopy}
      className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors ml-1 shrink-0"
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}

// ─── Tab toggle ───────────────────────────────────────────────────────────────

type TabId = 'schedules' | 'triggers'

export default function AutomationsPage() {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

  const [activeTab, setActiveTab] = useState<TabId>('schedules')

  // Schedule state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  // Trigger state
  const [editingTriggerId, setEditingTriggerId] = useState<string | null>(null)
  const [showAddTrigger, setShowAddTrigger] = useState(false)
  const [triggerForm, setTriggerForm] = useState(EMPTY_TRIGGER_FORM)
  const [triggerError, setTriggerError] = useState('')

  const { data: schedulesRaw = [], isLoading: loading, mutate } = useData(['schedules', eid], getSchedulesAction)
  const schedules = schedulesRaw as Schedule[]

  const { data: agentsRaw = [] } = useData(['agents', eid], getAgentsAction)
  const agents = agentsRaw as Agent[]

  const { data: triggersRaw = [], isLoading: triggersLoading, mutate: mutateTriggers } = useData(['triggers', eid], getTriggersAction)
  const triggers = triggersRaw as Trigger[]

  // ─── Schedule handlers ────────────────────────────────────────────────────

  function startAdd() {
    setEditingId(null)
    setShowAdd(true)
    setError('')
    setForm({ ...EMPTY_FORM, agent_id: agents[0]?.id || '' })
  }

  function startEdit(s: Schedule) {
    setEditingId(s.id)
    setShowAdd(false)
    setError('')
    setForm({
      name: s.name,
      type: s.type,
      agent_id: s.agent_id,
      cron_expr: s.cron_expr,
      task: s.task || '',
      objectives: s.objectives || '',
      chat_id: s.chat_id || '',
    })
  }

  function cancelForm() {
    setEditingId(null)
    setShowAdd(false)
    setError('')
  }

  function updateForm(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.agent_id) { setError('Select an agent'); return }
    if (!form.cron_expr.trim()) { setError('Cron expression is required'); return }

    setError('')
    const payload = {
      agent_id: form.agent_id,
      type: form.type,
      name: form.name.trim(),
      cron_expr: form.cron_expr.trim(),
      task: form.type === 'cron' ? (form.task || null) : null,
      objectives: form.type === 'heartbeat' ? (form.objectives || null) : null,
      chat_id: form.chat_id || null,
    }

    try {
      if (editingId) {
        const result = await updateScheduleAction(editingId, payload)
        if (!result.ok) { setError(result.error); toast.error(result.error); return }
        toast.success('Automation updated')
        setEditingId(null)
      } else {
        const result = await createScheduleAction(payload)
        if (!result.ok) { setError(result.error); toast.error(result.error); return }
        toast.success('Automation created')
        setShowAdd(false)
      }
      mutate()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      setError(msg)
      toast.error(msg)
    }
  }

  async function handleToggle(s: Schedule) {
    const result = await updateScheduleAction(s.id, { active: !s.active })
    if (!result.ok) { toast.error(result.error); return }
    mutate()
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this automation?')) {
      const result = await deleteScheduleAction(id)
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Automation deleted')
      mutate()
    }
  }

  // ─── Trigger handlers ─────────────────────────────────────────────────────

  function startAddTrigger() {
    setEditingTriggerId(null)
    setShowAddTrigger(true)
    setTriggerError('')
    setTriggerForm({ ...EMPTY_TRIGGER_FORM, agent_id: agents[0]?.id || '' })
  }

  function startEditTrigger(t: Trigger) {
    setEditingTriggerId(t.id)
    setShowAddTrigger(false)
    setTriggerError('')
    setTriggerForm({
      name: t.name,
      slug: t.slug,
      agent_id: t.agent_id,
      task_template: t.task_template,
    })
  }

  function cancelTriggerForm() {
    setEditingTriggerId(null)
    setShowAddTrigger(false)
    setTriggerError('')
  }

  function updateTriggerForm(field: string, value: string) {
    setTriggerForm(prev => {
      const next = { ...prev, [field]: value }
      // Auto-generate slug from name (only when creating new)
      if (field === 'name' && !editingTriggerId) {
        next.slug = slugify(value)
      }
      return next
    })
  }

  async function handleSaveTrigger() {
    if (!triggerForm.name.trim()) { setTriggerError('Name is required'); return }
    if (!triggerForm.slug.trim()) { setTriggerError('Slug is required'); return }
    if (!triggerForm.agent_id) { setTriggerError('Select an agent'); return }
    if (!triggerForm.task_template.trim()) { setTriggerError('Task template is required'); return }

    setTriggerError('')
    const payload = {
      name: triggerForm.name.trim(),
      slug: triggerForm.slug.trim(),
      agent_id: triggerForm.agent_id,
      task_template: triggerForm.task_template.trim(),
    }

    try {
      if (editingTriggerId) {
        const result = await updateTriggerAction(editingTriggerId, payload)
        if (!result.ok) { setTriggerError(result.error); toast.error(result.error); return }
        toast.success('Trigger updated')
        setEditingTriggerId(null)
      } else {
        const result = await createTriggerAction(payload)
        if (!result.ok) { setTriggerError(result.error); toast.error(result.error); return }
        toast.success('Trigger created')
        setShowAddTrigger(false)
      }
      mutateTriggers()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      setTriggerError(msg)
      toast.error(msg)
    }
  }

  async function handleToggleTrigger(t: Trigger) {
    const result = await toggleTriggerActiveAction(t.id, !t.active)
    if (!result.ok) { toast.error(result.error); return }
    mutateTriggers()
  }

  async function handleDeleteTrigger(id: string) {
    if (confirm('Delete this trigger?')) {
      const result = await deleteTriggerAction(id)
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Trigger deleted')
      mutateTriggers()
    }
  }

  const isFormOpen = editingId !== null || showAdd
  const isTriggerFormOpen = editingTriggerId !== null || showAddTrigger

  if (loading && activeTab === 'schedules') return <TableSkeleton rows={5} cols={7} />
  if (triggersLoading && activeTab === 'triggers') return <TableSkeleton rows={3} cols={5} />

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <PageHeader
        title="Automations"
        count={activeTab === 'schedules' ? schedules.length : triggers.length}
      >
        {activeTab === 'schedules' ? (
          <button
            onClick={startAdd}
            className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Create automation
          </button>
        ) : (
          <button
            onClick={startAddTrigger}
            className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Create trigger
          </button>
        )}
      </PageHeader>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-neutral-800/50">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'schedules'
              ? 'border-white text-white'
              : 'border-transparent text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Schedules
        </button>
        <button
          onClick={() => setActiveTab('triggers')}
          className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'triggers'
              ? 'border-white text-white'
              : 'border-transparent text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Webhook Triggers
          {triggers.length > 0 && (
            <span className="ml-1.5 text-[10px] text-neutral-600">({triggers.length})</span>
          )}
        </button>
      </div>

      {/* ─── Schedules tab ──────────────────────────────────────────────────── */}
      {activeTab === 'schedules' && (
        <>
          <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800/50">
                  <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider w-10"></th>
                  <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Agent</th>
                  <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Schedule</th>
                  <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Last run</th>
                  <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Next run</th>
                  <th className="text-right px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <Badge
                        label={s.active ? 'Active' : 'Paused'}
                        color={s.active ? 'emerald' : 'neutral'}
                        dot
                      />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-200 font-medium">{s.name}</span>
                        <Badge
                          label={s.type === 'heartbeat' ? 'Heartbeat' : 'Cron'}
                          color={s.type === 'heartbeat' ? 'blue' : 'emerald'}
                        />
                      </div>
                    </td>

                    <td className="px-5 py-4 text-neutral-400 text-xs">
                      {s.agents?.name || s.agent_id}
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-neutral-300 text-xs font-mono">{s.cron_expr}</span>
                      <span className="text-xs text-neutral-500 ml-2">{describeCron(s.cron_expr)}</span>
                    </td>

                    <td className="px-5 py-4">
                      {s.last_run_at ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-neutral-500 text-xs">{timeAgo(s.last_run_at)}</span>
                          {s.last_run_status && (
                            <span className={`text-xs ${
                              s.last_run_status === 'success' ? 'text-emerald-500' :
                              s.last_run_status === 'failed' ? 'text-red-400' :
                              'text-neutral-500'
                            }`}>
                              {s.last_run_status}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-700 text-xs">Never</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-neutral-500 text-xs">
                      {s.next_run_at ? timeAgo(s.next_run_at).replace(' ago', '') : '—'}
                    </td>

                    <td className="px-5 py-4 text-right space-x-3">
                      <button onClick={() => startEdit(s)} className="text-xs text-neutral-400 hover:text-white transition-colors">Edit</button>
                      <button
                        role="switch"
                        aria-checked={s.active}
                        aria-label={`Toggle ${s.name} active`}
                        onClick={() => handleToggle(s)}
                        className={`text-xs transition-colors ${s.active ? 'text-neutral-400 hover:text-amber-400' : 'text-neutral-400 hover:text-emerald-400'}`}
                      >
                        {s.active ? 'Pause' : 'Resume'}
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="text-xs text-neutral-400 hover:text-red-400 transition-colors">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {schedules.length === 0 && <EmptyState message="No automations yet" />}
          </div>

          {/* Create / Edit schedule form */}
          {isFormOpen && (
            <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-6 space-y-5">
              <p className="text-sm font-semibold text-white">{editingId ? 'Edit Automation' : 'New Automation'}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="e.g. Daily morning digest"
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5">Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateForm('type', 'cron')}
                      className={`flex-1 px-3 py-2.5 text-xs rounded-lg border transition-colors text-left ${
                        form.type === 'cron'
                          ? 'border-emerald-600 bg-emerald-950/30 text-emerald-400'
                          : 'border-neutral-800 bg-neutral-800/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300'
                      }`}
                    >
                      <span className="font-semibold block">Cron</span>
                      <span className="text-[10px] opacity-70">Run a task on schedule</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateForm('type', 'heartbeat')}
                      className={`flex-1 px-3 py-2.5 text-xs rounded-lg border transition-colors text-left ${
                        form.type === 'heartbeat'
                          ? 'border-blue-600 bg-blue-950/30 text-blue-400'
                          : 'border-neutral-800 bg-neutral-800/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300'
                      }`}
                    >
                      <span className="font-semibold block">Heartbeat</span>
                      <span className="text-[10px] opacity-70">Check objectives periodically</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5">Agent</label>
                  <select
                    value={form.agent_id}
                    onChange={(e) => updateForm('agent_id', e.target.value)}
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none"
                  >
                    <option value="">Select agent...</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5">Cron expression</label>
                  <input
                    value={form.cron_expr}
                    onChange={(e) => updateForm('cron_expr', e.target.value)}
                    placeholder="0 9 * * *"
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {CRON_EXAMPLES.map((ex) => (
                      <button
                        key={ex.expr}
                        type="button"
                        onClick={() => updateForm('cron_expr', ex.expr)}
                        className="border border-neutral-800 text-neutral-400 rounded-full px-3 py-1 text-xs hover:text-white hover:border-neutral-700 transition-colors font-mono"
                      >
                        {ex.expr} <span className="text-neutral-600 font-sans">— {ex.label}</span>
                      </button>
                    ))}
                  </div>
                  {form.cron_expr && (
                    <p className="mt-1.5 text-xs text-neutral-500">{describeCron(form.cron_expr)}</p>
                  )}
                </div>
              </div>

              {form.type === 'cron' ? (
                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5">Task</label>
                  <textarea
                    value={form.task}
                    onChange={(e) => updateForm('task', e.target.value)}
                    placeholder="Describe exactly what the agent should do when this runs..."
                    rows={5}
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white leading-relaxed focus:border-neutral-600 focus:outline-none resize-y"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5">Objectives</label>
                  <textarea
                    value={form.objectives}
                    onChange={(e) => updateForm('objectives', e.target.value)}
                    placeholder="What should the agent monitor or check each time it runs..."
                    rows={5}
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white leading-relaxed focus:border-neutral-600 focus:outline-none resize-y"
                  />
                </div>
              )}

              <div className="max-w-sm">
                <label className="block text-xs text-neutral-500 mb-1.5">
                  Telegram Chat ID <span className="text-neutral-600">(optional — for delivery)</span>
                </label>
                <input
                  value={form.chat_id}
                  onChange={(e) => updateForm('chat_id', e.target.value)}
                  placeholder="-100123456789"
                  className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-4 py-2.5">{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  {editingId ? 'Save changes' : 'Create automation'}
                </button>
                <button
                  onClick={cancelForm}
                  className="px-4 py-2 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:text-white hover:border-neutral-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Triggers tab ───────────────────────────────────────────────────── */}
      {activeTab === 'triggers' && (
        <>
          {/* Trigger cards */}
          <div className="space-y-3">
            {triggers.map((t) => (
              <div key={t.id} className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-5">
                {editingTriggerId === t.id ? (
                  /* Inline edit form */
                  <TriggerForm
                    form={triggerForm}
                    agents={agents}
                    error={triggerError}
                    isEdit
                    onChange={updateTriggerForm}
                    onSave={handleSaveTrigger}
                    onCancel={cancelTriggerForm}
                  />
                ) : (
                  <div className="space-y-3">
                    {/* Top row: name + badge + actions */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-neutral-200 font-medium text-sm truncate">{t.name}</span>
                        <Badge
                          label={t.active ? 'Active' : 'Paused'}
                          color={t.active ? 'emerald' : 'neutral'}
                          dot
                        />
                        {t.agents && (
                          <span className="text-xs text-neutral-500 shrink-0">{t.agents.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => startEditTrigger(t)}
                          className="text-xs text-neutral-400 hover:text-white transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleTrigger(t)}
                          className={`text-xs transition-colors ${t.active ? 'text-neutral-400 hover:text-amber-400' : 'text-neutral-400 hover:text-emerald-400'}`}
                        >
                          {t.active ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          onClick={() => handleDeleteTrigger(t.id)}
                          className="text-xs text-neutral-400 hover:text-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Webhook URL */}
                    <div className="flex items-center gap-2 bg-neutral-800/40 rounded-lg px-3 py-2">
                      <span className="text-[10px] text-neutral-600 uppercase tracking-wider shrink-0 font-semibold">URL</span>
                      <code className="text-xs text-neutral-300 font-mono truncate flex-1">
                        {WEBHOOK_BASE_URL}/api/webhook/{t.slug}
                      </code>
                      <CopyButton value={`${WEBHOOK_BASE_URL}/api/webhook/${t.slug}`} label="Copy" />
                    </div>

                    {/* Secret */}
                    <div className="flex items-center gap-2 bg-neutral-800/40 rounded-lg px-3 py-2">
                      <span className="text-[10px] text-neutral-600 uppercase tracking-wider shrink-0 font-semibold">Secret</span>
                      <code className="text-xs text-neutral-500 font-mono tracking-widest flex-1">
                        {'•'.repeat(Math.min(t.secret?.length ?? 16, 20))}
                      </code>
                      <CopyButton value={t.secret || ''} label="Reveal & Copy" />
                    </div>

                    {/* Stats footer */}
                    <div className="flex items-center gap-4 pt-0.5">
                      <span className="text-[11px] text-neutral-600">
                        Fired <span className="text-neutral-400">{t.trigger_count}</span> times
                      </span>
                      {t.last_triggered_at && (
                        <span className="text-[11px] text-neutral-600">
                          Last: <span className="text-neutral-400">{timeAgo(t.last_triggered_at)}</span>
                        </span>
                      )}
                      <span className="text-[11px] text-neutral-700 font-mono truncate">
                        /{t.slug}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {triggers.length === 0 && !showAddTrigger && (
              <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl">
                <EmptyState message="No webhook triggers yet" />
              </div>
            )}
          </div>

          {/* Create trigger form */}
          {showAddTrigger && (
            <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-6">
              <p className="text-sm font-semibold text-white mb-5">New Webhook Trigger</p>
              <TriggerForm
                form={triggerForm}
                agents={agents}
                error={triggerError}
                isEdit={false}
                onChange={updateTriggerForm}
                onSave={handleSaveTrigger}
                onCancel={cancelTriggerForm}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Trigger form component ───────────────────────────────────────────────────

type TriggerFormProps = {
  form: typeof EMPTY_TRIGGER_FORM
  agents: Agent[]
  error: string
  isEdit: boolean
  onChange: (field: string, value: string) => void
  onSave: () => void
  onCancel: () => void
}

function TriggerForm({ form, agents, error, isEdit, onChange, onSave, onCancel }: TriggerFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className="block text-xs text-neutral-500 mb-1.5">Name</label>
          <input
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="e.g. GitHub push event"
            className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-xs text-neutral-500 mb-1.5">
            Slug <span className="text-neutral-600">(URL-safe, auto-generated from name)</span>
          </label>
          <input
            value={form.slug}
            onChange={(e) => onChange('slug', e.target.value)}
            placeholder="github-push-event"
            className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none"
          />
        </div>

        {/* Agent */}
        <div className="sm:col-span-2">
          <label className="block text-xs text-neutral-500 mb-1.5">Agent</label>
          <select
            value={form.agent_id}
            onChange={(e) => onChange('agent_id', e.target.value)}
            className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none"
          >
            <option value="">Select agent...</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Task template */}
      <div>
        <label className="block text-xs text-neutral-500 mb-1.5">Task template</label>
        <textarea
          value={form.task_template}
          onChange={(e) => onChange('task_template', e.target.value)}
          placeholder={'Process this webhook data: {{payload}}'}
          rows={4}
          className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white leading-relaxed font-mono focus:border-neutral-600 focus:outline-none resize-y"
        />
        <p className="mt-1.5 text-[11px] text-neutral-600">
          Use <code className="text-neutral-500 bg-neutral-800 px-1 py-0.5 rounded">{'{{payload}}'}</code> to include the raw POST body in the task. Example:{' '}
          <span className="text-neutral-500 font-mono">{'Process this data: {{payload}}'}</span>
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-4 py-2.5">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors"
        >
          {isEdit ? 'Save changes' : 'Create trigger'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:text-white hover:border-neutral-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
