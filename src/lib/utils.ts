// Per-model pricing in USD per 1M tokens
const MODEL_RATES: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-opus-4-7':           { input: 15,    output: 75   },
  'claude-opus-4-6':           { input: 15,    output: 75   },
  'claude-sonnet-4-6':         { input: 3,     output: 15   },
  'claude-haiku-4-5-20251001': { input: 0.80,  output: 4    },
  'claude-haiku-4-5':          { input: 0.80,  output: 4    },
  // OpenAI — GPT-4.1
  'gpt-4.1':                   { input: 2,     output: 8    },
  'gpt-4.1-mini':              { input: 0.40,  output: 1.60 },
  'gpt-4.1-nano':              { input: 0.10,  output: 0.40 },
  // OpenAI — GPT-4o
  'gpt-4o':                    { input: 2.50,  output: 10   },
  'gpt-4o-mini':               { input: 0.15,  output: 0.60 },
  // OpenAI — o-series
  'o4-mini':                   { input: 1.10,  output: 4.40 },
  'o3':                        { input: 10,    output: 40   },
  'o3-mini':                   { input: 1.10,  output: 4.40 },
  'o1':                        { input: 15,    output: 60   },
  'o1-mini':                   { input: 1.10,  output: 4.40 },
  // OpenAI — legacy
  'gpt-4-turbo':               { input: 10,    output: 30   },
}

const FALLBACK_RATE = { input: 3, output: 15 }

export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string = 'claude-sonnet-4-6'
): string {
  const rates = MODEL_RATES[model] ?? FALLBACK_RATE
  const cost = (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(2)}`
}

// Legacy: when only a blended token total is available
export function estimateCostBlended(tokens: number, model: string = 'claude-sonnet-4-6'): string {
  return estimateCost(Math.round(tokens * 0.7), Math.round(tokens * 0.3), model)
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function truncate(text: string, maxLen: number = 60): string {
  if (!text) return ''
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function humanizeError(raw: string): string {
  if (!raw) return 'Something went wrong. Please try again.'
  const s = raw.toLowerCase()
  if (s.includes('unique') && s.includes('slug')) return 'An item with this name already exists. Try a different name.'
  if (s.includes('unique') && (s.includes('agent') || s.includes('name'))) return 'An item with this name already exists. Try a different name.'
  if (s.includes('foreign key') || s.includes('violates foreign key')) return 'This item is still in use and cannot be deleted.'
  if (s.includes('jwt expired') || s.includes('session expired')) return 'Your session has expired. Please refresh the page.'
  if (s.includes('not found') || s.includes('pgrst116')) return 'Item not found.'
  if (s.includes('network') || s.includes('fetch failed')) return 'Network error. Please check your connection and try again.'
  return 'Something went wrong. Please try again.'
}

export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  web_search: 'Search the web',
  http_request: 'Web request',
  send_notification: 'Send notification',
  delegate_task: 'Assign to agent',
  save_memory: 'Remember information',
  load_skill: 'Load skill',
  send_email: 'Send email',
  send_message: 'Send message',
  read_file: 'Read file',
  write_file: 'Write file',
  run_code: 'Run code',
  search_memory: 'Search memory',
  create_task: 'Create task',
  update_task: 'Update task',
}

export function displayToolName(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] ?? toolName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
