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
  clearDoneTasksAction,
  startTaskAction,
  getAgentsAction,
  updateAgentAction,
  getSchedulesAction,
  triggerCronAction,
  createScheduleAction,
  updateScheduleAction,
  deleteScheduleAction,
  runScheduleNowAction,
} from '@/lib/actions'
import { TASK_TEMPLATES, TASK_TEMPLATE_CATEGORIES } from '@/lib/task-templates'
import { useData } from '@/hooks/useData'
import { timeAgo } from '@/lib/utils'
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
  updated_at?: string | null
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

// ─── Recurrence helpers ───────────────────────────────────────────────────────
// The runner (api/cron.py::_calculate_next_run) supports these patterns:
//   */N * * * *  — every N minutes
//   0 */N * * *  — every N hours
//   0 H * * *    — daily at hour H
//   0 H * * D    — weekly on day D at hour H
// Anything else falls back to "+1 hour from now".
//
// The create modal exposes a simple picker (Every N hours | Every N days) —
// the functions below translate between that picker state and the raw cron_expr,
// so users never have to touch cron syntax unless they open the advanced view.

type RecurrenceUnit = 'hours' | 'days'
type Recurrence = { n: number; unit: RecurrenceUnit }

function recurrenceToCron({ n, unit }: Recurrence): string {
  const hours = Math.max(1, Math.min(23, Math.floor(Number(n) || 1)))
  const days = Math.max(1, Math.min(30, Math.floor(Number(n) || 1)))
  if (unit === 'hours') return `0 */${hours} * * *`
  if (days === 1) return '0 9 * * *' // daily at 09:00 local-as-UTC (runner uses UTC)
  return `0 9 */${days} * *`
}

function cronToRecurrence(cron: string | null | undefined): Recurrence | null {
  if (!cron) return null
  const trimmed = cron.trim()
  const hourMatch = trimmed.match(/^0\s+\*\/(\d+)\s+\*\s+\*\s+\*$/)
  if (hourMatch) return { n: parseInt(hourMatch[1], 10), unit: 'hours' }
  const dailyMatch = trimmed.match(/^0\s+(\d+)\s+\*\s+\*\s+\*$/)
  if (dailyMatch) return { n: 1, unit: 'days' }
  const everyNDays = trimmed.match(/^0\s+(\d+)\s+\*\/(\d+)\s+\*\s+\*$/)
  if (everyNDays) return { n: parseInt(everyNDays[2], 10), unit: 'days' }
  return null
}

function formatRecurrence(cron: string | null | undefined): string {
  const r = cronToRecurrence(cron)
  if (!r) return cron || 'custom schedule'
  if (r.unit === 'hours') return r.n === 1 ? 'every hour' : `every ${r.n} hours`
  if (r.n === 1) return 'daily'
  return `every ${r.n} days`
}

// Schedule row shape as returned by getSchedulesAction. Shared between the
// page state and the RoutinesColumn component.
type Schedule = {
  id: string
  name: string
  type: string
  cron_expr: string
  active: boolean
  agent_id: string
  task: string | null
  objectives: string | null
  chat_id: string | null
  agents: { name: string } | null
  last_run: string | null
  last_status: string | null
  next_run?: string | null
  created_at?: string
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

  // Relative time for the card footer — updated_at if it differs from created_at,
  // otherwise just created_at. Users care about "when last touched" more than the exact ISO.
  const rawUpdatedAt = task.updated_at
  const updatedAt = rawUpdatedAt && rawUpdatedAt !== task.created_at ? rawUpdatedAt : null
  const timestampTitle = `Created ${new Date(task.created_at).toLocaleString()}${updatedAt ? `\nUpdated ${new Date(updatedAt).toLocaleString()}` : ''}`
  const timestampLabel = updatedAt
    ? `updated ${timeAgo(updatedAt)}`
    : `created ${timeAgo(task.created_at)}`

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

      {/* Timestamp */}
      <p
        className="text-[10px] text-neutral-600 font-mono"
        title={timestampTitle}
      >
        {timestampLabel}
      </p>

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
  onClearDone?: () => void
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
  onClearDone,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key })

  return (
    <div className="flex flex-col">
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl border-t-2 border-x border-neutral-800/40 bg-neutral-900/80 ${col.topBorder}`}>
        <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400">
          {col.label}
        </span>
        <div className="flex items-center gap-1.5">
          {col.key === 'done' && colTasks.length > 0 && onClearDone && (
            <button
              onClick={onClearDone}
              className="text-[11px] px-2 py-0.5 rounded-md text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Clear
            </button>
          )}
          <span
            className={`inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-bold tabular-nums ${col.pillBg} ${col.pillText}`}
          >
            {colTasks.length}
          </span>
        </div>
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

// ─── RoutinesColumn ───────────────────────────────────────────────────────────
// Board column showing the user's active cron schedules (routines). Different
// data shape from tasks — schedules don't have status/drag-and-drop semantics,
// but the column visually matches the others for consistency.

interface RoutinesColumnProps {
  routines: Schedule[]
  agentMap: Map<string, Agent>
  onCreate: () => void
  onEdit: (r: Schedule) => void
  onToggle: (r: Schedule) => void
  onRunNow: (r: Schedule) => void
  onDelete: (r: Schedule) => void
}

function RoutinesColumn({ routines, agentMap, onCreate, onEdit, onToggle, onRunNow, onDelete }: RoutinesColumnProps) {
  return (
    <div className="flex flex-col">
      {/* Column header — neutral purple-ish to distinguish from task states */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-t-xl border-t-2 border-x border-neutral-800/40 bg-neutral-900/80 border-t-violet-500/60">
        <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400">Routines</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onCreate}
            className="text-[11px] px-2 py-0.5 rounded-md text-neutral-500 hover:text-violet-300 hover:bg-violet-500/10 transition-colors"
            title="Create a new routine"
          >
            + Add
          </button>
          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-bold tabular-nums bg-violet-500/15 text-violet-400">
            {routines.length}
          </span>
        </div>
      </div>

      {/* Column lane */}
      <div className="flex flex-col gap-2.5 rounded-b-xl p-3 min-h-[280px] bg-neutral-950/30 border-x border-b border-neutral-800/40">
        {routines.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2 border border-dashed border-neutral-800 rounded-xl px-5 py-6 w-full">
              <span className="text-lg leading-none text-neutral-700">↺</span>
              <p className="text-xs text-neutral-700">No routines yet</p>
              <button
                onClick={onCreate}
                className="text-[11px] text-violet-400 hover:text-violet-300 underline underline-offset-2"
              >
                Create one
              </button>
            </div>
          </div>
        )}

        {routines.map(r => {
          const agentName = r.agents?.name || agentMap.get(r.agent_id)?.name || 'unknown agent'
          const recurrence = formatRecurrence(r.cron_expr)
          const nextRunLabel = r.next_run ? `next ${timeAgo(r.next_run)}` : (r.last_run ? `last ${timeAgo(r.last_run)}` : 'not run yet')
          const paused = !r.active
          return (
            <div
              key={r.id}
              className={[
                'bg-neutral-900 border border-l-4 rounded-xl p-3 flex flex-col gap-2',
                paused ? 'border-l-neutral-700 opacity-60' : 'border-l-violet-500',
                'border-neutral-800/60',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-white leading-snug flex-1">{r.name}</p>
                <Badge label={recurrence} color="neutral" className="shrink-0 mt-0.5" />
              </div>
              {r.task && (
                <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">{r.task}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-900/30 text-emerald-400 font-mono">
                  {agentName}
                </span>
                {paused && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-800/60 border border-neutral-700 text-neutral-400 font-mono">
                    paused
                  </span>
                )}
              </div>
              <p className="text-[10px] text-neutral-600 font-mono" title={r.next_run ? new Date(r.next_run).toLocaleString() : ''}>
                {nextRunLabel}
              </p>
              <div className="flex items-center gap-1 pt-2 border-t border-neutral-800/50 flex-wrap">
                <button
                  onClick={() => onRunNow(r)}
                  className="px-2.5 py-1 text-xs font-semibold text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-md transition-all duration-150"
                >
                  Run now
                </button>
                <button
                  onClick={() => onToggle(r)}
                  className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white hover:bg-neutral-700/50 rounded-md transition-all duration-150"
                >
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={() => onEdit(r)}
                  className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white hover:bg-neutral-700/50 rounded-md transition-all duration-150"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(r)}
                  className="px-2.5 py-1 text-xs text-neutral-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all duration-150 ml-auto"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}
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
  const [cronRunning, setCronRunning] = useState(false)
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

  // Schedules (routines + system crons)
  const { data: schedulesRaw, mutate: mutateSchedules } = useData(['schedules', eid], getSchedulesAction)
  const schedules = (schedulesRaw ?? []) as Schedule[]
  // Show all user-created schedules on the board. System schedules (memory-guardian
  // etc) have type='system' and a synthetic id — keep them hidden here, they're
  // managed internally.
  const routines = schedules.filter(s => s.type !== 'system' && !s.id.startsWith('system-'))

  // ─── Routine modal state ─────────────────────────────────────
  const [showRoutineModal, setShowRoutineModal] = useState(false)
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null)
  const [routineForm, setRoutineForm] = useState<{
    name: string
    agent_id: string
    task: string
    n: number
    unit: RecurrenceUnit
  }>({ name: '', agent_id: '', task: '', n: 1, unit: 'hours' })
  const [savingRoutine, setSavingRoutine] = useState(false)

  function openCreateRoutine() {
    const defaultAgent = orchestratorId && orchestratorId !== '__all__'
      ? orchestratorId
      : (orchestrators[0]?.id ?? allAgents[0]?.id ?? '')
    setEditingRoutineId(null)
    setRoutineForm({ name: '', agent_id: defaultAgent, task: '', n: 3, unit: 'hours' })
    setShowRoutineModal(true)
  }

  function openEditRoutine(r: Schedule) {
    const rec = cronToRecurrence(r.cron_expr) ?? { n: 1, unit: 'hours' as RecurrenceUnit }
    setEditingRoutineId(r.id)
    setRoutineForm({
      name: r.name ?? '',
      agent_id: r.agent_id,
      task: r.task ?? '',
      n: rec.n,
      unit: rec.unit,
    })
    setShowRoutineModal(true)
  }

  async function saveRoutine() {
    if (!routineForm.name.trim()) { toast.error('Name is required'); return }
    if (!routineForm.agent_id) { toast.error('Pick an agent'); return }
    if (!routineForm.task.trim()) { toast.error('Task description is required'); return }
    setSavingRoutine(true)
    try {
      const cron_expr = recurrenceToCron({ n: routineForm.n, unit: routineForm.unit })
      const payload = {
        name: routineForm.name.trim(),
        agent_id: routineForm.agent_id,
        type: 'cron' as const,
        cron_expr,
        task: routineForm.task.trim(),
      }
      const result = editingRoutineId
        ? await updateScheduleAction(editingRoutineId, payload)
        : await createScheduleAction(payload)
      if (!result.ok) { toast.error(result.error); return }
      toast.success(editingRoutineId ? 'Routine updated' : 'Routine created')
      setShowRoutineModal(false)
      setEditingRoutineId(null)
      mutateSchedules()
    } finally {
      setSavingRoutine(false)
    }
  }

  async function toggleRoutineActive(r: Schedule) {
    const result = await updateScheduleAction(r.id, { active: !r.active })
    if (!result.ok) { toast.error(result.error); return }
    toast.success(r.active ? 'Routine paused' : 'Routine resumed')
    mutateSchedules()
  }

  async function runRoutineNow(r: Schedule) {
    const result = await runScheduleNowAction(r.id)
    if (!result.ok) { toast.error(result.error); return }
    toast.success(`Routine fired — job ${result.data.job_id?.slice(0, 8) ?? 'queued'}`)
    mutate()
    mutateSchedules()
  }

  async function deleteRoutine(r: Schedule) {
    if (!confirm(`Delete routine "${r.name}"?`)) return
    const result = await deleteScheduleAction(r.id)
    if (!result.ok) { toast.error(result.error); return }
    toast.success('Routine deleted')
    mutateSchedules()
  }

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

  async function handleClearDone() {
    if (!orchestratorId) return
    const doneCount = tasks.filter(t => t.status === 'done').length
    if (!doneCount || !confirm(`Delete all ${doneCount} completed task${doneCount > 1 ? 's' : ''}?`)) return
    const result = await clearDoneTasksAction(orchestratorId === '__all__' ? undefined : orchestratorId)
    if (!result.ok) { toast.error(result.error); return }
    toast.success(`Cleared ${result.data.count} completed task${result.data.count !== 1 ? 's' : ''}`)
    mutate()
  }

  async function runCron() {
    setCronRunning(true)
    try {
      const result = await triggerCronAction()
      if (!result.ok) { toast.error(result.error); return }
      const data = result.data as { triggered?: number; duration_ms?: number } | undefined
      const triggered = data?.triggered ?? 0
      const duration = data?.duration_ms ?? 0
      toast.success(
        triggered > 0
          ? `Cron tick done — ${triggered} scheduled job${triggered > 1 ? 's' : ''} fired (${duration}ms)`
          : `Cron tick done — board swept (${duration}ms)`,
      )
      mutate()
    } finally {
      setCronRunning(false)
    }
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
          onClick={runCron}
          disabled={cronRunning}
          title="Run the cron tick now — claims todo tasks immediately instead of waiting for the next 2-min tick."
          className="px-3 py-2 text-xs font-semibold bg-neutral-900 text-neutral-200 border border-neutral-800 rounded-full hover:bg-neutral-800 active:scale-[0.97] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {cronRunning ? 'Running cron…' : 'Run cron now'}
        </button>
        <button
          onClick={openCreateRoutine}
          className="px-3 py-2 text-xs font-semibold bg-neutral-900 text-neutral-200 border border-neutral-800 rounded-full hover:bg-neutral-800 active:scale-[0.97] transition-all duration-150"
        >
          + Routine
        </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <RoutinesColumn
              routines={routines}
              agentMap={agentMap}
              onCreate={openCreateRoutine}
              onEdit={openEditRoutine}
              onToggle={toggleRoutineActive}
              onRunNow={runRoutineNow}
              onDelete={deleteRoutine}
            />
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
                onClearDone={col.key === 'done' ? handleClearDone : undefined}
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

      {/* System section — recurring agent schedules */}
      {schedules.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">System</h2>
          <div className="bg-neutral-900 border border-neutral-800/60 rounded-xl overflow-hidden">
            <div className="divide-y divide-neutral-800/40">
              {schedules.map(s => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${s.active ? 'bg-emerald-500' : 'bg-neutral-600'}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium truncate">{s.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-mono shrink-0 ${s.type === 'system' ? 'bg-violet-950/50 border border-violet-900/30 text-violet-400' : 'bg-amber-950/50 border border-amber-900/30 text-amber-400'}`}>
                          {s.type === 'system' ? 'system' : s.type === 'heartbeat' ? 'heartbeat' : 'cron'}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-600">
                        {s.agents?.name ?? 'Unknown agent'} · <span className="font-mono">{s.cron_expr}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {s.last_status && (
                      <span className={`text-xs ${s.last_status === 'completed' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {s.last_status}
                      </span>
                    )}
                    {s.last_run && (
                      <span className="text-xs text-neutral-700 font-mono">
                        {new Date(s.last_run).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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

      {/* Routine create/edit modal */}
      {showRoutineModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowRoutineModal(false)}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl shadow-black/60 mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-semibold text-white">{editingRoutineId ? 'Edit routine' : 'New routine'}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Recurring task — the agent will be fired on the schedule below.
                </p>
              </div>
              <button
                onClick={() => setShowRoutineModal(false)}
                className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-all duration-150 text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">Name</label>
                <input
                  type="text"
                  value={routineForm.name}
                  onChange={e => setRoutineForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Check JobHunt for new ‼️ offers"
                  className="w-full bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">Agent</label>
                <select
                  value={routineForm.agent_id}
                  onChange={e => setRoutineForm(f => ({ ...f, agent_id: e.target.value }))}
                  className="w-full bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors"
                >
                  <option value="">— Pick an agent —</option>
                  {allAgents.filter(a => a.role !== 'system').map(a => (
                    <option key={a.id} value={a.id}>{a.name}{a.role === 'orchestrator' ? ' (orchestrator)' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">Runs every</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={routineForm.unit === 'hours' ? 23 : 30}
                    value={routineForm.n}
                    onChange={e => setRoutineForm(f => ({ ...f, n: Math.max(1, Number(e.target.value) || 1) }))}
                    className="w-20 bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors"
                  />
                  <select
                    value={routineForm.unit}
                    onChange={e => setRoutineForm(f => ({ ...f, unit: e.target.value as RecurrenceUnit }))}
                    className="flex-1 bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors"
                  >
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                  </select>
                </div>
                <p className="text-[11px] text-neutral-600 mt-1 font-mono">
                  cron: {recurrenceToCron({ n: routineForm.n, unit: routineForm.unit })}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">Task to run</label>
                <textarea
                  value={routineForm.task}
                  onChange={e => setRoutineForm(f => ({ ...f, task: e.target.value }))}
                  placeholder="What should the agent do each time?"
                  rows={4}
                  className="w-full bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none transition-colors resize-y"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-neutral-800/60">
              <button
                onClick={saveRoutine}
                disabled={savingRoutine}
                className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-full hover:bg-neutral-200 active:scale-[0.97] transition-all duration-150 disabled:opacity-50"
              >
                {savingRoutine ? 'Saving…' : (editingRoutineId ? 'Save changes' : 'Create routine')}
              </button>
              <button
                onClick={() => setShowRoutineModal(false)}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-all duration-150"
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
