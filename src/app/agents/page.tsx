'use client'

import { useEffect, useState } from 'react'
import { getAgents, createAgent, updateAgent, deleteAgent, setDefaultAgent, activateTelegram, deactivateTelegram } from '@/lib/queries'
import { timeAgo } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'

type Agent = {
  id: string; name: string; slug: string; personality: string
  model: string; active: boolean; is_default: boolean; role: string
  telegram_bot_token: string | null; telegram_bot_username: string | null
  requires_approval: string[] | null
  created_at: string; updated_at: string
}

const MODELS = [
  { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
  { value: 'claude-opus-4-6', label: 'Opus 4.6' },
]

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    name: '', slug: '', personality: '', model: 'claude-sonnet-4-6',
    role: 'agent', telegram_bot_token: '', telegram_bot_username: '',
    requires_approval: '' as string,
  })
  const [telegramStatus, setTelegramStatus] = useState('')

  async function load() { setAgents(await getAgents()); setLoading(false) }
  useEffect(() => { load() }, [])

  function startEdit(a: Agent) {
    setEditingId(a.id); setShowAdd(false); setTelegramStatus('')
    setForm({
      name: a.name, slug: a.slug, personality: a.personality, model: a.model,
      role: a.role || 'agent',
      telegram_bot_token: a.telegram_bot_token || '',
      telegram_bot_username: a.telegram_bot_username || '',
      requires_approval: (a.requires_approval || []).join(', '),
    })
  }

  function startAdd() {
    setEditingId(null); setShowAdd(true); setTelegramStatus('')
    setForm({
      name: '', slug: '', personality: DEFAULT_PERSONALITY, model: 'claude-sonnet-4-6',
      role: 'agent', telegram_bot_token: '', telegram_bot_username: '',
      requires_approval: '',
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
      await updateAgent(editingId, {
        name: form.name, slug: form.slug, personality: form.personality, model: form.model,
        role: form.role,
        telegram_bot_token: form.telegram_bot_token || null,
        telegram_bot_username: form.telegram_bot_username || null,
        requires_approval: approvalList,
      })
      setEditingId(null)
    } else {
      await createAgent({
        name: form.name, slug: form.slug, personality: form.personality, model: form.model,
        role: form.role,
        telegram_bot_token: form.telegram_bot_token || null,
        telegram_bot_username: form.telegram_bot_username || null,
      })
      setShowAdd(false)
    }
    load()
  }

  if (loading) return <p className="text-neutral-500 text-sm">Loading...</p>

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader title="Agents" count={agents.length}>
        <button onClick={startAdd} className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors">
          Create agent
        </button>
      </PageHeader>

      <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-hidden">
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
                    onClick={() => { updateAgent(a.id, { active: !a.active }); load() }}
                    className={`w-9 h-5 rounded-full relative transition-colors ${a.active ? 'bg-emerald-600' : 'bg-neutral-700'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${a.active ? 'left-4.5' : 'left-0.5'}`}
                      style={{ left: a.active ? '18px' : '2px' }}
                    />
                  </button>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-neutral-200 font-medium">{a.name}</span>
                  {a.is_default && <span className="ml-2 text-xs text-emerald-400">default</span>}
                </td>
                <td className="px-5 py-3.5 text-neutral-500 font-mono text-xs">{a.slug}</td>
                <td className="px-5 py-3.5 text-neutral-500 text-xs">{MODELS.find(m => m.value === a.model)?.label || a.model}</td>
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
                    <button onClick={() => { setDefaultAgent(a.id); load() }} className="text-xs text-neutral-400 hover:text-emerald-400 transition-colors">
                      Set default
                    </button>
                  )}
                  <button onClick={() => startEdit(a)} className="text-xs text-neutral-400 hover:text-white transition-colors">Edit</button>
                  {!a.is_default && (
                    <button
                      onClick={() => { if (confirm('Delete this agent?')) { deleteAgent(a.id); load() } }}
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

      {(editingId || showAdd) && (
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-6 space-y-5">
          <p className="text-sm font-semibold text-white">{editingId ? 'Edit Agent' : 'New Agent'}</p>

          <div className="grid grid-cols-4 gap-4">
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
              <select
                value={form.model} onChange={(e) => updateForm('model', e.target.value)}
                className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none transition-colors"
              >
                <option value="claude-sonnet-4-6">Sonnet 4.6</option>
                <option value="claude-haiku-4-5-20251001">Haiku 4.5 (fast, cheap)</option>
                <option value="claude-opus-4-6-20260827">Opus 4.6 (powerful)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5">Role</label>
              <select
                value={form.role} onChange={(e) => updateForm('role', e.target.value)}
                className="w-full bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none transition-colors"
              >
                <option value="agent">Agent</option>
                <option value="orchestrator">Orchestrator</option>
              </select>
            </div>
          </div>

          {form.role === 'orchestrator' && (
            <p className="text-xs text-blue-400 bg-blue-950/30 border border-blue-900/30 rounded-lg px-4 py-2.5">
              Orchestrators can delegate tasks to other agents using the delegate_task tool.
              List available agents in the personality so the orchestrator knows who to call.
            </p>
          )}

          {/* Telegram Configuration */}
          <div className="border-t border-neutral-800/50 pt-5">
            <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-3">Telegram Bot</p>
            <div className="grid grid-cols-2 gap-4">
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
                      const res = await activateTelegram(slug)
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
                      const res = await deactivateTelegram(slug)
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
