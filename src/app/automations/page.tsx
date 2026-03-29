'use client'

import { useEffect, useState } from 'react'
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, getAgents } from '@/lib/queries'
import { timeAgo } from '@/lib/utils'

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
    <div className="space-y-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          Automations
          {schedules.length > 0 && (
            <span className="ml-2 text-sm font-normal text-neutral-500">{schedules.length}</span>
          )}
        </h1>
        <button
          onClick={startAdd}
          className="px-3 py-1.5 text-xs font-medium bg-white text-black rounded-md hover:bg-neutral-200"
        >
          Create automation
        </button>
      </div>

      {/* List */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-neutral-500 border-b border-neutral-800">
              <th className="text-left px-4 py-2 font-medium w-8"></th>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Agent</th>
              <th className="text-left px-4 py-2 font-medium">Schedule</th>
              <th className="text-left px-4 py-2 font-medium">Last run</th>
              <th className="text-left px-4 py-2 font-medium">Next run</th>
              <th className="text-right px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                {/* Status dot */}
                <td className="px-4 py-3">
                  <span
                    title={s.active ? 'Active' : 'Paused'}
                    className={`inline-block w-2 h-2 rounded-full ${s.active ? 'bg-emerald-500' : 'bg-neutral-600'}`}
                  />
                </td>

                {/* Name + type badge */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-200 font-medium">{s.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                      s.type === 'heartbeat'
                        ? 'bg-blue-950/60 text-blue-400 border border-blue-900/40'
                        : 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40'
                    }`}>
                      {s.type === 'heartbeat' ? 'Heartbeat' : 'Cron'}
                    </span>
                  </div>
                </td>

                {/* Agent */}
                <td className="px-4 py-3 text-neutral-400 text-xs">
                  {s.agents?.name || s.agent_id}
                </td>

                {/* Cron expression */}
                <td className="px-4 py-3">
                  <div>
                    <span className="text-neutral-300 text-xs font-mono">{s.cron_expr}</span>
                    <span className="text-neutral-600 text-xs ml-2">({describeCron(s.cron_expr)})</span>
                  </div>
                </td>

                {/* Last run */}
                <td className="px-4 py-3">
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
                <td className="px-4 py-3 text-neutral-500 text-xs">
                  {s.next_run_at ? timeAgo(s.next_run_at).replace(' ago', '') : '—'}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right space-x-3">
                  <button onClick={() => startEdit(s)} className="text-xs text-neutral-400 hover:text-white">Edit</button>
                  <button
                    onClick={() => handleToggle(s)}
                    className={`text-xs ${s.active ? 'text-neutral-400 hover:text-amber-400' : 'text-neutral-400 hover:text-emerald-400'}`}
                  >
                    {s.active ? 'Pause' : 'Resume'}
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="text-xs text-neutral-400 hover:text-red-400">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {schedules.length === 0 && (
          <p className="px-4 py-8 text-center text-neutral-600 text-sm">No automations yet</p>
        )}
      </div>

      {/* Create / Edit form */}
      {isFormOpen && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-4">
          <p className="text-sm font-medium text-white">{editingId ? 'Edit Automation' : 'New Automation'}</p>

          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="e.g. Daily morning digest"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => updateForm('type', e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-300"
              >
                <option value="cron">Cron — run a task on schedule</option>
                <option value="heartbeat">Heartbeat — check objectives periodically</option>
              </select>
            </div>

            {/* Agent */}
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Agent</label>
              <select
                value={form.agent_id}
                onChange={(e) => updateForm('agent_id', e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-300"
              >
                <option value="">Select agent...</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Cron expression */}
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Cron expression</label>
              <input
                value={form.cron_expr}
                onChange={(e) => updateForm('cron_expr', e.target.value)}
                placeholder="0 9 * * *"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white font-mono"
              />
              {/* Quick picks */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CRON_EXAMPLES.map((ex) => (
                  <button
                    key={ex.expr}
                    type="button"
                    onClick={() => updateForm('cron_expr', ex.expr)}
                    className="px-2 py-0.5 text-xs text-neutral-400 bg-neutral-800 border border-neutral-700 rounded hover:border-neutral-500 hover:text-neutral-200 font-mono"
                  >
                    {ex.expr} <span className="text-neutral-600 font-sans">— {ex.label}</span>
                  </button>
                ))}
              </div>
              {form.cron_expr && (
                <p className="mt-1 text-xs text-neutral-500">{describeCron(form.cron_expr)}</p>
              )}
            </div>
          </div>

          {/* Conditional textarea: task or objectives */}
          {form.type === 'cron' ? (
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Task</label>
              <textarea
                value={form.task}
                onChange={(e) => updateForm('task', e.target.value)}
                placeholder="Describe exactly what the agent should do when this runs..."
                rows={5}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white leading-relaxed"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Objectives</label>
              <textarea
                value={form.objectives}
                onChange={(e) => updateForm('objectives', e.target.value)}
                placeholder="What should the agent monitor or check each time it runs..."
                rows={5}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white leading-relaxed"
              />
            </div>
          )}

          {/* Optional Chat ID */}
          <div className="max-w-sm">
            <label className="block text-xs text-neutral-500 mb-1">
              Telegram Chat ID <span className="text-neutral-600">(optional — for delivery)</span>
            </label>
            <input
              value={form.chat_id}
              onChange={(e) => updateForm('chat_id', e.target.value)}
              placeholder="-100123456789"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white font-mono"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-md px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-medium bg-white text-black rounded-md hover:bg-neutral-200"
            >
              {editingId ? 'Save changes' : 'Create automation'}
            </button>
            <button onClick={cancelForm} className="px-4 py-2 text-xs text-neutral-400 hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
