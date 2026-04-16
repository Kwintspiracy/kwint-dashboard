'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import { SKILL_TEMPLATES } from '@/lib/skill-templates'
import { toast } from 'sonner'
import {
  deriveAgentPreview,
  type AgentPreview,
  type ChatMessage,
  type ContentBlock,
} from '@/lib/configurator/preview'

type ConfiguratorResponse = {
  sessionId: string
  messages: ChatMessage[]
  agentId: string | null
  turnCount?: number
  status?: string
  error?: string
}

const skillNameMap = Object.fromEntries(SKILL_TEMPLATES.map(t => [t.slug, t.name]))

function getStatusLabel(p: AgentPreview): { label: string; color: string } {
  if (p.activated) return { label: 'Ready', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' }
  if (p.testStatus === 'passed') return { label: 'Test passed', color: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/30' }
  if (p.testStatus === 'running') return { label: 'Testing...', color: 'bg-amber-950/40 text-amber-400 border-amber-800/30' }
  if (p.testStatus === 'failed') return { label: 'Test failed', color: 'bg-red-950/40 text-red-400 border-red-800/30' }
  if (p.agentId) return { label: 'Created', color: 'bg-blue-950/40 text-blue-400 border-blue-800/30' }
  if (p.name) return { label: 'Draft', color: 'bg-neutral-800 text-neutral-400 border-neutral-700' }
  return { label: '', color: '' }
}

function AgentPreviewPanel({ preview, busy }: { preview: AgentPreview; busy: boolean }) {
  const [expandPersonality, setExpandPersonality] = useState(false)
  const status = getStatusLabel(preview)
  const hasAnything = preview.name || preview.agentId

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Agent Preview</h3>
          {status.label && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${status.color}`}>
              {status.label}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!hasAnything && !busy && (
          <p className="text-xs text-neutral-600 text-center py-8">
            La configuration de l&apos;agent apparaitra ici au fur et a mesure.
          </p>
        )}

        {!hasAnything && busy && (
          <div className="text-center py-8">
            <div className="inline-block w-5 h-5 border-2 border-neutral-700 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-xs text-neutral-600 mt-2">Analyse en cours...</p>
          </div>
        )}

        {/* Identity */}
        {preview.name && (
          <div className="space-y-2">
            <div>
              <p className="text-sm font-semibold text-white">{preview.name}</p>
              {preview.slug && <p className="text-xs font-mono text-neutral-500">{preview.slug}</p>}
            </div>
            {preview.model && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-950/50 text-violet-400 border border-violet-900/40">
                {preview.model}
              </span>
            )}
            {preview.agentId && (
              <p className="text-[10px] font-mono text-neutral-600">ID: {preview.agentId.slice(0, 12)}...</p>
            )}
          </div>
        )}

        {/* Personality */}
        {preview.personality && (
          <div>
            <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">Personality</h4>
            <div className="text-xs text-neutral-400 leading-relaxed bg-neutral-900/50 rounded-lg p-2.5 border border-neutral-800/40">
              {expandPersonality || preview.personality.length <= 200
                ? <p className="whitespace-pre-wrap">{preview.personality}</p>
                : (
                  <>
                    <p className="whitespace-pre-wrap">{preview.personality.slice(0, 200)}...</p>
                    <button onClick={() => setExpandPersonality(true)} className="text-blue-400 hover:text-blue-300 mt-1">
                      Show more
                    </button>
                  </>
                )
              }
              {expandPersonality && preview.personality.length > 200 && (
                <button onClick={() => setExpandPersonality(false)} className="text-blue-400 hover:text-blue-300 mt-1 block">
                  Show less
                </button>
              )}
            </div>
          </div>
        )}

        {/* Skills */}
        {preview.skillSlugs.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
              Skills ({preview.skillSlugs.length})
            </h4>
            <div className="space-y-1">
              {preview.skillSlugs.map(slug => (
                <div key={slug} className="flex items-center gap-2 text-xs">
                  <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-neutral-300">{skillNameMap[slug] ?? slug}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approvals */}
        {preview.requiresApproval.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
              Requires Approval
            </h4>
            <div className="space-y-1">
              {preview.requiresApproval.map(tool => (
                <div key={tool} className="flex items-center gap-2 text-xs">
                  <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <span className="text-neutral-400 font-mono">{tool}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Token budget */}
        {preview.maxTokens && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="text-neutral-600">Budget:</span>
            <span className="text-neutral-400">{preview.maxTokens.toLocaleString()} tokens/job</span>
          </div>
        )}

        {/* Test status */}
        {preview.testStatus && (
          <div>
            <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">Test</h4>
            {preview.testStatus === 'running' && (
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <div className="w-3.5 h-3.5 border-2 border-amber-800 border-t-amber-400 rounded-full animate-spin shrink-0" />
                Running...
              </div>
            )}
            {preview.testStatus === 'passed' && (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Passed
              </div>
            )}
            {preview.testStatus === 'failed' && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Failed
                </div>
                {preview.testError && (
                  <p className="text-[11px] text-red-400/70 bg-red-950/30 rounded px-2 py-1 border border-red-900/30">
                    {preview.testError.slice(0, 200)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function blocksOf(content: ChatMessage['content']): ContentBlock[] {
  if (typeof content === 'string') return [{ type: 'text', text: content }]
  return content as ContentBlock[]
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const blocks = blocksOf(msg.content)
  const isUser = msg.role === 'user'

  const toolResults = blocks.filter(b => b.type === 'tool_result') as Extract<ContentBlock, { type: 'tool_result' }>[]
  const textBlocks = blocks.filter(b => b.type === 'text') as Extract<ContentBlock, { type: 'text' }>[]
  const toolUses = blocks.filter(b => b.type === 'tool_use') as Extract<ContentBlock, { type: 'tool_use' }>[]

  if (isUser && toolResults.length > 0 && textBlocks.length === 0) {
    return (
      <div className="space-y-1">
        {toolResults.map(tr => {
          let parsed: unknown = tr.content
          try { parsed = JSON.parse(tr.content) } catch { /* keep as string */ }
          return (
            <details key={tr.tool_use_id} className="text-xs rounded border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1">
              <summary className={`cursor-pointer ${tr.is_error ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
                {tr.is_error ? 'Tool error' : 'Tool result'}
              </summary>
              <pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">{JSON.stringify(parsed, null, 2)}</pre>
            </details>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${isUser ? 'bg-blue-600 text-white' : 'bg-[var(--bg-surface)] border border-[var(--border)]'}`}>
        {textBlocks.map((b, i) => <p key={i} className="whitespace-pre-wrap">{b.text}</p>)}
        {toolUses.map(tu => (
          <details key={tu.id} className="mt-1 text-xs rounded bg-[var(--bg-body)] border border-[var(--border)] px-2 py-1">
            <summary className="cursor-pointer text-[var(--text-secondary)]">{tu.name}</summary>
            <pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">{JSON.stringify(tu.input, null, 2)}</pre>
          </details>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConfiguratorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialAgentId = searchParams.get('agentId')

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [agentId, setAgentId] = useState<string | null>(initialAgentId)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string>('active')
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const preview = useMemo(() => deriveAgentPreview(messages), [messages])

  useEffect(() => {
    if (!initialAgentId) return
    ;(async () => {
      const res = await fetch(`/api/configurator?agentId=${initialAgentId}`)
      const data = await res.json()
      if (data.session) {
        setSessionId(data.session.id)
        setMessages((data.session.messages as ChatMessage[]) ?? [])
        setStatus(data.session.status)
      }
    })()
  }, [initialAgentId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    setBusy(true)

    setMessages(prev => [...prev, { role: 'user', content: text }])

    try {
      const res = await fetch('/api/configurator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, agentId, userMessage: text }),
      })
      const data = await res.json() as ConfiguratorResponse
      if (!res.ok) {
        toast.error(data.error ?? 'Request failed')
        setMessages(prev => prev.slice(0, -1))
        return
      }
      setSessionId(data.sessionId)
      setAgentId(data.agentId)
      setMessages(data.messages)
      if (data.status) setStatus(data.status)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Network error')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setBusy(false)
    }
  }, [input, busy, sessionId, agentId])

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* ── Chat column ── */}
      <div className="flex flex-col flex-1 min-w-0">
        <PageHeader
          title="Agent Configurator"
          description="Dis-moi ce dont tu as besoin — je configure, teste et livre l'agent."
        />

        {agentId && (
          <div className="px-4 py-2 text-xs text-[var(--text-secondary)] border-b border-[var(--border)]">
            Agent cible : <Link href={`/agents`} className="underline">{agentId.slice(0, 8)}...</Link>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-[var(--text-secondary)] text-sm py-12">
              D&eacute;cris ton besoin (ex : &laquo; un agent qui r&eacute;sume mes emails Gmail non-lus chaque matin sur Telegram &raquo;).
            </div>
          )}
          {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-lg px-3 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)]">
                <span className="inline-block animate-pulse">R&eacute;flexion...</span>
              </div>
            </div>
          )}
        </div>

        {status !== 'active' && (
          <div className="px-4 py-2 text-xs bg-amber-950/40 text-amber-200 border-t border-amber-700">
            Session {status === 'exhausted' ? 'a court de tours (20 max)' : 'fermee'}. D&eacute;marre une nouvelle session pour continuer.
            <button className="ml-2 underline" onClick={() => router.push('/agents/configurator')}>Nouvelle session</button>
          </div>
        )}

        <div className="border-t border-[var(--border)] p-3 flex gap-2">
          {/* Mobile preview toggle */}
          <button
            type="button"
            onClick={() => setShowMobilePreview(!showMobilePreview)}
            className="md:hidden p-2 rounded-md border border-[var(--border)] text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Agent preview"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <form
            onSubmit={e => { e.preventDefault(); send() }}
            className="flex gap-2 flex-1"
          >
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Ton besoin..."
              rows={2}
              disabled={busy || status !== 'active'}
              className="flex-1 resize-none rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={busy || !input.trim() || status !== 'active'}
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
            >
              Envoyer
            </button>
          </form>
        </div>
      </div>

      {/* ── Desktop preview sidebar ── */}
      <div className="hidden md:flex flex-col w-[360px] border-l border-[var(--border)] bg-[var(--bg-body)] shrink-0">
        <AgentPreviewPanel preview={preview} busy={busy} />
      </div>

      {/* ── Mobile preview overlay ── */}
      {showMobilePreview && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setShowMobilePreview(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-[320px] bg-[var(--bg-body)] border-l border-[var(--border)] md:hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
              <span className="text-xs font-semibold text-neutral-500 uppercase">Preview</span>
              <button onClick={() => setShowMobilePreview(false)} className="p-1 text-neutral-500 hover:text-white">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <AgentPreviewPanel preview={preview} busy={busy} />
          </div>
        </>
      )}
    </div>
  )
}
