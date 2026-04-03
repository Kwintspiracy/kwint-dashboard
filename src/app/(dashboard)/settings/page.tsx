'use client'

import { useState } from 'react'
import { getLlmKeysAction, saveLlmKeyAction, deleteLlmKeyAction, getAgentsAction } from '@/lib/actions'
import { LLM_PROVIDERS, getProviderForModel, type LlmProvider } from '@/lib/llm-providers'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/components/AuthProvider'
import PageHeader from '@/components/PageHeader'
import { toast } from 'sonner'
import { Trash, Eye, EyeSlash, X, Warning } from '@phosphor-icons/react'

type LlmKey = {
  id: string
  provider: string
  api_key: string
  base_url: string | null
  nickname: string | null
  is_active: boolean
  created_at: string
}

type Agent = {
  id: string
  name: string
  model: string
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return '••••••••'
  return key.slice(0, 6) + '••••••••' + key.slice(-4)
}

export default function SettingsPage() {
  const { activeEntity } = useAuth()
  const eid = activeEntity?.id

  const { data: keysRaw = [], isLoading: loadingKeys, mutate } = useData(
    ['llm-keys', eid],
    getLlmKeysAction,
  )
  const { data: agentsRaw = [], isLoading: loadingAgents } = useData(
    ['agents', eid],
    getAgentsAction,
  )
  const keys = keysRaw as LlmKey[]
  const agents = agentsRaw as Agent[]

  // Build a map: provider id → agents using it
  const agentsByProvider = Object.fromEntries(
    LLM_PROVIDERS.map((p) => [
      p.id,
      agents.filter((a) => getProviderForModel(a.model)?.id === p.id),
    ]),
  )

  const [modal, setModal] = useState<LlmProvider | null>(null)
  const [form, setForm] = useState({ api_key: '', base_url: '', nickname: '' })
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  function openModal(provider: LlmProvider) {
    const existing = keys.find((k) => k.provider === provider.id)
    setForm({
      api_key: existing?.api_key ?? '',
      base_url: existing?.base_url ?? '',
      nickname: existing?.nickname ?? '',
    })
    setShowKey(false)
    setModal(provider)
  }

  function closeModal() {
    setModal(null)
    setForm({ api_key: '', base_url: '', nickname: '' })
  }

  async function handleSave() {
    if (!modal) return
    if (modal.needsBaseUrl && !form.base_url.trim()) {
      toast.error('Base URL is required')
      return
    }
    if (!modal.needsBaseUrl && !form.api_key.trim()) {
      toast.error('API Key is required')
      return
    }
    setSaving(true)
    const res = await saveLlmKeyAction({
      provider: modal.id,
      api_key: form.api_key.trim(),
      base_url: form.base_url.trim() || null,
      nickname: form.nickname.trim() || null,
    })
    setSaving(false)
    if (!res.ok) { toast.error(res.error); return }
    toast.success(`${modal.name} key saved`)
    closeModal()
    mutate()
  }

  async function handleDelete(provider: string, providerName: string) {
    if (!confirm(`Remove ${providerName} API key?`)) return
    setDeleting(provider)
    const res = await deleteLlmKeyAction(provider)
    setDeleting(null)
    if (!res.ok) { toast.error(res.error); return }
    toast.success(`${providerName} key removed`)
    mutate()
  }

  const loading = loadingKeys || loadingAgents
  const configuredCount = LLM_PROVIDERS.filter((p) => keys.some((k) => k.provider === p.id)).length
  const inUseCount = LLM_PROVIDERS.filter((p) => agentsByProvider[p.id]?.length > 0).length

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <PageHeader
        title="Settings"
        subtitle={`${configuredCount} provider${configuredCount !== 1 ? 's' : ''} configured · ${inUseCount} in use by agents`}
      />

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-neutral-300 mb-1">LLM Provider Keys</h2>
        <p className="text-xs text-neutral-500 mb-5">
          API keys are stored per workspace. Your agents use them when running jobs.
        </p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-neutral-900 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {LLM_PROVIDERS.map((provider) => {
              const existing = keys.find((k) => k.provider === provider.id)
              const configured = !!existing
              const usedByAgents = agentsByProvider[provider.id] ?? []
              const inUse = usedByAgents.length > 0
              const needsKey = inUse && !configured

              // Border color: configured > needsKey (warning) > inUse > default
              const borderColor = configured
                ? provider.color + '40'
                : needsKey
                  ? '#F59E0B40'
                  : 'rgb(38 38 38)'

              const dotColor = configured
                ? provider.color
                : needsKey
                  ? '#F59E0B'
                  : inUse
                    ? '#737373'
                    : '#404040'

              return (
                <div
                  key={provider.id}
                  className="relative rounded-xl border bg-neutral-950 p-4 flex flex-col gap-3 transition-colors"
                  style={{ borderColor }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                        style={{ backgroundColor: dotColor }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-neutral-100">{provider.name}</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight">{provider.description}</p>
                      </div>
                    </div>
                    {configured && (
                      <button
                        onClick={() => handleDelete(provider.id, provider.name)}
                        disabled={deleting === provider.id}
                        className="text-neutral-600 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                        title="Remove key"
                      >
                        <Trash size={15} weight="duotone" />
                      </button>
                    )}
                  </div>

                  {/* Key preview or warning */}
                  {configured && existing ? (
                    <div className="text-[11px] text-neutral-500 font-mono bg-neutral-900 rounded-lg px-3 py-2 leading-tight">
                      {maskKey(existing.api_key)}
                      {existing.base_url && (
                        <div className="mt-1 text-neutral-600 truncate">{existing.base_url}</div>
                      )}
                    </div>
                  ) : needsKey ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-500/80 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                      <Warning size={12} weight="fill" />
                      No key — {usedByAgents.length} agent{usedByAgents.length > 1 ? 's' : ''} use this provider
                    </div>
                  ) : (
                    <div className="text-[11px] text-neutral-700 italic">Not configured</div>
                  )}

                  {/* Agents using this provider */}
                  {inUse && (
                    <div className="flex flex-wrap gap-1">
                      {usedByAgents.map((a) => (
                        <span key={a.id} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                          {a.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Models count */}
                  {!inUse && (
                    <p className="text-[10px] text-neutral-600">
                      {provider.models.length} model{provider.models.length > 1 ? 's' : ''} available
                    </p>
                  )}

                  {/* Action */}
                  <button
                    onClick={() => openModal(provider)}
                    className="mt-auto text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    style={configured
                      ? { color: provider.color, backgroundColor: provider.color + '15' }
                      : needsKey
                        ? { color: '#F59E0B', backgroundColor: '#F59E0B15' }
                        : { color: '#a3a3a3', backgroundColor: 'rgb(23 23 23)' }
                    }
                  >
                    {configured ? 'Update key' : needsKey ? 'Add key' : 'Configure'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: modal.color }} />
                <p className="text-sm font-semibold text-neutral-100">{modal.name}</p>
              </div>
              <button onClick={closeModal} className="text-neutral-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Nickname <span className="text-neutral-600">(optional)</span>
                </label>
                <input
                  className="w-full text-sm bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                  placeholder="e.g. Production key"
                  value={form.nickname}
                  onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                />
              </div>

              {modal.needsBaseUrl && (
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    {modal.baseUrlLabel ?? 'Base URL'} <span className="text-red-400">*</span>
                  </label>
                  <input
                    className="w-full text-sm bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 font-mono"
                    placeholder={modal.baseUrlPlaceholder ?? 'https://...'}
                    value={form.base_url}
                    onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  {modal.keyLabel}
                  {!modal.needsBaseUrl && <span className="text-red-400 ml-1">*</span>}
                  {modal.needsBaseUrl && <span className="text-neutral-600 ml-1">(optional)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    className="w-full text-sm bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 pr-10 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 font-mono"
                    placeholder={modal.keyPlaceholder}
                    value={form.api_key}
                    onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    {showKey ? <EyeSlash size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-600 mt-1.5">{modal.keyHelp}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-neutral-500 mb-2">Available models</p>
                <div className="flex flex-wrap gap-1.5">
                  {modal.models.map((m) => (
                    <span
                      key={m.value}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400 border border-neutral-800"
                    >
                      {m.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="text-sm text-neutral-400 hover:text-white transition-colors px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: modal.color + '20', color: modal.color }}
              >
                {saving ? 'Saving…' : 'Save key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
