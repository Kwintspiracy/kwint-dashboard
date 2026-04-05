'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import {
  getApprovalsAction,
  resolveApprovalAction,
  getApprovalRulesAction,
  createApprovalRuleAction,
  deleteApprovalRuleAction,
  getAgentsAction,
} from '@/lib/actions'
import { toast } from 'sonner'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { useData } from '@/hooks/useData'
import { displayToolName } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import CardSkeleton from '@/components/skeletons/CardSkeleton'

type Approval = {
  id: string
  job_id: string
  agent_id: string | null
  tool_name: string
  tool_input: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  requested_at: string
  resolved_at: string | null
  resolved_by: string | null
  notes: string | null
  agents: { name: string } | null
  agent_jobs: { task: string; channel: string } | null
}

type ApprovalRule = {
  id: string
  agent_id: string | null
  tool_name: string
  action: 'auto_approve' | 'require_approval' | 'block'
  created_at: string
  agents: { name: string } | null
}

type Agent = {
  id: string
  name: string
}

const KNOWN_TOOLS = [
  'web_search',
  'http_request',
  'delegate_task',
  'save_memory',
  'query_database',
  'send_notification',
  'manage_skill',
  'load_skill',
]

export default function ApprovalsPage() {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

  const [tab, setTab] = useState<'pending' | 'history' | 'rules'>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({})

  // Rules state
  const [ruleDeleteLoading, setRuleDeleteLoading] = useState<string | null>(null)
  const [newRule, setNewRule] = useState({ agent_id: '', tool_name: '', action: 'require_approval' })
  const [ruleSubmitting, setRuleSubmitting] = useState(false)

  const { data: approvalsRaw = [], isLoading: loading, mutate: mutateApprovals } = useData(
    ['approvals', eid, tab],
    () => getApprovalsAction(tab === 'pending' ? 'pending' : undefined)
  )
  const approvals = approvalsRaw as Approval[]

  const { data: rulesRaw = [], isLoading: rulesLoading, mutate: mutateRules } = useData(
    ['approval-rules', eid],
    getApprovalRulesAction
  )
  const rules = rulesRaw as ApprovalRule[]

  const { data: agentsRaw = [] } = useData(['agents', eid], getAgentsAction)
  const agents = agentsRaw as Agent[]

  useRealtimeTable({
    table: 'approval_requests',
    onInsert: (row) => {
      mutateApprovals()
      toast('New approval request', { description: (row as Approval).tool_name })
    },
    onUpdate: () => {
      mutateApprovals()
    },
  })

  async function handleDeleteRule(id: string) {
    setRuleDeleteLoading(id)
    const result = await deleteApprovalRuleAction(id)
    if (!result.ok) {
      toast.error(result.error)
    } else {
      toast.success('Rule deleted')
      mutateRules()
    }
    setRuleDeleteLoading(null)
  }

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault()
    if (!newRule.tool_name.trim()) { toast.error('Tool name is required'); return }
    setRuleSubmitting(true)
    const result = await createApprovalRuleAction({
      agent_id: newRule.agent_id || null,
      tool_name: newRule.tool_name.trim(),
      action: newRule.action,
    })
    if (!result.ok) {
      toast.error(result.error)
    } else {
      toast.success('Rule created')
      setNewRule({ agent_id: '', tool_name: '', action: 'require_approval' })
      mutateRules()
    }
    setRuleSubmitting(false)
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setActionLoading(id)
    const result = await resolveApprovalAction({ id, action, notes: rejectNotes[id] || '' })
    if (!result.ok) {
      toast.error(result.error)
    } else {
      toast.success(action === 'approve' ? 'Approval granted' : 'Request rejected')
      mutateApprovals()
    }
    setActionLoading(null)
  }

  const pending = approvals.filter(a => a.status === 'pending')
  const resolved = approvals.filter(a => a.status !== 'pending')

  function tabClass(t: typeof tab) {
    return `text-sm font-medium transition-colors ${
      tab === t
        ? 'text-white border-b-2 border-emerald-500 pb-3'
        : 'text-neutral-500 hover:text-neutral-300 pb-3'
    }`
  }

  if (loading && tab !== 'rules') return <CardSkeleton />

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Approvals" count={tab === 'pending' ? pending.length : undefined} />

      <div className="flex gap-6 border-b border-neutral-800">
        <button onClick={() => setTab('pending')} className={tabClass('pending')}>
          Pending
          {pending.length > 0 && (
            <span className="ml-1.5 px-2 py-1 text-xs font-bold bg-amber-500/20 text-amber-400 rounded-full">
              {pending.length}
            </span>
          )}
        </button>
        <button onClick={() => setTab('history')} className={tabClass('history')}>
          History
        </button>
        <button onClick={() => setTab('rules')} className={tabClass('rules')}>
          Rules
          {rules.length > 0 && (
            <span className="ml-1.5 px-2 py-1 text-xs font-bold bg-neutral-700 text-neutral-300 rounded-full">
              {rules.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'pending' && (
        <div className="space-y-4">
          {pending.length === 0 && <EmptyState message="No pending approvals" />}
          {pending.map(a => (
            <div key={a.id} className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge label={displayToolName(a.tool_name)} color="amber" />
                    {a.agents && <span className="text-xs text-neutral-500">by {a.agents.name}</span>}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    {new Date(a.requested_at).toLocaleString()}
                  </p>
                </div>
                <Badge label="pending" color="amber" />
              </div>

              {a.agent_jobs && (
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Task</p>
                  <p className="text-xs text-neutral-300">{a.agent_jobs.task.slice(0, 300)}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Tool Input</p>
                <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap bg-neutral-800/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {JSON.stringify(a.tool_input, null, 2)}
                </pre>
              </div>

              <div>
                <input
                  value={rejectNotes[a.id] || ''}
                  onChange={e => setRejectNotes(prev => ({ ...prev, [a.id]: e.target.value }))}
                  placeholder="Notes (optional, used if rejecting)"
                  className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-2 text-xs text-white focus:border-neutral-600 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(a.id, 'approve')}
                  disabled={actionLoading === a.id}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
                >
                  {actionLoading === a.id ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleAction(a.id, 'reject')}
                  disabled={actionLoading === a.id}
                  className="px-4 py-2 text-xs font-semibold bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30 transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800/50">
                <th className="text-left px-5 py-3.5 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Tool</th>
                <th className="text-left px-5 py-3.5 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Agent</th>
                <th className="text-left px-5 py-3.5 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Resolved</th>
                <th className="text-left px-5 py-3.5 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody>
              {resolved.map(a => (
                <tr key={a.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <Badge label={displayToolName(a.tool_name)} color="neutral" />
                  </td>
                  <td className="px-5 py-3.5 text-neutral-400 text-xs">{a.agents?.name || '—'}</td>
                  <td className="px-5 py-3.5">
                    <Badge
                      label={a.status}
                      color={a.status === 'approved' ? 'emerald' : a.status === 'rejected' ? 'red' : 'neutral'}
                    />
                  </td>
                  <td className="px-5 py-3.5 text-neutral-500 text-xs">
                    {a.resolved_at ? new Date(a.resolved_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-neutral-500 text-xs">{a.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {resolved.length === 0 && <EmptyState message="No approval history yet" />}
        </div>
      )}

      {tab === 'rules' && (
        <div className="space-y-6">
          {/* Add rule form */}
          <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Add Rule</h3>
            <form onSubmit={handleCreateRule} className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1.5 min-w-[160px]">
                <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Agent</label>
                <select
                  value={newRule.agent_id}
                  onChange={e => setNewRule(prev => ({ ...prev, agent_id: e.target.value }))}
                  className="bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-neutral-500 focus:outline-none transition-colors"
                >
                  <option value="">Any agent</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 min-w-[180px]">
                <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Tool name</label>
                <select
                  value={newRule.tool_name}
                  onChange={e => setNewRule(prev => ({ ...prev, tool_name: e.target.value }))}
                  className="bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-neutral-500 focus:outline-none transition-colors"
                >
                  <option value="">Select or type below...</option>
                  {KNOWN_TOOLS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  value={newRule.tool_name}
                  onChange={e => setNewRule(prev => ({ ...prev, tool_name: e.target.value }))}
                  placeholder="or type custom tool name"
                  className="bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5 min-w-[160px]">
                <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Action</label>
                <select
                  value={newRule.action}
                  onChange={e => setNewRule(prev => ({ ...prev, action: e.target.value }))}
                  className="bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-neutral-500 focus:outline-none transition-colors"
                >
                  <option value="auto_approve">Auto-approve</option>
                  <option value="require_approval">Require approval</option>
                  <option value="block">Block</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={ruleSubmitting}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 self-end"
              >
                {ruleSubmitting ? 'Saving...' : 'Save Rule'}
              </button>
            </form>
          </div>

          {/* Existing rules list */}
          {rulesLoading ? (
            <CardSkeleton />
          ) : rules.length === 0 ? (
            <EmptyState message="No approval rules configured" />
          ) : (
            <div className="space-y-2">
              {rules.map(rule => {
                const actionColor = rule.action === 'auto_approve' ? 'emerald' : rule.action === 'block' ? 'red' : 'amber'
                const actionLabel = rule.action === 'auto_approve' ? 'auto-approve' : rule.action === 'block' ? 'block' : 'require approval'
                return (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between bg-neutral-900/50 border border-neutral-800/50 rounded-xl px-5 py-3.5"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-neutral-400 font-medium">
                        {rule.agents?.name ?? 'Any agent'}
                      </span>
                      <span className="text-neutral-600 text-xs">→</span>
                      <Badge label={displayToolName(rule.tool_name)} color="neutral" />
                      <span className="text-neutral-600 text-xs">→</span>
                      <Badge label={actionLabel} color={actionColor} />
                    </div>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      disabled={ruleDeleteLoading === rule.id}
                      className="text-xs text-neutral-600 hover:text-red-400 transition-colors disabled:opacity-50 ml-4 shrink-0"
                    >
                      {ruleDeleteLoading === rule.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
