import type { SupabaseClient } from '@supabase/supabase-js'
import { SKILL_TEMPLATES } from '@/lib/skill-templates'
import {
  createAgentAction,
  updateAgentAction,
  setAgentSkillAssignmentsAction,
} from '@/lib/actions'

export type ToolContext = {
  supabase: SupabaseClient
  entityId: string
  userId: string
  sessionId: string
}

export type ToolResult = { ok: true; data: unknown } | { ok: false; error: string }

// Anthropic tool schema type (JSON Schema subset)
export type AnthropicTool = {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export const CONFIGURATOR_TOOLS: AnthropicTool[] = [
  {
    name: 'list_skills',
    description: 'List all marketplace skills available for selection. Returns name, slug, category, description, and operations (each with risk level). Use this early to understand the catalog.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optional category filter (e.g. "communication", "storage", "google")' },
      },
    },
  },
  {
    name: 'list_connectors',
    description: 'List integrations already configured for the current entity. Merges the `connectors` table (OAuth/API-key connectors like Gmail, Drive, Stripe) AND the `mcp_servers` table (MCP integrations like Notion MCP, Apify MCP). Each row carries a `kind` field: "connector" or "mcp". Use this to check whether a required integration exists BEFORE proposing a skill that depends on it. Skills may depend on either kind.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'propose_agent_config',
    description: 'Show the user a preview of the agent configuration you plan to create. Use this before calling create_agent, unless the user has already approved the shape. The UI will render a compact summary card.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        slug: { type: 'string', description: 'URL-safe slug (lowercase, hyphens)' },
        personality: { type: 'string', description: 'System prompt for the agent' },
        model: { type: 'string', enum: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'] },
        role: { type: 'string', enum: ['agent', 'orchestrator'], default: 'agent' },
        skill_slugs: { type: 'array', items: { type: 'string' }, description: 'Slugs of marketplace skills to attach' },
        requires_approval: { type: 'array', items: { type: 'string' }, description: 'Tool names that must be gated by human approval' },
      },
      required: ['name', 'slug', 'personality', 'model', 'skill_slugs'],
    },
  },
  {
    name: 'create_agent',
    description: 'Create the agent in the database. Starts inactive (active=false). Returns the new agent_id. Does NOT attach skills — call attach_skills next.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        slug: { type: 'string' },
        personality: { type: 'string' },
        model: { type: 'string' },
        role: { type: 'string', enum: ['agent', 'orchestrator'], default: 'agent' },
        requires_approval: { type: 'array', items: { type: 'string' } },
        max_tokens_per_job: { type: 'number' },
      },
      required: ['name', 'slug', 'personality', 'model'],
    },
  },
  {
    name: 'attach_skills',
    description: 'Attach a set of marketplace skills to the agent (by skill slug). Replaces any existing skill assignments. Preserves per-operation approval overrides where possible.',
    input_schema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string' },
        skill_slugs: { type: 'array', items: { type: 'string' } },
      },
      required: ['agent_id', 'skill_slugs'],
    },
  },
  {
    name: 'detach_skills',
    description: 'Remove specific skills from an agent by slug.',
    input_schema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string' },
        skill_slugs: { type: 'array', items: { type: 'string' } },
      },
      required: ['agent_id', 'skill_slugs'],
    },
  },
  {
    name: 'update_agent',
    description: 'Update agent fields: personality, model, requires_approval, max_tokens_per_job. Use for post-ready iterations. Cannot modify skills (use attach_skills/detach_skills) and cannot flip active (use finalize_agent).',
    input_schema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string' },
        personality: { type: 'string' },
        model: { type: 'string' },
        requires_approval: { type: 'array', items: { type: 'string' } },
        max_tokens_per_job: { type: 'number' },
      },
      required: ['agent_id'],
    },
  },
  {
    name: 'run_test_job',
    description: 'Launch a real test job against the agent (via AgentOne runner). Returns job_id. Use a realistic task that exercises the agent\'s primary skills (e.g. "List my 3 most recent unread emails" for a Gmail agent). Non-blocking — poll with poll_test_result.',
    input_schema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string' },
        task: { type: 'string', description: 'Natural-language task the agent will execute' },
      },
      required: ['agent_id', 'task'],
    },
  },
  {
    name: 'poll_test_result',
    description: 'Poll a test job for completion. Blocks for up to 30 seconds. Returns status (pending/processing/completed/failed), output text, and tool_calls made. Call repeatedly until status is completed or failed.',
    input_schema: {
      type: 'object',
      properties: { job_id: { type: 'string' } },
      required: ['job_id'],
    },
  },
  {
    name: 'finalize_agent',
    description: 'Mark the agent active=true after a successful test. This is the ONLY way to activate an agent. Always run at least one successful test_job before calling this.',
    input_schema: {
      type: 'object',
      properties: { agent_id: { type: 'string' } },
      required: ['agent_id'],
    },
  },
  {
    name: 'alert_ender',
    description: 'Signal to Ender (the router orchestrator) that a marketplace skill appears broken or poorly designed. Creates an entry in agent_memory that Ender will surface to the Kwint team. Use ONLY when a skill genuinely misbehaves — not as a workaround for config issues.',
    input_schema: {
      type: 'object',
      properties: {
        skill_slug: { type: 'string' },
        issue: { type: 'string', description: 'Short description of what\'s wrong' },
        evidence_job_id: { type: 'string', description: 'job_id of the failing test run, for Ender to inspect' },
      },
      required: ['skill_slug', 'issue'],
    },
  },
]

// ── Handlers ─────────────────────────────────────────────────────────────────

async function resolveSkillIds(supabase: SupabaseClient, entityId: string, slugs: string[]): Promise<string[]> {
  if (!slugs.length) return []
  const { data } = await supabase
    .from('agent_skills')
    .select('id, slug')
    .eq('entity_id', entityId)
    .in('slug', slugs)
  return (data ?? []).map(r => r.id)
}

export async function executeTool(
  ctx: ToolContext,
  name: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'list_skills': {
        const category = input.category as string | undefined
        const rows = SKILL_TEMPLATES
          .filter(s => !category || s.category === category)
          .map(s => ({
            slug: s.slug,
            name: s.name,
            category: s.category,
            description: s.description,
            operations: (s.operations ?? []).map(o => ({ slug: o.slug, name: o.name, risk: o.risk })),
            connector_slug: s.connector?.slug,
          }))
        return { ok: true, data: rows }
      }

      case 'list_connectors': {
        // Two backing tables — `connectors` (OAuth/API-key) and `mcp_servers`
        // (MCP integrations like Notion MCP). The Configurator used to only
        // see the first, which is why it kept telling users "Notion is not
        // configured" even though their Notion MCP was active.
        const [connectorsRes, mcpRes] = await Promise.all([
          ctx.supabase
            .from('connectors')
            .select('slug, name, active, auth_type')
            .eq('entity_id', ctx.entityId),
          ctx.supabase
            .from('mcp_servers')
            .select('slug, name, active, transport')
            .eq('entity_id', ctx.entityId),
        ])
        if (connectorsRes.error) return { ok: false, error: connectorsRes.error.message }
        if (mcpRes.error) return { ok: false, error: mcpRes.error.message }
        const connectors = (connectorsRes.data ?? []).map(c => ({
          kind: 'connector' as const,
          slug: c.slug,
          name: c.name,
          active: c.active,
          auth_type: c.auth_type,
        }))
        const mcps = (mcpRes.data ?? []).map(m => ({
          kind: 'mcp' as const,
          slug: m.slug,
          name: m.name,
          active: m.active,
          transport: m.transport,
        }))
        return { ok: true, data: [...connectors, ...mcps] }
      }

      case 'propose_agent_config':
        return { ok: true, data: { preview: input } }

      case 'create_agent': {
        const payload = { ...input, role: input.role ?? 'agent' }
        const res = await createAgentAction(payload)
        if (!res.ok) {
          console.error('[configurator] create_agent failed:', res.error, 'payload:', JSON.stringify(payload))
          return { ok: false, error: res.error }
        }
        return { ok: true, data: res.data }
      }

      case 'attach_skills': {
        const slugs = (input.skill_slugs as string[]) ?? []
        const skillIds = await resolveSkillIds(ctx.supabase, ctx.entityId, slugs)
        const missing = slugs.length - skillIds.length
        const res = await setAgentSkillAssignmentsAction(input.agent_id as string, skillIds)
        if (!res.ok) return { ok: false, error: res.error }
        return { ok: true, data: { attached: skillIds.length, missing } }
      }

      case 'detach_skills': {
        const slugs = (input.skill_slugs as string[]) ?? []
        const agentId = input.agent_id as string
        // Read current assignments, subtract the slugs, write back
        const { data: current } = await ctx.supabase
          .from('agent_skill_assignments')
          .select('skill_id, agent_skills!inner(slug)')
          .eq('agent_id', agentId)
          .eq('entity_id', ctx.entityId)
        type Row = { skill_id: string; agent_skills: { slug: string } | { slug: string }[] }
        const keep = (current ?? []).filter((r: Row) => {
          const s = Array.isArray(r.agent_skills) ? r.agent_skills[0]?.slug : r.agent_skills?.slug
          return !slugs.includes(s ?? '')
        }).map((r: Row) => r.skill_id)
        const res = await setAgentSkillAssignmentsAction(agentId, keep)
        if (!res.ok) return { ok: false, error: res.error }
        return { ok: true, data: { remaining: keep.length } }
      }

      case 'update_agent': {
        const { agent_id, ...patch } = input as { agent_id: string; [k: string]: unknown }
        const res = await updateAgentAction(agent_id, patch)
        if (!res.ok) return { ok: false, error: res.error }
        return { ok: true, data: res.data }
      }

      case 'run_test_job': {
        const agentId = input.agent_id as string
        const task = input.task as string
        const { data: job, error } = await ctx.supabase
          .from('agent_jobs')
          .insert({
            entity_id: ctx.entityId,
            agent_id: agentId,
            channel: 'api',
            task,
            status: 'pending',
          })
          .select('id')
          .single()
        if (error || !job) return { ok: false, error: error?.message ?? 'insert failed' }

        // Trigger the worker (fire-and-forget) — must use /api/worker, not /api/agent
        const runnerUrl = process.env.NEXT_PUBLIC_AGENT_API_URL
        const runnerToken = process.env.WORKER_SECRET || process.env.API_SECRET_KEY
        if (!runnerUrl || !runnerToken) {
          return { ok: false, error: 'Runner trigger not configured (NEXT_PUBLIC_AGENT_API_URL / WORKER_SECRET missing).' }
        }
        fetch(`${runnerUrl}/api/worker`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${runnerToken}` },
          body: JSON.stringify({ job_id: job.id }),
        }).catch(e => console.error('[configurator] runner trigger failed', e))
        return { ok: true, data: { job_id: job.id } }
      }

      case 'poll_test_result': {
        const jobId = input.job_id as string
        const deadline = Date.now() + 10_000
        while (Date.now() < deadline) {
          const { data: job } = await ctx.supabase
            .from('agent_jobs')
            .select('status, result, error')
            .eq('id', jobId)
            .eq('entity_id', ctx.entityId)
            .maybeSingle()
          if (!job) return { ok: false, error: 'Job not found' }
          if (job.status === 'completed' || job.status === 'failed') {
            const { data: toolCalls } = await ctx.supabase
              .from('tool_calls')
              .select('tool_name, status, arguments, result')
              .eq('job_id', jobId)
              .order('created_at')
              .limit(20)
            return {
              ok: true,
              data: {
                status: job.status,
                result: job.result,
                error: job.error,
                tool_calls: toolCalls ?? [],
              },
            }
          }
          await new Promise(r => setTimeout(r, 2500))
        }
        return { ok: true, data: { status: 'still_running', hint: 'The test job is still running. Stop polling and tell the user the test is in progress — they can check the Sessions page for results.' } }
      }

      case 'finalize_agent': {
        const agentId = input.agent_id as string
        const res = await updateAgentAction(agentId, { active: true })
        if (!res.ok) return { ok: false, error: res.error }
        return { ok: true, data: { activated: true } }
      }

      case 'alert_ender': {
        const fact = `Skill issue reported by Configurator — skill=${input.skill_slug}: ${input.issue}${input.evidence_job_id ? ` (evidence job_id=${input.evidence_job_id})` : ''} [session ${ctx.sessionId}]`
        const { error } = await ctx.supabase.from('agent_memory').insert({
          entity_id: ctx.entityId,
          fact,
          category: 'ender_alert',
          importance: 5,
          source: 'configurator',
        })
        if (error) return { ok: false, error: error.message }
        return { ok: true, data: { alerted: true } }
      }

      default:
        return { ok: false, error: `Unknown tool: ${name}` }
    }
  } catch (e) {
    console.error('[configurator] tool exec error', name, e)
    return { ok: false, error: e instanceof Error ? e.message : 'Tool execution failed' }
  }
}
