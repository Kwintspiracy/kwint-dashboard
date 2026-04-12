'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createEntityAction, migrateExistingDataAction, switchEntityAction, saveLlmKeyAction, isOperatorAction } from '@/lib/actions'
import { LLM_PROVIDERS } from '@/lib/llm-providers'

const ICONS = ['🏢', '🏠', '🎨', '💼', '🚀', '🔬', '📊', '🎯', '🤖', '💡', '🔧', '⚡', '🌐', '📱', '🎮', '🏗️', '🎪', '🏥', '🏫', '🏦', '🛒', '🏭', '✈️', '📸']

const INDUSTRIES = [
  { value: 'agency', label: 'Agency' },
  { value: 'startup', label: 'Startup' },
  { value: 'personal', label: 'Personal' },
  { value: 'studio', label: 'Studio' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'other', label: 'Other' },
] as const

type Industry = typeof INDUSTRIES[number]['value']

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAddMode = searchParams.get('mode') === 'add'

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [icon, setIcon] = useState('🏢')
  const [industry, setIndustry] = useState<Industry | ''>('')
  const [goal, setGoal] = useState('')
  // API key step
  const [providerId, setProviderId] = useState<string>('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isOperator, setIsOperator] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Steps: 0 welcome, 1 name, 2 icon, 3 industry+goal, 4 api-key, 5 loading
  const TOTAL_STEPS = 6
  const LOADING_STEP = 5
  const API_KEY_STEP = 4

  useEffect(() => {
    isOperatorAction().then(r => setIsOperator(r.isOperator)).catch(() => setIsOperator(false))
  }, [])

  const provider = LLM_PROVIDERS.find(p => p.id === providerId) ?? LLM_PROVIDERS[0]

  function handleNameChange(v: string) {
    setName(v)
    setSlug(slugify(v))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      const result = await createEntityAction({
        name: name.trim(),
        slug: slug.trim(),
        icon,
        industry: industry || undefined,
        goal: goal.trim() || undefined,
      })
      if (!result.ok) {
        setError(result.error)
        setStep(1)
        setSubmitting(false)
        return
      }
      const entityId = result.data.id
      // Switch active entity FIRST so saveLlmKeyAction's requireAuthWithEntity picks it up
      await switchEntityAction(entityId)
      if (typeof window !== 'undefined') {
        localStorage.setItem('kwint_active_entity', entityId)
      }
      // Save the LLM key if provided
      if (apiKey.trim()) {
        const keyRes = await saveLlmKeyAction({
          provider: providerId,
          api_key: apiKey.trim(),
          base_url: baseUrl.trim() || null,
          nickname: null,
        })
        if (!keyRes.ok) {
          setError(`Workspace created, but saving the API key failed: ${keyRes.error}`)
          setStep(API_KEY_STEP)
          setSubmitting(false)
          return
        }
      }
      // Migrate existing data (only on first workspace setup, not add mode)
      if (!isAddMode) {
        await migrateExistingDataAction(entityId)
      }
      router.push('/stats')
    } catch (e) {
      console.error('[onboarding] Submit failed:', e)
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setStep(1)
      setSubmitting(false)
    }
  }

  function next() {
    if (step === 1 && (!name.trim() || !slug.trim())) {
      setError('Name and slug are required')
      return
    }
    if (step === API_KEY_STEP && !apiKey.trim() && !isOperator) {
      setError('An API key is required to run agents. You can change it later in Settings.')
      return
    }
    setError('')
    if (step === API_KEY_STEP) {
      setStep(LOADING_STEP)
      handleSubmit()
      return
    }
    setStep(s => Math.min(s + 1, TOTAL_STEPS - 1))
  }

  function back() {
    setError('')
    setStep(s => Math.max(s - 1, 0))
  }

  // Progress dots: one dot per interactive step (1..API_KEY_STEP)
  const dots = Array.from({ length: API_KEY_STEP }, (_, i) => i + 1)

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md">
        {/* Progress dots — hidden on welcome and loading */}
        {step > 0 && step < LOADING_STEP && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {dots.map(i => (
              <div
                key={i}
                className={`rounded-full transition-all duration-200 ${
                  i === step
                    ? 'w-6 h-2 bg-white'
                    : i < step
                    ? 'w-2 h-2 bg-neutral-400'
                    : 'w-2 h-2 bg-neutral-700'
                }`}
              />
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-neutral-800/50 bg-neutral-900/50 p-8">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center space-y-4">
              <div className="text-4xl mb-2">🤖</div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {isAddMode ? 'New workspace' : 'Welcome to Kwint Agents'}
              </h1>
              <p className="text-sm text-neutral-400">
                {isAddMode
                  ? "Let's set up a new workspace for your projects."
                  : "Let's set up your first workspace. It only takes a minute."}
              </p>
              <button
                onClick={() => setStep(1)}
                className="mt-4 w-full rounded-lg bg-white text-black py-2.5 text-sm font-medium hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150"
              >
                Get started
              </button>
            </div>
          )}

          {/* Step 1: Name + slug */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Name your workspace</h2>
                <p className="text-sm text-neutral-500 mt-1">Pick something memorable.</p>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Workspace name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="My Agency"
                  autoFocus
                  maxLength={120}
                  className="w-full rounded-lg border border-neutral-800/50 bg-neutral-800/30 px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-neutral-600 transition-colors outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(slugify(e.target.value))}
                  placeholder="my-agency"
                  maxLength={80}
                  className="w-full rounded-lg border border-neutral-800/50 bg-neutral-800/30 px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-neutral-600 transition-colors outline-none font-mono"
                />
                <p className="text-xs text-neutral-600 mt-1">Lowercase letters, numbers, and hyphens only</p>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
          )}

          {/* Step 2: Icon */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Choose an icon</h2>
                <p className="text-sm text-neutral-500 mt-1">Pick an icon for your workspace.</p>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {ICONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setIcon(emoji)}
                    className={`aspect-square rounded-lg text-xl flex items-center justify-center transition-colors ${
                      icon === emoji
                        ? 'bg-white/10 ring-2 ring-white/60'
                        : 'bg-neutral-800/40 hover:bg-neutral-800/80'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Industry + goal */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">A bit more detail</h2>
                <p className="text-sm text-neutral-500 mt-1">Optional — helps tailor the experience.</p>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Industry</label>
                <select
                  value={industry}
                  onChange={e => setIndustry(e.target.value as Industry | '')}
                  className="w-full rounded-lg border border-neutral-800/50 bg-neutral-800/30 px-3 py-2.5 text-sm text-white focus:border-neutral-600 transition-colors outline-none"
                >
                  <option value="" className="bg-neutral-900">Select industry (optional)</option>
                  {INDUSTRIES.map(i => (
                    <option key={i.value} value={i.value} className="bg-neutral-900">{i.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Main goal</label>
                <textarea
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  placeholder="What do you want to automate or achieve with your agents?"
                  maxLength={1000}
                  rows={4}
                  className="w-full rounded-lg border border-neutral-800/50 bg-neutral-800/30 px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-neutral-600 transition-colors outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 4: LLM API key */}
          {step === API_KEY_STEP && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Connect an LLM provider</h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Agents need an API key to run. Your key stays in your workspace and is only used for your jobs.
                </p>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Provider</label>
                <select
                  value={providerId}
                  onChange={e => setProviderId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800/50 bg-neutral-800/30 px-3 py-2.5 text-sm text-white focus:border-neutral-600 transition-colors outline-none"
                >
                  {LLM_PROVIDERS.map(p => (
                    <option key={p.id} value={p.id} className="bg-neutral-900">{p.name}</option>
                  ))}
                </select>
                <p className="text-xs text-neutral-600 mt-1">{provider.description}</p>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">{provider.keyLabel}</label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={provider.keyPlaceholder}
                    autoComplete="off"
                    className="w-full rounded-lg border border-neutral-800/50 bg-neutral-800/30 px-3 py-2.5 pr-16 text-sm text-white placeholder:text-neutral-600 focus:border-neutral-600 transition-colors outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(s => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-500 hover:text-neutral-300 px-2 py-1"
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-xs text-neutral-600 mt-1">{provider.keyHelp}</p>
              </div>
              {provider.needsBaseUrl && (
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">{provider.baseUrlLabel ?? 'Base URL'}</label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={e => setBaseUrl(e.target.value)}
                    placeholder={provider.baseUrlPlaceholder}
                    className="w-full rounded-lg border border-neutral-800/50 bg-neutral-800/30 px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-neutral-600 transition-colors outline-none font-mono"
                  />
                </div>
              )}
              {isOperator && (
                <button
                  type="button"
                  onClick={() => { setApiKey(''); setError(''); setStep(LOADING_STEP); handleSubmit() }}
                  className="text-xs text-neutral-500 hover:text-neutral-300 underline"
                >
                  Skip for now (operator)
                </button>
              )}
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
          )}

          {/* Step 5: Creating */}
          {step === LOADING_STEP && (
            <div className="text-center space-y-4 py-4">
              <div className="text-4xl animate-pulse">{icon}</div>
              <h2 className="text-lg font-bold text-white tracking-tight">Creating your workspace...</h2>
              <p className="text-sm text-neutral-500">Setting everything up. Just a moment.</p>
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
            </div>
          )}

          {/* Navigation — not shown on step 0 or loading step */}
          {step > 0 && step < LOADING_STEP && (
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={back}
                className="flex-1 rounded-lg border border-neutral-800 text-neutral-400 py-2.5 text-sm font-medium hover:text-white hover:border-neutral-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={next}
                disabled={submitting}
                className="flex-1 rounded-lg bg-white text-black py-2.5 text-sm font-medium hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {step === API_KEY_STEP ? 'Create workspace' : 'Next'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen w-full items-center justify-center bg-neutral-950">
        <p className="text-neutral-500">Loading...</p>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}
