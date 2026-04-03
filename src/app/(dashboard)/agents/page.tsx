'use client'

import { useState, useRef, useEffect } from 'react'
import { getAgentsAction, createAgentAction, updateAgentAction, deleteAgentAction, setDefaultAgentAction, activateTelegramAction, deactivateTelegramAction, getLlmKeysAction, getOperatorProvidersAction } from '@/lib/actions'
import { timeAgo } from '@/lib/utils'
import { toast } from 'sonner'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/components/AuthProvider'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import { AGENT_TEMPLATES, type AgentTemplate } from '@/lib/agent-templates'
import { LLM_PROVIDERS, getProviderForModel } from '@/lib/llm-providers'

type Agent = {
  id: string; name: string; slug: string; personality: string
  model: string; active: boolean; is_default: boolean; role: string
  telegram_bot_token: string | null; telegram_bot_username: string | null
  requires_approval: string[] | null
  capabilities: string[]
  created_at: string; updated_at: string
}

// Flat list for table display (provider: Model label)
function modelDisplayLabel(value: string): string {
  const provider = getProviderForModel(value)
  const model = provider?.models.find((m) => m.value === value)
  if (!model) return value
  return `${provider!.name} — ${model.label}`
}

const ROLES = [
  { value: 'agent', label: 'Agent', description: 'Executes tasks independently', color: 'text-neutral-300' },
  { value: 'orchestrator', label: 'Orchestrator', description: 'Delegates to other agents', color: 'text-blue-300' },
]

function RolePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = ROLES.find(r => r.value === value) ?? ROLES[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 bg-neutral-800/50 border border-neutral-800 rounded-lg pl-3 pr-2.5 py-2.5 text-xs hover:border-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors"
      >
        <span className={`font-medium ${selected.color}`}>{selected.label}</span>
        <svg className={`w-3.5 h-3.5 text-neutral-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-56 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden">
          {ROLES.map(role => (
            <button
              key={role.value}
              type="button"
              onClick={() => { onChange(role.value); setOpen(false) }}
              className={`w-full text-left flex items-center gap-3 px-3 py-2.5 transition-colors ${role.value === value ? 'bg-neutral-800' : 'hover:bg-neutral-800/60'}`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${role.color}`}>{role.label}</p>
                <p className="text-[10px] text-neutral-600 mt-0.5">{role.description}</p>
              </div>
              {role.value === value && (
                <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ModelPicker({ value, onChange, configuredProviders, operatorProviders }: {
  value: string
  onChange: (v: string) => void
  configuredProviders: Set<string>
  operatorProviders: Set<string>
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedProvider = getProviderForModel(value)
  const selectedModel = selectedProvider?.models.find(m => m.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 bg-neutral-800/50 border border-neutral-800 rounded-lg pl-3 pr-2.5 py-2.5 text-xs text-neutral-200 hover:border-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors"
      >
        <span className="truncate">
          {selectedProvider && selectedModel
            ? <><span style={{ color: selectedProvider.color }} className="font-medium">{selectedProvider.name}</span> — {selectedModel.label}</>
            : <span className="text-neutral-500">Select model</span>}
        </span>
        <svg className={`w-3.5 h-3.5 text-neutral-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden" style={{ maxHeight: 360, overflowY: 'auto' }}>
          {LLM_PROVIDERS.map(provider => {
            const hasOwnKey = configuredProviders.has(provider.id)
            const hasOperatorKey = operatorProviders.has(provider.id)
            const available = hasOwnKey || hasOperatorKey
            return (
              <div key={provider.id}>
                <div className="flex items-center gap-2 px-3 pt-3 pb-1.5 sticky top-0 bg-neutral-950 z-10">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: provider.color }}>{provider.name}</span>
                  {hasOwnKey ? (
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-900/40 px-1.5 py-0.5 rounded-full leading-none">your key</span>
                  ) : hasOperatorKey ? (
                    <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-900/40 px-1.5 py-0.5 rounded-full leading-none" title="Available via SaaS — usage is billed to you">via SaaS · billed</span>
                  ) : (
                    <span className="text-[10px] text-neutral-600">no key — <a href="/settings" className="underline hover:text-neutral-400 transition-colors">add in Settings</a></span>
                  )}
                </div>
                {provider.models.map(model => (
                  <button
                    key={model.value}
                    type="button"
                    onClick={() => { onChange(model.value); setOpen(false) }}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2 transition-colors ${model.value === value ? 'bg-neutral-800' : 'hover:bg-neutral-800/60'}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasOwnKey ? 'bg-emerald-400' : hasOperatorKey ? 'bg-amber-400' : 'bg-neutral-700'}`} />
                    <span className={`text-xs flex-1 ${model.value === value ? 'text-white font-medium' : available ? 'text-neutral-200' : 'text-neutral-500'}`}>{model.label}</span>
                    {model.description && <span className="text-[10px] text-neutral-600 shrink-0">{model.description}</span>}
                  </button>
                ))}
                <div className="h-px bg-neutral-800/60 mx-3 my-1" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AgentsPage() {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

  const { data: agentsRaw = [], isLoading: loading, mutate } = useData(['agents', eid], getAgentsAction)
  const { data: llmKeysRaw = [] } = useData(['llm-keys', eid], getLlmKeysAction)
  const { data: operatorProvidersRaw = [] } = useData(['operator-providers'], getOperatorProvidersAction)
  const configuredProviders = new Set(
    (llmKeysRaw as { provider: string; is_active: boolean }[]).filter(k => k.is_active).map(k => k.provider)
  )
  const operatorProviders = new Set(operatorProvidersRaw as string[])
  const agents = agentsRaw as Agent[]
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [form, setForm] = useState({
    name: '', slug: '', personality: '', model: 'claude-sonnet-4-6',
    role: 'agent', telegram_bot_token: '', telegram_bot_username: '',
    requires_approval: '' as string,
    capabilities: [] as string[],
  })
  const [capInput, setCapInput] = useState('')
  const [telegramStatus, setTelegramStatus] = useState('')

  function slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function selectTemplate(template: AgentTemplate) {
    setShowTemplates(false)
    setEditingId(null)
    setTelegramStatus('')
    setCapInput('')
    setForm({
      name: template.name,
      slug: slugify(template.name),
      personality: template.personality,
      model: template.model,
      role: template.role,
      telegram_bot_token: '',
      telegram_bot_username: '',
      requires_approval: template.suggestedApprovalTools.join(', '),
      capabilities: template.capabilities,
    })
    setShowAdd(true)
  }

  function startEdit(a: Agent) {
    setEditingId(a.id); setShowAdd(false); setTelegramStatus(''); setCapInput('')
    setForm({
      name: a.name, slug: a.slug, personality: a.personality, model: a.model,
      role: a.role || 'agent',
      telegram_bot_token: a.telegram_bot_token || '',
      telegram_bot_username: a.telegram_bot_username || '',
      requires_approval: (a.requires_approval || []).join(', '),
      capabilities: a.capabilities || [],
    })
  }

  function startAdd() {
    setEditingId(null); setShowAdd(true); setTelegramStatus(''); setCapInput('')
    setForm({
      name: '', slug: '', personality: DEFAULT_PERSONALITY, model: 'claude-sonnet-4-6',
      role: 'agent', telegram_bot_token: '', telegram_bot_username: '',
      requires_approval: '',
      capabilities: [],
    })
  }

  function updateForm(field: string, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'name' && !editingId) {
        next.slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      }
      if (field === 'role' && value === 'orchestrator' && !editingId) {
        next.personality = ORCHESTRATOR_PERSONALITY
      } else if (field === 'role' && value === 'agent' && !editingId) {
        next.personality = DEFAULT_PERSONALITY
      }
      return next
    })
  }

  async function handleSave() {
    if (!form.name || !form.slug || !form.personality) return
    const approvalList = form.requires_approval
      ? form.requires_approval.split(',').map(s => s.trim()).filter(Boolean)
      : []

    if (editingId) {
      const result = await updateAgentAction(editingId, {
        name: form.name, slug: form.slug, personality: form.personality, model: form.model,
        role: form.role,
        telegram_bot_token: form.telegram_bot_token || null,
        telegram_bot_username: form.telegram_bot_username || null,
        requires_approval: approvalList,
        capabilities: form.capabilities,
      })
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Agent updated')
      setEditingId(null)
    } else {
      const result = await createAgentAction({
        name: form.name, slug: form.slug, personality: form.personality, model: form.model,
        role: form.role,
        telegram_bot_token: form.telegram_bot_token || null,
        telegram_bot_username: form.telegram_bot_username || null,
        capabilities: form.capabilities,
      })
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Agent created')
      setShowAdd(false)
    }
    mutate()
  }

  if (loading) return <TableSkeleton rows={4} cols={6} />

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Agents" count={agents.length}>
        <button
          onClick={() => { setShowTemplates(true); setShowAdd(false); setEditingId(null) }}
          className="px-4 py-2 text-xs font-semibold border border-neutral-700 text-neutral-300 rounded-lg hover:border-neutral-500 hover:text-white transition-colors"
        >
          From Template
        </button>
        <button onClick={startAdd} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors">
          Create agent
        </button>
      </PageHeader>

      <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800/50">
              <th className="text-left px-5 py-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider w-14">On</th>
              <th className="text-left px-5 py-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Name</th>
              <th className="text-left px-5 py-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Slug</th>
              <th className="text-left px-5 py-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Model</th>
              <th className="text-left px-5 py-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Updated</th>
              <th className="text-left px-5 py-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Telegram</th>
              <th className="text-right px-5 py-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                <td className="px-5 py-3.5">
                  <button
                    role="switch"
                    aria-checked={a.active}
                    aria-label={`Toggle ${a.name} active`}
                    onClick={async () => {
                      const result = await updateAgentAction(a.id, { active: !a.active })
                      if (!result.ok) { toast.error(result.error) } else { mutate() }
                    }}
                    className={`w-9 h-5 rounded-full relative transition-colors ${a.active ? 'bg-emerald-600' : 'bg-neutral-700'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${a.active ? 'left-4.5' : 'left-0.5'}`}
                      style={{ left: a.active ? '18px' : '2px' }}
                    />
                  </button>
                </td>
                <td className="px-5 py-3.5">
                  <div>
                    <span className="text-neutral-200 font-medium">{a.name}</span>
                    {a.is_default && <span className="ml-2 text-xs text-emerald-400">default</span>}
                  </div>
                  {a.capabilities && a.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {a.capabilities.map(cap => (
                        <span key={cap} className="px-1.5 py-0.5 text-[10px] font-medium bg-violet-950/60 text-violet-300 border border-violet-800/40 rounded-full">{cap}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-5 py-3.5 text-neutral-500 font-mono text-xs">{a.slug}</td>
                <td className="px-5 py-3.5 text-neutral-500 text-xs">{modelDisplayLabel(a.model)}</td>
                <td className="px-5 py-3.5">
                  {a.role === 'orchestrator' ? (
                    <Badge label="orchestrator" color="blue" />
                  ) : (
                    <Badge label="agent" color="neutral" />
                  )}
                </td>
                <td className="px-5 py-3.5 text-neutral-500 text-xs">{timeAgo(a.updated_at)}</td>
                <td className="px-5 py-3.5">
                  {a.telegram_bot_username ? (
                    <Badge label={`@${a.telegram_bot_username}`} color="emerald" dot />
                  ) : (
                    <span className="text-neutral-600">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right space-x-3">
                  {!a.is_default && (
                    <button onClick={async () => {
                      const result = await setDefaultAgentAction(a.id)
                      if (!result.ok) { toast.error(result.error) } else { toast.success('Default agent updated'); mutate() }
                    }} className="text-xs text-neutral-400 hover:text-emerald-400 transition-colors">
                      Set default
                    </button>
                  )}
                  <button onClick={() => startEdit(a)} className="text-xs text-neutral-400 hover:text-white transition-colors">Edit</button>
                  {!a.is_default && (
                    <button
                      onClick={async () => {
                        if (!confirm('Delete this agent?')) return
                        const result = await deleteAgentAction(a.id)
                        if (!result.ok) { toast.error(result.error) } else { toast.success('Agent deleted'); mutate() }
                      }}
                      className="text-xs text-neutral-400 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {agents.length === 0 && <EmptyState message="No agents yet" />}
      </div>

      {showTemplates && (
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Choose a Template</p>
              <p className="text-xs text-neutral-500 mt-0.5">Pre-built agents you can customize before saving</p>
            </div>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-neutral-500 hover:text-white transition-colors text-lg leading-none"
              aria-label="Close template picker"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AGENT_TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => selectTemplate(template)}
                className="text-left p-4 bg-neutral-800/40 border border-neutral-800 rounded-xl hover:border-neutral-600 hover:bg-neutral-800/70 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none mt-0.5">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white group-hover:text-white">{template.name}</span>
                      {template.role === 'orchestrator' ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-950/60 text-blue-300 border border-blue-800/40 rounded-full">orchestrator</span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700 rounded-full">agent</span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{template.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.capabilities.map(cap => (
                        <span key={cap} className="px-1.5 py-0.5 text-[10px] font-medium bg-violet-950/60 text-violet-300 border border-violet-800/40 rounded-full">{cap}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {(editingId || showAdd) && (
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-6 space-y-5">
          <p className="text-sm font-semibold text-white">{editingId ? 'Edit Agent' : 'New Agent'}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5">Name</label>
              <input
                value={form.name} onChange={(e) => updateForm('name', e.target.value)}
                placeholder="e.g. Research Assistant"
                className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5">Slug</label>
              <input
                value={form.slug} onChange={(e) => updateForm('slug', e.target.value)}
                placeholder="e.g. research-assistant"
                className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5">Model</label>
              <ModelPicker value={form.model} onChange={v => updateForm('model', v)} configuredProviders={configuredProviders} operatorProviders={operatorProviders} />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5">Role</label>
              <RolePicker value={form.role} onChange={v => updateForm('role', v)} />
            </div>
          </div>

          {form.role === 'orchestrator' && (
            <p className="text-xs text-blue-400 bg-blue-950/30 border border-blue-900/30 rounded-lg px-4 py-2.5">
              Orchestrators can delegate tasks to other agents using the delegate_task tool.
              List available agents in the personality so the orchestrator knows who to call.
            </p>
          )}

          {/* Capabilities */}
          <div className="border-t border-neutral-800/50 pt-5">
            <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-3">Capabilities</p>
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">
                Capabilities <span className="text-neutral-600 font-normal">(used for smart auto-routing)</span>
              </label>
              {form.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.capabilities.map(cap => (
                    <span key={cap} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-violet-950/60 text-violet-300 border border-violet-800/40 rounded-full">
                      {cap}
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, capabilities: prev.capabilities.filter(c => c !== cap) }))}
                        className="text-violet-500 hover:text-violet-200 transition-colors leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                value={capInput}
                onChange={e => setCapInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const val = capInput.trim().toLowerCase().replace(/\s+/g, '-')
                    if (val && !form.capabilities.includes(val)) {
                      setForm(prev => ({ ...prev, capabilities: [...prev.capabilities, val] }))
                    }
                    setCapInput('')
                  }
                }}
                placeholder="Type a capability and press Enter"
                className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] text-neutral-600 mr-1 self-center">Suggestions:</span>
                {['data-analysis', 'code-review', 'web-search', 'email', 'scheduling', 'research'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      if (!form.capabilities.includes(s)) {
                        setForm(prev => ({ ...prev, capabilities: [...prev.capabilities, s] }))
                      }
                    }}
                    disabled={form.capabilities.includes(s)}
                    className="px-2 py-0.5 text-[10px] font-medium bg-neutral-800 text-neutral-400 border border-neutral-700 rounded-full hover:border-violet-700 hover:text-violet-300 transition-colors disabled:opacity-30 disabled:cursor-default"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Telegram Configuration */}
          <div className="border-t border-neutral-800/50 pt-5">
            <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-3">Telegram Bot</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">
                  Bot Token <span className="text-neutral-600 font-normal">(from @BotFather)</span>
                </label>
                <input
                  value={form.telegram_bot_token} onChange={(e) => updateForm('telegram_bot_token', e.target.value)}
                  placeholder="123456:ABC-DEF..."
                  type="password"
                  className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">
                  Bot Username <span className="text-neutral-600 font-normal">(without @)</span>
                </label>
                <input
                  value={form.telegram_bot_username} onChange={(e) => updateForm('telegram_bot_username', e.target.value)}
                  placeholder="my_agent_bot"
                  className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Slack Configuration */}
          <div className="border-t border-neutral-800/50 pt-5">
            <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-3">Slack</p>
            <div className="bg-neutral-800/30 border border-neutral-800 rounded-lg px-4 py-3 space-y-2">
              <p className="text-xs text-neutral-300 font-medium">Environment-level setup (applies to all agents)</p>
              <ol className="text-xs text-neutral-500 space-y-1 list-decimal list-inside">
                <li>Create a Slack app at <span className="font-mono text-neutral-400">api.slack.com/apps</span></li>
                <li>Set env var <span className="font-mono text-neutral-400">SLACK_SIGNING_SECRET</span> (from App Credentials)</li>
                <li>Set env var <span className="font-mono text-neutral-400">SLACK_BOT_TOKEN</span> (xoxb-... OAuth token)</li>
                <li>Under Event Subscriptions, set Request URL to:</li>
              </ol>
              <p className="font-mono text-xs text-emerald-400 bg-neutral-900/60 rounded px-3 py-1.5 break-all">
                https://your-domain/api/slack
              </p>
              <p className="text-[10px] text-neutral-600">Subscribe to bot events: <span className="font-mono">message.channels</span>, <span className="font-mono">message.im</span>, <span className="font-mono">app_mention</span></p>
            </div>
          </div>

          {/* Discord Configuration */}
          <div className="border-t border-neutral-800/50 pt-5">
            <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-3">Discord</p>
            <div className="bg-neutral-800/30 border border-neutral-800 rounded-lg px-4 py-3 space-y-2">
              <p className="text-xs text-neutral-300 font-medium">Environment-level setup (applies to all agents)</p>
              <ol className="text-xs text-neutral-500 space-y-1 list-decimal list-inside">
                <li>Create an app at <span className="font-mono text-neutral-400">discord.com/developers/applications</span></li>
                <li>Set env var <span className="font-mono text-neutral-400">DISCORD_PUBLIC_KEY</span> (from General Information)</li>
                <li>Set env var <span className="font-mono text-neutral-400">DISCORD_BOT_TOKEN</span> (bot token)</li>
                <li>Set env var <span className="font-mono text-neutral-400">DISCORD_APP_ID</span> (application ID)</li>
                <li>Under General Information, set Interactions Endpoint URL to:</li>
              </ol>
              <p className="font-mono text-xs text-indigo-400 bg-neutral-900/60 rounded px-3 py-1.5 break-all">
                https://your-domain/api/discord
              </p>
              <p className="text-[10px] text-neutral-600">Register slash commands (e.g. <span className="font-mono">/ask</span>) with a <span className="font-mono">message</span> string option via Discord&apos;s API or developer portal.</p>
            </div>
          </div>

          {/* Approval Configuration */}
          <div className="border-t border-neutral-800/50 pt-5">
            <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-3">Human-in-the-Loop</p>
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">
                Tools requiring approval <span className="text-neutral-600 font-normal">(comma-separated, e.g. http_request, send_notification)</span>
              </label>
              <input
                value={form.requires_approval}
                onChange={(e) => updateForm('requires_approval', e.target.value)}
                placeholder="http_request, send_notification, delegate_task"
                className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-neutral-600 focus:outline-none transition-colors"
              />
              <p className="text-[10px] text-neutral-600 mt-1">
                Available tools: web_search, save_memory, query_database, send_notification, http_request, manage_skill, load_skill, delegate_task
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5">
              Personality{' '}
              <span className="text-neutral-600 font-normal normal-case tracking-normal">
                — the agent&apos;s system prompt, rules, and behavior
              </span>
            </label>
            <textarea
              value={form.personality} onChange={(e) => updateForm('personality', e.target.value)}
              placeholder="# Agent: My Agent..."
              rows={20}
              className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-neutral-200 font-mono leading-relaxed focus:border-neutral-600 focus:outline-none transition-colors resize-y"
            />
          </div>

          <div className="flex gap-2 items-center">
            <button onClick={handleSave} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors">
              {editingId ? 'Save changes' : 'Create agent'}
            </button>
            <button
              onClick={() => { setEditingId(null); setShowAdd(false) }}
              className="px-4 py-2 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:text-white hover:border-neutral-600 transition-colors"
            >
              Cancel
            </button>
            {editingId && form.telegram_bot_token && (
              <div className="flex items-center gap-2 ml-4 border-l border-neutral-800 pl-4">
                <button
                  onClick={async () => {
                    const slug = form.slug
                    setTelegramStatus('Registering...')
                    try {
                      const res = await activateTelegramAction(slug)
                      setTelegramStatus(res.ok ? 'Webhook active!' : `Error: ${res.error}`)
                    } catch (e) { setTelegramStatus('Failed to connect') }
                  }}
                  className="px-4 py-2 text-xs font-medium border border-emerald-800 text-emerald-400 rounded-lg hover:bg-emerald-950 transition-colors"
                >
                  Activate Telegram
                </button>
                <button
                  onClick={async () => {
                    const slug = form.slug
                    setTelegramStatus('Removing...')
                    try {
                      const res = await deactivateTelegramAction(slug)
                      setTelegramStatus(res.ok ? 'Webhook removed' : `Error: ${res.error}`)
                    } catch (e) { setTelegramStatus('Failed') }
                  }}
                  className="px-4 py-2 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:border-red-800 hover:text-red-400 transition-colors"
                >
                  Deactivate
                </button>
                {telegramStatus && <span className="text-xs text-neutral-500">{telegramStatus}</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const ORCHESTRATOR_PERSONALITY = `# Orchestrator

You coordinate work across specialist agents. You are the main point of contact for the user.

## How to delegate

Use \`delegate_task\` with the agent's slug and a **detailed** task description.

**Critical: always include all necessary context in the task description.** Sub-agents have no access to your conversation history unless you provide it. Include:
- Specific IDs, URLs, names, values from the conversation
- The exact action to perform (not vague instructions)
- Any constraints or format requirements

Example — BAD: "Edit the spreadsheet"
Example — GOOD: "Write the value 'Done' in cell B5 of spreadsheet ID 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms, sheet 'Tasks'"

## Available agents

The list of available agents is auto-injected below. Use their slugs with delegate_task.

## Tools

You have access to all standard tools (web_search, save_memory, http_request, etc.) plus:
- \`delegate_task\` — assign work to a specialist agent
- \`load_skill\` — load full API documentation for a skill before using it

## Rules

1. Handle simple questions yourself — only delegate when specialist knowledge is needed
2. When delegating, be explicit and detailed. The sub-agent starts fresh each time
3. Compile results into a coherent response for the user
4. If an agent fails, diagnose why before retrying — add missing context, not just rephrase
5. Save important outcomes and learned rules to memory for future sessions
6. Be transparent about which agents you consulted
7. For multi-step tasks, break them down and delegate sequentially, passing results between steps`

const DEFAULT_PERSONALITY = `# Agent: [Name]

## Who you are

Describe the agent's role and personality here.

---

## Rules

1. Be concise
2. Save useful facts to memory
3. If something fails, explain why clearly

---

## Response format

Keep responses structured and clear.`
