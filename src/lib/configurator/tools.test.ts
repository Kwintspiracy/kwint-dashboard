import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

// ── Mocks ─────────────────────────────────────────────────────────────
// Server actions called by tool handlers. Mocked at module level so
// the handlers can resolve the imports without touching real auth.
vi.mock('@/lib/actions', () => ({
  createAgentAction: vi.fn(async () => ({ ok: true, data: { id: 'agent-xyz' } })),
  updateAgentAction: vi.fn(async () => ({ ok: true, data: { id: 'agent-xyz' } })),
  setAgentSkillAssignmentsAction: vi.fn(async () => ({ ok: true, data: {} })),
  // createSkillAction returns a fresh id each call so we can track provisioning
  createSkillAction: vi.fn(async () => ({ ok: true, data: { id: `skill-${Math.random().toString(36).slice(2, 8)}` } })),
}))

import { executeTool, type ToolContext } from './tools'

// Build a supabase client stub that records calls and lets tests script
// return values per `from(table)` invocation.
function buildSupabaseStub(responses: Record<string, unknown> = {}) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = []

  function chainFor(table: string) {
    const chain: Record<string, (...args: unknown[]) => unknown> = {}
    const methods = [
      'select', 'insert', 'update', 'delete', 'eq', 'in', 'order',
      'limit', 'gte', 'lt', 'lte', 'not', 'single', 'maybeSingle',
    ]
    for (const m of methods) {
      chain[m] = vi.fn((...args: unknown[]) => {
        calls.push({ table, method: m, args })
        // Terminal methods return the scripted response (or defaults).
        if (m === 'single' || m === 'maybeSingle') {
          return Promise.resolve(responses[`${table}.${m}`] ?? { data: null, error: null })
        }
        return chain
      })
    }
    // `then` so `await chain` works for non-terminal queries.
    chain.then = (onFulfilled: unknown) => {
      const resp = responses[`${table}.list`] ?? { data: [], error: null }
      return Promise.resolve(resp).then(onFulfilled as (v: unknown) => unknown)
    }
    return chain
  }

  return {
    client: {
      from: vi.fn((table: string) => chainFor(table)),
    } as unknown as SupabaseClient,
    calls,
  }
}

function makeCtx(supabase: SupabaseClient): ToolContext {
  return {
    supabase,
    entityId: 'entity-1',
    userId: 'user-1',
    sessionId: 'session-1',
  }
}

describe('executeTool', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 202 })) as unknown as typeof fetch
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  // ── Simple passthroughs ────────────────────────────────────────────

  it('propose_agent_config echoes the input as preview', async () => {
    const { client } = buildSupabaseStub()
    const res = await executeTool(makeCtx(client), 'propose_agent_config', {
      name: 'Gmail Buddy', slug: 'gmail-buddy', model: 'claude-opus-4-6',
    })
    expect(res).toEqual({ ok: true, data: { preview: { name: 'Gmail Buddy', slug: 'gmail-buddy', model: 'claude-opus-4-6' } } })
  })

  it('list_skills returns the static catalog with risk-mapped operations', async () => {
    const { client } = buildSupabaseStub()
    const res = await executeTool(makeCtx(client), 'list_skills', {})
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(Array.isArray(res.data)).toBe(true)
      expect((res.data as Array<{ slug: string }>).length).toBeGreaterThan(0)
    }
  })

  it('list_skills filters by category', async () => {
    const { client } = buildSupabaseStub()
    const all = await executeTool(makeCtx(client), 'list_skills', {})
    const scoped = await executeTool(makeCtx(client), 'list_skills', { category: 'communication' })
    expect(all.ok && scoped.ok).toBe(true)
    if (all.ok && scoped.ok) {
      const allCount = (all.data as unknown[]).length
      const scopedCount = (scoped.data as unknown[]).length
      expect(scopedCount).toBeLessThanOrEqual(allCount)
    }
  })

  it('returns ok:false for unknown tool', async () => {
    const { client } = buildSupabaseStub()
    const res = await executeTool(makeCtx(client), 'definitely_not_a_tool', {})
    expect(res).toEqual({ ok: false, error: 'Unknown tool: definitely_not_a_tool' })
  })

  // ── list_connectors must include MCP servers ─────────────────────────
  // Past bug: the Configurator kept telling users "Notion is not configured"
  // because Notion is registered as an mcp_servers row, not a connectors
  // row. The handler now queries both tables and merges with a `kind` field.
  it('list_connectors merges connectors + mcp_servers with kind discriminator', async () => {
    const { client } = buildSupabaseStub({
      'connectors.list': { data: [
        { slug: 'gmail', name: 'Gmail', active: true, auth_type: 'oauth2' },
        { slug: 'tavily', name: 'Tavily Search', active: true, auth_type: 'api_key' },
      ], error: null },
      'mcp_servers.list': { data: [
        { slug: 'notion', name: 'Notion MCP', active: true, transport: 'http' },
        { slug: 'apify', name: 'Apify MCP', active: true, transport: 'http' },
      ], error: null },
    })
    const res = await executeTool(makeCtx(client), 'list_connectors', {})
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const data = res.data as Array<{ kind: string; slug: string; name: string }>
    const slugs = data.map(d => d.slug).sort()
    expect(slugs).toEqual(['apify', 'gmail', 'notion', 'tavily'])
    const notion = data.find(d => d.slug === 'notion')
    expect(notion?.kind).toBe('mcp')
    expect(notion?.name).toBe('Notion MCP')
    const gmail = data.find(d => d.slug === 'gmail')
    expect(gmail?.kind).toBe('connector')
  })

  it('list_connectors surfaces an error if the mcp_servers query fails', async () => {
    const { client } = buildSupabaseStub({
      'connectors.list': { data: [], error: null },
      'mcp_servers.list': { data: null, error: { message: 'mcp_servers RLS denied' } },
    })
    const res = await executeTool(makeCtx(client), 'list_connectors', {})
    expect(res).toEqual({ ok: false, error: 'mcp_servers RLS denied' })
  })

  // ── attach_skills must auto-provision missing skills from catalog ─────
  // Past bug: list_skills surfaces the static SKILL_TEMPLATES catalog, so
  // the LLM picks slugs like 'notion' or 'memory' that the entity has
  // never provisioned. attach_skills then reported `missing: N` even
  // though the slug was in the catalog — the agent was created but could
  // not be tested. Every first-time skill use was blocked.
  it('attach_skills auto-provisions a catalog slug not yet in agent_skills', async () => {
    const { createSkillAction, setAgentSkillAssignmentsAction } = await import('@/lib/actions')
    vi.clearAllMocks()
    const { client } = buildSupabaseStub({
      // No existing agent_skills rows for this entity
      'agent_skills.list': { data: [], error: null },
    })
    const res = await executeTool(makeCtx(client), 'attach_skills', {
      agent_id: 'agent-xyz', skill_slugs: ['notion', 'memory'],
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const data = res.data as { attached: number; missing: number; missing_slugs: string[] }
    expect(data.attached).toBe(2)
    expect(data.missing).toBe(0)
    expect(data.missing_slugs).toEqual([])
    expect(createSkillAction).toHaveBeenCalledTimes(2)
    expect(setAgentSkillAssignmentsAction).toHaveBeenCalledWith(
      'agent-xyz', expect.arrayContaining([expect.stringMatching(/^skill-/)]),
    )
  })

  it('attach_skills flags truly-unknown slugs as missing without blocking the rest', async () => {
    vi.clearAllMocks()
    const { client } = buildSupabaseStub({
      'agent_skills.list': { data: [], error: null },
    })
    const res = await executeTool(makeCtx(client), 'attach_skills', {
      agent_id: 'agent-xyz', skill_slugs: ['notion', 'this-slug-does-not-exist'],
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const data = res.data as { attached: number; missing: number; missing_slugs: string[] }
    expect(data.attached).toBe(1)
    expect(data.missing).toBe(1)
    expect(data.missing_slugs).toEqual(['this-slug-does-not-exist'])
  })

  it('attach_skills reuses existing agent_skills rows without re-provisioning', async () => {
    const { createSkillAction } = await import('@/lib/actions')
    vi.clearAllMocks()
    const { client } = buildSupabaseStub({
      'agent_skills.list': { data: [
        { id: 'existing-skill-1', slug: 'notion' },
      ], error: null },
    })
    const res = await executeTool(makeCtx(client), 'attach_skills', {
      agent_id: 'agent-xyz', skill_slugs: ['notion'],
    })
    expect(res.ok).toBe(true)
    expect(createSkillAction).not.toHaveBeenCalled()
  })

  // ── alert_ender must use an allowed agent_memory.category ─────────────
  // Past bug: used category='ender_alert' which failed the CHECK
  // constraint {preference, context, outcome, learned_rule}. Every
  // escalation from the Configurator was silently lost.
  it('alert_ender writes with category=context and tags [ENDER_ALERT]', async () => {
    const captured: Array<Record<string, unknown>> = []
    const client = {
      from: vi.fn(() => ({
        insert: vi.fn((row: Record<string, unknown>) => {
          captured.push(row)
          return Promise.resolve({ error: null })
        }),
      })),
    } as unknown as SupabaseClient
    const res = await executeTool(makeCtx(client), 'alert_ender', {
      skill_slug: 'notion',
      issue: 'attach failed',
      evidence_job_id: 'job-abc',
    })
    expect(res).toEqual({ ok: true, data: { alerted: true } })
    expect(captured).toHaveLength(1)
    expect(captured[0].category).toBe('context')
    expect(captured[0].fact).toMatch(/^\[ENDER_ALERT\]/)
  })

  // ── run_test_job: the regression hotspot ─────────────────────────────
  // Past bugs: wrong endpoint (/api/agent), wrong env var (AGENT_API_TOKEN).
  // These tests pin the correct wiring so future refactors can't silently regress.

  it('run_test_job posts to /api/worker (NOT /api/agent)', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_API_URL', 'https://runner.example.com')
    vi.stubEnv('WORKER_SECRET', 'secret-value')

    const { client } = buildSupabaseStub({
      'agent_jobs.single': { data: { id: 'job-123' }, error: null },
    })
    const res = await executeTool(makeCtx(client), 'run_test_job', {
      agent_id: 'agent-xyz', task: 'test task',
    })
    expect(res).toEqual({ ok: true, data: { job_id: 'job-123' } })

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://runner.example.com/api/worker')
    expect(init.method).toBe('POST')
    // Runner's /api/worker (AgentOne/api/worker.py) only accepts the
    // X-Worker-Secret header. Bug 2026-04-19: Bearer was used and every
    // Configurator test job silently 403'd because the runner rejected
    // the auth, the fire-and-forget catch swallowed it, and the job sat
    // in `pending`/`processing` until the user manually killed it.
    expect(init.headers['X-Worker-Secret']).toBe('secret-value')
    expect(init.headers.Authorization).toBeUndefined()
    expect(JSON.parse(init.body)).toEqual({ job_id: 'job-123' })
  })

  it('run_test_job falls back from WORKER_SECRET to API_SECRET_KEY if unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_API_URL', 'https://runner.example.com')
    vi.stubEnv('WORKER_SECRET', '')
    vi.stubEnv('API_SECRET_KEY', 'legacy-key')

    const { client } = buildSupabaseStub({
      'agent_jobs.single': { data: { id: 'job-456' }, error: null },
    })
    const res = await executeTool(makeCtx(client), 'run_test_job', {
      agent_id: 'agent-xyz', task: 'test',
    })
    expect(res.ok).toBe(true)

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['X-Worker-Secret']).toBe('legacy-key')
  })

  it('run_test_job rejects when NEXT_PUBLIC_AGENT_API_URL is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_API_URL', '')
    vi.stubEnv('WORKER_SECRET', 'secret')

    const { client } = buildSupabaseStub({
      'agent_jobs.single': { data: { id: 'job-1' }, error: null },
    })
    const res = await executeTool(makeCtx(client), 'run_test_job', {
      agent_id: 'a', task: 't',
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/Runner trigger not configured/)
  })

  it('run_test_job rejects when both WORKER_SECRET and API_SECRET_KEY are missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_API_URL', 'https://runner.example.com')
    vi.stubEnv('WORKER_SECRET', '')
    vi.stubEnv('API_SECRET_KEY', '')

    const { client } = buildSupabaseStub({
      'agent_jobs.single': { data: { id: 'job-1' }, error: null },
    })
    const res = await executeTool(makeCtx(client), 'run_test_job', {
      agent_id: 'a', task: 't',
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/WORKER_SECRET/)
  })

  it('run_test_job marks the job failed when /api/worker returns 4xx (was: silent loss)', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_API_URL', 'https://runner.example.com')
    vi.stubEnv('WORKER_SECRET', 'wrong-secret')

    const updateMock = vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) }))
    const { client } = buildSupabaseStub({
      'agent_jobs.single': { data: { id: 'job-403' }, error: null },
    })
    // Splice in an `update` chain on the stub so we can assert it was called.
    const origFrom = client.from
    client.from = ((table: string) => {
      const base = origFrom(table)
      return Object.assign(base, { update: updateMock })
    }) as typeof client.from

    globalThis.fetch = vi.fn(async () => new Response('Invalid worker secret', { status: 403 })) as unknown as typeof fetch

    const res = await executeTool(makeCtx(client), 'run_test_job', {
      agent_id: 'a', task: 't',
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/403/)
    // Job row must be flipped to `failed` so the user/Configurator stop
    // waiting on a job the worker will never pick up.
    expect(updateMock).toHaveBeenCalled()
    const patch = (updateMock.mock.calls[0] as unknown as [{ status?: string; error?: string }])[0]
    expect(patch.status).toBe('failed')
    expect(patch.error).toMatch(/403/)
  })

  it('run_test_job surfaces Supabase insert errors', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_API_URL', 'https://runner.example.com')
    vi.stubEnv('WORKER_SECRET', 'secret')

    const { client } = buildSupabaseStub({
      'agent_jobs.single': { data: null, error: { message: 'permission denied' } },
    })
    const res = await executeTool(makeCtx(client), 'run_test_job', {
      agent_id: 'a', task: 't',
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toBe('permission denied')
  })

  // ── create_agent delegates to the server action ─────────────────────

  it('create_agent defaults role to "agent" when not provided', async () => {
    const actions = await import('@/lib/actions')
    const createMock = actions.createAgentAction as unknown as ReturnType<typeof vi.fn>
    createMock.mockClear()

    const { client } = buildSupabaseStub()
    await executeTool(makeCtx(client), 'create_agent', {
      name: 'A', slug: 'a', personality: 'p', model: 'claude-opus-4-6',
    })
    expect(createMock).toHaveBeenCalledTimes(1)
    const payload = createMock.mock.calls[0][0] as Record<string, unknown>
    expect(payload.role).toBe('agent')
  })

  it('create_agent propagates action failure to tool caller', async () => {
    const actions = await import('@/lib/actions')
    const createMock = actions.createAgentAction as unknown as ReturnType<typeof vi.fn>
    createMock.mockResolvedValueOnce({ ok: false, error: 'slug taken' })

    const { client } = buildSupabaseStub()
    const res = await executeTool(makeCtx(client), 'create_agent', {
      name: 'A', slug: 'a', personality: 'p', model: 'claude-opus-4-6',
    })
    expect(res).toEqual({ ok: false, error: 'slug taken' })
  })
})
