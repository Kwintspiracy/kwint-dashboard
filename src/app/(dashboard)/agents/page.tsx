'use client'

import { useState, useRef, useEffect } from 'react'
import { getAgentsAction, createAgentAction, updateAgentAction, deleteAgentAction, setDefaultAgentAction, activateTelegramAction, deactivateTelegramAction, getLlmKeysAction, getOperatorProvidersAction, getSkillsAction, getAgentSkillAssignmentsAction, setAgentSkillAssignmentsAction, getOrchestratorAssignmentsAction, getOrchestratorAssignmentDetailsAction, setOrchestratorAssignmentsAction, getAgentOrchestratorAction, setAgentOrchestratorAction, getAllAgentAssignmentsAction, getAllSkillAssignmentsAction } from '@/lib/actions'
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
import { SKILL_CAPABILITIES } from '@/lib/skill-templates'

type Agent = {
  id: string; name: string; slug: string; personality: string
  model: string; active: boolean; is_default: boolean; role: string
  telegram_bot_token: string | null; telegram_bot_username: string | null
  telegram_webhook_url: string | null
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
  const { data: skillsRaw = [] } = useData(['skills', eid], getSkillsAction)
  const { data: allAssignmentsRaw } = useData(['agent-assignments', eid], getAllAgentAssignmentsAction)
  const { data: allSkillAssignmentsRaw } = useData(['all-skill-assignments', eid], getAllSkillAssignmentsAction)
  const configuredProviders = new Set(
    (llmKeysRaw as { provider: string; is_active: boolean }[]).filter(k => k.is_active).map(k => k.provider)
  )
  const operatorProviders = new Set(operatorProvidersRaw as string[])
  const agents = agentsRaw as Agent[]
  type Skill = { id: string; name: string; slug: string; active: boolean }
  const skills = skillsRaw as Skill[]
  type AgentAssignment = { orchestrator_id: string; sub_agent_id: string }
  const allAssignments: AgentAssignment[] = (allAssignmentsRaw as { ok: boolean; data?: AgentAssignment[] } | undefined)?.ok
    ? ((allAssignmentsRaw as { ok: true; data: AgentAssignment[] }).data ?? [])
    : []
  // skillMap: agent_id → slug[]
  const skillMap: Record<string, string[]> = {}
  const rawSkillAssignments = (allSkillAssignmentsRaw as { ok: boolean; data?: { agent_id: string; slug: string }[] } | undefined)?.ok
    ? ((allSkillAssignmentsRaw as { ok: true; data: { agent_id: string; slug: string }[] }).data ?? [])
    : []
  for (const r of rawSkillAssignments) {
    if (!skillMap[r.agent_id]) skillMap[r.agent_id] = []
    skillMap[r.agent_id].push(r.slug)
  }

  const [editingId, setEditingId] = useState<string | null>(null)
  const [assignedSkillIds, setAssignedSkillIds] = useState<string[]>([])
  const [assignedAgentIds, setAssignedAgentIds] = useState<string[]>([])
  const [agentInstructions, setAgentInstructions] = useState<Record<string, string>>({})
  const [selectedOrchestratorId, setSelectedOrchestratorId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy'>('list')
  const [showAdd, setShowAdd] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [form, setForm] = useState({
    name: '', slug: '', personality: '', model: 'claude-sonnet-4-6',
    role: 'agent', telegram_bot_token: '', telegram_bot_username: '',
    requires_approval: '' as string,
    capabilities: [] as string[],
  })
  const [telegramStatus, setTelegramStatus] = useState('')

  useEffect(() => {
    if (!editingId) { setAssignedSkillIds([]); setAssignedAgentIds([]); setAgentInstructions({}); setSelectedOrchestratorId(null); return }
    getAgentSkillAssignmentsAction(editingId).then(r => { if (r.ok) setAssignedSkillIds(r.data) })
    getOrchestratorAssignmentDetailsAction(editingId).then(r => {
      if (r.ok) {
        setAssignedAgentIds(r.data.map(d => d.sub_agent_id))
        const instr: Record<string, string> = {}
        for (const d of r.data) { if (d.instructions) instr[d.sub_agent_id] = d.instructions }
        setAgentInstructions(instr)
      }
    })
    getAgentOrchestratorAction(editingId).then(r => { if (r.ok) setSelectedOrchestratorId(r.data) })
  }, [editingId])

  function slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function selectTemplate(template: AgentTemplate) {
    setShowTemplates(false)
    setEditingId(null)
    setTelegramStatus('')
    setForm({
      name: template.name,
      slug: slugify(template.name),
      personality: template.personality,
      model: template.model,
      role: template.role,
      telegram_bot_token: '',
      telegram_bot_username: '',
      requires_approval: template.suggestedApprovalTools.join(', '),
      capabilities: [],
    })
    setShowAdd(true)
  }

  function startEdit(a: Agent) {
    setEditingId(a.id); setShowAdd(false); setTelegramStatus('')
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
    setEditingId(null); setShowAdd(true); setTelegramStatus('')
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
      })
      if (!result.ok) { toast.error(result.error); return }
      const orchAssignments = assignedAgentIds.map(id => ({ sub_agent_id: id, instructions: agentInstructions[id] || null }))
      await Promise.all([
        setAgentSkillAssignmentsAction(editingId, assignedSkillIds),
        form.role === 'orchestrator' ? setOrchestratorAssignmentsAction(editingId, orchAssignments) : setAgentOrchestratorAction(editingId, selectedOrchestratorId),
      ])
      toast.success('Agent updated')
      setEditingId(null)
    } else {
      const result = await createAgentAction({
        name: form.name, slug: form.slug, personality: form.personality, model: form.model,
        role: form.role,
        telegram_bot_token: form.telegram_bot_token || null,
        telegram_bot_username: form.telegram_bot_username || null,
      })
      if (!result.ok) { toast.error(result.error); return }
      const newId = (result as { ok: true; data: { id: string } }).data?.id
      if (newId) {
        const orchAssignments = assignedAgentIds.map(id => ({ sub_agent_id: id, instructions: agentInstructions[id] || null }))
        await Promise.all([
          setAgentSkillAssignmentsAction(newId, assignedSkillIds),
          form.role === 'orchestrator' ? setOrchestratorAssignmentsAction(newId, orchAssignments) : setAgentOrchestratorAction(newId, selectedOrchestratorId),
        ])
      }
      toast.success('Agent created')
      setShowAdd(false)
    }
    mutate()
  }

  if (loading) return <TableSkeleton rows={4} cols={6} />

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Agents" count={agents.length}>
        <div className="flex items-center gap-1 bg-neutral-800/50 border border-neutral-800 rounded-lg p-0.5">
          <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'list' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>List</button>
          <button onClick={() => setViewMode('hierarchy')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'hierarchy' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>Hierarchy</button>
        </div>
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

      {viewMode === 'list' && <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-x-auto">
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
      </div>}

      {viewMode === 'hierarchy' && (() => {
        // Build orchestrator→children map
        const childMap: Record<string, string[]> = {}
        const assignedAsSubIds = new Set<string>()
        for (const a of allAssignments) {
          if (!childMap[a.orchestrator_id]) childMap[a.orchestrator_id] = []
          childMap[a.orchestrator_id].push(a.sub_agent_id)
          assignedAsSubIds.add(a.sub_agent_id)
        }
        const agentMap = new Map(agents.map(a => [a.id, a]))

        type HNode = { agent: Agent; children: HNode[] }
        function buildNode(id: string): HNode {
          const agent = agentMap.get(id)!
          return { agent, children: (childMap[id] ?? []).map(cid => agentMap.has(cid) ? buildNode(cid) : null).filter(Boolean) as HNode[] }
        }

        const roots = agents.filter(a => a.role === 'orchestrator' && !assignedAsSubIds.has(a.id)).map(a => buildNode(a.id))
        const unassigned = agents.filter(a => !assignedAsSubIds.has(a.id) && a.role !== 'orchestrator')

        function AgentChip({ slug }: { slug: string }) {
          return <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700/50 text-neutral-500 font-mono">{slug}</span>
        }

        function NodeRow({ node, depth }: { node: HNode; depth: number }) {
          const a = node.agent
          const agentSkills = skillMap[a.id] ?? []
          return (
            <div>
              <div
                className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-neutral-800/30 transition-colors cursor-pointer group"
                style={{ paddingLeft: `${1.25 + depth * 1.75}rem` }}
                onClick={() => { setEditingId(a.id); setShowAdd(false) }}
              >
                {depth > 0 && <span className="text-neutral-700 select-none">└</span>}
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.active ? (a.role === 'orchestrator' ? 'bg-violet-400' : 'bg-emerald-400') : 'bg-neutral-600'}`} />
                <span className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">{a.name}</span>
                {a.role === 'orchestrator' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-950/60 border border-violet-800/40 text-violet-400">orchestrator</span>}
                {agentSkills.map(s => <AgentChip key={s} slug={s} />)}
                <span className="text-xs text-neutral-700 font-mono ml-auto group-hover:text-neutral-500">{a.slug}</span>
              </div>
              {node.children.length > 0 && (
                <div className="border-l border-neutral-800/60 ml-8">
                  {node.children.map(child => <NodeRow key={child.agent.id} node={child} depth={depth + 1} />)}
                </div>
              )}
            </div>
          )
        }

        return (
          <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-hidden">
            {agents.length === 0 && <EmptyState message="No agents yet" />}
            {roots.map(node => <NodeRow key={node.agent.id} node={node} depth={0} />)}
            {unassigned.length > 0 && (
              <>
                {roots.length > 0 && <div className="border-t border-neutral-800/50 mx-4 my-1" />}
                <div className="px-4 py-2">
                  <p className="text-[10px] text-neutral-600 font-semibold uppercase tracking-wider mb-1">Unassigned</p>
                  {unassigned.map(a => {
                    const agentSkills = skillMap[a.id] ?? []
                    return (
                      <div key={a.id} className="flex items-center gap-2.5 py-2 hover:bg-neutral-800/30 rounded-lg px-2 -mx-2 transition-colors cursor-pointer group" onClick={() => { setEditingId(a.id); setShowAdd(false) }}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.active ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                        <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">{a.name}</span>
                        {agentSkills.map(s => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700/50 text-neutral-500 font-mono">{s}</span>)}
                        <span className="text-xs text-neutral-700 font-mono ml-auto group-hover:text-neutral-500">{a.slug}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )
      })()}

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
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-hidden">

          {/* ── Form header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/50 bg-neutral-900/80">
            <h2 className="text-sm font-semibold text-white">{editingId ? 'Edit Agent' : 'New Agent'}</h2>
            <div className="flex items-center gap-2">
              {editingId && form.telegram_bot_token && (() => {
                const isActive = !!agents.find(a => a.id === editingId)?.telegram_webhook_url
                return (
                  <div className="flex items-center gap-2 pr-3 border-r border-neutral-800">
                    {isActive && !telegramStatus && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        Webhook active
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        setTelegramStatus('Registering...')
                        try {
                          const res = await activateTelegramAction(form.slug)
                          setTelegramStatus(res.ok ? 'Webhook active!' : `Error: ${res.error}`)
                          if (res.ok) mutate()
                        } catch { setTelegramStatus('Failed to connect') }
                      }}
                      className="px-3 py-1.5 text-xs font-medium border border-emerald-800 text-emerald-400 rounded-lg hover:bg-emerald-950 transition-colors"
                    >
                      {isActive ? 'Re-activate' : 'Activate Telegram'}
                    </button>
                    {isActive && (
                      <button
                        type="button"
                        onClick={async () => {
                          setTelegramStatus('Removing...')
                          try {
                            const res = await deactivateTelegramAction(form.slug)
                            setTelegramStatus(res.ok ? 'Webhook removed' : `Error: ${res.error}`)
                            if (res.ok) mutate()
                          } catch { setTelegramStatus('Failed') }
                        }}
                        className="px-3 py-1.5 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:border-red-800 hover:text-red-400 transition-colors"
                        aria-label="Deactivate Telegram webhook"
                      >
                        Deactivate
                      </button>
                    )}
                    {telegramStatus && <span className="text-xs text-neutral-500">{telegramStatus}</span>}
                  </div>
                )
              })()}
              <button
                type="button"
                onClick={() => { setEditingId(null); setShowAdd(false) }}
                className="px-3 py-1.5 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:text-white hover:border-neutral-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors"
              >
                {editingId ? 'Save changes' : 'Create agent'}
              </button>
            </div>
          </div>

          {/* ── Two-column body ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px]">

            {/* Left — Identity + Personality */}
            <div className="p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-neutral-800/50">

              {/* Identity */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Identity</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="agent-name" className="block text-xs text-neutral-500 mb-1.5">Name</label>
                    <input
                      id="agent-name"
                      value={form.name} onChange={(e) => updateForm('name', e.target.value)}
                      placeholder="e.g. Research Assistant"
                      className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="agent-slug" className="block text-xs text-neutral-500 mb-1.5">Slug</label>
                    <input
                      id="agent-slug"
                      value={form.slug} onChange={(e) => updateForm('slug', e.target.value)}
                      placeholder="research-assistant"
                      className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white font-mono placeholder-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1.5">Model</label>
                    <ModelPicker value={form.model} onChange={v => updateForm('model', v)} configuredProviders={configuredProviders} operatorProviders={operatorProviders} />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1.5">Role</label>
                    <RolePicker value={form.role} onChange={v => updateForm('role', v)} />
                  </div>
                </div>
                {form.role === 'orchestrator' && (
                  <p className="text-xs text-blue-400 bg-blue-950/30 border border-blue-900/30 rounded-lg px-3 py-2.5 leading-relaxed">
                    Delegates tasks via <code className="font-mono bg-blue-950/60 px-1 rounded">delegate_task</code>. Use <code className="font-mono bg-blue-950/60 px-1 rounded">{'{{team}}'}</code> in the personality to control where the agent roster is injected.
                  </p>
                )}
              </fieldset>

              {/* Personality */}
              <fieldset className="space-y-3">
                <div className="flex items-center justify-between">
                  <legend className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Personality
                    <span className="ml-1.5 text-neutral-600 font-normal normal-case tracking-normal">— system prompt</span>
                  </legend>
                  <details className="relative text-right">
                    <summary className="text-[11px] text-neutral-600 hover:text-neutral-400 cursor-pointer select-none transition-colors list-none">
                      Placeholders ▾
                    </summary>
                    <div className="absolute right-0 z-20 mt-1.5 text-left bg-neutral-950 border border-neutral-800 rounded-xl shadow-xl p-3 space-y-2 text-[11px] w-72">
                      <p className="text-neutral-500 pb-1.5 border-b border-neutral-800">
                        Any placeholder activates <strong className="text-neutral-300">full-template mode</strong> — runner substitutes only, no auto-assembly.
                      </p>
                      {([
                        ['{{skills}}', 'Skills index for this session'],
                        ['{{memories}}', 'Recalled memories'],
                        ['{{team}}', 'Assigned agents roster'],
                        ['{{date}}', "Today's date"],
                        ['{{briefing}}', 'Delegation context (sub-agents)'],
                        ['{{channel}}', 'Channel-specific instructions'],
                      ] as [string, string][]).map(([ph, desc]) => (
                        <div key={ph} className="flex items-start gap-2.5">
                          <code className="text-emerald-400 font-mono shrink-0 mt-px">{ph}</code>
                          <span className="text-neutral-600 leading-relaxed">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
                <textarea
                  id="agent-personality"
                  value={form.personality} onChange={(e) => updateForm('personality', e.target.value)}
                  placeholder="# Agent: My Agent&#10;&#10;## Who you are&#10;..."
                  rows={22}
                  aria-label="Agent personality / system prompt"
                  className="w-full bg-neutral-950/60 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-neutral-200 font-mono leading-relaxed focus:border-neutral-600 focus:outline-none transition-colors resize-y"
                />

                {/* Team block preview */}
                {form.role === 'orchestrator' && (() => {
                  const teamAgents = agents.filter(a => {
                    if (a.id === editingId) return false
                    if (assignedAgentIds.length > 0) return assignedAgentIds.includes(a.id)
                    return true
                  })
                  if (teamAgents.length === 0) return null
                  const lines = ['## Your team', '', "Use `delegate_task` with the agent's slug:", '']
                  for (const a of teamAgents) {
                    const agentSkills = skillMap[a.id] ?? []
                    const roleTag = a.role === 'orchestrator' ? ' (orchestrator)' : ''
                    lines.push(`- **${a.name}** — slug: \`${a.slug}\`${roleTag}`)
                    if (agentSkills.length > 0) {
                      lines.push('  Skills:')
                      agentSkills.forEach(s => lines.push(`  - ${s}`))
                    }
                    const instr = agentInstructions[a.id]
                    if (instr) lines.push(`  Instructions: ${instr}`)
                  }
                  const hasPlaceholder = form.personality.includes('{{team}}')
                  return (
                    <div className="border border-neutral-800/50 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-neutral-800/20 border-b border-neutral-800/50">
                        <span className="text-[11px] text-neutral-600 font-medium">
                          Team preview —{' '}
                          {hasPlaceholder
                            ? <span className="text-blue-400">injected at {'{{team}}'}</span>
                            : <span className="text-neutral-600">appended at end</span>}
                        </span>
                        {!hasPlaceholder && (
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, personality: prev.personality + '\n\n{{team}}' }))}
                            className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Insert {'{{team}}'} →
                          </button>
                        )}
                      </div>
                      <pre className="px-4 py-3 text-xs text-neutral-500 font-mono leading-relaxed overflow-x-auto bg-neutral-950/40 whitespace-pre-wrap">
                        {lines.join('\n')}
                      </pre>
                    </div>
                  )
                })()}
              </fieldset>
            </div>

            {/* Right sidebar — Config */}
            <div className="p-5 space-y-5 bg-neutral-950/20">

              {/* Skills */}
              <section aria-labelledby="section-skills">
                <h3 id="section-skills" className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Skills</h3>
                <p className="text-[11px] text-neutral-600 mb-2.5">Leave unchecked to allow all workspace skills.</p>
                {skills.length === 0 ? (
                  <p className="text-xs text-neutral-600">
                    No skills yet —{' '}
                    <a href="/connectors" className="text-neutral-400 underline hover:text-white transition-colors">install from Marketplace</a>
                  </p>
                ) : (
                  <div className="flex flex-col">
                    {skills.map(skill => {
                      const checked = assignedSkillIds.includes(skill.id)
                      return (
                        <label key={skill.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800/30 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setAssignedSkillIds(prev => checked ? prev.filter(id => id !== skill.id) : [...prev, skill.id])}
                            className="rounded border-neutral-700 bg-neutral-800 accent-emerald-500"
                          />
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${skill.active ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                          <span className="text-xs text-neutral-300 flex-1 truncate">{skill.name}</span>
                          <span className="text-[10px] text-neutral-700 font-mono">{skill.slug}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
                {assignedSkillIds.length === 0 && skills.length > 0 && (
                  <p className="text-[11px] text-neutral-700 mt-1.5">All {skills.length} skills available.</p>
                )}
              </section>

              {/* Orchestrator (non-orchestrator agents only) */}
              {form.role !== 'orchestrator' && (
                <section aria-labelledby="section-orchestrator" className="border-t border-neutral-800/50 pt-5">
                  <h3 id="section-orchestrator" className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Orchestrator</h3>
                  <p className="text-[11px] text-neutral-600 mb-2.5">Which orchestrator manages this agent.</p>
                  <select
                    value={selectedOrchestratorId ?? ''}
                    onChange={e => setSelectedOrchestratorId(e.target.value || null)}
                    aria-label="Select orchestrator"
                    className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-neutral-600 focus:outline-none transition-colors"
                  >
                    <option value="">None (unassigned)</option>
                    {agents.filter(a => a.role === 'orchestrator' && a.id !== editingId).map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </section>
              )}

              {/* Assigned agents (orchestrators only) */}
              {form.role === 'orchestrator' && (
                <section aria-labelledby="section-team" className="border-t border-neutral-800/50 pt-5">
                  <h3 id="section-team" className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Team</h3>
                  <p className="text-[11px] text-neutral-600 mb-2.5">Leave unchecked to allow all workspace agents.</p>
                  {agents.filter(a => a.id !== editingId).length === 0 ? (
                    <p className="text-xs text-neutral-600">No other agents yet.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {agents.filter(a => a.id !== editingId).map(a => {
                        const checked = assignedAgentIds.includes(a.id)
                        const agentSkills = skillMap[a.id] ?? []
                        return (
                          <div key={a.id} className={`rounded-lg border overflow-hidden transition-colors ${checked ? 'border-violet-900/50' : 'border-neutral-800/40'}`}>
                            <label className="flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-neutral-800/20 transition-colors">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => setAssignedAgentIds(prev => checked ? prev.filter(id => id !== a.id) : [...prev, a.id])}
                                className="rounded border-neutral-700 bg-neutral-800 accent-violet-500 shrink-0"
                              />
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.active ? (a.role === 'orchestrator' ? 'bg-violet-400' : 'bg-emerald-400') : 'bg-neutral-600'}`} />
                              <span className="text-xs text-neutral-300 flex-1 truncate">{a.name}</span>
                              {agentSkills.length > 0 && (
                                <span className="text-[10px] text-neutral-700 shrink-0">{agentSkills.length} skills</span>
                              )}
                            </label>
                            {checked && (
                              <div className="px-2.5 pb-2 pt-1 border-t border-neutral-800/30 bg-neutral-900/30">
                                <textarea
                                  value={agentInstructions[a.id] ?? ''}
                                  onChange={e => setAgentInstructions(prev => ({ ...prev, [a.id]: e.target.value }))}
                                  placeholder={`When to use ${a.name}, constraints…`}
                                  rows={2}
                                  aria-label={`Instructions for ${a.name}`}
                                  className="w-full bg-transparent border border-neutral-800 rounded px-2.5 py-1.5 text-[11px] text-neutral-400 placeholder-neutral-700 font-mono leading-relaxed focus:border-neutral-600 focus:outline-none transition-colors resize-none"
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {assignedAgentIds.length === 0 && agents.filter(a => a.id !== editingId).length > 0 && (
                    <p className="text-[11px] text-neutral-700 mt-1.5">All agents available.</p>
                  )}
                </section>
              )}

              {/* Capabilities — derived from assigned skills, read-only */}
              {(() => {
                const caps = [...new Set(
                  assignedSkillIds.flatMap(skillId => {
                    const skill = skills.find(s => s.id === skillId)
                    return skill ? (SKILL_CAPABILITIES[skill.slug] ?? []) : []
                  })
                )]
                return (
                  <section aria-labelledby="section-caps" className="border-t border-neutral-800/50 pt-5">
                    <h3 id="section-caps" className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Capabilities</h3>
                    <p className="text-[11px] text-neutral-600 mb-2.5">Derived from assigned skills.</p>
                    {caps.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {caps.map(cap => (
                          <span key={cap} className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-violet-950/60 text-violet-300 border border-violet-800/40 rounded-full">
                            {cap}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-neutral-700">Assign skills above to see capabilities.</p>
                    )}
                  </section>
                )
              })()}

              {/* Human-in-the-Loop */}
              <section aria-labelledby="section-approval" className="border-t border-neutral-800/50 pt-5">
                <h3 id="section-approval" className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Approval</h3>
                <p className="text-[11px] text-neutral-600 mb-2.5">Tools that require human sign-off before execution.</p>
                <input
                  id="requires-approval"
                  value={form.requires_approval}
                  onChange={(e) => updateForm('requires_approval', e.target.value)}
                  placeholder="http_request, delegate_task"
                  aria-label="Tools requiring approval, comma-separated"
                  className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors"
                />
                <p className="text-[10px] text-neutral-700 mt-1.5 leading-relaxed">
                  web_search · save_memory · http_request · send_notification · delegate_task · load_skill
                </p>
              </section>

              {/* Channels */}
              <section aria-labelledby="section-channels" className="border-t border-neutral-800/50 pt-5">
                <h3 id="section-channels" className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Channels</h3>

                {/* Telegram — has editable fields */}
                <div className="space-y-2.5 mb-3">
                  <p className="text-[11px] text-neutral-500 font-medium">Telegram</p>
                  <div>
                    <label htmlFor="tg-token" className="block text-[11px] text-neutral-600 mb-1">Bot Token</label>
                    <input
                      id="tg-token"
                      value={form.telegram_bot_token} onChange={(e) => updateForm('telegram_bot_token', e.target.value)}
                      placeholder="123456:ABC-DEF..."
                      type="password"
                      className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="tg-username" className="block text-[11px] text-neutral-600 mb-1">Bot Username <span className="text-neutral-700">(without @)</span></label>
                    <input
                      id="tg-username"
                      value={form.telegram_bot_username} onChange={(e) => updateForm('telegram_bot_username', e.target.value)}
                      placeholder="my_agent_bot"
                      className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>
                  {(() => {
                    const webhookUrl = agents.find(a => a.id === editingId)?.telegram_webhook_url
                    return webhookUrl ? (
                      <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg px-3 py-2 space-y-0.5">
                        <p className="text-[10px] text-neutral-600 font-medium">Registered webhook URL</p>
                        <p className="text-[10px] text-emerald-500 font-mono break-all">{webhookUrl}</p>
                      </div>
                    ) : null
                  })()}
                </div>

                {/* Slack + Discord — docs only, collapsed */}
                <details className="group">
                  <summary className="text-[11px] text-neutral-600 hover:text-neutral-400 cursor-pointer select-none transition-colors list-none flex items-center gap-1">
                    <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    Slack & Discord setup
                  </summary>
                  <div className="mt-2.5 space-y-3">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 space-y-1.5">
                      <p className="text-[11px] text-neutral-400 font-medium">Slack <span className="text-neutral-600 font-normal">(env-level)</span></p>
                      <p className="text-[10px] text-neutral-600 leading-relaxed">Set <code className="font-mono">SLACK_SIGNING_SECRET</code> + <code className="font-mono">SLACK_BOT_TOKEN</code>, then point Event Subscriptions to:</p>
                      <code className="block text-[10px] text-emerald-500 bg-neutral-950 rounded px-2 py-1 break-all">https://your-domain/api/slack</code>
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 space-y-1.5">
                      <p className="text-[11px] text-neutral-400 font-medium">Discord <span className="text-neutral-600 font-normal">(env-level)</span></p>
                      <p className="text-[10px] text-neutral-600 leading-relaxed">Set <code className="font-mono">DISCORD_PUBLIC_KEY</code> + <code className="font-mono">DISCORD_BOT_TOKEN</code> + <code className="font-mono">DISCORD_APP_ID</code>, then set Interactions URL to:</p>
                      <code className="block text-[10px] text-indigo-400 bg-neutral-950 rounded px-2 py-1 break-all">https://your-domain/api/discord</code>
                    </div>
                  </div>
                </details>
              </section>

            </div>
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

{{team}}

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
