'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false)
  const [activeTab, setActiveTab] = useState<'vercel' | 'docker' | 'local'>('vercel')

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-neutral-300 overflow-x-hidden selection:bg-emerald-900/40 selection:text-emerald-300">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-neutral-900 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto h-12 sm:h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-mono text-xs sm:text-sm">$</span>
            <span className="text-sm font-mono font-bold text-white tracking-tight">kwint-agents</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-xs font-mono text-neutral-400">
            <a href="#features" className="hover:text-emerald-400 transition-colors">features</a>
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">setup</a>
            <a href="#architecture" className="hover:text-emerald-400 transition-colors">arch</a>
            <a href="#docs" className="hover:text-emerald-400 transition-colors">docs</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-3 py-1.5 text-xs font-mono font-bold text-black bg-emerald-500 rounded hover:bg-emerald-400 transition-colors">
              sign in →
            </Link>
            <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden text-neutral-400 hover:text-emerald-400 p-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileMenu ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t border-neutral-900 bg-[#0a0a0a] px-4 py-3 space-y-2">
            {['features', 'how-it-works', 'architecture', 'docs'].map(id => (
              <a key={id} href={`#${id}`} onClick={() => setMobileMenu(false)}
                className="block text-xs font-mono text-neutral-400 hover:text-emerald-400 py-1.5">
                /{id}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="pt-24 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="font-mono text-[10px] sm:text-xs text-neutral-500 mb-6 sm:mb-8">
            <span className="text-emerald-500">~</span> v1.0 &middot; open source &middot; MIT license
          </div>
          <h1 className="text-5xl sm:text-8xl md:text-[9.5rem] font-bold text-white leading-[0.9] tracking-tighter">
            Multi-agent AI,
            <br />
            managed visually.
          </h1>
          <p className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-neutral-400 leading-relaxed font-mono">
            Create agents with personalities. Connect 59+ APIs.
            Watch them learn from every task. Bring your own API key. Ship from your browser.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3">
            <Link href="/login" className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-mono font-bold text-black bg-emerald-500 rounded hover:bg-emerald-400 transition-colors">
              get started →
            </Link>
            <a href="#docs" className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-mono text-neutral-300 border border-neutral-700 rounded hover:border-neutral-500 hover:text-white transition-colors">
              read docs
            </a>
          </div>

          {/* Terminal preview */}
          <div className="mt-12 sm:mt-16 border border-neutral-800/80 rounded-lg overflow-hidden bg-[#111]">
            <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-neutral-800/80 bg-[#161616]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-2 text-[10px] font-mono text-neutral-500">kwint-agents — bash</span>
            </div>
            <div className="p-4 sm:p-5 font-mono text-[10px] sm:text-xs leading-relaxed">
              <Line prompt>npx create-kwint-agent researcher</Line>
              <Line ok>Agent &quot;researcher&quot; created with capabilities: [web-search, data-analysis]</Line>
              <Line prompt>kwint connect google-sheets stripe github</Line>
              <Line ok>3 connectors installed → 3 skills generated</Line>
              <Line prompt>kwint deploy --telegram</Line>
              <Line ok>Webhook registered. Bot @kwint_researcher_bot is live.</Line>
              <Line prompt>kwint status</Line>
              <Line dim>researcher  ●  active   12 memories   47 jobs   $0.34 spent</Line>
              <Line dim>manager     ●  active    3 memories    8 jobs   $0.12 spent</Line>
              <Line ok>2 agents running in workspace &quot;kwint-co&quot;</Line>
            </div>
          </div>
        </div>
      </section>

      {/* ── Numbers ────────────────────────────────────────── */}
      <section className="border-y border-neutral-900 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto py-8 sm:py-10 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {[
            { value: '59', unit: 'connectors', detail: 'one-click install' },
            { value: '11', unit: 'LLM providers', detail: 'BYOK supported' },
            { value: '10', unit: 'tools', detail: 'built-in' },
            { value: '<2s', unit: 'load time', detail: 'SWR cached' },
          ].map(s => (
            <div key={s.unit}>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold text-white font-mono">{s.value}</span>
                <span className="text-xs text-neutral-400 font-mono">{s.unit}</span>
              </div>
              <p className="text-[10px] text-neutral-500 font-mono mt-1">{s.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHead tag="01" title="Capabilities" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden mt-8 sm:mt-12">
            {[
              { title: 'Agent CRUD', desc: 'Personalities, model selection, capability tags, role assignment. Templates or custom.', k: 'core' },
              { title: 'Orchestration', desc: 'delegate_task with smart routing. Parallel execution. Capability-based auto-matching.', k: 'core' },
              { title: 'Vector Memory', desc: 'pgvector semantic search. Auto-embeddings. Meaning-based recall, not keywords.', k: 'intelligence' },
              { title: 'Self-Improving', desc: 'Post-task reflection via Haiku. Auto-saves learned_rule. Gets smarter per task.', k: 'intelligence' },
              { title: 'Marketplace', desc: '59 connectors. Google, Stripe, GitHub, Slack, Discord, Figma... One-click install.', k: 'integrations' },
              { title: 'Approval Gates', desc: 'Per-tool human review. Auto-approve rules. Block rules. Push notifications.', k: 'safety' },
              { title: 'Cost Budgets', desc: 'Daily/monthly token limits. Auto-pause. Visual usage bars. Alert thresholds.', k: 'control' },
              { title: 'Scheduling', desc: 'Visual cron builder. Webhook triggers. Heartbeat objectives. Event-driven.', k: 'automation' },
              { title: 'Skill Versions', desc: 'Every edit tracked. Rollback anytime. Inline test before deploy.', k: 'dev' },
              { title: 'Observability', desc: 'Trace trees. Per-agent costs. SSE streaming. Real-time job status.', k: 'monitoring' },
              { title: 'Workspaces', desc: 'Entity isolation. Multi-workspace. Onboarding flow. Context switching.', k: 'multi-tenant' },
              { title: 'Security', desc: 'Auth + RLS. Fail-closed. hmac secrets. Redacted logs. Cookie hardening.', k: 'security' },
              { title: 'BYOK', desc: '11 providers: Anthropic, OpenAI, Gemini, Mistral, Groq, DeepSeek... Add your own key → lower costs. Operator key as fallback.', k: 'control' },
            ].map(f => (
              <div key={f.title} className="bg-[#0d0d0d] p-4 sm:p-5 hover:bg-[#131313] transition-colors group">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs sm:text-sm font-mono font-bold text-white">{f.title}</h3>
                  <span className="text-[9px] font-mono text-neutral-600 group-hover:text-neutral-500 uppercase">{f.k}</span>
                </div>
                <p className="text-[11px] sm:text-xs text-neutral-400 leading-relaxed font-mono">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-neutral-900">
        <div className="max-w-5xl mx-auto">
          <SectionHead tag="02" title="Setup" />
          <div className="mt-8 sm:mt-12 space-y-6 sm:space-y-8">
            {[
              { cmd: 'create workspace', out: 'Sign up → name your entity → existing data migrates automatically.' },
              { cmd: 'create agent --template researcher', out: '8 templates ready. Or write a personality from scratch. Capabilities auto-tag.' },
              { cmd: 'connect stripe google-sheets github', out: 'Marketplace → click Install → agent gets API docs as a loadable skill.' },
              { cmd: 'deploy --channel telegram', out: 'Dashboard → agent → Set up bot → paste token → webhook registered. Live.' },
              { cmd: 'watch', out: 'Agent completes tasks → reflects → saves rules → semantic memory grows → smarter next time.' },
            ].map((s, i) => (
              <div key={i} className="border-l-2 border-neutral-800 pl-4 sm:pl-6">
                <div className="font-mono text-xs">
                  <span className="text-emerald-500">$</span>
                  <span className="text-neutral-300 ml-2">kwint {s.cmd}</span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-500 mt-2 leading-relaxed">{s.out}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Architecture ───────────────────────────────────── */}
      <section id="architecture" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-neutral-900">
        <div className="max-w-5xl mx-auto">
          <SectionHead tag="03" title="Architecture" />

          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mt-8 sm:mt-12">
            <StackTable title="dashboard" rows={[
              ['next.js', '16 + react 19 + typescript'],
              ['style', 'tailwind 4, dark/light'],
              ['data', 'server actions + swr'],
              ['auth', 'supabase (email + pw)'],
              ['realtime', 'supabase channels + sse'],
              ['test', 'vitest 58 + playwright 3'],
              ['deploy', 'vercel | docker'],
            ]} />
            <StackTable title="backend" rows={[
              ['runtime', 'python 3.12 serverless'],
              ['llm', '11 providers · Anthropic, OpenAI, Gemini, Mistral, Groq...'],
              ['db', 'postgresql + pgvector'],
              ['memory', 'embeddings + semantic search'],
              ['tools', '10 built-in + 59 skills'],
              ['orchestration', 'delegate + classify + parallel'],
              ['channels', 'telegram, api, webhooks'],
            ]} />
          </div>

          <div className="mt-8 sm:mt-10 border border-neutral-800 rounded-lg overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-neutral-800 bg-[#161616]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-2 text-[10px] font-mono text-neutral-500">data-flow.txt</span>
            </div>
            <pre className="p-4 sm:p-5 text-[10px] sm:text-xs font-mono text-neutral-400 leading-relaxed overflow-x-auto whitespace-pre-wrap sm:whitespace-pre">{`user ─→ backend ─→ claude api
                     ├─→ tools (search, http, memory, delegate...)
                     └─→ supabase (jobs, memories, runs)
         ←── result delivered
              └─→ reflection ─→ learned_rule saved
                                └─→ pgvector embedding
                                     └─→ available next task`}</pre>
          </div>
        </div>
      </section>

      {/* ── Docs ───────────────────────────────────────────── */}
      <section id="docs" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-neutral-900">
        <div className="max-w-5xl mx-auto">
          <SectionHead tag="04" title="Quick start" />

          <div className="mt-8 sm:mt-12 border border-neutral-800 rounded-lg p-4 sm:p-5 bg-[#0d0d0d]">
            <p className="text-xs font-mono text-neutral-400 mb-3">prerequisites</p>
            <div className="font-mono text-[11px] sm:text-xs text-neutral-400 space-y-1">
              <p>node 20+ &middot; python 3.12+ &middot; <a href="https://supabase.com" className="text-emerald-500 hover:text-emerald-400 underline underline-offset-2" target="_blank" rel="noopener">supabase</a> project &middot; <a href="https://console.anthropic.com" className="text-emerald-500 hover:text-emerald-400 underline underline-offset-2" target="_blank" rel="noopener">anthropic key</a></p>
            </div>
          </div>

          <div className="mt-6 flex gap-px bg-neutral-900 rounded-t-lg overflow-hidden border border-b-0 border-neutral-800">
            {(['vercel', 'docker', 'local'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-1 px-3 py-2.5 text-[10px] sm:text-xs font-mono transition-colors ${activeTab === t ? 'bg-[#131313] text-emerald-500' : 'bg-[#0a0a0a] text-neutral-500 hover:text-neutral-300'}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="border border-neutral-800 rounded-b-lg bg-[#0d0d0d] p-4 sm:p-5 space-y-4">
            {activeTab === 'vercel' && <>
              <CodeBlock title="clone">{`git clone https://github.com/Kwintspiracy/kwint-dashboard.git
git clone https://github.com/Kwintspiracy/Kwint-Agent-One.git`}</CodeBlock>
              <CodeBlock title="deploy dashboard">{`cd kwint-dashboard && npm i && npx vercel --prod`}</CodeBlock>
              <CodeBlock title="deploy backend">{`cd Kwint-Agent-One && npx vercel --prod`}</CodeBlock>
              <div className="font-mono text-[10px] sm:text-[11px] text-neutral-500 space-y-1 mt-3">
                <p className="text-neutral-400 mb-1">env vars (set in vercel dashboard):</p>
                <p>NEXT_PUBLIC_SUPABASE_URL &middot; NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
                <p>NEXT_PUBLIC_AGENT_API_URL &middot; ANTHROPIC_API_KEY</p>
                <p>SUPABASE_SERVICE_ROLE_KEY &middot; API_SECRET_KEY &middot; WORKER_SECRET</p>
              </div>
            </>}
            {activeTab === 'docker' && <>
              <CodeBlock title="dashboard">{`cd kwint-dashboard
docker build -t kwint-dashboard \\
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \\
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... .
docker run -p 3000:3000 kwint-dashboard`}</CodeBlock>
              <CodeBlock title="backend">{`cd Kwint-Agent-One
docker build -t kwint-agent .
docker run -p 3001:3001 \\
  -e ANTHROPIC_API_KEY=... \\
  -e SUPABASE_URL=... \\
  -e SUPABASE_SERVICE_ROLE_KEY=... \\
  -e API_SECRET_KEY=... \\
  -e WORKER_SECRET=... \\
  -e APP_URL=http://localhost:3001 \\
  kwint-agent`}</CodeBlock>
              <CodeBlock title="or use compose">{`cd Kwint-Agent-One && docker compose up`}</CodeBlock>
            </>}
            {activeTab === 'local' && <>
              <CodeBlock title="dashboard">{`cd kwint-dashboard && npm i && npm run dev`}</CodeBlock>
              <CodeBlock title="backend">{`cd Kwint-Agent-One && pip install -r requirements.txt && npx vercel dev`}</CodeBlock>
              <CodeBlock title="tests">{`npm test && npm run e2e && pytest tests/`}</CodeBlock>
            </>}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-neutral-900">
        <div className="max-w-xl mx-auto text-center">
          <p className="font-mono text-xs text-neutral-500 mb-4">ready?</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Deploy your first agent.</h2>
          <div className="mt-6 sm:mt-8">
            <Link href="/login" className="inline-flex px-6 py-2.5 text-xs font-mono font-bold text-black bg-emerald-500 rounded hover:bg-emerald-400 transition-colors">
              sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-neutral-900 py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[10px] font-mono text-neutral-500">kwint-agents &middot; MIT &middot; 2026</span>
          <div className="flex items-center gap-6 text-[10px] font-mono text-neutral-500">
            <a href="https://github.com/Kwintspiracy/kwint-dashboard" className="hover:text-emerald-400 transition-colors" target="_blank" rel="noopener">github</a>
            <a href="#docs" className="hover:text-emerald-400 transition-colors">docs</a>
            <Link href="/login" className="hover:text-emerald-400 transition-colors">sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Components ──────────────────────────────────────────────

function SectionHead({ tag, title }: { tag: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-mono text-emerald-500 border border-emerald-800 rounded px-1.5 py-0.5">{tag}</span>
      <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
    </div>
  )
}

function Line({ children, prompt, ok, dim }: { children: React.ReactNode; prompt?: boolean; ok?: boolean; dim?: boolean }) {
  return (
    <div className={`${dim ? 'text-neutral-500' : ok ? 'text-emerald-500' : 'text-neutral-300'} ${prompt ? '' : 'ml-0 sm:ml-2'}`}>
      {prompt && <span className="text-emerald-500">$ </span>}
      {ok && <span className="text-emerald-700">→ </span>}
      {dim && <span className="text-neutral-600">  </span>}
      {children}
    </div>
  )
}

function StackTable({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-neutral-800 bg-[#161616]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[10px] font-mono text-neutral-500">{title}</span>
      </div>
      <div className="divide-y divide-neutral-900/50">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between px-4 py-2 text-[11px] sm:text-xs font-mono bg-[#0a0a0a] hover:bg-[#0d0d0d] transition-colors">
            <span className="text-neutral-500">{k}</span>
            <span className="text-neutral-300">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CodeBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-mono text-neutral-500 mb-1"># {title}</p>
      <pre className="bg-[#0a0a0a] border border-neutral-800/50 rounded px-3 py-2 text-[10px] sm:text-[11px] font-mono text-emerald-500 overflow-x-auto leading-relaxed whitespace-pre-wrap sm:whitespace-pre">
        {children}
      </pre>
    </div>
  )
}
