'use client'

import { useEffect, useState } from 'react'
import { getApprovals, resolveApproval } from '@/lib/queries'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'

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

export default function ApprovalsPage() {
  const [tab, setTab] = useState<'pending' | 'history'>('pending')
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({})

  async function load() {
    const data = await getApprovals(tab === 'pending' ? 'pending' : undefined)
    setApprovals(data as Approval[])
    setLoading(false)
  }

  useEffect(() => { setLoading(true); load() }, [tab])

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setActionLoading(id)
    await resolveApproval(id, action, rejectNotes[id] || '')
    await load()
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

  if (loading) return <p className="text-neutral-500 text-sm">Loading...</p>

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Approvals" count={tab === 'pending' ? pending.length : undefined} />

      <div className="flex gap-6 border-b border-neutral-800">
        <button onClick={() => setTab('pending')} className={tabClass('pending')}>
          Pending
          {pending.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded-full">
              {pending.length}
            </span>
          )}
        </button>
        <button onClick={() => setTab('history')} className={tabClass('history')}>
          History
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
                    <Badge label={a.tool_name} color="amber" />
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
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Task</p>
                  <p className="text-xs text-neutral-300">{a.agent_jobs.task.slice(0, 300)}</p>
                </div>
              )}

              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Tool Input</p>
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
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800/50">
                <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Tool</th>
                <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Agent</th>
                <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Resolved</th>
                <th className="text-left px-5 py-3.5 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody>
              {resolved.map(a => (
                <tr key={a.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <Badge label={a.tool_name} color="neutral" />
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
    </div>
  )
}
