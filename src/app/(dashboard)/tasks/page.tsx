'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  getTasksAction,
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
  startTaskAction,
  getAgentsAction,
  updateAgentAction,
} from '@/lib/actions'
import { TASK_TEMPLATES, TASK_TEMPLATE_CATEGORIES } from '@/lib/task-templates'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/components/AuthProvider'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import CardSkeleton from '@/components/skeletons/CardSkeleton'
import Badge from '@/components/Badge'
import { toast } from 'sonner'

type Agent = { id: string; name: string; slug: string; role: string; task_context_template: string | null }

type Task = {
  id: string
  orchestrator_id: string
  created_by_agent_id: string | null
  assigned_agent_id: string | null
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done' | 'cancelled' | 'blocked'
  depends_on: string[] | null
  result: string | null
  priority: 'low' | 'medium' | 'high'
  job_id: string | null
  input_tokens: number | null
  output_tokens: number | null
  cost_usd: number | null
  created_at: string
}

const COLUMNS: {
  key: Task['status']
  label: string
  topBorder: string
  pillBg: string
  pillText: string
  emptyText: string
}[] = [
  {
    key: 'blocked',
    label: 'Blocked',
    topBorder: 'border-t-neutral-800',
    pillBg: 'bg-neutral-900',
    pillText: 'text-neutral-600',
    emptyText: 'No blocked tasks',
  },
  {
    key: 'todo',
    label: 'To Do',
    topBorder: 'border-t-neutral-700',
    pillBg: 'bg-neutral-800',
    pillText: 'text-neutral-400',
    emptyText: 'Nothing queued yet',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    topBorder: 'border-t-amber-500/60',
    pillBg: 'bg-amber-500/15',
    pillText: 'text-amber-400',
    emptyText: 'No active tasks',
  },
  {
    key: 'done',
    label: 'Done',
    topBorder: 'border-t-emerald-500/60',
    pillBg: 'bg-emerald-500/15',
    pillText: 'text-emerald-400',
    emptyText: 'Nothing completed yet',
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    topBorder: 'border-t-neutral-800',
    pillBg: 'bg-neutral-900',
    pillText: 'text-neutral-600',
    emptyText: 'No cancelled tasks',
  },
]

const PRIORITY_BADGE: Record<Task['priority'], 'neutral' | 'amber' | 'red'> = {
  low: 'neutral',
  medium: 'amber',
  high: 'red',
}

// Left border strip color per priority
const PRIORITY_STRIP: Record<Task['priority'], string> = {
  low: 'border-l-neutral-600',
  medium: 'border-l-amber-500',
  high: 'border-l-red-500',
}

const EMPTY_FORM = {
  title: '',
  description: '',
  priority: 'medium' as Task['priority'],
}

// ─── TaskCardContent ──────────────────────────────────────────────────────────
// Shared card body — rendered both on the board and inside the DragOverlay.

interface TaskCardContentProps {
  task: Task
  agentMap?: Map<string, Agent>
  editingId?: string | null
  starting?: string | null
  onStart?: (task: Task) => void
  onEdit?: (task: Task) => void
  onStatusChange?: (id: string, status: Task['status']) => void
  onDelete?: (id: string) => void
  /** When true the action buttons are hidden (overlay use-case). */
  overlay?: boolean
}

function TaskCardContent({
  task,
  agentMap,
  editingId,
  starting,
  onStart,
  onEdit,
  onStatusChange,
  onDelete,
  overlay = false,
}: TaskCardContentProps) {
  const creatorName = task.created_by_agent_id && agentMap?.get(task.created_by_agent_id)?.name
  const assigneeName = task.assigned_agent_id && agentMap?.get(task.assigned_agent_id)?.name

  return (
    <>
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white leading-snug flex-1">{task.title}</p>
        <Badge label={task.priority} color={PRIORITY_BADGE[task.priority]} className="shrink-0 mt-0.5" />
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Agent info row */}
      {(creatorName || assigneeName) && (
        <div className="flex items-center gap-2 flex-wrap">
          {creatorName && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-sky-950/50 border border-sky-900/30 text-sky-400 font-mono">
              by {creatorName}
            </span>
          )}
          {assigneeName && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-900/30 text-emerald-400 font-mono">
              {assigneeName}
            </span>
          )}
        </div>
      )}

      {/* Token/cost info for completed tasks */}
      {task.status === 'done' && (task.input_tokens || task.output_tokens) && (
        <div className="flex items-center gap-2 text-xs text-neutral-600 font-mono">
          <span>{((task.input_tokens || 0) + (task.output_tokens || 0)).toLocaleString()} tokens</span>
          {task.cost_usd && task.cost_usd > 0 && <span>${task.cost_usd.toFixed(4)}</span>}
        </div>
      )}

      {/* Job chip */}
      {task.job_id && (
        <a
          href="/jobs"
          className="self-start text-xs font-mono bg-violet-950/50 text-violet-400 px-2 py-0.5 rounded border border-violet-900/40 hover:bg-violet-900/40 hover:text-violet-300 transition-colors duration-150"
        >
          job:{task.job_id.slice(0, 8)}
        </a>
      )}

      {/* Actions row — hidden in overlay */}
      {!overlay && (
        <div className="flex items-center gap-1 pt-2 border-t border-neutral-800/50 flex-wrap">
          {task.status === 'todo' && (
            <button
              onClick={() => onStart?.(task)}
              disabled={starting === task.id}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-md transition-all duration-150 disabled:opacity-50"
            >
              {starting === task.id ? 'Starting…' : 'Start →'}
            </button>
          )}
          {task.status === 'in_progress' && (
            <button
              onClick={() => onStatusChange?.(task.id, 'done')}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-md transition-all duration-150"
            >
              Mark done
            </button>
          )}
          <button
            onClick={() => onEdit?.(task)}
            className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white hover:bg-neutral-700/50 rounded-md transition-all duration-150"
          >
            Edit
          </button>
          {task.status !== 'cancelled' && task.status !== 'done' && (
            <button
              onClick={() => onStatusChange?.(task.id, 'cancelled')}
              className="px-2.5 py-1 text-xs text-neutral-600 hover:text-neutral-400 hover:bg-neutral-800/60 rounded-md transition-all duration-150"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => onDelete?.(task.id)}
            className="px-2.5 py-1 text-xs text-neutral-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all duration-150 ml-auto"
          >
            Delete
          </button>
        </div>
      )}
    </>
  )
}

// ─── DraggableTaskCard ────────────────────────────────────────────────────────

interface DraggableTaskCardProps extends Omit<TaskCardContentProps, 'overlay'> {
  task: Task
  agentMap?: Map<string, Agent>
}

function DraggableTaskCard(props: DraggableTaskCardProps) {
  const { task, editingId } = props
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={[
        'group bg-neutral-900 border border-l-4 border-neutral-800/60 rounded-xl p-4 flex flex-col gap-3',
        'transition-all duration-150 hover:border-neutral-700 hover:bg-neutral-800/30',
        PRIORITY_STRIP[task.priority],
        editingId === task.id ? 'ring-1 ring-violet-500/50 border-neutral-700' : '',
        isDragging ? 'opacity-30 cursor-grabbing' : 'cursor-grab',
      ].join(' ')}
    >
      {/* Drag handle is the whole card header — attach listeners there so buttons still work */}
      <div {...listeners} className="flex flex-col gap-3 cursor-grab active:cursor-grabbing">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-white leading-snug flex-1">{task.title}</p>
          <Badge label={task.priority} color={PRIORITY_BADGE[task.priority]} className="shrink-0 mt-0.5" />
        </div>
        {task.description && (
          <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">
            {task.description}
          </p>
        )}
        {/* Agent info */}
        {(() => {
          const creator = task.created_by_agent_id && props.agentMap?.get(task.created_by_agent_id)
          const assignee = task.assigned_agent_id && props.agentMap?.get(task.assigned_agent_id)
          return (creator || assignee) ? (
            <div className="flex items-center gap-2 flex-wrap">
              {creator && <span className="text-xs px-1.5 py-0.5 rounded bg-sky-950/50 border border-sky-900/30 text-sky-400 font-mono">by {creator.name}</span>}
              {assignee && <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-900/30 text-emerald-400 font-mono">{assignee.name}</span>}
            </div>
          ) : null
        })()}
        {/* Token/cost for done tasks */}
        {task.status === 'done' && (task.input_tokens || task.output_tokens) ? (
          <div className="flex items-center gap-2 text-xs text-neutral-600 font-mono">
            <span>{((task.input_tokens || 0) + (task.output_tokens || 0)).toLocaleString()} tokens</span>
            {task.cost_usd && task.cost_usd > 0 && <span>${Number(task.cost_usd).toFixed(4)}</span>}
          </div>
        ) : null}
        {task.job_id && (
          <span className="self-start text-xs font-mono bg-violet-950/50 text-violet-400 px-2 py-0.5 rounded border border-violet-900/40">
            job:{task.job_id.slice(0, 8)}
          </span>
        )}
      </div>

      {/* Actions — not part of drag listeners so clicks still fire */}
      <div className="flex items-center gap-1 pt-2 border-t border-neutral-800/50 flex-wrap">
        {task.status === 'todo' && (
          <button
            onClick={() => props.onStart?.(task)}
            disabled={props.starting === task.id}
            className="px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-md transition-all duration-150 disabled:opacity-50"
          >
            {props.starting === task.id ? 'Starting…' : 'Start →'}
          </button>
        )}
        {task.status === 'in_progress' && (
          <button
            onClick={() => props.onStatusChange?.(task.id, 'done')}
            className="px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-md transition-all duration-150"
          >
            Mark done
          </button>
        )}
        <button
          onClick={() => props.onEdit?.(task)}
          className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white hover:bg-neutral-700/50 rounded-md transition-all duration-150"
        >
          Edit
        </button>
        {task.status !== 'cancelled' && task.status !== 'done' && (
          <button
            onClick={() => props.onStatusChange?.(task.id, 'cancelled')}
            className="px-2.5 py-1 text-xs text-neutral-600 hover:text-neutral-400 hover:bg-neutral-800/60 rounded-md transition-all duration-150"
          >
            Cancel
          </button>
        )}
        <button
          onClick={() => props.onDelete?.(task.id)}
          className="px-2.5 py-1 text-xs text-neutral-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all duration-150 ml-auto"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

// ─── DroppableColumn ──────────────────────────────────────────────────────────

interface DroppableColumnProps {
  col: (typeof COLUMNS)[number]
  colTasks: Task[]
  agentMap: Map<string, Agent>
  editingId: string | null
  starting: string | null
  onStart: (task: Task) => void
  onEdit: (task: Task) => void
  onStatusChange: (id: string, status: Task['status']) => void
  onDelete: (id: string) => void
}

function DroppableColumn({
  col,
  colTasks,
  agentMap,
  editingId,
  starting,
  onStart,
  onEdit,
  onStatusChange,
  onDelete,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key })

  return (
    <div className="flex flex-col">
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl border-t-2 border-x border-neutral-800/40 bg-neutral-900/80 ${col.topBorder}`}>
        <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400">
          {col.label}
        </span>
        <span
          className={`inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-bold tabular-nums ${col.pillBg} ${col.pillText}`}
        >
          {colTasks.length}
        </span>
      </div>

      {/* Column lane */}
      <div
        ref={setNodeRef}
        className={[
          'flex flex-col gap-2.5 rounded-b-xl p-3 min-h-[280px] bg-neutral-950/30 border-x border-b border-neutral-800/40',
          'transition-colors duration-150',
          isOver ? 'bg-neutral-900/50 ring-1 ring-neutral-600/30' : '',
        ].join(' ')}
      >
        {/* Empty state */}
        {colTasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-8">
            <div
              className={[
                'flex flex-col items-center gap-2 border border-dashed rounded-xl px-5 py-6 w-full transition-colors duration-150',
                isOver ? 'border-neutral-600' : 'border-neutral-800',
              ].join(' ')}
            >
              <span className={`text-lg leading-none transition-colors duration-150 ${isOver ? 'text-neutral-500' : 'text-neutral-700'}`}>+</span>
              <p className={`text-xs transition-colors duration-150 ${isOver ? 'text-neutral-500' : 'text-neutral-700'}`}>{col.emptyText}</p>
            </div>
          </div>
        )}

        {/* Task cards */}
        {colTasks.map(task => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            agentMap={agentMap}
            editingId={editingId}
            starting={starting}
            onStart={onStart}
            onEdit={onEdit}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

  const [orchestratorId, setOrchestratorId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)
  const [showContextEditor, setShowContextEditor] = useState(false)
  const [contextTemplate, setContextTemplate] = useState<string>('')
  const [savingContext, setSavingContext] = useState(false)

  // DnD state
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require a 5px move before activating — avoids swallowing button clicks
        distance: 5,
      },
    }),
  )

  const { data: agentsRaw, isLoading: agentsLoading } = useData(['agents', eid], getAgentsAction)
  const allAgents = (agentsRaw ?? []) as Agent[]
  const orchestrators = allAgents.filter(a => a.role === 'orchestrator')
  const agentMap = new Map(allAgents.map(a => [a.id, a]))

  // Auto-select "all" by default
  useEffect(() => {
    if (!orchestratorId && !agentsLoading) {
      setOrchestratorId('__all__')
    }
  }, [orchestratorId, agentsLoading])

  // Reset editor visibility when the selected orchestrator changes
  useEffect(() => {
    setShowContextEditor(false)
  }, [orchestratorId])

  // Sync context template text whenever orchestrator data or selection changes
  useEffect(() => {
    const orch = orchestrators.find(o => o.id === orchestratorId)
    setContextTemplate(orch?.task_context_template ?? '')
  // orchestrators is re-created each render; intentionally omit from deps to avoid
  // overwriting in-flight edits — orchestratorId change above handles reset
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orchestratorId])

  const tasksKey = orchestratorId ? (['tasks', orchestratorId] as unknown[]) : ('tasks:none' as string)
  const { data: tasksRaw = [], isLoading, mutate } = useData(
    tasksKey,
    orchestratorId ? () => getTasksAction(orchestratorId === '__all__' ? undefined : orchestratorId) : async () => [],
  )
  const tasks = tasksRaw as Task[]

  // ── DnD handlers ────────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find(t => t.id === event.active.id)
    setDraggedTask(task ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggedTask(null)
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const targetStatus = over.id as Task['status']
    const task = tasks.find(t => t.id === taskId)

    if (!task || task.status === targetStatus) return

    // Optimistic update — swap status in cached data before the server round-trip
    mutate(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prev: any) =>
        ((prev ?? []) as Task[]).map(t => (t.id === taskId ? { ...t, status: targetStatus } : t)),
      { revalidate: false },
    )

    await handleStatusChange(taskId, targetStatus)
  }

  // ── Task actions ─────────────────────────────────────────────────────────────

  async function saveContextTemplate() {
    if (!orchestratorId) return
    setSavingContext(true)
    try {
      const result = await updateAgentAction(orchestratorId, {
        task_context_template: contextTemplate.trim() || null,
      })
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Task context saved')
      setShowContextEditor(false)
    } finally {
      setSavingContext(false)
    }
  }

  function startAdd() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setShowAdd(true)
  }

  function startEdit(t: Task) {
    setEditingId(t.id)
    setShowAdd(false)
    setForm({ title: t.title, description: t.description ?? '', priority: t.priority })
  }

  function cancelForm() {
    setShowAdd(false)
    setEditingId(null)
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (!orchestratorId) { toast.error('Select an orchestrator first'); return }
    setSaving(true)
    try {
      if (editingId) {
        const result = await updateTaskAction(editingId, {
          title: form.title.trim(),
          description: form.description.trim() || null,
          priority: form.priority,
        })
        if (!result.ok) { toast.error(result.error); return }
        toast.success('Task updated')
        setEditingId(null)
      } else {
        const result = await createTaskAction({
          orchestrator_id: orchestratorId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          priority: form.priority,
        })
        if (!result.ok) { toast.error(result.error); return }
        toast.success('Task created')
        setShowAdd(false)
      }
      mutate()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this task?')) return
    const result = await deleteTaskAction(id)
    if (!result.ok) { toast.error(result.error); return }
    toast.success('Task deleted')
    mutate()
  }

  async function handleStart(task: Task) {
    setStarting(task.id)
    try {
      const result = await startTaskAction(task.id)
      if (!result.ok) { toast.error(result.error); return }
      if (result.data.job_id) {
        toast.success('Task started — job created')
      } else {
        toast.success('Task marked in progress')
      }
      mutate()
    } finally {
      setStarting(null)
    }
  }

  async function handleStatusChange(id: string, status: Task['status']) {
    const result = await updateTaskAction(id, { status })
    if (!result.ok) { toast.error(result.error); return }
    mutate()
  }

  const isFormOpen = showAdd || editingId !== null
  const totalCount = tasks.length

  if (agentsLoading || (isLoading && orchestratorId)) return <CardSkeleton />

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Tasks" count={totalCount}>
        <button
          onClick={startAdd}
          disabled={!orchestratorId}
          className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-full hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          + New task
        </button>
      </PageHeader>

      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={orchestratorId ?? '__all__'}
            onChange={e => { setOrchestratorId(e.target.value); setShowAdd(false); setEditingId(null) }}
            className="bg-neutral-900 border border-neutral-800/60 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all duration-150 cursor-pointer"
          >
            <option value="__all__">All orchestrators</option>
            {orchestrators.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          {tasks.length > 0 && (
            <span className="text-xs text-neutral-600 font-mono">
              {tasks.filter(t => t.status === 'done').length}/{tasks.length} done
            </span>
          )}
        </div>
      </div>

      {/* Task context template — what the orchestrator receives with every task */}
      {orchestratorId && (
        <div className="border border-neutral-800/50 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowContextEditor(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs hover:bg-neutral-800/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-500 uppercase tracking-wide">Instructions sent to orchestrator</span>
              {contextTemplate && (
                <span className="px-1.5 py-px bg-emerald-950/50 text-emerald-500 border border-emerald-800/30 rounded text-xs">custom</span>
              )}
            </div>
            <span className="text-neutral-700">{showContextEditor ? '▲' : '▼'}</span>
          </button>

          {showContextEditor && (
            <div className="border-t border-neutral-800/50 p-4 space-y-3">
              <p className="text-xs text-neutral-600 leading-relaxed">
                This text is appended to every task sent to this orchestrator. Leave blank to use the default:
                <em className="text-neutral-500 block mt-1">&ldquo;When you finish this task, briefly summarize what you accomplished.&rdquo;</em>
              </p>
              <textarea
                value={contextTemplate}
                onChange={e => setContextTemplate(e.target.value)}
                placeholder="e.g. Break this task into subtasks, delegate each to a specialist, then compile results…"
                rows={5}
                className="w-full bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-2.5 text-xs text-neutral-200 font-mono leading-relaxed focus:border-neutral-600 focus:outline-none transition-colors resize-y"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveContextTemplate}
                  disabled={savingContext}
                  className="px-4 py-1.5 text-xs font-semibold bg-white text-black rounded-full hover:bg-neutral-200 active:scale-[0.97] transition-all duration-150 disabled:opacity-50"
                >
                  {savingContext ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!orchestratorId) return
                    setContextTemplate('')
                    const res = await updateAgentAction(orchestratorId, { task_context_template: null })
                    if (res.ok) toast.success('Reset to default')
                    else toast.error('Could not reset')
                  }}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
                >
                  Reset to default
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kanban board */}
      {orchestratorId && (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {COLUMNS.map(col => (
              <DroppableColumn
                key={col.key}
                col={col}
                colTasks={tasks.filter(t => t.status === col.key)}
                agentMap={agentMap}
                editingId={editingId}
                starting={starting}
                onStart={handleStart}
                onEdit={startEdit}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {draggedTask ? (
              <div
                className={[
                  'bg-neutral-900 border border-l-4 border-neutral-700 rounded-xl p-4 flex flex-col gap-3',
                  'opacity-90 shadow-2xl shadow-black/60 rotate-1',
                  PRIORITY_STRIP[draggedTask.priority],
                ].join(' ')}
              >
                <TaskCardContent task={draggedTask} overlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {orchestratorId && tasks.length === 0 && !isFormOpen && (
        <EmptyState message="No tasks yet — create one to get started" />
      )}

      {/* Add / Edit modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={cancelForm}>
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl shadow-black/60 mx-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-semibold text-white">
                  {editingId ? 'Edit task' : 'New task'}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {editingId ? 'Update task details below' : 'Add a task for the orchestrator to execute'}
                </p>
              </div>
              <button
                onClick={cancelForm}
                className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-all duration-150 text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Form fields */}
            <div className="space-y-4">
              {!editingId && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">
                    Load from template
                  </label>
                  <select
                    defaultValue=""
                    onChange={e => {
                      const tpl = TASK_TEMPLATES.find(t => t.id === e.target.value)
                      if (tpl) setForm({ title: tpl.title, description: tpl.description, priority: tpl.priority })
                    }}
                    className="w-full bg-neutral-800/50 border border-neutral-700/60 rounded-lg px-4 py-2.5 text-sm text-white focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all duration-150 cursor-pointer"
                  >
                    <option value="" disabled>— choose a template —</option>
                    {TASK_TEMPLATE_CATEGORIES.map(cat => (
                      <optgroup key={cat} label={cat}>
                        {TASK_TEMPLATES.filter(t => t.category === cat).map(t => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">
                  Title
                </label>
                <input
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Review unread emails"
                  autoFocus
                  className="w-full bg-neutral-800/50 border border-neutral-700/60 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all duration-150"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">
                  Description <span className="text-neutral-700 normal-case tracking-normal font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional context or instructions for the orchestrator…"
                  rows={3}
                  className="w-full bg-neutral-800/50 border border-neutral-700/60 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all duration-150 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">
                  Priority
                </label>
                <select
                  value={form.priority}
                  onChange={e => setForm(prev => ({ ...prev, priority: e.target.value as Task['priority'] }))}
                  className="w-full bg-neutral-800/50 border border-neutral-700/60 rounded-lg px-4 py-2.5 text-sm text-white focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all duration-150 cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center gap-2 mt-6 pt-5 border-t border-neutral-800">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 text-xs font-semibold bg-white text-black rounded-full hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create task'}
              </button>
              <button
                onClick={cancelForm}
                className="px-5 py-2.5 text-xs font-medium border border-neutral-700 text-neutral-400 rounded-full hover:text-white hover:border-neutral-600 transition-all duration-150"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
