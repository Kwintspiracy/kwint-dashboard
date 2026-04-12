'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { DndContext, DragOverlay, useDraggable, useDroppable, MouseSensor, TouchSensor, useSensor, useSensors, pointerWithin, type DragEndEvent } from '@dnd-kit/core'
import { getAgentsAction, createAgentAction, updateAgentAction, deleteAgentAction, setDefaultAgentAction, activateTelegramAction, deactivateTelegramAction, getLlmKeysAction, getOperatorProvidersAction, getSkillsAction, getConnectorsAction, getAgentSkillAssignmentsAction, setAgentSkillAssignmentsAction, setSkillApprovalsAction, setSkillEnabledOperationsAction, getOrchestratorAssignmentsAction, getOrchestratorAssignmentDetailsAction, setOrchestratorAssignmentsAction, getAgentOrchestratorAction, setAgentOrchestratorAction, getAllAgentAssignmentsAction, getAllSkillAssignmentsAction, previewEffectivePromptAction, autoAssignTemplateSkillsAction, getSkillCustomInstructionsAction, setSkillCustomInstructionsAction, getAgentEditDataAction, getAgentMemoryCountsAction } from '@/lib/actions'
import { AgentReadinessBadge } from '@/components/AgentReadiness'
import AgentMemoriesList from '@/components/AgentMemoriesList'
import { timeAgo } from '@/lib/utils'
import { toast } from 'sonner'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/components/AuthProvider'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import { AGENT_TEMPLATES, type AgentTemplate } from '@/lib/agent-templates'
import { AGENT_PACKS, type AgentPack } from '@/lib/agent-packs'
import { installPackAction } from '@/lib/actions'
import { LLM_PROVIDERS, getProviderForModel } from '@/lib/llm-providers'
import { SKILL_CAPABILITIES } from '@/lib/skill-templates'
import Toggle from '@/components/Toggle'
import SidePanel from '@/components/SidePanel'

type Agent = {
  id: string; name: string; slug: string; personality: string
  model: string; active: boolean; is_default: boolean; system_agent: boolean; role: string
  telegram_bot_token: string | null; telegram_bot_username: string | null
  telegram_webhook_url: string | null
  requires_approval: string[] | null
  capabilities: string[]
  avatar_url: string | null
  created_at: string; updated_at: string
}

const AVATAR_COUNT = 42
const AVATARS = Array.from({ length: AVATAR_COUNT }, (_, i) => `/avatars/avatar-${i}.png`)

function AvatarPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Choose avatar"
        className="w-14 h-14 rounded-full border-2 border-neutral-700 hover:border-neutral-500 transition-colors bg-neutral-800/50 flex items-center justify-center"
      >
        {value ? (
          <img src={value} alt="avatar" className="w-full h-full object-contain" />
        ) : (
          <svg className="w-6 h-6 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        )}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-2 w-72 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl p-3">
          <div className="grid grid-cols-7 gap-1.5 max-h-64 overflow-y-auto">
            {value && (
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false) }}
                className="w-9 h-9 rounded-lg border border-neutral-700 hover:border-red-500/60 bg-neutral-800 flex items-center justify-center transition-colors"
                title="Remove avatar"
              >
                <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {AVATARS.map(src => (
              <button
                key={src}
                type="button"
                onClick={() => { onChange(src); setOpen(false) }}
                className={`w-9 h-9 rounded-full border-2 transition-colors ${value === src ? 'border-sky-500' : 'border-transparent hover:border-neutral-600'}`}
              >
                <img src={src} alt="" className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Flat list for table display (provider: Model label)
function modelDisplayLabel(value: string): string {
  const provider = getProviderForModel(value)
  const model = provider?.models.find((m) => m.value === value)
  if (!model) return value
  return model.label
}
function modelFullLabel(value: string): string {
  const provider = getProviderForModel(value)
  const model = provider?.models.find((m) => m.value === value)
  if (!model) return value
  return `${provider!.name} — ${model.label}`
}

const ROLES = [
  { value: 'agent', label: 'Agent', description: 'Executes tasks independently', color: 'text-neutral-300' },
  { value: 'orchestrator', label: 'Orchestrator', description: 'Delegates to other agents', color: 'text-blue-300' },
  { value: 'system', label: 'System', description: 'Automated maintenance agent', color: 'text-amber-300' },
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

// ─── Hierarchy Drag-and-Drop primitives ──────────────────────────────────────

type HierarchyAgentData = { id: string; name: string; slug: string; role: string; active: boolean }

/**
 * Renders a single agent row (no children). Draggable via grip handle.
 * Orchestrators are also droppable on hover (drop agent onto them = sub-assign).
 */
function AgentHierarchyRow({
  agent, depth, skills, onEdit, isDraggingAny,
}: {
  agent: HierarchyAgentData
  depth: number       // 0 = root, 1+ = nested, -1 = unassigned
  skills: string[]
  onEdit: (id: string) => void
  isDraggingAny: boolean
}) {
  const isOrch = agent.role === 'orchestrator'
  const isSystem = agent.role === 'system'
  const isRoot = depth === 0
  const isUnassigned = depth < 0

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: agent.id, disabled: isSystem })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: agent.id, disabled: !isOrch || isSystem })
  const setRef = useCallback(
    (node: HTMLElement | null) => { setDragRef(node); setDropRef(node) },
    [setDragRef, setDropRef],
  )

  const dragHandle = (
    <button
      {...attributes} {...listeners}
      className="text-neutral-600 hover:text-neutral-400 cursor-grab active:cursor-grabbing shrink-0 touch-none p-0.5"
      onClick={e => e.stopPropagation()} tabIndex={-1} aria-label="Drag to reassign"
    >
      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
        <circle cx="4" cy="2.5" r="1.2"/><circle cx="8" cy="2.5" r="1.2"/>
        <circle cx="4" cy="6"   r="1.2"/><circle cx="8" cy="6"   r="1.2"/>
        <circle cx="4" cy="9.5" r="1.2"/><circle cx="8" cy="9.5" r="1.2"/>
      </svg>
    </button>
  )

  const dot = (
    <span className={`rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-neutral-900 ${isUnassigned ? 'w-1.5 h-1.5' : 'w-2 h-2'} ${agent.active ? (agent.role === 'system' ? 'bg-amber-400 ring-amber-700/50' : isOrch ? 'bg-sky-400 ring-sky-700/50' : 'bg-emerald-400 ring-emerald-700/50') : 'bg-neutral-600 ring-neutral-700/50'}`} />
  )

  if (isUnassigned) {
    return (
      <div ref={setDragRef} style={{ opacity: isDragging ? 0.4 : undefined }}>
        <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg hover:bg-neutral-800/30 transition-all duration-150 cursor-pointer group" onClick={() => onEdit(agent.id)}>
          {dragHandle}{dot}
          <span className="text-sm text-neutral-400 group-hover:text-white transition-colors">{agent.name}</span>
          {skills.map(s => <span key={s} className="text-xs px-2 py-1 rounded bg-neutral-800 border border-neutral-700/50 text-neutral-500 font-mono">{s}</span>)}
          <span className="text-xs text-neutral-700 font-mono ml-auto group-hover:text-neutral-500 transition-colors">{agent.slug}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ opacity: isDragging ? 0.4 : undefined }}>
      <div
        ref={setRef}
        className={[
          'flex items-center gap-2.5 rounded-lg transition-all duration-150 group cursor-pointer',
          isRoot ? 'px-3.5 py-2.5 bg-neutral-800/40 border border-neutral-700/40 hover:border-neutral-600/60 hover:bg-neutral-800/60' : 'px-3.5 py-2.5 hover:bg-neutral-800/30',
          isOver && isDraggingAny ? 'ring-1 ring-violet-500/50 !bg-violet-950/10 !border-violet-800/40' : '',
        ].join(' ')}
        style={!isRoot ? { paddingLeft: `${1.25 + (depth - 1) * 1.5}rem` } : undefined}
        onClick={() => onEdit(agent.id)}
      >
        {depth > 0 && <span className="text-neutral-700 select-none text-xs font-light">└─</span>}
        {!isSystem && dragHandle}{dot}
        <span className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">{agent.name}</span>
        {isOrch && <span className="text-xs px-2 py-1 rounded-full bg-sky-950/60 border border-sky-800/40 text-sky-400 font-medium leading-tight">orchestrator</span>}
        {agent.role === 'system' && <span className="text-xs px-2 py-1 rounded-full bg-amber-950/60 border border-amber-800/40 text-amber-400 font-medium leading-tight">system</span>}
        {isOver && isDraggingAny ? (
          <span className="ml-auto text-xs px-2 py-0.5 rounded bg-violet-900/60 text-violet-300 border border-violet-700/40 font-medium">assign here →</span>
        ) : (
          <>
            {skills.map(s => <span key={s} className="text-xs px-2 py-1 rounded bg-neutral-800 border border-neutral-700/50 text-neutral-500 font-mono">{s}</span>)}
            <span className="text-xs text-neutral-700 font-mono ml-auto group-hover:text-neutral-500 transition-colors">{agent.slug}</span>
            <svg className="w-3.5 h-3.5 text-neutral-700 group-hover:text-neutral-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Wraps a set of children at a given indent level.
 * The left border line IS the drop target — hovering over it highlights it
 * and dropping assigns the dragged agent to `parentId`.
 * id = `lvl:${parentId}`
 */
function DroppableLevelLine({
  parentId, isDraggingAny, isRootChild, children,
}: {
  parentId: string
  isDraggingAny: boolean
  isRootChild: boolean
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `lvl:${parentId}` })
  const active = isOver && isDraggingAny
  return (
    <div className="relative mt-1 ml-4">
      {/* Wide invisible hit-zone sitting on top of the left border */}
      <div
        ref={setNodeRef}
        className={`absolute -left-1.5 top-0 bottom-0 w-5 z-10 rounded-sm transition-colors duration-100 ${active ? 'bg-violet-500/20' : ''}`}
      />
      <div className={`pl-3 space-y-0.5 border-l-2 transition-colors duration-150 ${active ? 'border-violet-400' : isDraggingAny ? (isRootChild ? 'border-neutral-600/50' : 'border-neutral-600/30') : (isRootChild ? 'border-neutral-800/60' : 'border-neutral-800/40')}`}>
        {active && <p className="text-xs text-violet-400 font-medium px-1 py-0.5 pointer-events-none">↑ move to this level</p>}
        {children}
      </div>
    </div>
  )
}

/**
 * Thin strip on the far left of the hierarchy panel.
 * Drop here = remove from all hierarchy (become a root/free agent).
 */
function DroppableRootZone({ isDraggingAny, children }: { isDraggingAny: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'root' })
  const active = isOver && isDraggingAny
  return (
    <div className="relative">
      {/* Always mounted — dnd-kit must register this BEFORE the drag starts,
          not after. Conditional mount means it misses the drag session entirely. */}
      <div
        ref={setNodeRef}
        className={`absolute left-0 top-0 bottom-0 w-8 z-20 rounded-l-xl transition-all duration-150 flex flex-col items-center justify-center ${
          isDraggingAny
            ? active
              ? 'bg-violet-500/25 border-r-2 border-violet-400'
              : 'border-r border-neutral-700/20'
            : 'pointer-events-none'
        }`}
      >
        {active && <span className="text-violet-400 text-xs font-bold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>root</span>}
      </div>
      <div className={isDraggingAny ? 'pl-8' : ''}>
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

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
  const { data: memoryCountsRaw = {}, mutate: mutateMemoryCounts } = useData(['memory-counts-by-agent', eid], getAgentMemoryCountsAction)
  const memoryCounts = memoryCountsRaw as Record<string, number>
  const globalMemoryCount = memoryCounts['__global__'] ?? 0
  const configuredProviders = new Set(
    (llmKeysRaw as { provider: string; is_active: boolean }[]).filter(k => k.is_active).map(k => k.provider)
  )
  const operatorProviders = new Set(operatorProvidersRaw as string[])
  const agents = agentsRaw as Agent[]
  type RequiredConfigItem = { label: string; description: string; type: 'connector_slug' | 'manual'; value?: string; critical: boolean }
  type OperationItem = { name: string; slug: string; risk: 'read' | 'write' | 'destructive'; requires_approval: boolean; description?: string }
  type Skill = { id: string; name: string; slug: string; active: boolean; content: string | null; description: string | null; required_config: RequiredConfigItem[] | null; default_content: string | null; content_overridden: boolean; operations: OperationItem[] | null }
  type ConnectorRef = { id: string; name: string; slug: string; active: boolean }
  const skills = skillsRaw as Skill[]
  const connectors = connectorsRaw as ConnectorRef[]
  type AgentAssignment = { orchestrator_id: string; sub_agent_id: string; instructions: string | null }
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

  // Readiness input builder — used by AgentReadinessBadge on each agent card
  // and by the expanded checklist in the edit panel.
  function buildReadinessInput(agent: Agent) {
    const ownAssignments = allAssignments.filter(a => a.orchestrator_id === agent.id)
    return {
      agent: { id: agent.id, role: agent.role },
      skillCount: (skillMap[agent.id] ?? []).length,
      teammateCount: ownAssignments.length,
      teammateWithInstructions: ownAssignments.filter(a => ((a.instructions ?? '') as string).trim().length > 0).length,
      memoryCount: memoryCounts[agent.id] ?? 0,
      globalMemoryCount,
    }
  }

  const [editingId, setEditingId] = useState<string | null>(null)
  const [assignedSkillIds, setAssignedSkillIds] = useState<string[]>([])
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null)
  const [skillApprovalOverrides, setSkillApprovalOverrides] = useState<Record<string, Record<string, boolean>>>({})
  const [skillCustomInstructions, setSkillCustomInstructions] = useState<Record<string, boolean>>({})
  // Per-skill enabled operations. null = all enabled (default), [] = none, [list] = only those.
  const [skillEnabledOps, setSkillEnabledOps] = useState<Record<string, string[] | null>>({})
  const [assignedAgentIds, setAssignedAgentIds] = useState<string[]>([])
  const [agentInstructions, setAgentInstructions] = useState<Record<string, string>>({})
  const [selectedOrchestratorId, setSelectedOrchestratorId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'list' | 'hierarchy'>('cards')
  const [hierarchyDraggingId, setHierarchyDraggingId] = useState<string | null>(null)
  const hierarchyLastOverIdRef = useRef<string | null>(null)
  const hierarchySensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )
  const [showAdd, setShowAdd] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [pendingTemplateSlugs, setPendingTemplateSlugs] = useState<string[]>([])
  const [templateTab, setTemplateTab] = useState<'templates' | 'packs'>('templates')
  const [templateCategory, setTemplateCategory] = useState<string>('all')
  const [installingPack, setInstallingPack] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', slug: '', personality: '', model: 'claude-sonnet-4-6',
    role: 'agent', telegram_bot_token: '', telegram_bot_username: '',
    requires_approval: [] as string[],
    capabilities: [] as string[],
    avatar_url: null as string | null,
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
    setPendingTemplateSlugs(template.suggestedSkills ?? [])
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
      avatar_url: null,
    })
    setShowAdd(true)
  }

  async function handleInstallPack(pack: AgentPack) {
    setInstallingPack(pack.id)
    try {
      const result = await installPackAction(pack.id)
      if (result.ok) {
        mutate()
        setShowTemplates(false)
        toast.success(`Pack installed — ${result.data.agentNames.join(', ')} created`)
      } else {
        toast.error(result.error)
      }
    } finally {
      setInstallingPack(null)
    }
  }

  async function startEdit(a: Agent) {
    // Open panel immediately with known data
    setEditingId(a.id); setShowAdd(false); setTelegramStatus('')
    setSlugManuallyEdited(false)
    setPromptPreview(null); setShowPromptPreview(true); setExpandedPreviewSections(new Set())
    setAssignedSkillIds([]); setSkillApprovalOverrides({}); setSkillCustomInstructions({}); setSkillEnabledOps({})
    setAssignedAgentIds([]); setAgentInstructions({}); setSelectedOrchestratorId(null)
    setForm({
      name: a.name, slug: a.slug, personality: '', model: a.model,
      role: a.role || 'agent',
      telegram_bot_token: a.telegram_bot_token || '',
      telegram_bot_username: a.telegram_bot_username || '',
      requires_approval: a.requires_approval || [],
      capabilities: a.capabilities || [],
      avatar_url: a.avatar_url || null,
    })

    // Single fetch for all edit data (1 server action, 4 parallel DB queries)
    // Personality is fetched here (not in the list endpoint) to keep the list payload small.
    setLoadingEditId(a.id)
    const res = await getAgentEditDataAction(a.id)
    if (res.ok) {
      setForm(prev => ({ ...prev, personality: res.data.personality ?? '' }))
      const validSkillIds = new Set(skills.map(s => s.id))
      setAssignedSkillIds(res.data.skillIds.filter(id => validSkillIds.has(id)))
      setSkillCustomInstructions(res.data.customInstructions)
      setSkillEnabledOps(res.data.enabledOperations ?? {})
      setAssignedAgentIds(res.data.subAgents.map(d => d.sub_agent_id))
      const instr: Record<string, string> = {}
      for (const d of res.data.subAgents) { if (d.instructions) instr[d.sub_agent_id] = d.instructions }
      setAgentInstructions(instr)
      setSelectedOrchestratorId(res.data.orchestratorId)
    }
    setLoadingEditId(null)
    loadPromptPreview(a.id)
  }

  function startAdd() {
    setEditingId(null); setShowAdd(true); setTelegramStatus('')
    setSlugManuallyEdited(false)
    setForm({
      name: '', slug: '', personality: DEFAULT_PERSONALITY, model: 'claude-sonnet-4-6',
      role: 'agent', telegram_bot_token: '', telegram_bot_username: '',
      requires_approval: [],
      capabilities: [],
      avatar_url: null,
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
        avatar_url: form.avatar_url || null,
      })
      if (!result.ok) { toast.error(result.error); return }
      const orchAssignments = assignedAgentIds.map(id => ({ sub_agent_id: id, instructions: agentInstructions[id] || null }))
      // Save all assignments in parallel (single batch)
      const savePromises: Promise<{ ok: boolean; error?: string }>[] = [
        setAgentSkillAssignmentsAction(editingId, assignedSkillIds),
        setAgentOrchestratorAction(editingId, selectedOrchestratorId),
        ...(form.role === 'orchestrator' ? [setOrchestratorAssignmentsAction(editingId, orchAssignments)] : []),
        // Approval overrides (only changed ones)
        ...assignedSkillIds
          .filter(skillId => skillApprovalOverrides[skillId] && Object.keys(skillApprovalOverrides[skillId]).length > 0)
          .map(skillId => setSkillApprovalsAction({ agent_id: editingId, skill_id: skillId, approval_overrides: skillApprovalOverrides[skillId] })),
        // Custom instructions flags
        ...assignedSkillIds.map(skillId => setSkillCustomInstructionsAction(editingId, skillId, skillCustomInstructions[skillId] ?? false)),
        // Per-skill enabled operations (narrows the agent's toolkit)
        ...assignedSkillIds.map(skillId => setSkillEnabledOperationsAction(editingId, skillId, skillEnabledOps[skillId] ?? null)),
      ]
      const results = await Promise.all(savePromises)
      const failed = results.filter(r => !r.ok)
      if (failed.length > 0) toast.error(`${failed.length} save(s) failed`)
      toast.success('Agent updated')
      setEditingId(null)
    } else {
      const result = await createAgentAction({
        name: form.name, slug: form.slug, personality: form.personality, model: form.model,
        role: form.role,
        telegram_bot_token: form.telegram_bot_token || null,
        telegram_bot_username: form.telegram_bot_username || null,
        requires_approval: form.requires_approval,
        avatar_url: form.avatar_url || null,
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
        // Persist per-skill approval overrides for new agent
        await Promise.all(
          assignedSkillIds.map(skillId => {
            const overrides = skillApprovalOverrides[skillId]
            if (!overrides || Object.keys(overrides).length === 0) return Promise.resolve()
            return setSkillApprovalsAction({ agent_id: newId, skill_id: skillId, approval_overrides: overrides })
          })
        )
      }
      // Auto-assign template skills (e.g. Personal Assistant → Gmail, Drive, Docs, Sheets)
      if (newId && pendingTemplateSlugs.length > 0 && assignedSkillIds.length === 0) {
        const autoRes = await autoAssignTemplateSkillsAction(newId, pendingTemplateSlugs)
        if (autoRes.ok && (autoRes as { ok: true; data: number }).data > 0) {
          toast.success(`Auto-assigned ${(autoRes as { ok: true; data: number }).data} skills from template`)
        }
        setPendingTemplateSlugs([])
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
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${viewMode === 'cards' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            Cards
          </button>
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

      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => {
            const assignedSlugs = skillMap[a.id] ?? []
            const assignedSkills = skills.filter(s => assignedSlugs.includes(s.slug))
            return (
              <div
                key={a.id}
                className={`bg-neutral-900 border rounded-xl p-4 space-y-3 transition-all duration-150 cursor-pointer hover:border-neutral-600 relative ${
                  a.active ? 'border-neutral-800/60' : 'border-neutral-800/30 opacity-50'
                } ${loadingEditId === a.id ? 'border-violet-800/60 animate-pulse' : ''}`}
                onClick={() => startEdit(a)}
              >
                {/* Header: avatar + name + role */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {a.avatar_url ? (
                      <img src={a.avatar_url} alt="" className="w-8 h-8 object-contain shrink-0" />
                    ) : (
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        a.role === 'orchestrator' ? 'bg-sky-950/60 text-sky-400 border border-sky-800/40' :
                        a.role === 'system' ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40' :
                        'bg-neutral-800 text-neutral-400 border border-neutral-700/40'
                      }`}>
                        {a.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-white text-sm truncate">{a.name}</span>
                        {a.is_default && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 leading-tight shrink-0">default</span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-600 font-mono">{a.slug}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {a.role !== 'system' && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <AgentReadinessBadge input={buildReadinessInput(a)} />
                      </div>
                    )}
                    {a.role === 'orchestrator' && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-sky-950/60 text-sky-400 border border-sky-800/40 font-medium">orchestrator</span>
                    )}
                    {a.role === 'system' && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/40 font-medium">system</span>
                    )}
                    <div onClick={(e) => e.stopPropagation()}>
                      <Toggle
                        checked={a.active}
                        aria-label={`Toggle ${a.name}`}
                        onChange={async () => {
                          const result = await updateAgentAction(a.id, { active: !a.active })
                          if (!result.ok) { toast.error(result.error) } else { mutate() }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Model + Telegram */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neutral-500 font-mono" title={modelFullLabel(a.model)}>{modelDisplayLabel(a.model)}</span>
                  {a.telegram_bot_username && (
                    <button
                      title={`@${a.telegram_bot_username} — click to copy`}
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`@${a.telegram_bot_username}`); toast.success('Copied') }}
                      className="inline-flex items-center gap-1 text-emerald-500 hover:text-emerald-400 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="font-mono">@{a.telegram_bot_username}</span>
                    </button>
                  )}
                </div>

                {/* Skills pills */}
                {assignedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {assignedSkills.map(s => (
                      <span key={s.id} className="px-1.5 py-0.5 text-xs font-medium bg-violet-950/60 text-violet-400 border border-violet-800/40 rounded leading-tight">{s.name}</span>
                    ))}
                  </div>
                )}

                {/* Capabilities */}
                {(a.capabilities?.length > 0 && assignedSkills.length === 0) && (
                  <div className="flex flex-wrap gap-1">
                    {a.capabilities.slice(0, 4).map(c => (
                      <span key={c} className="px-1.5 py-0.5 text-xs font-medium bg-neutral-800 text-neutral-500 border border-neutral-700/40 rounded leading-tight">{c}</span>
                    ))}
                    {a.capabilities.length > 4 && (
                      <span className="text-xs text-neutral-600">+{a.capabilities.length - 4}</span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-neutral-800/40">
                  <span className="text-xs text-neutral-700">{timeAgo(a.updated_at)}</span>
                  <div className="flex items-center gap-1">
                    {!a.is_default && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          const result = await setDefaultAgentAction(a.id)
                          if (!result.ok) { toast.error(result.error) } else { toast.success('Default agent updated'); mutate() }
                        }}
                        title="Set as default"
                        className="p-1 rounded text-neutral-600 hover:text-emerald-400 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    )}
                    {!a.is_default && !a.system_agent && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!confirm('Delete this agent?')) return
                          const result = await deleteAgentAction(a.id)
                          if (!result.ok) { toast.error(result.error) } else { toast.success('Agent deleted'); mutate() }
                        }}
                        title="Delete"
                        className="p-1 rounded text-neutral-600 hover:text-red-400 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {agents.length === 0 && (
            <div className="col-span-full">
              <EmptyState message="No agents yet" />
            </div>
          )}
        </div>
      )}

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
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Avatar or status dot */}
                      {a.avatar_url ? (
                        <img src={a.avatar_url} alt="" className="w-6 h-6 object-contain shrink-0" />
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.active ? (a.role === 'orchestrator' ? 'bg-sky-400' : 'bg-emerald-400') : 'bg-neutral-600'}`} />
                      )}
                      <span className="font-medium text-white text-sm leading-none truncate">{a.name}</span>
                      {a.is_default && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 leading-tight shrink-0">default</span>
                      )}
                      {(() => {
                        const assignedSlugs = skillMap[a.id] ?? []
                        const assignedSkills = skills.filter(s => assignedSlugs.includes(s.slug))
                        if (assignedSkills.length === 0) return null
                        const allNames = assignedSkills.map(s => s.name).join(', ')
                        return (
                          <span className="text-xs text-violet-500 shrink-0" title={allNames}>
                            {assignedSkills.length} skill{assignedSkills.length > 1 ? 's' : ''}
                          </span>
                        )
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-neutral-500 font-mono bg-neutral-800/50 px-2 py-0.5 rounded">{a.slug}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-neutral-500 font-mono" title={modelFullLabel(a.model)}>{modelDisplayLabel(a.model)}</span>
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
                      <button
                        title={`@${a.telegram_bot_username} — click to copy`}
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`@${a.telegram_bot_username}`); toast.success('Copied') }}
                        className="w-2.5 h-2.5 rounded-full bg-emerald-500 hover:ring-2 hover:ring-emerald-500/30 transition-all cursor-pointer"
                      />
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
                      {!a.is_default && !a.system_agent && (
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
        const systemRoots = agents.filter(a => a.role === 'system').map(a => buildNode(a.id))
        const unassigned = agents.filter(a => !assignedAsSubIds.has(a.id) && a.role !== 'orchestrator' && a.role !== 'system')
        const draggingAgent = hierarchyDraggingId ? agentMap.get(hierarchyDraggingId) : null

        function renderNode(node: HNode, depth: number): React.ReactNode {
          const a = node.agent
          const isRoot = depth === 0
          return (
            <div key={a.id} className={isRoot ? 'p-3 pb-0 last:pb-3' : ''}>
              <AgentHierarchyRow
                agent={a}
                depth={depth}
                skills={skillMap[a.id] ?? []}
                onEdit={(id) => { const ag = agentMap.get(id); if (ag) startEdit(ag) }}
                isDraggingAny={hierarchyDraggingId !== null}
              />
              {node.children.length > 0 && (
                <DroppableLevelLine parentId={a.id} isDraggingAny={!!hierarchyDraggingId} isRootChild={isRoot}>
                  {node.children.map(child => renderNode(child, depth + 1))}
                </DroppableLevelLine>
              )}
            </div>
          )
        }

        function handleHierarchyDragEnd(event: DragEndEvent) {
          const { active, over } = event
          // Fallback to last known over-id to handle cursor micro-drift at mouseup
          const overId = over ? String(over.id) : hierarchyLastOverIdRef.current
          hierarchyLastOverIdRef.current = null
          setHierarchyDraggingId(null)
          if (!overId) return
          const agentId = String(active.id)

          // Resolve drop target: level-line drops and root-zone all normalise to an orch ID or 'free'
          const rawTarget = overId
          const targetId = rawTarget === 'root'
            ? 'free'
            : rawTarget.startsWith('lvl:')
              ? rawTarget.slice(4)   // lvl:<orchId> → orchId
              : rawTarget            // direct orchestrator drop

          if (agentId === targetId) return

          const currentOrchId = allAssignments.find(a => a.sub_agent_id === agentId)?.orchestrator_id ?? null
          const isFree = targetId === 'free'

          if (isFree && !currentOrchId) return  // already free
          if (!isFree && currentOrchId === targetId) return  // already there

          // Compute optimistic state immediately
          const nextAssignments: AgentAssignment[] = isFree
            ? allAssignments.filter(a => a.sub_agent_id !== agentId)
            : [
                ...allAssignments.filter(a => a.sub_agent_id !== agentId),
                { orchestrator_id: targetId, sub_agent_id: agentId, instructions: null },
              ]

          void mutateAssignments(
            async () => {
              try {
                // Remove from old orchestrator
                if (currentOrchId) {
                  const remaining = allAssignments
                    .filter(a => a.orchestrator_id === currentOrchId && a.sub_agent_id !== agentId)
                    .map(a => ({ sub_agent_id: a.sub_agent_id, instructions: null }))
                  const r = await setOrchestratorAssignmentsAction(currentOrchId, remaining)
                  if (!r.ok) throw new Error(r.error)
                }
                // Assign to new orchestrator (if not freeing)
                if (!isFree) {
                  const existing = allAssignments
                    .filter(a => a.orchestrator_id === targetId)
                    .map(a => ({ sub_agent_id: a.sub_agent_id, instructions: null }))
                  const r = await setOrchestratorAssignmentsAction(targetId, [...existing, { sub_agent_id: agentId, instructions: null }])
                  if (!r.ok) throw new Error(r.error)
                  toast.success(`Moved to ${agentMap.get(targetId)?.name ?? 'orchestrator'}`)
                } else {
                  toast.success('Moved to root level')
                }
                return { ok: true as const, data: nextAssignments }
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed to update hierarchy')
                throw e
              }
            },
            { optimisticData: { ok: true as const, data: nextAssignments }, revalidate: true, rollbackOnError: true },
          )
        }

        return (
          <DndContext
            sensors={hierarchySensors}
            collisionDetection={pointerWithin}
            onDragStart={({ active }) => setHierarchyDraggingId(String(active.id))}
            onDragMove={({ over }) => { hierarchyLastOverIdRef.current = over ? String(over.id) : null }}
            onDragEnd={handleHierarchyDragEnd}
            onDragCancel={() => { hierarchyLastOverIdRef.current = null; setHierarchyDraggingId(null) }}
          >
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
              <DroppableRootZone isDraggingAny={!!hierarchyDraggingId}>
                {roots.length > 0 && (
                  <div className="py-3 space-y-1">
                    {systemRoots.map(node => renderNode(node, 0))}
                    {roots.map(node => renderNode(node, 0))}
                  </div>
                )}
                {unassigned.length > 0 && (
                  <>
                    {roots.length > 0 && <div className="border-t border-neutral-800/50 mx-4" />}
                    <div className="px-4 py-3">
                      <p className="text-xs text-neutral-600 font-semibold uppercase tracking-wide mb-2">Unassigned</p>
                      <div className="space-y-0.5">
                        {unassigned.map(a => (
                          <AgentHierarchyRow
                            key={a.id} agent={a} depth={-1}
                            skills={skillMap[a.id] ?? []}
                            onEdit={(id) => { const ag = agentMap.get(id); if (ag) startEdit(ag) }}
                            isDraggingAny={!!hierarchyDraggingId}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </DroppableRootZone>
            </div>
            <DragOverlay dropAnimation={null}>
              {draggingAgent ? (
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-neutral-800 border border-violet-600/40 rounded-lg shadow-xl rotate-1 opacity-90 pointer-events-none">
                  <span className={`w-2 h-2 rounded-full ${draggingAgent.active ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                  <span className="text-sm font-medium text-neutral-100">{draggingAgent.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )
      })()}

      {showTemplates && (
        <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/60 bg-neutral-900/80">
            <div>
              <p className="text-sm font-semibold text-white">Agent Templates</p>
              <p className="text-xs text-neutral-500 mt-0.5">Pre-built agents — customize before saving</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Tab toggle */}
              <div className="flex items-center bg-neutral-800/60 border border-neutral-700/60 rounded-lg p-0.5">
                <button
                  onClick={() => setTemplateTab('templates')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${templateTab === 'templates' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
                >Templates</button>
                <button
                  onClick={() => setTemplateTab('packs')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${templateTab === 'packs' ? 'bg-violet-600 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
                >✦ Packs</button>
              </div>
              <button
                onClick={() => setShowTemplates(false)}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all duration-150"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {templateTab === 'templates' ? (
            <div className="p-5">
              {/* Category filter pills */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(['all', 'productivity', 'marketing', 'development', 'sales', 'media', 'data', 'hiring'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setTemplateCategory(cat)}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-all duration-150 capitalize ${
                      templateCategory === cat
                        ? 'bg-violet-600 text-white border-violet-500'
                        : 'bg-neutral-800/40 text-neutral-400 border-neutral-700/60 hover:text-neutral-200 hover:border-neutral-600'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
              {/* Templates grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {AGENT_TEMPLATES.filter(t => templateCategory === 'all' || t.category === templateCategory).map(template => (
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
                            <span className="px-2 py-0.5 text-xs font-medium bg-sky-950/60 text-sky-400 border border-sky-800/40 rounded-full leading-tight">orchestrator</span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-medium bg-neutral-800 text-neutral-500 border border-neutral-700/60 rounded-full leading-tight">agent</span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 leading-relaxed">{template.description}</p>
                        {template.capabilities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.capabilities.slice(0, 3).map(cap => (
                              <span key={cap} className="px-1.5 py-0.5 text-xs font-medium bg-violet-950/60 text-violet-400 border border-violet-800/40 rounded-full leading-tight">{cap}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute inset-0 rounded-xl flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                      <span className="text-xs font-semibold text-violet-400 bg-violet-950/80 border border-violet-800/60 px-2 py-1 rounded-md">Use template →</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Packs tab */
            <div className="p-5">
              <p className="text-xs text-neutral-500 mb-4">Install a pack to instantly create a full team of agents, pre-wired with a hierarchy. Connect your tools and start delegating.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {AGENT_PACKS.map(pack => (
                  <div key={pack.id} className="flex flex-col p-4 bg-neutral-800/30 border border-neutral-800/80 rounded-xl hover:border-neutral-700/80 transition-all duration-150">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl leading-none mt-0.5">{pack.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-100">{pack.name}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{pack.agentCount} agents · {pack.category}</p>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed mb-3 flex-1">{pack.description}</p>
                    {pack.suggestedConnectors.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {pack.suggestedConnectors.map(slug => (
                          <span key={slug} className="px-2 py-0.5 text-xs font-medium bg-neutral-700/40 text-neutral-400 border border-neutral-700/60 rounded-full">{slug}</span>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => handleInstallPack(pack)}
                      disabled={installingPack === pack.id}
                      className="w-full py-2 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all duration-150"
                    >
                      {installingPack === pack.id ? 'Installing…' : 'Install Pack'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <SidePanel
        open={editingId !== null || showAdd}
        onClose={() => { setEditingId(null); setShowAdd(false) }}
        title={editingId ? 'Edit Agent' : 'New Agent'}
        subtitle={editingId ? `/${form.slug}` : undefined}
        width="lg"
        actions={
          <>
            <button
              onClick={() => { setEditingId(null); setShowAdd(false) }}
              className="px-3 py-1.5 text-xs font-medium border border-neutral-800 text-neutral-500 rounded-lg hover:text-white hover:border-neutral-700 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150 disabled:opacity-60 disabled:pointer-events-none"
            >
              {saving && <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
              {saving ? (editingId ? 'Saving…' : 'Creating…') : (editingId ? 'Save' : 'Create')}
            </button>
          </>
        }
      >

            {/* Identity + Instructions */}
            <div className="space-y-6">

              {/* Readiness checklist — only when editing an existing agent */}
              {editingId && (() => {
                const a = agents.find(x => x.id === editingId)
                if (!a || a.role === 'system') return null
                return (
                  <div className="rounded-xl border border-neutral-800/60 bg-neutral-900/40 p-4">
                    <AgentReadinessBadge input={buildReadinessInput(a)} compact={false} />
                  </div>
                )
              })()}

              {/* Identity */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Identity</legend>
                <div className="space-y-4">
                  {/* Row 1: Avatar + Name */}
                  <div className="flex items-start gap-4">
                    <div className="shrink-0">
                      <label className="text-xs text-neutral-500 mb-1.5 block">Avatar</label>
                      <AvatarPicker value={form.avatar_url} onChange={v => setForm(prev => ({ ...prev, avatar_url: v }))} />
                    </div>
                    <div className="flex-1 min-w-0">
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
                  </div>
                  {/* Row 2: Model + Role */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-neutral-500 mb-1.5 block">Model</label>
                      <ModelPicker value={form.model} onChange={v => updateForm('model', v)} configuredProviders={configuredProviders} operatorProviders={operatorProviders} />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 mb-1.5 block">Role</label>
                      <RolePicker value={form.role} onChange={v => updateForm('role', v)} />
                    </div>
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

                {/* Team block preview — only after assignments loaded */}
                {form.role === 'orchestrator' && !loadingEditId && (() => {
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

            {/* Loading skeleton for all assignment sections */}
            {loadingEditId && (
              <div className="space-y-4 pt-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 rounded animate-pulse bg-neutral-800/60" style={{ width: `${50 + i * 10}px` }} />
                    <div className="h-9 bg-neutral-800/40 rounded-lg animate-pulse" />
                  </div>
                ))}
              </div>
            )}

            {/* Skills, Orchestrator, Team, Capabilities, Approval — all depend on loaded data */}
            {!loadingEditId && (<>
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

                        {/* Expanded: setup callout + operations + content preview */}
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
                            {/* Operations: per-tool enable/disable + approval toggles */}
                            {(skill.operations ?? []).length > 0 && (
                              <div className="space-y-2">
                                {(() => {
                                  const currentEnabled = skillEnabledOps[skill.id]
                                  const allOps = (skill.operations ?? []).map(op => op.slug)
                                  const enabledCount = currentEnabled === null || currentEnabled === undefined
                                    ? allOps.length
                                    : currentEnabled.length
                                  const allChecked = currentEnabled === null || currentEnabled === undefined || currentEnabled.length === allOps.length
                                  return (
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs font-medium text-neutral-600">
                                        Enabled tools <span className="text-neutral-700">({enabledCount}/{allOps.length})</span>
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSkillEnabledOps(prev => ({
                                            ...prev,
                                            [skill.id]: allChecked ? [] : null,
                                          }))
                                        }}
                                        className="text-[11px] text-neutral-500 hover:text-neutral-300"
                                      >
                                        {allChecked ? 'Uncheck all' : 'Enable all'}
                                      </button>
                                    </div>
                                  )
                                })()}
                                <p className="text-[11px] text-neutral-700 leading-snug">
                                  Uncheck tools this agent shouldn&apos;t use. Fewer tools = smaller prompt + less chance the agent picks the wrong one.
                                </p>
                                <div className="grid grid-cols-1 gap-1.5">
                                  {(skill.operations ?? []).map(op => {
                                    const currentEnabled = skillEnabledOps[skill.id]
                                    const isEnabled = currentEnabled === null || currentEnabled === undefined
                                      ? true
                                      : currentEnabled.includes(op.slug)
                                    const tone =
                                      op.risk === 'read' ? 'text-emerald-400' :
                                      op.risk === 'write' ? 'text-amber-400' :
                                      'text-red-400'
                                    return (
                                      <label
                                        key={op.slug}
                                        className="flex items-start gap-2 cursor-pointer group px-1 py-0.5 rounded hover:bg-neutral-900/40"
                                        title={op.description ? `${op.slug}\n\n${op.description}` : op.slug}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isEnabled}
                                          onChange={() => {
                                            setSkillEnabledOps(prev => {
                                              const current = prev[skill.id]
                                              const allOps = (skill.operations ?? []).map(o => o.slug)
                                              const baseList: string[] = current === null || current === undefined ? [...allOps] : [...current]
                                              let next: string[] | null
                                              if (isEnabled) {
                                                next = baseList.filter(s => s !== op.slug)
                                              } else {
                                                next = baseList.includes(op.slug) ? baseList : [...baseList, op.slug]
                                              }
                                              if (next.length === allOps.length && allOps.every(s => next!.includes(s))) {
                                                next = null
                                              }
                                              return { ...prev, [skill.id]: next }
                                            })
                                          }}
                                          className="rounded border-neutral-700 bg-neutral-800 accent-emerald-500 shrink-0 cursor-pointer mt-0.5"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className={`text-xs font-mono ${isEnabled ? tone : 'text-neutral-700 line-through'}`}>
                                              {op.name}
                                            </span>
                                            {op.risk === 'destructive' && <span className="text-[10px] text-red-500/60">⚠</span>}
                                            {op.description && (
                                              <span className="text-[10px] text-neutral-600 group-hover:text-neutral-400 transition-colors cursor-help" title={op.description}>ⓘ</span>
                                            )}
                                          </div>
                                          {op.description && (
                                            <p className={`text-[10px] leading-snug mt-0.5 ${isEnabled ? 'text-neutral-600' : 'text-neutral-700'}`}>
                                              {op.description}
                                            </p>
                                          )}
                                          <code className="text-[9px] text-neutral-700 font-mono block">{op.slug}</code>
                                        </div>
                                      </label>
                                    )
                                  })}
                                </div>
                                {/* Approval toggles for write/destructive only */}
                                {(skill.operations ?? []).filter(op => op.risk !== 'read').length > 0 && (
                                  <div className="space-y-1 pt-1">
                                    <p className="text-xs text-neutral-600">Require human approval:</p>
                                    <p className="text-xs text-amber-500/70">Enabling this gates all outbound web requests for this agent.</p>
                                    {(skill.operations ?? []).filter(op => op.risk !== 'read').map(op => {
                                      const override = skillApprovalOverrides[skill.id]?.[op.slug]
                                      const isChecked = override !== undefined ? override : op.requires_approval
                                      return (
                                        <label key={op.slug} className="flex items-center gap-2 cursor-pointer group">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              setSkillApprovalOverrides(prev => ({
                                                ...prev,
                                                [skill.id]: { ...(prev[skill.id] ?? {}), [op.slug]: !isChecked },
                                              }))
                                            }}
                                            className="rounded border-neutral-700 bg-neutral-800 accent-amber-500 shrink-0 cursor-pointer"
                                          />
                                          <span className={`text-xs transition-colors ${isChecked ? 'text-amber-400' : 'text-neutral-600 group-hover:text-neutral-400'}`}>
                                            {op.name}
                                          </span>
                                          {op.risk === 'destructive' && (
                                            <span className="text-xs text-red-500/60">⚠</span>
                                          )}
                                        </label>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Adapter mode toggle */}
                            <div className="pt-1 border-t border-neutral-800/30">
                              <label className="flex items-start gap-2.5 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={skillCustomInstructions[skill.id] ?? false}
                                  onChange={() => {
                                    setSkillCustomInstructions(prev => ({
                                      ...prev,
                                      [skill.id]: !(prev[skill.id] ?? false),
                                    }))
                                  }}
                                  className="rounded border-neutral-700 bg-neutral-800 accent-violet-500 shrink-0 mt-0.5 cursor-pointer"
                                />
                                <div>
                                  <p className="text-xs font-medium text-neutral-400 group-hover:text-neutral-300 transition-colors">
                                    Use custom instructions
                                  </p>
                                  <p className="text-xs text-neutral-700 mt-0.5 leading-relaxed">
                                    When enabled, the agent uses the markdown skill document instead of typed tools. Useful if you&apos;ve customised the skill instructions.
                                  </p>
                                </div>
                              </label>
                            </div>

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

              {/* Orchestrator — available for all roles, including orchestrators (sub-orchestrator support) */}
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

              {/* Assigned agents (orchestrators only) */}
              {form.role === 'orchestrator' && (
                <section aria-labelledby="section-team" className="border-t border-neutral-800/50 pt-5">
                  <h3 id="section-team" className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Team</h3>
                  <p className="text-xs text-neutral-600 mb-2.5">Leave unchecked to allow all workspace agents.</p>
                  {agents.filter(a => a.id !== editingId).length === 0 ? (
                    <p className="text-xs text-neutral-600">No other agents yet.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {agents.filter(a => a.id !== editingId && a.role !== 'system').map(a => {
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
            </>)}

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
                  {editingId && form.telegram_bot_token && (() => {
                    const isActive = !!agents.find(a => a.id === editingId)?.telegram_webhook_url
                    return (
                      <div className="flex flex-wrap items-center gap-2">
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

          {/* Memories section — list + edit/delete */}
          {editingId && (() => {
            const a = agents.find(x => x.id === editingId)
            if (!a || a.role === 'system') return null
            return (
              <div className="space-y-6 mt-6">
                <fieldset>
                  <legend className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Agent memories</legend>
                  <p className="text-xs text-neutral-600 mb-3 leading-snug">
                    Persistent facts this agent knows — loaded automatically into every run. Click any memory to edit or remove it. Add new ones from the Memories page.
                  </p>
                  <AgentMemoriesList agentId={a.id} onChanged={() => mutateMemoryCounts()} />
                </fieldset>
              </div>
            )
          })()}

      </SidePanel>
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
5. When a user corrects a value (email address, URL, ID, name), always re-state the corrected value **verbatim** in your delegation task. Never assume a sub-agent will infer the correction from context.
6. When a user confirms an action (e.g. "send it", "yes", "go ahead"), include **"The user has already confirmed this action — proceed immediately without asking again"** in your delegation task.
6. When a user confirms an action (e.g. "send it", "yes", "go ahead"), include **"The user has already confirmed this action — proceed immediately without asking again"** in your delegation task.
7. If a sub-agent returns a question or asks for confirmation, do NOT relay it to the user verbatim. Resolve it yourself using context from the conversation, or re-delegate with the missing information explicitly included.
8. Save important outcomes and learned rules to memory for future sessions
9. Be transparent about which agents you consulted
10. For multi-step tasks, break them down and delegate sequentially, passing results between steps`

const DEFAULT_PERSONALITY = `You are a helpful assistant. You are thorough, accurate, and concise. When given a task, you break it down into clear steps and execute them carefully.`
