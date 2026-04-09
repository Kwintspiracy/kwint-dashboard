# Kwint Agents

An open-source, multi-tenant platform for building and managing teams of AI agents. Create agents with distinct personalities, connect them to 60+ services, organize them into orchestrator hierarchies, and let them learn from every task through persistent memory.

## What makes it different

- **Orchestrator hierarchies** — Agents delegate work to specialists. An orchestrator like "Ender" assigns tasks to "Pavel" (Job Hunt Orchestrator), who in turn delegates to "Resume Optimizer" and "Cover Letter Writer". Hierarchies are visual and drag-and-drop in the UI.
- **Layered memory (L1-L3)** — Agents boot with ~2K tokens of context instead of dumping everything. Critical memories load first (L1), task-relevant memories on demand (L2), deep semantic search when needed (L3). Memories expire with configurable TTLs and are deduplicated automatically.
- **Context compression** — Long conversations are compressed in-flight. A 180K-token context gets trimmed to ~10K without losing key information. Sub-agents receive zero-context delegations: just the task + structured variables, no parent history pollution.
- **System agents** — Automated maintenance agents (Memory Guardian) run daily via cron to deduplicate memories, expire stale facts, and detect contradictions. Visible in the UI, customizable instructions, non-deletable.
- **60+ connectors** — One-click OAuth for Google (Gmail, Sheets, Drive, Docs, Calendar), Slack, GitHub, Notion, Linear, HubSpot, Microsoft. API-key connectors for Stripe, Twilio, Tavily, and dozens more via the skill marketplace.
- **11 LLM providers** — Anthropic (native), OpenAI, Google AI, Mistral, Groq, Cohere, DeepSeek, Together AI, OpenRouter, Ollama, Mammoth AI. Users bring their own keys or fall back to the operator's.
- **Kanban task board** — Orchestrators create tasks on a shared board. Cards show creator agent, assignee, token usage, and cost. Tasks auto-update when jobs complete or fail.

## Architecture

Two separate deployments that share a Supabase database:

```
                    ┌──────────────────────┐
                    │   Supabase Cloud     │
                    │  PostgreSQL + pgvector│
                    │  Auth + RLS + Realtime│
                    └──────┬───────┬───────┘
                           │       │
              ┌────────────┘       └────────────┐
              ▼                                  ▼
┌──────────────────────┐          ┌──────────────────────┐
│   Dashboard (Vercel) │          │   Runner (Fly.io)    │
│                      │  POST    │                      │
│  Next.js 16          │ ──────►  │  Python / FastAPI    │
│  React 19            │ /api/    │  Claude API          │
│  Tailwind CSS 4      │ agent    │  Tool execution      │
│  Server Actions      │          │  Memory management   │
│  SWR + Zod           │          │  OAuth token refresh  │
└──────────────────────┘          └──────────────────────┘
```

| Component | Stack | Deployment | Role |
|-----------|-------|------------|------|
| **Dashboard** | Next.js 16, React 19, TypeScript, Tailwind 4, SWR, Zod | Vercel | UI, server actions, auth, entity management |
| **Runner** | Python 3.12, FastAPI, uvicorn (2 workers) | Fly.io (Paris CDG) | Agent loop, tool execution, memory, LLM calls |
| **Database** | PostgreSQL 15, pgvector, RLS | Supabase Cloud | Auth, data, vector search, realtime |

### Why Fly.io for the runner

The runner was migrated from Vercel serverless to Fly.io to remove the 60-second function timeout. Agent jobs can now run for minutes, chain multiple delegations, and self-trigger workers without deadlocking. Machines auto-suspend when idle and wake in ~300ms.

### Multi-tenant isolation

Every query is scoped by `entity_id` (workspace). Row-Level Security on all tables. Agents, memories, connectors, and tasks never leak between workspaces.

## Key features

### Agent management
Create agents from 14 templates or from scratch. Each agent has a personality prompt, a model selection, capabilities derived from assigned skills, and optional Telegram integration. Agents are organized by role: `agent`, `orchestrator`, or `system`.

### Orchestrator delegation
Orchestrators delegate tasks to their assigned sub-agents via `delegate_task`. The system enforces hierarchy: an orchestrator can only delegate to agents in its assignment list. Sub-orchestrators are supported (Ender → Pavel → Resume Optimizer).

### Memory system
Persistent memory stored in `agent_memory` with pgvector embeddings for semantic search.

- **L1 layer** (~500 tokens): Always loaded. Preferences and context memories, sorted by importance decay score.
- **L2 layer** (~800 tokens): Task-relevant memories matched by keyword.
- **L3 layer** (~700 tokens): Deep semantic search via pgvector when L1+L2 are insufficient.
- **TTL expiration**: `learned_rule` = 14 days, `context` = 30 days, `preference` = never.
- **Deduplication**: MD5 hash for exact matches, word overlap for semantic duplicates.
- **Memory Guardian**: System agent that runs daily to clean duplicates, expire stale facts, and detect contradictions.

### Context compression
When conversation history exceeds 50K tokens, the ContextCompressor trims it automatically:
1. Tool results longer than 3K chars are truncated
2. Older messages are summarized while keeping the last 6 messages intact
3. Target: 15K tokens after compression

### Connector marketplace
60+ pre-built connector templates with API documentation baked into each skill. OAuth 2.0 flow for Google, Slack, GitHub, Notion, Linear, HubSpot, Microsoft. API-key auth for everything else. Agents use connectors via `http_request` with automatic credential injection.

### Kanban task board
Global task board across all orchestrators. Cards display:
- Creator agent (who created the task)
- Assigned agent
- Priority badge
- Token usage and cost (on completed tasks)
- Linked job ID

Tasks auto-transition when jobs complete (`done`) or fail (`cancelled`).

### BYOK — Bring Your Own Key
Users add their own LLM API keys in Settings. The runner checks for entity-level keys first, then falls back to the operator's key. Both paths are tracked in `agent_runs.key_source` and visible on the Billing page.

## Roadmap

- [ ] Pavel structured context — orchestrators pass structured variables to sub-agents for consistent ~10K token usage
- [ ] Memory Guardian auto-creation — automatically created when a workspace is created
- [ ] Brave Search skill — marketplace connector for web search via Brave API
- [ ] Typed skill adapters — each skill generates typed Python tools instead of freeform `http_request`
- [ ] Async delegation — fire-and-forget delegation with callback instead of 40s polling
- [ ] Knowledge graph — temporal entity-relationship triples (MemPalace-inspired) as L2/L3 memory source
- [ ] Approval workflows — real per-operation approval instead of prompt-based gating

## Installation

### Prerequisites

- Node.js 20+
- Python 3.12+
- A Supabase project (free tier works)
- An Anthropic API key (operator fallback)
- A Fly.io account (for the runner)

### 1. Clone both repos

```bash
git clone https://github.com/Kwintspiracy/kwint-dashboard.git
git clone https://github.com/Kwintspiracy/Kwint-Agent-One.git
```

### 2. Set up Supabase

Create a project at [supabase.com](https://supabase.com). Apply migrations from the runner repo:

```bash
cd Kwint-Agent-One
# Apply each SQL file in seeds/ via Supabase SQL Editor
```

### 3. Deploy the runner (Fly.io)

```bash
cd Kwint-Agent-One
fly launch --name your-agent-runner --region cdg
fly secrets set \
  ANTHROPIC_API_KEY=sk-ant-... \
  SUPABASE_URL=https://yourproject.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  WORKER_SECRET=your-random-secret \
  APP_URL=https://your-agent-runner.fly.dev \
  GOOGLE_CLIENT_ID=your-google-client-id \
  GOOGLE_CLIENT_SECRET=your-google-client-secret
fly deploy
```

### 4. Deploy the dashboard (Vercel)

```bash
cd kwint-dashboard
npm install
npx vercel --prod
```

Set these environment variables in Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_AGENT_API_URL=https://your-agent-runner.fly.dev
WORKER_SECRET=your-random-secret  # same as runner
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 5. Local development

```bash
# Dashboard
cd kwint-dashboard && npm install && npm run dev   # → http://localhost:3000

# Runner
cd Kwint-Agent-One && pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 3001 --workers 2
```

### Commands

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest unit tests
npm run e2e          # Playwright e2e tests
```

## License

MIT
