'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { getAgentsAction, createAgentAction, updateAgentAction, deleteAgentAction, setDefaultAgentAction, activateTelegramAction, deactivateTelegramAction, getLlmKeysAction, getOperatorProvidersAction, getSkillsAction, getConnectorsAction, getAgentSkillAssignmentsAction, setAgentSkillAssignmentsAction, getOrchestratorAssignmentsAction, getOrchestratorAssignmentDetailsAction, setOrchestratorAssignmentsAction, getAgentOrchestratorAction, setAgentOrchestratorAction, getAllAgentAssignmentsAction, getAllSkillAssignmentsAction, previewEffectivePromptAction } from '@/lib/actions'
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
import Toggle from '@/components/Toggle'

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
                <p className="text-xs text-neutral-600 mt-0.5">{role.description}</p>
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
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: provider.color }}>{provider.name}</span>
                  {hasOwnKey ? (
                    <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-900/40 px-2 py-1 rounded-full leading-tight">your key</span>
                  ) : hasOperatorKey ? (
                    <span className="text-xs text-amber-400 bg-amber-950/60 border border-amber-900/40 px-2 py-1 rounded-full leading-tight" title="Available via SaaS — usage is billed to you">via SaaS · billed</span>
                  ) : (
                    <span className="text-xs text-neutral-600">no key — <a href="/settings" className="underline hover:text-neutral-400 transition-colors">add in Settings</a></span>
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
                    {model.description && <span className="text-xs text-neutral-600 shrink-0">{model.description}</span>}
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
  const { data: connectorsRaw = [] } = useData(['connectors', eid], getConnectorsAction)
  const { data: allAssignmentsRaw, mutate: mutateAssignments } = useData(['agent-assignments', eid], getAllAgentAssignmentsAction)
  const { data: allSkillAssignmentsRaw, mutate: mutateSkillAssignments } = useData(['all-skill-assignments', eid], getAllSkillAssignmentsAction)
  const configuredProviders = new Set(
    (llmKeysRaw as { provider: string; is_active: boolean }[]).filter(k => k.is_active).map(k => k.provider)
  )
  const operatorProviders = new Set(operatorProvidersRaw as string[])
  const agents = agentsRaw as Agent[]
  type RequiredConfigItem = { label: string; description: string; type: 'connector_slug' | 'manual'; value?: string; critical: boolean }
  type Skill = { id: string; name: string; slug: string; active: boolean; content: string | null; description: string | null; required_config: RequiredConfigItem[] | null; default_content: string | null; content_overridden: boolean }
  type ConnectorRef = { id: string; name: string; slug: string; active: boolean }
  const skills = skillsRaw as Skill[]
  const connectors = connectorsRaw as ConnectorRef[]
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
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null)
  const [assignedAgentIds, setAssignedAgentIds] = useState<string[]>([])
  const [agentInstructions, setAgentInstructions] = useState<Record<string, string>>({})
  const [selectedOrchestratorId, setSelectedOrchestratorId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy'>('list')
  const [showAdd, setShowAdd] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [form, setForm] = useState({
    name: '', slug: '', personality: '', model: 'claude-sonnet-4-6',
    role: 'agent', telegram_bot_token: '', telegram_bot_username: '',
    requires_approval: [] as string[],
    capabilities: [] as string[],
  })
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [telegramStatus, setTelegramStatus] = useState('')
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  type PromptPreview = { sections: { source: string; label: string; content: string; tokens: number }[]; totalTokens: number; isTemplateMode: boolean }
  const [promptPreview, setPromptPreview] = useState<PromptPreview | null>(null)
  const [promptPreviewLoading, setPromptPreviewLoading] = useState(false)
  const [showPromptPreview, setShowPromptPreview] = useState(false)
  const [expandedPreviewSections, setExpandedPreviewSections] = useState<Set<string>>(new Set())

  const loadPromptPreview = useCallback(async (id?: string) => {
    const targetId = id ?? editingId
    if (!targetId) return
    setPromptPreviewLoading(true)
    setShowPromptPreview(true)
    try {
      const result = await previewEffectivePromptAction(targetId)
      if (result.ok) setPromptPreview(result.data)
    } finally {
      setPromptPreviewLoading(false)
    }
  }, [editingId])

  // Auto-refresh preview 800ms after skill assignments change
  const skillDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!editingId || !showPromptPreview) return
    if (skillDebounceRef.current) clearTimeout(skillDebounceRef.current)
    skillDebounceRef.current = setTimeout(() => {
      loadPromptPreview()
    }, 800)
    return () => { if (skillDebounceRef.current) clearTimeout(skillDebounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedSkillIds, assignedAgentIds])

  function slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function selectTemplate(template: AgentTemplate) {
    setShowTemplates(false)
    setEditingId(null)
    setTelegramStatus('')
    setSlugManuallyEdited(false)
    setForm({
      name: template.name,
      slug: slugify(template.name),
      personality: template.personality,
      model: template.model,
      role: template.role,
      telegram_bot_token: '',
      telegram_bot_username: '',
      requires_approval: template.suggestedApprovalTools,
      capabilities: [],
    })
    setShowAdd(true)
  }

  async function startEdit(a: Agent) {
    setLoadingEditId(a.id)
    const [skillsRes, orchDetailsRes, orchParentRes] = await Promise.all([
      getAgentSkillAssignmentsAction(a.id),
      getOrchestratorAssignmentDetailsAction(a.id),
      getAgentOrchestratorAction(a.id),
    ])
    // Filter out orphaned IDs pointing to deleted skills
    const validSkillIds = new Set(skills.map(s => s.id))
    setAssignedSkillIds(skillsRes.ok ? skillsRes.data.filter(id => validSkillIds.has(id)) : [])
    if (orchDetailsRes.ok) {
      setAssignedAgentIds(orchDetailsRes.data.map(d => d.sub_agent_id))
      const instr: Record<string, string> = {}
      for (const d of orchDetailsRes.data) { if (d.instructions) instr[d.sub_agent_id] = d.instructions }
      setAgentInstructions(instr)
    } else {
      setAssignedAgentIds([]); setAgentInstructions({})
    }
    setSelectedOrchestratorId(orchParentRes.ok ? orchParentRes.data : null)
    setLoadingEditId(null)
    setEditingId(a.id); setShowAdd(false); setTelegramStatus('')
    setSlugManuallyEdited(false)
    setPromptPreview(null); setShowPromptPreview(true); setExpandedPreviewSections(new Set())
    // Load preview immediately with known id (editingId state may not be set yet)
    setTimeout(() => loadPromptPreview(a.id), 0)
    setForm({
      name: a.name, slug: a.slug, personality: a.personality, model: a.model,
      role: a.role || 'agent',
      telegram_bot_token: a.telegram_bot_token || '',
      telegram_bot_username: a.telegram_bot_username || '',
      requires_approval: a.requires_approval || [],
      capabilities: a.capabilities || [],
    })
  }

  function startAdd() {
    setEditingId(null); setShowAdd(true); setTelegramStatus('')
    setSlugManuallyEdited(false)
    setForm({
      name: '', slug: '', personality: DEFAULT_PERSONALITY, model: 'claude-sonnet-4-6',
      role: 'agent', telegram_bot_token: '', telegram_bot_username: '',
      requires_approval: [],
      capabilities: [],
    })
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
      if (field === 'role' && value === 'orchestrator' && !editingId) {
        next.personality = ORCHESTRATOR_PERSONALITY
      } else if (field === 'role' && value === 'agent' && !editingId) {
        next.personality = DEFAULT_PERSONALITY
      }
      return next
    })
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    if (!form.slug.trim()) { toast.error('ID is required'); return }
    if (!form.personality.trim()) { toast.error('Instructions are required'); return }
    setSaving(true)
    const isFirstAgent = agents.length === 0

    try {
    if (editingId) {
      const result = await updateAgentAction(editingId, {
        name: form.name, slug: form.slug, personality: form.personality, model: form.model,
        role: form.role,
        telegram_bot_token: form.telegram_bot_token || null,
        telegram_bot_username: form.telegram_bot_username || null,
        requires_approval: form.requires_approval,
      })
      if (!result.ok) { toast.error(result.error); return }
      const orchAssignments = assignedAgentIds.map(id => ({ sub_agent_id: id, instructions: agentInstructions[id] || null }))
      const [skillRes, assignRes] = await Promise.all([
        setAgentSkillAssignmentsAction(editingId, assignedSkillIds),
        form.role === 'orchestrator' ? setOrchestratorAssignmentsAction(editingId, orchAssignments) : setAgentOrchestratorAction(editingId, selectedOrchestratorId),
      ])
      if (!skillRes.ok) toast.error('Could not save skill assignments')
      if (!assignRes.ok) toast.error('Could not save team assignments')
      toast.success('Agent updated')
      setEditingId(null)
    } else {
      const result = await createAgentAction({
        name: form.name, slug: form.slug, personality: form.personality, model: form.model,
        role: form.role,
        telegram_bot_token: form.telegram_bot_token || null,
        telegram_bot_username: form.telegram_bot_username || null,
        requires_approval: form.requires_approval,
      })
      if (!result.ok) { toast.error(result.error); return }
      const newId = (result as { ok: true; data: { id: string } }).data?.id
      if (newId) {
        const orchAssignments = assignedAgentIds.map(id => ({ sub_agent_id: id, instructions: agentInstructions[id] || null }))
        const [skillRes, assignRes] = await Promise.all([
          setAgentSkillAssignmentsAction(newId, assignedSkillIds),
          form.role === 'orchestrator' ? setOrchestratorAssignmentsAction(newId, orchAssignments) : setAgentOrchestratorAction(newId, selectedOrchestratorId),
        ])
        if (!skillRes.ok) toast.error('Could not save skill assignments')
        if (!assignRes.ok) toast.error('Could not save team assignments')
      }
      toast.success(isFirstAgent ? 'Agent created! Now assign it some skills to give it capabilities.' : 'Agent created successfully.')
      setShowAdd(false)
    }
    mutate()
    mutateAssignments()
    mutateSkillAssignments()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <TableSkeleton rows={4} cols={6} />

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Agents" count={agents.length}>
        {/* View toggle — pill style */}
        <div className="flex items-center gap-0.5 bg-neutral-800 border border-neutral-700/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${viewMode === 'list' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('hierarchy')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${viewMode === 'hierarchy' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            Hierarchy
          </button>
        </div>
        <button
          onClick={() => { setShowTemplates(true); setShowAdd(false); setEditingId(null) }}
          className="px-3.5 py-1.5 text-xs font-medium border border-neutral-700/80 text-neutral-400 rounded-lg hover:border-neutral-500 hover:text-white transition-all duration-150"
        >
          From Template
        </button>
        <button
          onClick={startAdd}
          className="px-3.5 py-1.5 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150"
        >
          + Create agent
        </button>
      </PageHeader>

      {viewMode === 'list' && (
        <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800/60">
                <th className="text-left px-4 py-3 text-xs text-neutral-600 font-semibold uppercase tracking-wide w-12"></th>
                <th className="text-left px-4 py-3 text-xs text-neutral-600 font-semibold uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs text-neutral-600 font-semibold uppercase tracking-wide hidden lg:table-cell">Slug</th>
                <th className="text-left px-4 py-3 text-xs text-neutral-600 font-semibold uppercase tracking-wide">Model</th>
                <th className="text-left px-4 py-3 text-xs text-neutral-600 font-semibold uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs text-neutral-600 font-semibold uppercase tracking-wide hidden md:table-cell">Updated</th>
                <th className="text-left px-4 py-3 text-xs text-neutral-600 font-semibold uppercase tracking-wide hidden xl:table-cell">Telegram</th>
                <th className="text-right px-4 py-3 text-xs text-neutral-600 font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/40">
              {agents.map((a) => (
                <tr key={a.id} className="hover:bg-neutral-800/30 transition-colors duration-150 group">
                  <td className="px-4 py-3">
                    <Toggle
                      checked={a.active}
                      aria-label={`Toggle ${a.name} active`}
                      onChange={async () => {
                        const result = await updateAgentAction(a.id, { active: !a.active })
                        if (!result.ok) { toast.error(result.error) } else { mutate() }
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status dot */}
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.active ? (a.role === 'orchestrator' ? 'bg-sky-400' : 'bg-emerald-400') : 'bg-neutral-600'}`} />
                      <span className="font-medium text-white text-sm leading-none">{a.name}</span>
                      {a.is_default && (
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 leading-tight">default</span>
                      )}
                      {(() => {
                        // Derive live skill names from current assignments (avoids stale capabilities field)
                        const assignedSlugs = skillMap[a.id] ?? []
                        const assignedSkills = skills.filter(s => assignedSlugs.includes(s.slug))
                        if (assignedSkills.length === 0) return null
                        return <>
                          {assignedSkills.slice(0, 2).map(s => (
                            <span key={s.id} className="px-1.5 py-0.5 text-xs font-medium bg-violet-950/60 text-violet-400 border border-violet-800/40 rounded leading-tight">{s.name}</span>
                          ))}
                          {assignedSkills.length > 2 && (
                            <span className="text-xs text-neutral-600" title={assignedSkills.slice(2).map(s => s.name).join(', ')}>+{assignedSkills.length - 2}</span>
                          )}
                        </>
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-neutral-500 font-mono bg-neutral-800/50 px-2 py-0.5 rounded">{a.slug}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-neutral-500 font-mono">{modelDisplayLabel(a.model)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {a.role === 'orchestrator' ? (
                      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-sky-950/60 text-sky-400 border border-sky-800/40 font-medium leading-tight">orchestrator</span>
                    ) : (
                      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-neutral-800/80 text-neutral-400 border border-neutral-700/40 font-medium leading-tight">agent</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-neutral-600">{timeAgo(a.updated_at)}</span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    {a.telegram_bot_username ? (
                      <Badge label={`@${a.telegram_bot_username}`} color="emerald" dot />
                    ) : (
                      <span className="text-neutral-700 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-150">
                      {!a.is_default && (
                        <button
                          onClick={async () => {
                            const result = await setDefaultAgentAction(a.id)
                            if (!result.ok) { toast.error(result.error) } else { toast.success('Default agent updated'); mutate() }
                          }}
                          title="Set as default"
                          className="p-1.5 rounded-md text-neutral-500 hover:text-emerald-400 hover:bg-neutral-800 transition-all duration-150"
                        >
                          {/* Star icon */}
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(a)}
                        disabled={loadingEditId === a.id}
                        title="Edit agent"
                        className="p-1.5 rounded-md text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all duration-150 disabled:opacity-50"
                      >
                        {loadingEditId === a.id
                          ? <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        }
                      </button>
                      {!a.is_default && (
                        <button
                          onClick={async () => {
                            if (!confirm('Delete this agent?')) return
                            const result = await deleteAgentAction(a.id)
                            if (!result.ok) { toast.error(result.error) } else { toast.success('Agent deleted'); mutate() }
                          }}
                          title="Delete agent"
                          className="p-1.5 rounded-md text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-all duration-150"
                        >
                          {/* Trash icon */}
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {agents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              {/* Agent icon */}
              <div className="w-12 h-12 rounded-xl bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.711-1.379 2.711H4.177c-1.409 0-2.38-1.712-1.379-2.711L4.2 15.3" />
                </svg>
              </div>
              <p className="text-sm font-medium text-neutral-300 mb-1">No agents yet</p>
              <p className="text-xs text-neutral-600 mb-5 max-w-xs">Create your first agent to start automating tasks. Use a template to get started quickly.</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowTemplates(true); setShowAdd(false); setEditingId(null) }}
                  className="px-3.5 py-1.5 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-lg hover:border-neutral-500 hover:text-white transition-all duration-150"
                >
                  From Template
                </button>
                <button
                  onClick={startAdd}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150"
                >
                  + Create agent
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
          return <span className="text-xs px-2 py-1 rounded bg-neutral-800 border border-neutral-700/50 text-neutral-500 font-mono">{slug}</span>
        }

        function NodeRow({ node, depth }: { node: HNode; depth: number }) {
          const a = node.agent
          const agentSkills = skillMap[a.id] ?? []
          const isRoot = depth === 0
          return (
            <div className={isRoot ? 'p-3' : ''}>
              <div
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg cursor-pointer group transition-all duration-150 ${isRoot ? 'bg-neutral-800/40 border border-neutral-700/40 hover:border-neutral-600/60 hover:bg-neutral-800/60' : 'hover:bg-neutral-800/30'}`}
                style={!isRoot ? { paddingLeft: `${1.25 + (depth - 1) * 1.5}rem` } : undefined}
                onClick={() => { setEditingId(a.id); setShowAdd(false) }}
              >
                {depth > 0 && (
                  <span className="text-neutral-700 select-none text-xs font-light">└─</span>
                )}
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-neutral-900 ${a.active ? (a.role === 'orchestrator' ? 'bg-sky-400 ring-sky-700/50' : 'bg-emerald-400 ring-emerald-700/50') : 'bg-neutral-600 ring-neutral-700/50'}`} />
                <span className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">{a.name}</span>
                {a.role === 'orchestrator' && (
                  <span className="text-xs px-2 py-1 rounded-full bg-sky-950/60 border border-sky-800/40 text-sky-400 font-medium leading-tight">orchestrator</span>
                )}
                {agentSkills.map(s => <AgentChip key={s} slug={s} />)}
                <span className="text-xs text-neutral-700 font-mono ml-auto group-hover:text-neutral-500 transition-colors">{a.slug}</span>
                {/* Edit hint */}
                <svg className="w-3.5 h-3.5 text-neutral-700 group-hover:text-neutral-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              {node.children.length > 0 && (
                <div className={`mt-1 space-y-0.5 ${isRoot ? 'ml-4 pl-3 border-l border-neutral-800/60' : 'ml-4 pl-3 border-l border-neutral-800/40'}`}>
                  {node.children.map(child => <NodeRow key={child.agent.id} node={child} depth={depth + 1} />)}
                </div>
              )}
            </div>
          )
        }

        return (
          <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl overflow-hidden">
            {agents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.711-1.379 2.711H4.177c-1.409 0-2.38-1.712-1.379-2.711L4.2 15.3" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-neutral-300 mb-1">No agents yet</p>
                <p className="text-xs text-neutral-600">Create agents to see the hierarchy here.</p>
              </div>
            )}
            {roots.length > 0 && (
              <div className="p-3 space-y-2">
                {roots.map(node => <NodeRow key={node.agent.id} node={node} depth={0} />)}
              </div>
            )}
            {unassigned.length > 0 && (
              <>
                {roots.length > 0 && <div className="border-t border-neutral-800/50 mx-4" />}
                <div className="px-4 py-3">
                  <p className="text-xs text-neutral-600 font-semibold uppercase tracking-wide mb-2">Unassigned</p>
                  <div className="space-y-0.5">
                    {unassigned.map(a => {
                      const agentSkills = skillMap[a.id] ?? []
                      return (
                        <div
                          key={a.id}
                          className="flex items-center gap-2.5 py-2 px-3 rounded-lg hover:bg-neutral-800/30 transition-all duration-150 cursor-pointer group"
                          onClick={() => { setEditingId(a.id); setShowAdd(false) }}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.active ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                          <span className="text-sm text-neutral-400 group-hover:text-white transition-colors">{a.name}</span>
                          {agentSkills.map(s => (
                            <span key={s} className="text-xs px-2 py-1 rounded bg-neutral-800 border border-neutral-700/50 text-neutral-500 font-mono">{s}</span>
                          ))}
                          <span className="text-xs text-neutral-700 font-mono ml-auto group-hover:text-neutral-500 transition-colors">{a.slug}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )
      })()}

      {showTemplates && (
        <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl overflow-hidden">
          {/* Templates header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/60 bg-neutral-900/80">
            <div>
              <p className="text-sm font-semibold text-white">Agent Templates</p>
              <p className="text-xs text-neutral-500 mt-0.5">Pre-built agents — customize before saving</p>
            </div>
            <button
              onClick={() => setShowTemplates(false)}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all duration-150"
              aria-label="Close template picker"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {AGENT_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  className="text-left p-4 bg-neutral-800/30 border border-neutral-800/80 rounded-xl hover:border-neutral-600/80 hover:bg-neutral-800/60 transition-all duration-150 group relative flex flex-col"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl leading-none mt-0.5 shrink-0">{template.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-neutral-100">{template.name}</span>
                        {template.role === 'orchestrator' ? (
                          <span className="px-2 py-1 text-xs font-medium bg-sky-950/60 text-sky-400 border border-sky-800/40 rounded-full leading-tight">orchestrator</span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-neutral-800 text-neutral-500 border border-neutral-700/60 rounded-full leading-tight">agent</span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed">{template.description}</p>
                      {template.capabilities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {template.capabilities.map(cap => (
                            <span key={cap} className="px-2 py-1 text-xs font-medium bg-violet-950/60 text-violet-400 border border-violet-800/40 rounded-full leading-tight">{cap}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* "Use template" hint on hover */}
                  <div className="absolute inset-0 rounded-xl flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                    <span className="text-xs font-semibold text-violet-400 bg-violet-950/80 border border-violet-800/60 px-2 py-1 rounded-md">Use template →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {(editingId || showAdd) && (
        <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl overflow-hidden">

          {/* ── Form header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/60 bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${editingId ? 'bg-violet-950/60 border border-violet-800/40' : 'bg-neutral-800 border border-neutral-700/50'}`}>
                <svg className={`w-3.5 h-3.5 ${editingId ? 'text-violet-400' : 'text-neutral-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {editingId
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  }
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">{editingId ? 'Edit Agent' : 'New Agent'}</h2>
                {editingId && <p className="text-xs text-neutral-600 mt-px">/{form.slug}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {editingId && form.telegram_bot_token && (() => {
                const isActive = !!agents.find(a => a.id === editingId)?.telegram_webhook_url
                return (
                  <div className="flex items-center gap-2 pr-3 border-r border-neutral-800/80">
                    {isActive && !telegramStatus && (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
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
                      className="px-3 py-1.5 text-xs font-medium border border-emerald-800/60 text-emerald-400 rounded-lg hover:bg-emerald-950/60 transition-all duration-150"
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
                        className="px-3 py-1.5 text-xs font-medium border border-neutral-700/60 text-neutral-400 rounded-lg hover:border-red-800/60 hover:text-red-400 transition-all duration-150"
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
                className="px-3 py-1.5 text-xs font-medium border border-neutral-700/60 text-neutral-400 rounded-lg hover:text-white hover:border-neutral-600 transition-all duration-150"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving && (
                  <svg className="w-3 h-3 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                )}
                {saving ? (editingId ? 'Saving…' : 'Creating…') : (editingId ? 'Save changes' : 'Create agent')}
              </button>
            </div>
          </div>

          {/* ── Two-column body ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px]">

            {/* Left — Identity + Instructions */}
            <div className="p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-neutral-800/50">

              {/* Identity */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Identity</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label htmlFor="agent-name" className="text-xs text-neutral-500 mb-1.5 block">Name</label>
                    <input
                      id="agent-name"
                      value={form.name} onChange={(e) => updateForm('name', e.target.value)}
                      placeholder="e.g. Research Assistant"
                      className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors duration-150"
                    />
                    <p className="text-xs text-[--text-muted] mt-1">ID: {form.slug || '—'}</p>
                    <details className="mt-1">
                      <summary className="text-xs text-neutral-500 cursor-pointer select-none">Advanced</summary>
                      <div className="mt-2">
                        <label htmlFor="agent-slug" className="text-xs text-neutral-500 mb-1.5 block">Slug</label>
                        <input
                          id="agent-slug"
                          value={form.slug} onChange={(e) => updateForm('slug', e.target.value)}
                          placeholder="research-assistant"
                          className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white font-mono placeholder-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors duration-150"
                        />
                      </div>
                    </details>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1.5 block">Model</label>
                    <ModelPicker value={form.model} onChange={v => updateForm('model', v)} configuredProviders={configuredProviders} operatorProviders={operatorProviders} />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1.5 block">Role</label>
                    <RolePicker value={form.role} onChange={v => updateForm('role', v)} />
                  </div>
                </div>
                {form.role === 'orchestrator' && (
                  <div className="flex items-start gap-2.5 text-xs text-violet-300 bg-violet-950/20 border border-violet-900/30 rounded-lg px-3.5 py-2.5 leading-relaxed">
                    <svg className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Delegates tasks via <code className="font-mono bg-violet-950/60 px-1 rounded text-violet-300">delegate_task</code>. Use <code className="font-mono bg-violet-950/60 px-1 rounded text-violet-300">{'{{team}}'}</code> in the personality to control where the agent roster is injected.</span>
                  </div>
                )}
              </fieldset>

              {/* Instructions */}
              <fieldset className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <legend className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Instructions
                    </legend>
                    <p className="text-xs text-neutral-600 mt-0.5">Tell your agent who it is and how to behave</p>
                  </div>
                  <details className="relative text-right">
                    <summary className="text-xs text-neutral-600 hover:text-neutral-400 cursor-pointer select-none transition-colors list-none">
                      Placeholders ▾
                    </summary>
                    <div className="absolute right-0 z-20 mt-1.5 text-left bg-neutral-950 border border-neutral-800 rounded-xl shadow-xl p-3 space-y-2 text-xs w-72">
                      <p className="text-neutral-500 pb-1.5 border-b border-neutral-800">
                        Any placeholder activates <strong className="text-neutral-300">full-template mode</strong> — runner substitutes only, no auto-assembly.
                      </p>
                      {([
                        ['{{skills}}', 'Include skill list'],
                        ['{{memories}}', 'Recalled memories'],
                        ['{{team}}', 'Include team roster'],
                        ['{{date}}', 'Include today\'s date'],
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

                {/* Phase 1: Assembly mode indicator — plain language */}
                {(() => {
                  const KNOWN = ['{{skills}}', '{{memories}}', '{{team}}', '{{date}}', '{{briefing}}', '{{channel}}']
                  const templateMode = KNOWN.some(p => form.personality.includes(p))
                  return (
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs border ${templateMode ? 'bg-neutral-900/60 border-neutral-800/60 text-neutral-500' : 'bg-neutral-900/40 border-neutral-800/40 text-neutral-600'}`}>
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                      {templateMode
                        ? <span>Your skills and team are placed exactly where you put them in the instructions.</span>
                        : <span>Your agent&apos;s skills and team will be added to its instructions automatically.</span>
                      }
                    </div>
                  )
                })()}

                <textarea
                  id="agent-personality"
                  value={form.personality} onChange={(e) => updateForm('personality', e.target.value)}
                  placeholder="You are a helpful assistant..."
                  rows={22}
                  aria-label="Agent instructions / system prompt"
                  className="w-full bg-neutral-950/60 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-neutral-200 leading-relaxed focus:border-neutral-600 focus:outline-none transition-colors resize-y"
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
                        <span className="text-xs text-neutral-600 font-medium">
                          Team preview —{' '}
                          {hasPlaceholder
                            ? <span className="text-blue-400">injected at {'{{team}}'}</span>
                            : <span className="text-neutral-600">appended at end</span>}
                        </span>
                        {!hasPlaceholder && (
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, personality: prev.personality + '\n\n{{team}}' }))}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
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
            <div className="p-5 space-y-5 bg-neutral-950/30">

              {/* Skills */}
              <section aria-labelledby="section-skills">
                <h3 id="section-skills" className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Skills</h3>
                <p className="text-xs text-neutral-600 mb-2.5">Leave unchecked to allow all workspace skills.</p>
                {skills.length === 0 ? (
                  <p className="text-xs text-neutral-600">
                    No skills yet —{' '}
                    <a href="/connectors" className="text-neutral-400 underline hover:text-white transition-colors">install from Marketplace</a>
                  </p>
                ) : (() => {
                  const assigned = skills.filter(s => assignedSkillIds.includes(s.id))
                  const available = skills.filter(s => !assignedSkillIds.includes(s.id))

                  function SkillRow({ skill }: { skill: Skill }) {
                    const checked = assignedSkillIds.includes(skill.id)
                    const isExpanded = expandedSkillId === skill.id
                    const requiredItems = skill.required_config ?? []
                    const missingConnectors = requiredItems.filter(item =>
                      item.type === 'connector_slug' && item.value &&
                      !connectors.some(c => c.slug === item.value && c.active)
                    )
                    const manualItems = requiredItems.filter(item => item.type === 'manual')
                    return (
                      <div className={`rounded-lg border transition-colors ${checked ? 'border-neutral-700/60 bg-neutral-800/20' : 'border-transparent'}`}>
                        <label className="flex items-start gap-2.5 px-2 py-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setAssignedSkillIds(prev => checked ? prev.filter(id => id !== skill.id) : [...prev, skill.id])
                              if (!checked) setExpandedSkillId(skill.id)
                              else if (isExpanded) setExpandedSkillId(null)
                            }}
                            className="rounded border-neutral-700 bg-neutral-800 accent-emerald-500 shrink-0 mt-0.5 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${skill.active ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                              <span className="text-xs font-medium text-neutral-300">{skill.name}</span>
                              {checked && missingConnectors.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-amber-400 bg-amber-950/30 border border-amber-900/40 rounded">
                                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                                  Setup needed
                                </span>
                              )}
                            </div>
                            {skill.description && (
                              <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">{skill.description}</p>
                            )}
                          </div>
                          {checked && skill.content && (
                            <button
                              type="button"
                              onClick={e => { e.preventDefault(); setExpandedSkillId(isExpanded ? null : skill.id) }}
                              className="text-neutral-600 hover:text-neutral-400 transition-colors shrink-0 mt-0.5"
                            >
                              <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                              </svg>
                            </button>
                          )}
                        </label>

                        {/* Expanded: setup callout + content preview */}
                        {checked && isExpanded && (
                          <div className="px-3 pb-3 space-y-2 border-t border-neutral-800/40 pt-2">
                            {missingConnectors.length > 0 && (
                              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-950/10 border border-amber-900/30 rounded-lg">
                                <svg className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-amber-400 mb-1">Setup required:</p>
                                  {missingConnectors.map((item, i) => (
                                    <p key={i} className="text-xs text-amber-300/70">
                                      • {item.label} — {item.description}{' '}
                                      <a href="/connectors" className="underline hover:text-amber-300 transition-colors">Connect →</a>
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                            {manualItems.length > 0 && (
                              <div className="space-y-1">
                                {manualItems.map((item, i) => (
                                  <div key={i} className="flex items-start gap-2 text-xs text-neutral-600">
                                    <svg className="w-3 h-3 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                                    <span>{item.label} — {item.description}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {skill.content && (
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className="text-xs text-neutral-600 font-medium">Instructions preview</p>
                                  <a href="/skills" className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">Edit in Skills →</a>
                                </div>
                                <pre className="text-xs text-neutral-500 bg-neutral-900/60 border border-neutral-800/40 rounded-lg p-3 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed font-mono">
                                  {skill.content.slice(0, 600)}{skill.content.length > 600 ? '\n…' : ''}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }

                  return (
                    <div className="flex flex-col gap-1">
                      {/* Assigned skills group */}
                      {assigned.length > 0 && (
                        <>
                          <p className="text-xs text-neutral-600 font-medium mb-0.5">Assigned ({assigned.length})</p>
                          {assigned.map(skill => <SkillRow key={skill.id} skill={skill} />)}
                        </>
                      )}
                      {/* Available skills group */}
                      {available.length > 0 && (
                        <>
                          {assigned.length > 0 && <div className="border-t border-neutral-800/40 my-1.5" />}
                          {assigned.length > 0 && <p className="text-xs text-neutral-600 font-medium mb-0.5">Available</p>}
                          {available.map(skill => <SkillRow key={skill.id} skill={skill} />)}
                        </>
                      )}
                    </div>
                  )
                })()}
                {assignedSkillIds.length === 0 && skills.length > 0 && (
                  <p className="text-xs text-neutral-700 mt-1.5">All {skills.length} skills available.</p>
                )}
              </section>

              {/* Orchestrator (non-orchestrator agents only) */}
              {form.role !== 'orchestrator' && (
                <section aria-labelledby="section-orchestrator" className="border-t border-neutral-800/50 pt-5">
                  <h3 id="section-orchestrator" className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Orchestrator</h3>
                  <p className="text-xs text-neutral-600 mb-2.5">Which orchestrator manages this agent.</p>
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
                  <h3 id="section-team" className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Team</h3>
                  <p className="text-xs text-neutral-600 mb-2.5">Leave unchecked to allow all workspace agents.</p>
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
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.active ? (a.role === 'orchestrator' ? 'bg-sky-400' : 'bg-emerald-400') : 'bg-neutral-600'}`} />
                              <span className="text-xs text-neutral-300 flex-1 truncate">{a.name}</span>
                              {agentSkills.length > 0 && (
                                <span className="text-xs text-neutral-700 shrink-0">{agentSkills.length} skills</span>
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
                                  className="w-full bg-transparent border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-400 placeholder-neutral-700 font-mono leading-relaxed focus:border-neutral-600 focus:outline-none transition-colors resize-none"
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {assignedAgentIds.length === 0 && agents.filter(a => a.id !== editingId).length > 0 && (
                    <p className="text-xs text-neutral-700 mt-1.5">All agents available.</p>
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
                    <h3 id="section-caps" className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Capabilities</h3>
                    <p className="text-xs text-neutral-600 mb-2.5">Derived from assigned skills.</p>
                    {caps.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {caps.map(cap => (
                          <span key={cap} className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-violet-950/60 text-violet-300 border border-violet-800/40 rounded-full">
                            {cap}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-700">Assign skills above to see capabilities.</p>
                    )}
                  </section>
                )
              })()}

              {/* Human-in-the-Loop */}
              <section aria-labelledby="section-approval" className="border-t border-neutral-800/50 pt-5">
                <h3 id="section-approval" className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-0.5">Require human approval before:</h3>
                <p className="text-xs text-neutral-600 mb-2.5">Your agent will pause and wait for your OK before taking these actions.</p>
                <div className="flex flex-col gap-0.5">
                  {([
                    ['web_search', 'Search the web'],
                    ['http_request', 'Make web requests / API calls'],
                    ['send_notification', 'Send notifications'],
                    ['delegate_task', 'Assign work to another agent'],
                    ['save_memory', 'Remember information'],
                    ['load_skill', 'Load skill instructions'],
                  ] as [string, string][]).map(([tool, label]) => {
                    const checked = form.requires_approval.includes(tool)
                    return (
                      <label key={tool} className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-neutral-800/30 ${checked ? 'bg-neutral-800/20' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setForm(prev => ({
                            ...prev,
                            requires_approval: checked
                              ? prev.requires_approval.filter(t => t !== tool)
                              : [...prev.requires_approval, tool],
                          }))}
                          className="rounded border-neutral-700 bg-neutral-800 accent-amber-500 shrink-0 cursor-pointer"
                        />
                        <span className="text-xs text-neutral-300">{label}</span>
                      </label>
                    )
                  })}
                </div>
              </section>

              {/* Channels */}
              <section aria-labelledby="section-channels" className="border-t border-neutral-800/50 pt-5">
                <h3 id="section-channels" className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Channels</h3>

                {/* Telegram — has editable fields */}
                <div className="space-y-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-neutral-400 font-semibold">Telegram</p>
                  </div>
                  <div>
                    <label htmlFor="tg-token" className="block text-xs text-neutral-600 mb-1">Bot Token</label>
                    <input
                      id="tg-token"
                      value={form.telegram_bot_token} onChange={(e) => updateForm('telegram_bot_token', e.target.value)}
                      placeholder="123456:ABC-DEF..."
                      type="password"
                      className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="tg-username" className="block text-xs text-neutral-600 mb-1">Bot Username <span className="text-neutral-700">(without @)</span></label>
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
                        <p className="text-xs text-neutral-600 font-medium">Registered webhook URL</p>
                        <p className="text-xs text-emerald-500 font-mono break-all">{webhookUrl}</p>
                      </div>
                    ) : null
                  })()}
                </div>

                {/* Slack + Discord — docs only, collapsed */}
                <details className="group">
                  <summary className="text-xs text-neutral-600 hover:text-neutral-400 cursor-pointer select-none transition-colors list-none flex items-center gap-1">
                    <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    Slack & Discord setup
                  </summary>
                  <div className="mt-2.5 space-y-3">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 space-y-1.5">
                      <p className="text-xs text-neutral-400 font-medium">Slack <span className="text-neutral-600 font-normal">(env-level)</span></p>
                      <p className="text-xs text-neutral-600 leading-relaxed">Set <code className="font-mono">SLACK_SIGNING_SECRET</code> + <code className="font-mono">SLACK_BOT_TOKEN</code>, then point Event Subscriptions to:</p>
                      <code className="block text-xs text-emerald-500 bg-neutral-950 rounded px-2 py-1 break-all">https://your-domain/api/slack</code>
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 space-y-1.5">
                      <p className="text-xs text-neutral-400 font-medium">Discord <span className="text-neutral-600 font-normal">(env-level)</span></p>
                      <p className="text-xs text-neutral-600 leading-relaxed">Set <code className="font-mono">DISCORD_PUBLIC_KEY</code> + <code className="font-mono">DISCORD_BOT_TOKEN</code> + <code className="font-mono">DISCORD_APP_ID</code>, then set Interactions URL to:</p>
                      <code className="block text-xs text-indigo-400 bg-neutral-950 rounded px-2 py-1 break-all">https://your-domain/api/discord</code>
                    </div>
                  </div>
                </details>
              </section>

            </div>
          </div>

          {/* Phase 3: Agent preview — plain language summary */}
          {editingId && (
            <div className="border-t border-neutral-800/50">
              <button
                type="button"
                onClick={() => {
                  if (showPromptPreview) setShowPromptPreview(false)
                  else loadPromptPreview()
                }}
                className="w-full flex items-center justify-between px-6 py-3 text-xs text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/20 transition-all duration-150"
              >
                <div className="flex items-center gap-2">
                  <svg className={`w-3.5 h-3.5 transition-transform ${showPromptPreview ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                  <span className="font-semibold uppercase tracking-wide">Effective prompt</span>
                  {promptPreviewLoading && (
                    <svg className="animate-spin w-3 h-3 text-neutral-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  )}
                </div>
                {promptPreview && !promptPreviewLoading && (() => {
                  const total = promptPreview.totalTokens
                  const load = total < 1500 ? { label: 'Light', color: 'text-emerald-500' }
                    : total < 4000 ? { label: 'Medium', color: 'text-amber-500' }
                    : total < 8000 ? { label: 'Heavy', color: 'text-orange-500' }
                    : { label: 'Very heavy', color: 'text-red-500' }
                  return <span className={`text-xs ${load.color}`}>{total.toLocaleString()} tokens · {load.label}</span>
                })()}
              </button>

              {showPromptPreview && (
                <div className="px-6 pb-6 space-y-3">
                  {promptPreviewLoading && !promptPreview ? (
                    <p className="text-xs text-neutral-600 py-4 text-center">Loading preview…</p>
                  ) : promptPreview ? (
                    <>
                      {promptPreview.sections.map((section) => {
                        const isExpanded = expandedPreviewSections.has(section.source)
                        const toggleSection = () => setExpandedPreviewSections(prev => {
                          const next = new Set(prev)
                          if (next.has(section.source)) next.delete(section.source)
                          else next.add(section.source)
                          return next
                        })

                        if (section.source === 'personality') {
                          const lines = section.content.split('\n')
                            .map(l => l.replace(/^#+\s*/, '').trim())
                            .filter(l => l.length > 20)
                            .slice(0, 3)
                          return (
                            <div key="personality" className="border border-neutral-800/40 rounded-lg overflow-hidden">
                              <button type="button" onClick={toggleSection} className="w-full flex items-center justify-between px-3 py-2 hover:bg-neutral-800/20 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Your instructions</span>
                                  <span className="text-xs text-neutral-700">{section.tokens} tok</span>
                                </div>
                                <svg className={`w-3 h-3 text-neutral-700 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                              </button>
                              {!isExpanded && (
                                <div className="px-3 pb-2 space-y-0.5">
                                  {lines.map((l, i) => (
                                    <p key={i} className="text-xs text-neutral-500 leading-relaxed">{l.slice(0, 100)}{l.length > 100 ? '…' : ''}</p>
                                  ))}
                                </div>
                              )}
                              {isExpanded && (
                                <pre className="px-3 pb-3 text-xs text-neutral-500 whitespace-pre-wrap leading-relaxed border-t border-neutral-800/40 pt-2 max-h-48 overflow-y-auto font-mono">
                                  {section.content}
                                </pre>
                              )}
                            </div>
                          )
                        }

                        if (section.source === 'skills') {
                          const skillNames = section.content
                            .split(/\n---\n/)
                            .map(block => block.match(/^#\s+(.+)/m)?.[1]?.trim())
                            .filter(Boolean) as string[]
                          return (
                            <div key="skills" className="border border-neutral-800/40 rounded-lg overflow-hidden">
                              <button type="button" onClick={toggleSection} className="w-full flex items-center justify-between px-3 py-2 hover:bg-neutral-800/20 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Skills</span>
                                  <span className="text-xs text-neutral-700">{skillNames.length} · {section.tokens} tok</span>
                                </div>
                                <svg className={`w-3 h-3 text-neutral-700 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                              </button>
                              <div className="px-3 pb-2 pt-0.5 flex flex-wrap gap-1.5">
                                {skillNames.map((name, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 rounded-full text-xs">{name}</span>
                                ))}
                              </div>
                              {isExpanded && (
                                <pre className="px-3 pb-3 text-xs text-neutral-500 whitespace-pre-wrap leading-relaxed border-t border-neutral-800/40 pt-2 max-h-48 overflow-y-auto font-mono">
                                  {section.content}
                                </pre>
                              )}
                            </div>
                          )
                        }

                        if (section.source === 'team') {
                          const members = section.content
                            .split('\n')
                            .filter(l => l.startsWith('- **'))
                            .map(l => l.match(/\*\*(.+?)\*\*/)?.[1])
                            .filter(Boolean) as string[]
                          return (
                            <div key="team" className="border border-neutral-800/40 rounded-lg overflow-hidden">
                              <button type="button" onClick={toggleSection} className="w-full flex items-center justify-between px-3 py-2 hover:bg-neutral-800/20 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Team</span>
                                  <span className="text-xs text-neutral-700">{members.length} agents · {section.tokens} tok</span>
                                </div>
                                <svg className={`w-3 h-3 text-neutral-700 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                              </button>
                              <div className="px-3 pb-2 pt-0.5 flex flex-wrap gap-1.5">
                                {members.map((name, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-sky-950/40 text-sky-400 border border-sky-800/30 rounded-full text-xs">{name}</span>
                                ))}
                              </div>
                              {isExpanded && (
                                <pre className="px-3 pb-3 text-xs text-neutral-500 whitespace-pre-wrap leading-relaxed border-t border-neutral-800/40 pt-2 max-h-48 overflow-y-auto font-mono">
                                  {section.content}
                                </pre>
                              )}
                            </div>
                          )
                        }

                        // date / other sections
                        return (
                          <div key={section.source} className="border border-neutral-800/40 rounded-lg overflow-hidden">
                            <button type="button" onClick={toggleSection} className="w-full flex items-center justify-between px-3 py-2 hover:bg-neutral-800/20 transition-colors">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{section.label || section.source}</span>
                                <span className="text-xs text-neutral-700">{section.tokens} tok</span>
                              </div>
                              <svg className={`w-3 h-3 text-neutral-700 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                            </button>
                            {isExpanded && (
                              <pre className="px-3 pb-3 text-xs text-neutral-500 whitespace-pre-wrap leading-relaxed border-t border-neutral-800/40 pt-2 max-h-32 overflow-y-auto font-mono">
                                {section.content}
                              </pre>
                            )}
                          </div>
                        )
                      })}
                      {promptPreview.totalTokens >= 8000 && (
                        <p className="text-xs text-orange-500/80 bg-orange-950/20 border border-orange-800/20 rounded-lg px-3 py-2">
                          Very large prompt — this may slow responses. Consider removing unused skills.
                        </p>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>
          )}
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

const DEFAULT_PERSONALITY = `You are a helpful assistant. You are thorough, accurate, and concise. When given a task, you break it down into clear steps and execute them carefully.`
