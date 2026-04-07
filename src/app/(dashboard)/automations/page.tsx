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
  getPluginsAction,
  createPluginAction,
  updatePluginAction,
  deletePluginAction,
  togglePluginActiveAction,
  runScheduleNowAction,
} from '@/lib/actions'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/components/AuthProvider'
import { timeAgo } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import { toast } from 'sonner'
import SidePanel from '@/components/SidePanel'

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

const CRON_PRESETS: { label: string; expr: string; desc: string }[] = [
  { label: 'Every 15 min',   expr: '*/15 * * * *', desc: 'This schedule will run every 15 minutes.' },
  { label: 'Every 30 min',   expr: '*/30 * * * *', desc: 'This schedule will run every 30 minutes.' },
  { label: 'Every hour',     expr: '0 * * * *',    desc: 'This schedule will run every hour.' },
  { label: 'Daily at 9am',   expr: '0 9 * * *',    desc: 'This schedule will run daily at 9:00 AM.' },
  { label: 'Weekly (Mon)',   expr: '0 9 * * 1',    desc: 'This schedule will run every Monday at 9:00 AM.' },
  { label: 'Monthly (1st)',  expr: '0 9 1 * *',    desc: 'This schedule will run on the 1st of every month at 9:00 AM.' },
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

const WEBHOOK_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kwint-dashboard.vercel.app'

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
      className={`text-xs transition-colors duration-150 ml-1 shrink-0 font-medium ${copied ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'}`}
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}

type Plugin = {
  id: string
  name: string
  slug: string
  description: string | null
  plugin_type: 'webhook' | 'transform' | 'schedule'
  hook: 'pre_task' | 'post_task' | 'pre_tool' | 'post_tool' | 'on_memory_save'
  config: Record<string, unknown>
  active: boolean
  webhook_url: string | null
  created_at: string
}

const EMPTY_PLUGIN_FORM = {
  name: '',
  slug: '',
  description: '',
  plugin_type: 'webhook' as Plugin['plugin_type'],
  hook: 'post_task' as Plugin['hook'],
  webhook_url: '',
  config_json: '{}',
}

type PluginTemplate = {
  name: string
  slug: string
  description: string
  plugin_type: Plugin['plugin_type']
  hook: Plugin['hook']
  webhook_url?: string
  config?: Record<string, unknown>
}

const PLUGIN_TEMPLATES: PluginTemplate[] = [
  {
    name: 'Slack Notification',
    slug: 'slack-notification',
    description: 'Send the agent result to a Slack webhook after every task.',
    plugin_type: 'webhook',
    hook: 'post_task',
    webhook_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
  },
  {
    name: 'Task Logger',
    slug: 'task-logger',
    description: 'Log every incoming task to an external URL before the agent runs.',
    plugin_type: 'webhook',
    hook: 'pre_task',
    webhook_url: 'https://your-logger.example.com/tasks',
  },
  {
    name: 'Result Prefix',
    slug: 'result-prefix',
    description: 'Prepend "[Agent Report]" to every result before delivery.',
    plugin_type: 'transform',
    hook: 'post_task',
    config: { transform: 'prefix', prefix: '[Agent Report] ' },
  },
  {
    name: 'Memory Monitor',
    slug: 'memory-monitor',
    description: 'Notify an external URL whenever a new memory is saved.',
    plugin_type: 'webhook',
    hook: 'on_memory_save',
    webhook_url: 'https://your-monitor.example.com/memory',
  },
]

type TabId = 'schedules' | 'triggers' | 'plugins'

// ── Active status pill ────────────────────────────────────────────────────────

function ActivePill({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border ${
      active
        ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900/40'
        : 'bg-neutral-800/60 text-neutral-500 border-neutral-700/50'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-neutral-600'}`} />
      {active ? 'Active' : 'Paused'}
    </span>
  )
}

export default function AutomationsPage() {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

  const [activeTab, setActiveTab] = useState<TabId>('schedules')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<string | 'custom'>('')
  const [showCustomCron, setShowCustomCron] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)

  const [editingTriggerId, setEditingTriggerId] = useState<string | null>(null)
  const [showAddTrigger, setShowAddTrigger] = useState(false)
  const [triggerForm, setTriggerForm] = useState(EMPTY_TRIGGER_FORM)
  const [triggerError, setTriggerError] = useState('')
  const [triggerSlugManuallyEdited, setTriggerSlugManuallyEdited] = useState(false)

  const [editingPluginId, setEditingPluginId] = useState<string | null>(null)
  const [showAddPlugin, setShowAddPlugin] = useState(false)
  const [pluginForm, setPluginForm] = useState(EMPTY_PLUGIN_FORM)
  const [pluginError, setPluginError] = useState('')
  const [pluginSlugManuallyEdited, setPluginSlugManuallyEdited] = useState(false)

  const { data: schedulesRaw = [], isLoading: loading, mutate } = useData(['schedules', eid], getSchedulesAction)
  const schedules = schedulesRaw as Schedule[]

  const { data: agentsRaw = [] } = useData(['agents', eid], getAgentsAction)
  const agents = agentsRaw as Agent[]

  const { data: triggersRaw = [], isLoading: triggersLoading, mutate: mutateTriggers } = useData(['triggers', eid], getTriggersAction)
  const triggers = triggersRaw as Trigger[]

  const { data: pluginsRaw = [], isLoading: pluginsLoading, mutate: mutatePlugins } = useData(['plugins', eid], getPluginsAction)
  const plugins = pluginsRaw as Plugin[]

  // ─── Schedule handlers ───────────────────────────────────────────────────────

  function startAdd() {
    setEditingId(null)
    setShowAdd(true)
    setError('')
    setSelectedPreset('')
    setShowCustomCron(false)
    setForm({ ...EMPTY_FORM, agent_id: agents[0]?.id || '' })
  }

  function startEdit(s: Schedule) {
    setEditingId(s.id)
    setShowAdd(false)
    setError('')
    // Detect if the cron_expr matches a preset
    const matchedPreset = CRON_PRESETS.find(p => p.expr === s.cron_expr)
    setSelectedPreset(matchedPreset ? matchedPreset.expr : 'custom')
    setShowCustomCron(!matchedPreset)
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

  async function handleRunNow(s: Schedule) {
    setRunningId(s.id)
    try {
      const result = await runScheduleNowAction(s.id)
      if (!result.ok) { toast.error(result.error); return }
      toast.success(`"${s.name}" triggered — job started`)
    } catch {
      toast.error('Failed to trigger automation')
    } finally {
      setRunningId(null)
    }
  }

  // ─── Trigger handlers ────────────────────────────────────────────────────────

  function startAddTrigger() {
    setEditingTriggerId(null)
    setShowAddTrigger(true)
    setTriggerError('')
    setTriggerSlugManuallyEdited(false)
    setTriggerForm({ ...EMPTY_TRIGGER_FORM, agent_id: agents[0]?.id || '' })
  }

  function startEditTrigger(t: Trigger) {
    setEditingTriggerId(t.id)
    setShowAddTrigger(false)
    setTriggerError('')
    setTriggerSlugManuallyEdited(false)
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
    setTriggerSlugManuallyEdited(false)
  }

  function updateTriggerForm(field: string, value: string) {
    if (field === 'slug') {
      setTriggerSlugManuallyEdited(true)
      setTriggerForm(prev => ({ ...prev, slug: value }))
      return
    }
    setTriggerForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'name' && !triggerSlugManuallyEdited) {
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

  // ─── Plugin handlers ─────────────────────────────────────────────────────────

  function startAddPlugin() {
    setEditingPluginId(null)
    setShowAddPlugin(true)
    setPluginError('')
    setPluginSlugManuallyEdited(false)
    setPluginForm(EMPTY_PLUGIN_FORM)
  }

  function startEditPlugin(p: Plugin) {
    setEditingPluginId(p.id)
    setShowAddPlugin(false)
    setPluginError('')
    setPluginSlugManuallyEdited(false)
    setPluginForm({
      name: p.name,
      slug: p.slug,
      description: p.description || '',
      plugin_type: p.plugin_type,
      hook: p.hook,
      webhook_url: p.webhook_url || '',
      config_json: JSON.stringify(p.config || {}, null, 2),
    })
  }

  function cancelPluginForm() {
    setEditingPluginId(null)
    setShowAddPlugin(false)
    setPluginError('')
    setPluginSlugManuallyEdited(false)
  }

  function updatePluginForm(field: string, value: string) {
    if (field === 'slug') {
      setPluginSlugManuallyEdited(true)
      setPluginForm(prev => ({ ...prev, slug: value }))
      return
    }
    setPluginForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'name' && !pluginSlugManuallyEdited) {
        next.slug = slugify(value)
      }
      return next
    })
  }

  async function handleSavePlugin() {
    if (!pluginForm.name.trim()) { setPluginError('Name is required'); return }
    if (!pluginForm.slug.trim()) { setPluginError('Slug is required'); return }

    let config: Record<string, unknown> = {}
    try {
      config = JSON.parse(pluginForm.config_json || '{}')
    } catch {
      setPluginError('Config must be valid JSON'); return
    }

    setPluginError('')
    const payload = {
      name: pluginForm.name.trim(),
      slug: pluginForm.slug.trim(),
      description: pluginForm.description.trim() || undefined,
      plugin_type: pluginForm.plugin_type,
      hook: pluginForm.hook,
      webhook_url: pluginForm.webhook_url.trim() || undefined,
      config,
    }

    try {
      if (editingPluginId) {
        const result = await updatePluginAction(editingPluginId, payload)
        if (!result.ok) { setPluginError(result.error); toast.error(result.error); return }
        toast.success('Plugin updated')
        setEditingPluginId(null)
      } else {
        const result = await createPluginAction(payload)
        if (!result.ok) { setPluginError(result.error); toast.error(result.error); return }
        toast.success('Plugin created')
        setShowAddPlugin(false)
      }
      mutatePlugins()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      setPluginError(msg)
      toast.error(msg)
    }
  }

  async function handleTogglePlugin(p: Plugin) {
    const result = await togglePluginActiveAction(p.id, !p.active)
    if (!result.ok) { toast.error(result.error); return }
    mutatePlugins()
  }

  async function handleDeletePlugin(id: string) {
    if (confirm('Delete this plugin?')) {
      const result = await deletePluginAction(id)
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Plugin deleted')
      mutatePlugins()
    }
  }

  async function handleInstallTemplate(tpl: PluginTemplate) {
    const payload = {
      name: tpl.name,
      slug: tpl.slug,
      description: tpl.description,
      plugin_type: tpl.plugin_type,
      hook: tpl.hook,
      webhook_url: tpl.webhook_url,
      config: tpl.config || {},
    }
    const result = await createPluginAction(payload)
    if (!result.ok) { toast.error(result.error); return }
    toast.success(`Plugin "${tpl.name}" installed`)
    mutatePlugins()
  }

  const isFormOpen = editingId !== null || showAdd
  const isTriggerFormOpen = editingTriggerId !== null || showAddTrigger
  const isPluginFormOpen = editingPluginId !== null || showAddPlugin

  if (loading && activeTab === 'schedules') return <TableSkeleton rows={5} cols={7} />
  if (triggersLoading && activeTab === 'triggers') return <TableSkeleton rows={3} cols={5} />
  if (pluginsLoading && activeTab === 'plugins') return <TableSkeleton rows={3} cols={5} />

  function tabClass(t: TabId) {
    return `px-4 py-2.5 text-xs font-medium transition-colors duration-150 border-b-2 -mb-px ${
      activeTab === t
        ? 'border-violet-500 text-white'
        : 'border-transparent text-neutral-500 hover:text-neutral-300'
    }`
  }

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader
        title="Automations"
        count={activeTab === 'schedules' ? schedules.length : activeTab === 'triggers' ? triggers.length : plugins.length}
      >
        {activeTab === 'schedules' ? (
          <button onClick={startAdd} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150">
            Create automation
          </button>
        ) : activeTab === 'triggers' ? (
          <button onClick={startAddTrigger} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150">
            Create trigger
          </button>
        ) : (
          <button onClick={startAddPlugin} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150">
            Add plugin
          </button>
        )}
      </PageHeader>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-neutral-800/60">
        <button onClick={() => setActiveTab('schedules')} className={tabClass('schedules')}>
          Schedules
          {schedules.length > 0 && <span className="ml-1.5 text-xs text-neutral-600">({schedules.length})</span>}
        </button>
        <button onClick={() => setActiveTab('triggers')} className={tabClass('triggers')}>
          Webhook Triggers
          {triggers.length > 0 && <span className="ml-1.5 text-xs text-neutral-600">({triggers.length})</span>}
        </button>
        <button onClick={() => setActiveTab('plugins')} className={tabClass('plugins')}>
          Plugins
          {plugins.length > 0 && <span className="ml-1.5 text-xs text-neutral-600">({plugins.length})</span>}
        </button>
      </div>

      {/* ─── Schedules tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'schedules' && (
        <>
          <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800/60">
                  <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Agent</th>
                  <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Schedule</th>
                  <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Last run</th>
                  <th className="text-left px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Next run</th>
                  <th className="text-right px-5 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id} className="border-b border-neutral-800/40 hover:bg-neutral-800/20 transition-colors duration-150">
                    <td className="px-5 py-4">
                      <ActivePill active={s.active} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-neutral-200 font-medium">{s.name}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
                          s.type === 'heartbeat'
                            ? 'bg-blue-950/40 text-blue-400 border-blue-900/40'
                            : 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
                        }`}>
                          {s.type === 'heartbeat' ? 'Heartbeat' : 'Cron'}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-neutral-500 text-xs">{s.agents?.name || s.agent_id}</span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-300 text-xs font-mono bg-neutral-800/60 px-2 py-0.5 rounded-md">{s.cron_expr}</span>
                        <span className="text-xs text-neutral-600">{describeCron(s.cron_expr)}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {s.last_run_at ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-neutral-500 text-xs">{timeAgo(s.last_run_at)}</span>
                          {s.last_run_status && (
                            <span className={`text-xs font-medium ${
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

                    <td className="px-5 py-4">
                      {s.next_run_at ? (
                        <span className="text-neutral-400 text-xs font-mono">{timeAgo(s.next_run_at).replace(' ago', '')}</span>
                      ) : (
                        <span className="text-neutral-700 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleRunNow(s)}
                          disabled={runningId === s.id}
                          title="Run now"
                          className="p-2 rounded-lg text-neutral-500 hover:text-emerald-400 hover:bg-neutral-800 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {runningId === s.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a10 10 0 100 10h-2a8 8 0 01-8-8z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                            </svg>
                          )}
                        </button>
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
                          role="switch"
                          aria-checked={s.active}
                          aria-label={`Toggle ${s.name} active`}
                          onClick={() => handleToggle(s)}
                          title={s.active ? 'Pause' : 'Resume'}
                          className={`p-2 rounded-lg hover:bg-neutral-800 transition-all duration-150 ${s.active ? 'text-neutral-500 hover:text-amber-400' : 'text-neutral-500 hover:text-emerald-400'}`}
                        >
                          {s.active ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                            </svg>
                          )}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {schedules.length === 0 && <EmptyState message="No automations yet" />}
          </div>

          <SidePanel
            open={isFormOpen}
            onClose={cancelForm}
            title={editingId ? 'Edit Schedule' : 'New Schedule'}
            width="lg"
          >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="e.g. Daily morning digest"
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors duration-150"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateForm('type', 'cron')}
                      className={`flex-1 px-3 py-2.5 text-xs rounded-lg border transition-colors duration-150 text-left ${
                        form.type === 'cron'
                          ? 'border-emerald-700/60 bg-emerald-950/30 text-emerald-400'
                          : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300'
                      }`}
                    >
                      <span className="font-semibold block">Cron</span>
                      <span className="text-xs opacity-70">Run a task on schedule</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateForm('type', 'heartbeat')}
                      className={`flex-1 px-3 py-2.5 text-xs rounded-lg border transition-colors duration-150 text-left ${
                        form.type === 'heartbeat'
                          ? 'border-blue-700/60 bg-blue-950/30 text-blue-400'
                          : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300'
                      }`}
                    >
                      <span className="font-semibold block">Heartbeat</span>
                      <span className="text-xs opacity-70">Check objectives periodically</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Agent</label>
                  <select
                    value={form.agent_id}
                    onChange={(e) => updateForm('agent_id', e.target.value)}
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors duration-150"
                  >
                    <option value="">Select agent...</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-2">Schedule</label>
                  {/* Preset grid */}
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {CRON_PRESETS.map((preset) => {
                      const isActive = selectedPreset === preset.expr
                      return (
                        <button
                          key={preset.expr}
                          type="button"
                          onClick={() => {
                            setSelectedPreset(preset.expr)
                            updateForm('cron_expr', preset.expr)
                          }}
                          className={`px-2.5 py-2 rounded-lg border text-xs font-medium text-center transition-all duration-150 leading-tight ${
                            isActive
                              ? 'border-violet-600/70 bg-violet-950/40 text-violet-300'
                              : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200 hover:bg-neutral-800/60'
                          }`}
                        >
                          {preset.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Human-readable confirmation */}
                  {selectedPreset && selectedPreset !== 'custom' && (() => {
                    const preset = CRON_PRESETS.find(p => p.expr === selectedPreset)
                    return preset ? (
                      <p className="mt-2 text-xs text-violet-400/80 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 16 16" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 4.5v4l2.5 2.5"/></svg>
                        {preset.desc}
                      </p>
                    ) : null
                  })()}

                  {/* Custom cron disclosure */}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomCron(v => !v)
                        if (!showCustomCron) {
                          setSelectedPreset('custom')
                        }
                      }}
                      className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors duration-150"
                    >
                      <svg
                        className={`w-3 h-3 transition-transform duration-150 ${showCustomCron ? 'rotate-90' : ''}`}
                        fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 2l4 4-4 4"/>
                      </svg>
                      Custom schedule (advanced)
                    </button>

                    {showCustomCron && (
                      <div className="mt-2">
                        <input
                          value={form.cron_expr}
                          onChange={(e) => {
                            updateForm('cron_expr', e.target.value)
                            setSelectedPreset('custom')
                          }}
                          placeholder="*/5 * * * *"
                          className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors duration-150"
                        />
                        <p className="mt-1.5 text-xs text-neutral-600">
                          Enter a cron expression (e.g. <span className="font-mono text-neutral-500">*/5 * * * *</span> for every 5 minutes)
                        </p>
                        {form.cron_expr && selectedPreset === 'custom' && (
                          <p className="mt-1 text-xs text-neutral-500">{describeCron(form.cron_expr)}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {form.type === 'cron' ? (
                <div>
                  <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Task</label>
                  <textarea
                    value={form.task}
                    onChange={(e) => updateForm('task', e.target.value)}
                    placeholder="Describe exactly what the agent should do when this runs..."
                    rows={5}
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white leading-relaxed focus:border-neutral-600 focus:outline-none transition-colors duration-150 resize-y"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Objectives</label>
                  <textarea
                    value={form.objectives}
                    onChange={(e) => updateForm('objectives', e.target.value)}
                    placeholder="What should the agent monitor or check each time it runs..."
                    rows={5}
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white leading-relaxed focus:border-neutral-600 focus:outline-none transition-colors duration-150 resize-y"
                  />
                </div>
              )}

              <div className="max-w-sm">
                <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">
                  Telegram Chat ID <span className="normal-case text-neutral-700 font-normal">(optional — for delivery)</span>
                </label>
                <input
                  value={form.chat_id}
                  onChange={(e) => updateForm('chat_id', e.target.value)}
                  placeholder="-100123456789"
                  className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors duration-150"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-4 py-2.5">{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={handleSave} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150">
                  {editingId ? 'Save changes' : 'Create automation'}
                </button>
                <button onClick={cancelForm} className="px-4 py-2 text-xs font-medium border border-neutral-800 text-neutral-500 rounded-lg hover:text-white hover:border-neutral-700 transition-colors duration-150">
                  Cancel
                </button>
              </div>
          </SidePanel>
        </>
      )}

      {/* ─── Triggers tab ────────────────────────────────────────────────────────── */}
      {activeTab === 'triggers' && (
        <>
          <div className="space-y-3">
            {triggers.map((t) => (
              <div key={t.id} className="bg-neutral-900 border border-neutral-800/60 rounded-xl p-5 hover:border-neutral-700/60 transition-colors duration-150">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                        <span className="text-neutral-200 font-medium text-sm">{t.name}</span>
                        <ActivePill active={t.active} />
                        {t.agents && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500/60 shrink-0" />
                            {t.agents.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEditTrigger(t)}
                          title="Edit"
                          className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all duration-150"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggleTrigger(t)}
                          title={t.active ? 'Pause' : 'Resume'}
                          className={`p-2 rounded-lg hover:bg-neutral-800 transition-all duration-150 ${t.active ? 'text-neutral-500 hover:text-amber-400' : 'text-neutral-500 hover:text-emerald-400'}`}
                        >
                          {t.active ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteTrigger(t.id)}
                          title="Delete"
                          className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-all duration-150"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Webhook URL */}
                    <div className="flex items-center gap-2 bg-neutral-800/40 border border-neutral-800/50 rounded-lg px-3 py-2">
                      <span className="text-xs text-neutral-600 uppercase tracking-wider shrink-0 font-semibold w-12">URL</span>
                      <code className="text-xs text-neutral-300 font-mono truncate flex-1">
                        {WEBHOOK_BASE_URL}/api/webhook/{t.slug}
                      </code>
                      <CopyButton value={`${WEBHOOK_BASE_URL}/api/webhook/${t.slug}`} label="Copy" />
                    </div>

                    {/* Secret */}
                    <div className="flex items-center gap-2 bg-neutral-800/40 border border-neutral-800/50 rounded-lg px-3 py-2">
                      <span className="text-xs text-neutral-600 uppercase tracking-wider shrink-0 font-semibold w-12">Secret</span>
                      <code className="text-xs text-neutral-600 font-mono tracking-wide flex-1">
                        {'•'.repeat(Math.min(t.secret?.length ?? 16, 20))}
                      </code>
                      <CopyButton value={t.secret || ''} label="Reveal & Copy" />
                    </div>

                    <div className="flex items-center gap-4 pt-0.5">
                      <span className="text-xs text-neutral-600">
                        Fired <span className="text-neutral-400 font-semibold">{t.trigger_count}</span> times
                      </span>
                      {t.last_triggered_at && (
                        <span className="text-xs text-neutral-600">
                          Last: <span className="text-neutral-400">{timeAgo(t.last_triggered_at)}</span>
                        </span>
                      )}
                      <span className="text-xs text-neutral-700 font-mono truncate">/{t.slug}</span>
                    </div>
                  </div>
              </div>
            ))}
            {triggers.length === 0 && !isTriggerFormOpen && (
              <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl">
                <EmptyState message="No webhook triggers yet" />
              </div>
            )}
          </div>

          <SidePanel
            open={isTriggerFormOpen}
            onClose={cancelTriggerForm}
            title={editingTriggerId ? 'Edit Trigger' : 'New Trigger'}
          >
            <TriggerForm
              form={triggerForm}
              agents={agents}
              error={triggerError}
              isEdit={editingTriggerId !== null}
              onChange={updateTriggerForm}
              onSave={handleSaveTrigger}
              onCancel={cancelTriggerForm}
            />
          </SidePanel>
        </>
      )}

      {/* ─── Plugins tab ──────────────────────────────────────────────────────────── */}
      {activeTab === 'plugins' && (
        <>
          {/* Template cards shown when no plugins yet */}
          {plugins.length === 0 && !isPluginFormOpen && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider px-1">Quick install templates</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLUGIN_TEMPLATES.map((tpl) => (
                  <div key={tpl.slug} className="bg-neutral-900 border border-neutral-800/60 rounded-xl p-4 flex items-start justify-between gap-3 hover:border-neutral-700/60 transition-colors duration-150">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-neutral-200">{tpl.name}</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold border ${
                          tpl.plugin_type === 'webhook' ? 'bg-blue-950/40 text-blue-400 border-blue-900/40' : 'bg-violet-950/40 text-violet-400 border-violet-900/40'
                        }`}>{tpl.plugin_type}</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-neutral-800/60 text-neutral-500 border border-neutral-700/50">
                          {tpl.hook.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500">{tpl.description}</p>
                    </div>
                    <button
                      onClick={() => handleInstallTemplate(tpl)}
                      className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 hover:text-white transition-colors duration-150 border border-neutral-700/60"
                    >
                      Install
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Installed plugins */}
          {plugins.length > 0 && (
            <div className="space-y-3">
              {plugins.map((p) => (
                <div key={p.id} className="bg-neutral-900 border border-neutral-800/60 rounded-xl p-5 hover:border-neutral-700/60 transition-colors duration-150">
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                          <span className="text-neutral-200 font-medium text-sm">{p.name}</span>
                          <ActivePill active={p.active} />
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold border ${
                            p.plugin_type === 'webhook' ? 'bg-blue-950/40 text-blue-400 border-blue-900/40' :
                            p.plugin_type === 'transform' ? 'bg-violet-950/40 text-violet-400 border-violet-900/40' :
                            'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
                          }`}>{p.plugin_type}</span>
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-neutral-800/60 text-neutral-500 border border-neutral-700/50">
                            {p.hook.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEditPlugin(p)}
                            title="Edit"
                            className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all duration-150"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleTogglePlugin(p)}
                            title={p.active ? 'Pause' : 'Resume'}
                            className={`p-2 rounded-lg hover:bg-neutral-800 transition-all duration-150 ${p.active ? 'text-neutral-500 hover:text-amber-400' : 'text-neutral-500 hover:text-emerald-400'}`}
                          >
                            {p.active ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeletePlugin(p.id)}
                            title="Delete"
                            className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-all duration-150"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {p.description && (
                        <p className="text-xs text-neutral-500">{p.description}</p>
                      )}
                      {p.webhook_url && (
                        <div className="flex items-center gap-2 bg-neutral-800/40 border border-neutral-800/50 rounded-lg px-3 py-2">
                          <span className="text-xs text-neutral-600 uppercase tracking-wider shrink-0 font-semibold w-12">URL</span>
                          <code className="text-xs text-neutral-400 font-mono truncate flex-1">{p.webhook_url}</code>
                        </div>
                      )}
                      {p.config && Object.keys(p.config).length > 0 && (
                        <div className="flex items-center gap-2 bg-neutral-800/40 border border-neutral-800/50 rounded-lg px-3 py-2">
                          <span className="text-xs text-neutral-600 uppercase tracking-wider shrink-0 font-semibold w-12">Config</span>
                          <code className="text-xs text-neutral-400 font-mono truncate flex-1">{JSON.stringify(p.config)}</code>
                        </div>
                      )}
                      <p className="text-xs text-neutral-700">Added {timeAgo(p.created_at)}</p>
                    </div>
                </div>
              ))}
            </div>
          )}

          <SidePanel
            open={isPluginFormOpen}
            onClose={cancelPluginForm}
            title={editingPluginId ? 'Edit Plugin' : 'New Plugin'}
            width="lg"
          >
            <PluginForm
              form={pluginForm}
              error={pluginError}
              isEdit={editingPluginId !== null}
              onChange={updatePluginForm}
              onSave={handleSavePlugin}
              onCancel={cancelPluginForm}
            />
          </SidePanel>

          {/* Browse templates when plugins exist */}
          {plugins.length > 0 && !isPluginFormOpen && (
            <details className="mt-2">
              <summary className="text-xs text-neutral-600 cursor-pointer hover:text-neutral-400 transition-colors duration-150 select-none">
                Browse templates
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {PLUGIN_TEMPLATES.map((tpl) => (
                  <div key={tpl.slug} className="bg-neutral-900 border border-neutral-800/60 rounded-xl p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-neutral-200">{tpl.name}</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold border ${
                          tpl.plugin_type === 'webhook' ? 'bg-blue-950/40 text-blue-400 border-blue-900/40' : 'bg-violet-950/40 text-violet-400 border-violet-900/40'
                        }`}>{tpl.plugin_type}</span>
                      </div>
                      <p className="text-xs text-neutral-500">{tpl.description}</p>
                    </div>
                    <button
                      onClick={() => handleInstallTemplate(tpl)}
                      className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 hover:text-white transition-colors duration-150 border border-neutral-700/60"
                    >
                      Install
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}

          {plugins.length === 0 && !isPluginFormOpen && (
            <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl mt-3">
              <EmptyState message="No plugins installed yet — use a template above or click Add plugin" />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── TriggerForm component ────────────────────────────────────────────────────

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
        <div className="sm:col-span-2">
          <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Name</label>
          <input
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="e.g. GitHub push event"
            className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors duration-150"
          />
          <p className="text-xs text-[--text-muted] mt-1">ID: {form.slug || '—'}</p>
          <details className="mt-1">
            <summary className="text-xs text-neutral-500 cursor-pointer select-none">Advanced</summary>
            <div className="mt-2">
              <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Slug</label>
              <input
                value={form.slug}
                onChange={(e) => onChange('slug', e.target.value)}
                placeholder="github-push-event"
                className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors duration-150"
              />
            </div>
          </details>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Agent</label>
          <select
            value={form.agent_id}
            onChange={(e) => onChange('agent_id', e.target.value)}
            className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors duration-150"
          >
            <option value="">Select agent...</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Task template</label>
        <textarea
          value={form.task_template}
          onChange={(e) => onChange('task_template', e.target.value)}
          placeholder={'Process this webhook data: {{payload}}'}
          rows={4}
          className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white leading-relaxed font-mono focus:border-neutral-600 focus:outline-none transition-colors duration-150 resize-y"
        />
        <p className="mt-1.5 text-xs text-neutral-600">
          Use <code className="text-neutral-500 bg-neutral-800/80 px-1 py-0.5 rounded">{'{{payload}}'}</code> to include the raw POST body.
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-4 py-2.5">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={onSave} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150">
          {isEdit ? 'Save changes' : 'Create trigger'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-xs font-medium border border-neutral-800 text-neutral-500 rounded-lg hover:text-white hover:border-neutral-700 transition-colors duration-150">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── PluginForm component ─────────────────────────────────────────────────────

type PluginFormProps = {
  form: typeof EMPTY_PLUGIN_FORM
  error: string
  isEdit: boolean
  onChange: (field: string, value: string) => void
  onSave: () => void
  onCancel: () => void
}

const HOOK_OPTIONS: { value: Plugin['hook']; label: string; desc: string }[] = [
  { value: 'pre_task',       label: 'Pre-task',    desc: 'Runs before the agent starts (can modify task)' },
  { value: 'post_task',      label: 'Post-task',   desc: 'Runs after the agent completes (can modify result)' },
  { value: 'pre_tool',       label: 'Pre-tool',    desc: 'Runs before each tool is executed' },
  { value: 'post_tool',      label: 'Post-tool',   desc: 'Runs after each tool returns' },
  { value: 'on_memory_save', label: 'Memory save', desc: 'Runs when a memory is persisted' },
]

const TYPE_OPTIONS: { value: Plugin['plugin_type']; label: string; desc: string; cls: string }[] = [
  { value: 'webhook',   label: 'Webhook',   desc: 'POST context to an external URL',               cls: 'border-blue-700/60 bg-blue-950/30 text-blue-400' },
  { value: 'transform', label: 'Transform', desc: 'Apply a built-in text transform to task/result', cls: 'border-violet-700/60 bg-violet-950/30 text-violet-400' },
  { value: 'schedule',  label: 'Schedule',  desc: 'Schedule-based hook (via automations)',           cls: 'border-emerald-700/60 bg-emerald-950/30 text-emerald-400' },
]

function PluginForm({ form, error, isEdit, onChange, onSave, onCancel }: PluginFormProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Name</label>
          <input
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="e.g. Slack Notification"
            className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors duration-150"
          />
          <p className="text-xs text-[--text-muted] mt-1">ID: {form.slug || '—'}</p>
          <details className="mt-1">
            <summary className="text-xs text-neutral-500 cursor-pointer select-none">Advanced</summary>
            <div className="mt-2">
              <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Slug</label>
              <input
                value={form.slug}
                onChange={(e) => onChange('slug', e.target.value)}
                placeholder="slack-notification"
                className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors duration-150"
              />
            </div>
          </details>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">
            Description <span className="normal-case text-neutral-700 font-normal">(optional)</span>
          </label>
          <input
            value={form.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="What does this plugin do?"
            className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors duration-150"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-2">Plugin type</label>
        <div className="flex gap-2 flex-wrap">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange('plugin_type', opt.value)}
              className={`flex-1 min-w-[130px] px-3 py-2.5 text-xs rounded-lg border transition-colors duration-150 text-left ${
                form.plugin_type === opt.value
                  ? opt.cls
                  : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300'
              }`}
            >
              <span className="font-semibold block">{opt.label}</span>
              <span className="text-xs opacity-70">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Hook</label>
        <select
          value={form.hook}
          onChange={(e) => onChange('hook', e.target.value)}
          className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors duration-150"
        >
          {HOOK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label} — {opt.desc}</option>
          ))}
        </select>
      </div>

      {form.plugin_type === 'webhook' && (
        <div>
          <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Webhook URL</label>
          <input
            value={form.webhook_url}
            onChange={(e) => onChange('webhook_url', e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors duration-150"
          />
          <p className="mt-1.5 text-xs text-neutral-600">The agent will POST a JSON payload to this URL. Must be https://.</p>
        </div>
      )}

      <div>
        <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">
          Config <span className="normal-case text-neutral-700 font-normal">(JSON)</span>
          {form.plugin_type === 'transform' && (
            <span className="ml-2 normal-case text-neutral-700 font-normal">
              — use <code className="text-neutral-600 bg-neutral-800/80 px-1 rounded text-xs">{'{"transform":"prefix","prefix":"[Agent] "}'}</code>
            </span>
          )}
        </label>
        <textarea
          value={form.config_json}
          onChange={(e) => onChange('config_json', e.target.value)}
          rows={3}
          className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors duration-150 resize-y"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-4 py-2.5">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={onSave} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150">
          {isEdit ? 'Save changes' : 'Create plugin'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-xs font-medium border border-neutral-800 text-neutral-500 rounded-lg hover:text-white hover:border-neutral-700 transition-colors duration-150">
          Cancel
        </button>
      </div>
    </div>
  )
}
