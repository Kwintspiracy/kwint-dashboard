'use client'

import { useEffect, useState } from 'react'
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, getAgents } from '@/lib/queries'
import { timeAgo } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'

type Agent = { id: string; name: string }

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

export default function AutomationsPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  async function load() {
    const [scheds, agts] = await Promise.all([getSchedules(), getAgents()])
    setSchedules(scheds as Schedule[])
    setAgents(agts)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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
        await updateSchedule(editingId, payload)
        setEditingId(null)
      } else {
        await createSchedule(payload)
        setShowAdd(false)
      }
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  async function handleToggle(s: Schedule) {
    await updateSchedule(s.id, { active: !s.active })
    load()
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this automation?')) {
      await deleteSchedule(id)
      load()
    }
  }

  const isFormOpen = editingId !== null || showAdd

  if (loading) return <p className="text-neutral-500 text-sm">Loading...</p>

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <PageHeader title="Automations" count={schedules.length}>
        <button
          onClick={startAdd}
          className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors"
        >
          Create automation
        </button>
      </PageHeader>

      {/* Schedule list */}
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
                {/* Status dot */}
                <td className="px-5 py-4">
                  <Badge
                    label={s.active ? 'Active' : 'Paused'}
                    color={s.active ? 'emerald' : 'neutral'}
                    dot
                  />
                </td>

                {/* Name + type badge */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-200 font-medium">{s.name}</span>
                    <Badge
                      label={s.type === 'heartbeat' ? 'Heartbeat' : 'Cron'}
                      color={s.type === 'heartbeat' ? 'blue' : 'emerald'}
                    />
                  </div>
                </td>

                {/* Agent */}
                <td className="px-5 py-4 text-neutral-400 text-xs">
                  {s.agents?.name || s.agent_id}
                </td>

                {/* Cron expression */}
                <td className="px-5 py-4">
                  <span className="text-neutral-300 text-xs font-mono">{s.cron_expr}</span>
                  <span className="text-xs text-neutral-500 ml-2">{describeCron(s.cron_expr)}</span>
                </td>

                {/* Last run */}
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

                {/* Next run */}
                <td className="px-5 py-4 text-neutral-500 text-xs">
                  {s.next_run_at ? timeAgo(s.next_run_at).replace(' ago', '') : '—'}
                </td>

                {/* Actions */}
                <td className="px-5 py-4 text-right space-x-3">
                  <button onClick={() => startEdit(s)} className="text-xs text-neutral-400 hover:text-white transition-colors">Edit</button>
                  <button
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

      {/* Create / Edit form */}
      {isFormOpen && (
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-6 space-y-5">
          <p className="text-sm font-semibold text-white">{editingId ? 'Edit Automation' : 'New Automation'}</p>

          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Name</label>
              <input
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="e.g. Daily morning digest"
                className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none"
              />
            </div>

            {/* Type — styled radio-like buttons */}
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

            {/* Agent */}
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

            {/* Cron expression */}
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Cron expression</label>
              <input
                value={form.cron_expr}
                onChange={(e) => updateForm('cron_expr', e.target.value)}
                placeholder="0 9 * * *"
                className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none"
              />
              {/* Quick-pick pills */}
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

          {/* Conditional textarea: task or objectives */}
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

          {/* Optional Chat ID */}
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
    </div>
  )
}
