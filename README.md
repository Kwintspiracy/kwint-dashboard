# Kwint Agents — Dashboard

Multi-agent AI management platform. Create agents with personalities, connect 59+ APIs, watch them learn from every task. Bring your own LLM key or use the operator's fallback.

## Architecture

Two separate deployments:

| Repo | Stack | Role |
|------|-------|------|
| `kwint-dashboard` (this) | Next.js 16, React 19, Supabase, Tailwind 4 | UI + server actions |
| `Kwint-Agent-One` | Python 3.12, FastAPI, Anthropic SDK | Agent runner |

## Quick start — Vercel

```bash
# 1. Clone both repos
git clone https://github.com/Kwintspiracy/kwint-dashboard.git
git clone https://github.com/Kwintspiracy/Kwint-Agent-One.git

# 2. Deploy dashboard
cd kwint-dashboard && npm i && npx vercel --prod

# 3. Deploy backend
cd ../Kwint-Agent-One && npx vercel --prod
```

**Environment variables (dashboard — set in Vercel):**

```
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_AGENT_API_URL=https://your-agent.vercel.app
API_SECRET_KEY=<random secret shared with backend>
```

**Environment variables (backend — set in Vercel):**

```
ANTHROPIC_API_KEY=sk-ant-...        # operator fallback key
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
API_SECRET_KEY=<same as dashboard>
WORKER_SECRET=<random secret>
APP_URL=https://your-agent.vercel.app
```

## Quick start — Local dev

```bash
# Dashboard
cd kwint-dashboard && npm i && npm run dev   # → http://localhost:3000

# Backend
cd Kwint-Agent-One && pip install -r requirements.txt && npx vercel dev
```

## BYOK — Bring Your Own Key

Users can add their own LLM API keys in **Settings → LLM Provider Keys**. Supported providers: Anthropic, OpenAI, Google AI, Mistral, Groq, Cohere, DeepSeek, Together AI, OpenRouter, Ollama, Mammoth AI.

When a user has their own key configured, the runner uses it directly — the cost is billed to their provider account. Without a key, runs fall back to the operator's `ANTHROPIC_API_KEY`. Both paths are tracked in `agent_runs.key_source` and visible on the **Billing** page.

## Database

Uses Supabase (PostgreSQL + pgvector + auth + realtime). Apply migrations from `supabase/migrations/` in order via the Supabase SQL Editor.

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest unit tests
npm run e2e          # Playwright e2e tests
```

## License

MIT
