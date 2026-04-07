// ─── LLM Provider & Model definitions ────────────────────────────────────────
// Used by: settings page (key management), agents page (model selector)

export type LlmProvider = {
  id: string
  name: string
  color: string
  description: string
  keyLabel: string       // label for the API key field
  keyPlaceholder: string
  keyHelp: string
  needsBaseUrl: boolean  // Ollama, custom OpenAI-compatible endpoints
  baseUrlLabel?: string
  baseUrlPlaceholder?: string
  models: LlmModel[]
}

export type LlmModel = {
  value: string
  label: string
  description?: string
}

export const LLM_PROVIDERS: LlmProvider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    color: '#D97706',
    description: 'Claude — best for reasoning, coding, and long context',
    keyLabel: 'API Key',
    keyPlaceholder: 'sk-ant-api03-...',
    keyHelp: 'Find your key at console.anthropic.com → API Keys',
    needsBaseUrl: false,
    models: [
      { value: 'claude-opus-4-6', label: 'Claude Opus 4.6', description: 'Most capable' },
      { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', description: 'Balanced' },
      { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', description: 'Fastest' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    color: '#10B981',
    description: 'GPT-4.1, GPT-4o, o-series — industry-standard models',
    keyLabel: 'API Key',
    keyPlaceholder: 'sk-proj-...',
    keyHelp: 'Find your key at platform.openai.com → API keys',
    needsBaseUrl: false,
    models: [
      { value: 'gpt-4.1',       label: 'GPT-4.1',       description: 'Flagship — 1M context' },
      { value: 'gpt-4.1-mini',  label: 'GPT-4.1 mini',  description: 'Fast & affordable' },
      { value: 'gpt-4.1-nano',  label: 'GPT-4.1 nano',  description: 'Cheapest' },
      { value: 'gpt-4o',        label: 'GPT-4o',         description: 'Multimodal' },
      { value: 'gpt-4o-mini',   label: 'GPT-4o mini',    description: 'Fast & cheap' },
      { value: 'o4-mini',       label: 'o4-mini',        description: 'Fast reasoning' },
      { value: 'o3',            label: 'o3',             description: 'Best reasoning' },
      { value: 'o3-mini',       label: 'o3-mini',        description: 'Reasoning, efficient' },
      { value: 'o1',            label: 'o1',             description: 'Deep reasoning' },
      { value: 'o1-mini',       label: 'o1-mini',        description: 'Reasoning, lightweight' },
      { value: 'gpt-4-turbo',   label: 'GPT-4 Turbo',   description: 'Legacy' },
    ],
  },
  {
    id: 'google',
    name: 'Google AI',
    color: '#4285F4',
    description: 'Gemini 2.0/1.5 — multimodal, huge context window',
    keyLabel: 'API Key',
    keyPlaceholder: 'AIza...',
    keyHelp: 'Find your key at aistudio.google.com → Get API key',
    needsBaseUrl: false,
    models: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Fast & capable' },
      { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', description: 'Cheapest' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: '2M context' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    color: '#FF7000',
    description: 'Mistral Large, Small, Codestral — European sovereign AI',
    keyLabel: 'API Key',
    keyPlaceholder: '...',
    keyHelp: 'Find your key at console.mistral.ai → API Keys',
    needsBaseUrl: false,
    models: [
      { value: 'mistral-large-latest', label: 'Mistral Large', description: 'Most capable' },
      { value: 'mistral-small-latest', label: 'Mistral Small', description: 'Fast & cheap' },
      { value: 'codestral-latest', label: 'Codestral', description: 'Code-optimized' },
      { value: 'open-mistral-nemo', label: 'Mistral Nemo', description: 'Open & lightweight' },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    color: '#F97316',
    description: 'LPU inference — fastest open-weight models',
    keyLabel: 'API Key',
    keyPlaceholder: 'gsk_...',
    keyHelp: 'Find your key at console.groq.com → API Keys',
    needsBaseUrl: false,
    models: [
      { value: 'llama-3.3-70b-versatile', label: 'LLaMA 3.3 70B', description: 'Best quality' },
      { value: 'llama-3.1-8b-instant', label: 'LLaMA 3.1 8B', description: 'Ultra fast' },
      { value: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 (Groq)', description: 'Reasoning' },
      { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    ],
  },
  {
    id: 'cohere',
    name: 'Cohere',
    color: '#39594D',
    description: 'Command R+ — enterprise RAG & tool use',
    keyLabel: 'API Key',
    keyPlaceholder: '...',
    keyHelp: 'Find your key at dashboard.cohere.com → API Keys',
    needsBaseUrl: false,
    models: [
      { value: 'command-r-plus-08-2024', label: 'Command R+', description: 'Best for RAG' },
      { value: 'command-r-08-2024', label: 'Command R', description: 'Lighter' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    color: '#4D6BFE',
    description: 'DeepSeek V3 & R1 — top-tier reasoning at low cost',
    keyLabel: 'API Key',
    keyPlaceholder: 'sk-...',
    keyHelp: 'Find your key at platform.deepseek.com → API Keys',
    needsBaseUrl: false,
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek V3', description: 'Best value' },
      { value: 'deepseek-reasoner', label: 'DeepSeek R1', description: 'CoT reasoning' },
    ],
  },
  {
    id: 'together',
    name: 'Together AI',
    color: '#7C3AED',
    description: 'Open-weight models — LLaMA, Qwen, Mixtral',
    keyLabel: 'API Key',
    keyPlaceholder: '...',
    keyHelp: 'Find your key at api.together.xyz → Settings → API Keys',
    needsBaseUrl: false,
    models: [
      { value: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'LLaMA 3.3 70B Turbo' },
      { value: 'meta-llama/Llama-3.1-8B-Instruct-Turbo', label: 'LLaMA 3.1 8B Turbo' },
      { value: 'Qwen/Qwen2.5-72B-Instruct-Turbo', label: 'Qwen 2.5 72B' },
      { value: 'mistralai/Mixtral-8x22B-Instruct-v0.1', label: 'Mixtral 8x22B' },
      { value: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1' },
    ],
  },
  {
    id: 'mammoth',
    name: 'Mammoth AI',
    color: '#C2410C',
    description: 'French sovereign AI — Lucie, open-weight models',
    keyLabel: 'API Key',
    keyPlaceholder: 'sk-...',
    keyHelp: 'Find your key at mammoth.ai → API Keys',
    needsBaseUrl: false,
    models: [
      { value: 'mammoth/lucie-7b', label: 'Lucie 7B' },
      { value: 'mammoth/lucie-70b', label: 'Lucie 70B' },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    color: '#6366F1',
    description: 'Unified gateway — 200+ models from all providers',
    keyLabel: 'API Key',
    keyPlaceholder: 'sk-or-v1-...',
    keyHelp: 'Find your key at openrouter.ai → Keys',
    needsBaseUrl: false,
    models: [
      { value: 'openai/gpt-4o', label: 'GPT-4o (via OR)' },
      { value: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (via OR)' },
      { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash (via OR)' },
      { value: 'meta-llama/llama-3.3-70b-instruct', label: 'LLaMA 3.3 70B (via OR)' },
      { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1 (via OR)' },
      { value: 'mistralai/mistral-large', label: 'Mistral Large (via OR)' },
      { value: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen 2.5 72B (via OR)' },
      { value: 'x-ai/grok-3-beta', label: 'Grok 3 (via OR)' },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    color: '#6B7280',
    description: 'Run models locally — LLaMA, Mistral, Qwen, Phi',
    keyLabel: 'API Key',
    keyPlaceholder: 'ollama (or leave empty)',
    keyHelp: 'Leave empty for local Ollama without auth',
    needsBaseUrl: true,
    baseUrlLabel: 'Base URL',
    baseUrlPlaceholder: 'http://localhost:11434',
    models: [
      { value: 'ollama/llama3.2', label: 'LLaMA 3.2' },
      { value: 'ollama/llama3.1', label: 'LLaMA 3.1' },
      { value: 'ollama/mistral', label: 'Mistral' },
      { value: 'ollama/qwen2.5', label: 'Qwen 2.5' },
      { value: 'ollama/deepseek-r1', label: 'DeepSeek R1' },
      { value: 'ollama/phi4', label: 'Phi-4' },
      { value: 'ollama/gemma3', label: 'Gemma 3' },
    ],
  },
]

// Flat list of all models (for agent model selector)
export const ALL_MODELS: (LlmModel & { provider: string; providerName: string })[] =
  LLM_PROVIDERS.flatMap((p) =>
    p.models.map((m) => ({ ...m, provider: p.id, providerName: p.name })),
  )

// Look up provider by model value
export function getProviderForModel(modelValue: string): LlmProvider | undefined {
  return LLM_PROVIDERS.find((p) => p.models.some((m) => m.value === modelValue))
}
