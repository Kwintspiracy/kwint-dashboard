# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Dev server (Next.js 16)
npm run build        # Production build (standalone output)
npm run lint         # ESLint
npm test             # Vitest (unit tests, single run)
npm run test:watch   # Vitest in watch mode
npm run e2e          # Playwright end-to-end tests
npm run e2e:ui       # Playwright with UI
```

Run a single test file: `npx vitest run src/path/to/file.test.tsx`

## Architecture

**Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase (auth + Postgres + pgvector), SWR, Zod 4, Recharts, Sonner toasts, Phosphor Icons.

**Multi-tenant agent management dashboard** — users create workspaces (entities), then manage AI agents, connectors, skills, automations, memories, and MCP servers within them.

### App Router Layout

- `src/app/layout.tsx` — Root layout (minimal, loads globals.css)
- `src/app/(dashboard)/layout.tsx` — Dashboard shell: `AuthProvider` → `ThemeProvider` → `Sidebar` + main content. All dashboard pages are children of this layout.
- `src/app/page.tsx` — Public landing page (not behind auth)
- `src/app/(dashboard)/` — All authenticated pages: stats, agents, jobs, memories, connectors, skills, mcp-servers, automations, approvals, logs

### Server Actions (`src/lib/actions.ts`)

All mutations are Server Actions following a strict pattern:
- Return `ActionResult<T>` = `{ ok: true, data }` or `{ ok: false, error }`
- Use `requireAuth()` / `requireAuthWithEntity()` guards
- Validate all inputs with Zod schemas from `src/lib/schemas.ts`
- Entity isolation via `kwint_active_entity` cookie — every query filters by entity_id
- Helper functions: `ok()`, `fail()`, `dbError()`, `dbFail()`

When adding a new action: define the Zod schema in `schemas.ts`, add the action in `actions.ts` using the same auth + validation + result pattern.

### Client Data Fetching (`src/hooks/useData.ts`)

SWR wrapper with: 10s dedup, 3 retries at 5s intervals, keepPreviousData, no revalidate-on-focus.

### Supabase Clients

- `src/lib/supabase-server.ts` — Server-side client (uses `cookies()` from next/headers)
- `src/lib/supabase.ts` — Browser client (singleton)

### Entity/Auth Flow (`src/proxy.ts`)

Auth gating logic: checks session, manages entity cookies (`kwint_has_entities`, `kwint_active_entity`), redirects unauthenticated users to `/login` and entity-less users to `/onboarding`.

### API Routes

- `GET /api/health` — Health check
- `GET /api/jobs/[jobId]/stream` — SSE job streaming (polls Supabase every 2s, 5min max)
- `POST /api/webhook/[slug]` — Webhook trigger endpoint
- `POST /auth/callback` — Supabase auth callback

### Key Lib Files

| File | Purpose |
|------|---------|
| `actions.ts` | All Server Actions (CRUD for every entity type) |
| `schemas.ts` | Zod schemas for all inputs |
| `agent-templates.ts` | Pre-built agent personalities with system prompts |
| `skill-templates.ts` | 59 connector templates (Slack, GitHub, Stripe, etc.) |
| `utils.ts` | Cost estimation (per-model rates), date formatting |

### Theming

CSS custom properties in `globals.css` (`--bg-body`, `--bg-surface`, `--border`, `--text-primary`, etc.). Dark mode is default; light mode via `[data-theme="light"]`. Toggle managed by `ThemeProvider`.

### Testing

- **Unit**: Vitest + jsdom + Testing Library. Setup mocks Supabase in `src/test/setup.ts`.
- **E2E**: Playwright against production build (`npm run start`). Retries 2x in CI.

## Database Tables

Core tables (all RLS-protected, entity-scoped): `entities`, `entity_members`, `agents`, `agent_jobs`, `agent_runs`, `agent_memory`, `agent_skills`, `skill_versions`, `connectors`, `agent_schedules`, `approval_requests`, `approval_rules`, `agent_budgets`, `tool_calls`, `webhook_triggers`, `mcp_servers`, `plugins`.
