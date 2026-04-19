import { describe, it, expect } from 'vitest'
import { deriveAgentPreview, EMPTY_PREVIEW, type ChatMessage } from './preview'

// Tiny helpers to keep the fixtures readable.
const toolUse = (name: string, input: Record<string, unknown>, id = `tu-${name}`): ChatMessage => ({
  role: 'assistant',
  content: [{ type: 'tool_use', id, name, input }],
})
const toolResult = (id: string, payload: unknown): ChatMessage => ({
  role: 'user',
  content: [{ type: 'tool_result', tool_use_id: id, content: JSON.stringify(payload) }],
})
const userText = (text: string): ChatMessage => ({ role: 'user', content: text })

describe('deriveAgentPreview', () => {
  it('returns an empty preview for no messages', () => {
    expect(deriveAgentPreview([])).toEqual(EMPTY_PREVIEW)
  })

  // ── initial-state overlay ─────────────────────────────────────────────
  // Used by the "Edit with AI" flow so the sidebar shows the existing
  // agent's state immediately, before any tool_use fires.
  it('applies the initial seed when no tool_use messages are present', () => {
    const preview = deriveAgentPreview([], {
      name: 'Existing Agent',
      slug: 'existing',
      model: 'claude-opus-4-7',
      personality: 'prior personality',
      skillSlugs: ['notion', 'memory'],
      requiresApproval: ['gmail_send_email'],
      agentId: 'agent-123',
      activated: true,
    })
    expect(preview.name).toBe('Existing Agent')
    expect(preview.model).toBe('claude-opus-4-7')
    expect(preview.skillSlugs).toEqual(['notion', 'memory'])
    expect(preview.requiresApproval).toEqual(['gmail_send_email'])
    expect(preview.agentId).toBe('agent-123')
    expect(preview.activated).toBe(true)
  })

  it('lets tool_use update_agent override the initial personality', () => {
    const preview = deriveAgentPreview(
      [toolUse('update_agent', { agent_id: 'agent-123', personality: 'NEW personality' })],
      { name: 'Existing', personality: 'OLD personality', skillSlugs: [], requiresApproval: [] },
    )
    expect(preview.name).toBe('Existing')
    expect(preview.personality).toBe('NEW personality')
  })

  it('lets tool_use detach_skills remove from the initial skill list', () => {
    const preview = deriveAgentPreview(
      [toolUse('detach_skills', { skill_slugs: ['memory'] })],
      { skillSlugs: ['notion', 'memory'], requiresApproval: [] },
    )
    expect(preview.skillSlugs).toEqual(['notion'])
  })

  it('ignores plain-text messages without tool_use blocks', () => {
    const preview = deriveAgentPreview([
      userText('Please build me an agent'),
      { role: 'assistant', content: 'Sure, what would you like?' },
    ])
    expect(preview).toEqual(EMPTY_PREVIEW)
  })

  it('fills identity/model/personality/skills from propose_agent_config', () => {
    const preview = deriveAgentPreview([
      toolUse('propose_agent_config', {
        name: 'Gmail Buddy',
        slug: 'gmail-buddy',
        model: 'claude-opus-4-6',
        personality: 'Helpful email assistant.',
        skill_slugs: ['gmail', 'google-drive'],
        requires_approval: ['gmail_send_email'],
        max_tokens_per_job: 50000,
      }),
    ])
    expect(preview.name).toBe('Gmail Buddy')
    expect(preview.slug).toBe('gmail-buddy')
    expect(preview.model).toBe('claude-opus-4-6')
    expect(preview.personality).toBe('Helpful email assistant.')
    expect(preview.skillSlugs).toEqual(['gmail', 'google-drive'])
    expect(preview.requiresApproval).toEqual(['gmail_send_email'])
    expect(preview.maxTokens).toBe(50000)
    expect(preview.agentId).toBeUndefined()
    expect(preview.testStatus).toBeNull()
  })

  it('update_agent overrides personality/model/approval but keeps name/slug from earlier create', () => {
    const preview = deriveAgentPreview([
      toolUse('create_agent', { name: 'Original', slug: 'original', model: 'claude-sonnet-4-6', personality: 'v1' }),
      toolUse('update_agent', { personality: 'v2 — revised', model: 'claude-opus-4-6', requires_approval: ['drive_upload'] }),
    ])
    expect(preview.name).toBe('Original')
    expect(preview.slug).toBe('original')
    expect(preview.model).toBe('claude-opus-4-6')
    expect(preview.personality).toBe('v2 — revised')
    expect(preview.requiresApproval).toEqual(['drive_upload'])
  })

  it('attach_skills sets the list, detach_skills removes specific slugs', () => {
    const preview = deriveAgentPreview([
      toolUse('attach_skills', { skill_slugs: ['gmail', 'notion', 'slack'] }),
      toolUse('detach_skills', { skill_slugs: ['slack'] }),
    ])
    expect(preview.skillSlugs).toEqual(['gmail', 'notion'])
  })

  it('run_test_job flips status to running', () => {
    const preview = deriveAgentPreview([
      toolUse('create_agent', { name: 'Test' }),
      toolUse('run_test_job', { task: 'say hi' }),
    ])
    expect(preview.testStatus).toBe('running')
  })

  it('tool_result with status=completed flips testStatus to passed and clears error', () => {
    const preview = deriveAgentPreview([
      toolUse('run_test_job', { task: 'say hi' }, 'tu-run'),
      toolResult('tu-run', { ok: true, data: { status: 'completed', result: 'hi!' } }),
    ])
    expect(preview.testStatus).toBe('passed')
    expect(preview.testError).toBeUndefined()
  })

  it('tool_result with status=failed captures the error message', () => {
    const preview = deriveAgentPreview([
      toolUse('run_test_job', { task: 'do stuff' }, 'tu-run'),
      toolResult('tu-run', { ok: true, data: { status: 'failed', error: 'Tool X timed out' } }),
    ])
    expect(preview.testStatus).toBe('failed')
    expect(preview.testError).toBe('Tool X timed out')
  })

  // Bug 2026-04-19: the sidebar's "Testing..." spinner stayed lit forever
  // because run_test_job's tool_result returned `{ job_id }` but the
  // preview never captured it, so the page had no way to client-poll the
  // job's actual status. The LLM stops calling poll_test_result after one
  // `still_running` response (per its system prompt), so the spinner had
  // no exit condition once that path was taken.
  it('run_test_job tool_result captures job_id so the sidebar can client-poll', () => {
    const preview = deriveAgentPreview([
      toolUse('run_test_job', { task: 'go' }, 'tu-run'),
      toolResult('tu-run', { ok: true, data: { job_id: 'job-abc-123' } }),
    ])
    expect(preview.testJobId).toBe('job-abc-123')
    // Status stays running — no completion payload yet.
    expect(preview.testStatus).toBe('running')
  })

  it('a new run_test_job clears the previous testJobId until the new tool_result returns one', () => {
    const preview = deriveAgentPreview([
      toolUse('run_test_job', { task: 'first' }, 'tu-run-1'),
      toolResult('tu-run-1', { ok: true, data: { job_id: 'job-old' } }),
      toolUse('run_test_job', { task: 'second' }, 'tu-run-2'),
      // No tool_result yet for the second run.
    ])
    // Stale jobId must NOT leak — otherwise the polling effect would query
    // the old job and decide the new test is "passed" based on stale state.
    expect(preview.testJobId).toBeUndefined()
    expect(preview.testStatus).toBe('running')
  })

  it('tool_result with an agent id sets agentId on the preview', () => {
    const preview = deriveAgentPreview([
      toolUse('create_agent', { name: 'Agent' }, 'tu-create'),
      toolResult('tu-create', { ok: true, data: { id: '00000000-0000-0000-0000-000000000001' } }),
    ])
    expect(preview.agentId).toBe('00000000-0000-0000-0000-000000000001')
  })

  it('later agent ids do NOT overwrite the first one (create is authoritative)', () => {
    const preview = deriveAgentPreview([
      toolUse('create_agent', { name: 'Agent' }, 'tu-create'),
      toolResult('tu-create', { ok: true, data: { id: 'real-agent-id' } }),
      toolResult('tu-other', { ok: true, data: { id: 'some-other-id' } }),
    ])
    expect(preview.agentId).toBe('real-agent-id')
  })

  it('activated flips true when a tool_result reports activated=true', () => {
    const preview = deriveAgentPreview([
      toolUse('finalize_agent', {}, 'tu-final'),
      toolResult('tu-final', { ok: true, data: { activated: true } }),
    ])
    expect(preview.activated).toBe(true)
  })

  it('ignores tool_result payloads that fail JSON parsing', () => {
    const preview = deriveAgentPreview([
      toolUse('run_test_job', { task: 'go' }, 'tu-run'),
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu-run', content: 'plain string not json' }] },
    ])
    // testStatus stays 'running' since no completed payload parsed
    expect(preview.testStatus).toBe('running')
  })

  it('full lifecycle: propose → create → attach → run → pass → finalize → activated', () => {
    const messages: ChatMessage[] = [
      userText('build an email assistant'),
      toolUse('propose_agent_config', {
        name: 'Gmail Buddy',
        slug: 'gmail-buddy',
        model: 'claude-opus-4-6',
        personality: 'Helpful.',
        skill_slugs: ['gmail'],
        requires_approval: ['gmail_send_email'],
      }, 'tu-propose'),
      userText('yes, create it'),
      toolUse('create_agent', {
        name: 'Gmail Buddy',
        slug: 'gmail-buddy',
        model: 'claude-opus-4-6',
        personality: 'Helpful.',
      }, 'tu-create'),
      toolResult('tu-create', { ok: true, data: { id: 'agent-xyz' } }),
      toolUse('attach_skills', { skill_slugs: ['gmail'] }, 'tu-attach'),
      toolResult('tu-attach', { ok: true, data: { attached: ['gmail'] } }),
      toolUse('run_test_job', { task: 'test' }, 'tu-run'),
      toolResult('tu-run', { ok: true, data: { status: 'completed', result: 'ok' } }),
      toolUse('finalize_agent', {}, 'tu-final'),
      toolResult('tu-final', { ok: true, data: { activated: true } }),
    ]
    const preview = deriveAgentPreview(messages)
    expect(preview.name).toBe('Gmail Buddy')
    expect(preview.slug).toBe('gmail-buddy')
    expect(preview.agentId).toBe('agent-xyz')
    expect(preview.skillSlugs).toEqual(['gmail'])
    expect(preview.requiresApproval).toEqual(['gmail_send_email'])
    expect(preview.testStatus).toBe('passed')
    expect(preview.activated).toBe(true)
  })
})
