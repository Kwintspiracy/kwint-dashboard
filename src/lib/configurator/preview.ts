/**
 * Derives a real-time AgentPreview from the configurator chat history.
 *
 * The configurator page renders a preview sidebar that "fills up" as the
 * LLM calls its tools (propose_agent_config, create_agent, attach_skills,
 * run_test_job, finalize_agent, ...). This function is the single source
 * of truth for that sidebar — pure, deterministic, `useMemo`-friendly.
 *
 * Extracted from page.tsx so it can be unit-tested without pulling React.
 */

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: ContentBlock[] | string
}

export type AgentPreview = {
  name?: string
  slug?: string
  model?: string
  personality?: string
  skillSlugs: string[]
  requiresApproval: string[]
  maxTokens?: number
  agentId?: string
  testStatus: 'running' | 'passed' | 'failed' | null
  testError?: string
  activated: boolean
}

export const EMPTY_PREVIEW: AgentPreview = {
  skillSlugs: [],
  requiresApproval: [],
  testStatus: null,
  activated: false,
}

/**
 * Derive the live preview from chat history, optionally starting from an
 * `initial` state (used when the Configurator loads an EXISTING agent via
 * the "Edit with AI" button — the sidebar then shows the current agent
 * state immediately instead of an empty card, and any subsequent tool_use
 * from the LLM layers on top).
 */
export function deriveAgentPreview(
  messages: ChatMessage[],
  initial?: Partial<AgentPreview>,
): AgentPreview {
  const p: AgentPreview = {
    ...EMPTY_PREVIEW,
    skillSlugs: [],
    requiresApproval: [],
    ...(initial ?? {}),
    // Re-normalise array fields: spread of an undefined override must not
    // leak into the arrays above.
    skillSlugs: initial?.skillSlugs ? [...initial.skillSlugs] : [],
    requiresApproval: initial?.requiresApproval ? [...initial.requiresApproval] : [],
  }

  for (const msg of messages) {
    const blocks = typeof msg.content === 'string' ? [] : (msg.content as ContentBlock[])
    for (const b of blocks) {
      if (b.type === 'tool_use') {
        const inp = b.input as Record<string, unknown>
        switch (b.name) {
          case 'propose_agent_config':
          case 'create_agent':
            if (inp.name) p.name = String(inp.name)
            if (inp.slug) p.slug = String(inp.slug)
            if (inp.model) p.model = String(inp.model)
            if (inp.personality) p.personality = String(inp.personality)
            if (Array.isArray(inp.skill_slugs)) p.skillSlugs = inp.skill_slugs as string[]
            if (Array.isArray(inp.requires_approval)) p.requiresApproval = inp.requires_approval as string[]
            if (inp.max_tokens_per_job) p.maxTokens = Number(inp.max_tokens_per_job)
            break
          case 'attach_skills':
            if (Array.isArray(inp.skill_slugs)) p.skillSlugs = inp.skill_slugs as string[]
            break
          case 'detach_skills':
            if (Array.isArray(inp.skill_slugs)) {
              const remove = new Set(inp.skill_slugs as string[])
              p.skillSlugs = p.skillSlugs.filter(s => !remove.has(s))
            }
            break
          case 'update_agent':
            if (inp.personality) p.personality = String(inp.personality)
            if (inp.model) p.model = String(inp.model)
            if (Array.isArray(inp.requires_approval)) p.requiresApproval = inp.requires_approval as string[]
            if (inp.max_tokens_per_job) p.maxTokens = Number(inp.max_tokens_per_job)
            break
          case 'run_test_job':
            p.testStatus = 'running'
            p.testError = undefined
            break
          case 'finalize_agent':
            break
        }
      }

      if (b.type === 'tool_result') {
        let parsed: Record<string, unknown> | null = null
        try { parsed = JSON.parse(b.content) } catch { /* skip */ }
        if (!parsed || typeof parsed !== 'object') continue
        const data = (parsed as { ok?: boolean; data?: Record<string, unknown> })

        if (data.ok && data.data) {
          const d = data.data
          if (typeof d.id === 'string' && !p.agentId) p.agentId = d.id
          if (typeof d.activated === 'boolean' && d.activated) p.activated = true

          if (typeof d.status === 'string') {
            if (d.status === 'completed') {
              p.testStatus = 'passed'
              p.testError = undefined
            } else if (d.status === 'failed') {
              p.testStatus = 'failed'
              p.testError = typeof d.error === 'string' ? d.error : undefined
            }
          }
        }
      }
    }
  }
  return p
}
