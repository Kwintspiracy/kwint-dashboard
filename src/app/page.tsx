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
        <div className="max-w-6xl mx-auto h-12 sm:h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-mono text-xs sm:text-sm">$</span>
            <span className="text-sm font-mono font-bold text-white tracking-tight">kwint-agents</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-xs text-neutral-400">
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">How it works</a>
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#integrations" className="hover:text-emerald-400 transition-colors">Integrations</a>
            <a href="#use-cases" className="hover:text-emerald-400 transition-colors">Use cases</a>
            <a href="#developers" className="hover:text-emerald-400 transition-colors">Developers</a>
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
            {[
              ['how-it-works', 'How it works'],
              ['features', 'Features'],
              ['integrations', 'Integrations'],
              ['use-cases', 'Use cases'],
              ['developers', 'Developers'],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={() => setMobileMenu(false)}
                className="block text-xs text-neutral-400 hover:text-emerald-400 py-1.5">
                {label}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="font-mono text-xs text-neutral-500 mb-5 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            New · AI Configurator — describe your agent, we build it
          </div>
          <h1 className="text-[2.75rem] sm:text-7xl md:text-[7.5rem] font-bold text-white leading-[0.95] tracking-tighter">
            AI agents that <br className="hidden sm:block" />
            <span className="text-emerald-400">actually use</span> your apps.
          </h1>
          <p className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-neutral-400 leading-relaxed max-w-3xl">
            Describe what you want in plain English. We configure, test, and deploy the agent — connected to Gmail, Slack, Notion, Stripe, and 110+ more. Runs on your schedule. Sends results to Telegram, Slack, or email.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3">
            <Link href="/login" className="inline-flex items-center justify-center px-6 py-3 text-sm font-mono font-bold text-black bg-emerald-500 rounded hover:bg-emerald-400 transition-colors">
              Start free →
            </Link>
            <a href="#how-it-works" className="inline-flex items-center justify-center px-6 py-3 text-sm text-neutral-300 border border-neutral-700 rounded hover:border-neutral-500 hover:text-white transition-colors">
              See how it works
            </a>
          </div>
          <div className="mt-6 flex items-center gap-4 text-xs text-neutral-500 flex-wrap">
            <span className="flex items-center gap-1.5"><Check />No credit card</span>
            <span className="flex items-center gap-1.5"><Check />Bring your own API key</span>
            <span className="flex items-center gap-1.5"><Check />Self-hostable (MIT)</span>
          </div>

          {/* Configurator mockup */}
          <div className="mt-14 sm:mt-20 border border-neutral-800/80 rounded-lg overflow-hidden bg-[#111] shadow-2xl shadow-emerald-900/10">
            <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-neutral-800/80 bg-[#161616]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-2 text-xs font-mono text-neutral-500">agent configurator</span>
            </div>
            <div className="grid md:grid-cols-[1fr_320px]">
              {/* Chat side */}
              <div className="p-4 sm:p-6 space-y-3 text-sm min-h-[380px]">
                <div className="flex justify-end">
                  <div className="bg-blue-600 text-white rounded-lg px-3 py-2 max-w-[80%] text-sm">
                    Un agent qui résume mes emails Gmail non-lus chaque matin sur Telegram
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-[#0d0d0d] border border-neutral-800 text-neutral-300 rounded-lg px-3 py-2 max-w-[85%] text-sm">
                    Got it. I&apos;ll use the Gmail skill to read unread emails and send a digest to your Telegram each morning at 8am. Any specific approval rules for replying?
                  </div>
                </div>
                <div className="flex justify-start flex-wrap gap-1.5">
                  <Chip>→ list_skills</Chip>
                  <Chip>→ list_connectors</Chip>
                  <Chip highlight>→ propose_agent_config</Chip>
                </div>
                <div className="flex justify-start">
                  <div className="bg-[#0d0d0d] border border-neutral-800 text-neutral-300 rounded-lg px-3 py-2 max-w-[85%] text-sm">
                    Agent created and tested ✓ — first run found 12 unread emails, 3 flagged urgent. Ready to deploy?
                  </div>
                </div>
              </div>
              {/* Preview sidebar */}
              <div className="border-t md:border-t-0 md:border-l border-neutral-800/80 bg-[#0d0d0d] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Agent Preview</h4>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                    Ready
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Résumé Matinal Gmail</p>
                  <p className="text-[10px] font-mono text-neutral-500">resume-matinal-gmail</p>
                </div>
                <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-violet-950/50 text-violet-400 border border-violet-900/40">
                  claude-sonnet-4-6
                </div>
                <div>
                  <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">Skills</p>
                  <div className="flex items-center gap-2 text-xs text-neutral-300">
                    <Check />Gmail
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">Approvals</p>
                  <div className="space-y-1 text-[11px] font-mono text-neutral-400">
                    <div className="flex items-center gap-1.5">🔒 gmail_send_email</div>
                    <div className="flex items-center gap-1.5">🔒 gmail_reply_email</div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">Test</p>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <Check />Passed — 1.2s
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Numbers ────────────────────────────────────────── */}
      <section className="border-y border-neutral-900 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto py-8 sm:py-10 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {[
            { value: '113', unit: 'API connectors', detail: 'Gmail, Slack, Notion, Stripe…' },
            { value: '17', unit: 'official MCPs', detail: 'Linear, GitHub, Atlassian…' },
            { value: '11', unit: 'LLM providers', detail: 'Bring your own key' },
            { value: '∞', unit: 'use cases', detail: 'Built from templates or chat' },
          ].map(s => (
            <div key={s.unit}>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold text-white font-mono">{s.value}</span>
                <span className="text-xs text-neutral-400 font-mono">{s.unit}</span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">{s.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What it is ─────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <SectionLabel>The problem</SectionLabel>
            <h2 className="text-2xl sm:text-4xl font-bold text-white mt-3 leading-tight">
              ChatGPT is great at <span className="text-neutral-500">thinking</span>.<br />
              Your work needs <span className="text-emerald-400">doing</span>.
            </h2>
            <p className="text-base text-neutral-400 mt-6 leading-relaxed">
              Most AI chatbots live in a silo. They can&apos;t read your Gmail, post to Slack, create Notion pages, or charge a Stripe invoice. You end up copy-pasting between tabs.
            </p>
            <p className="text-base text-neutral-400 mt-3 leading-relaxed">
              Kwint gives you agents that actually <span className="text-white">use your apps</span> — through safe, human-approved actions. They remember what worked last time. They run on a schedule. They deliver results where you already are.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mt-12">
            {[
              { icon: '🗣️', title: 'Describe in plain English', desc: 'No prompts to engineer. Our AI Configurator interviews you, builds the agent, and tests it before you deploy.' },
              { icon: '🔌', title: 'Connects to your tools', desc: '113 API integrations + 17 official MCP servers. One-click OAuth for Google, Slack, Notion, Stripe, GitHub and more.' },
              { icon: '⏰', title: 'Runs without you', desc: 'Schedule daily digests. Trigger on webhook. Chat via Telegram or Slack. Approval gates for sensitive actions.' },
            ].map(p => (
              <div key={p.title} className="bg-[#0d0d0d] border border-neutral-800 rounded-lg p-5 hover:border-emerald-900/40 transition-colors">
                <div className="text-2xl mb-3">{p.icon}</div>
                <h3 className="text-sm font-bold text-white mb-1.5">{p.title}</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-neutral-900">
        <div className="max-w-6xl mx-auto">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="text-2xl sm:text-4xl font-bold text-white mt-3 leading-tight">
            From idea to running agent in <span className="text-emerald-400">three steps</span>.
          </h2>

          <div className="mt-12 sm:mt-16 space-y-12 sm:space-y-16">
            {/* Step 1 */}
            <Step number="01" title="Describe what you want">
              <p className="text-neutral-400 leading-relaxed">
                Open the Configurator and tell it — in French, English, or whatever — what you need. Examples: <span className="text-neutral-300">&ldquo;a social media manager that posts my blog to LinkedIn and Twitter&rdquo;</span> or <span className="text-neutral-300">&ldquo;an agent that creates Stripe invoices when I forward an email&rdquo;</span>.
              </p>
              <p className="text-neutral-400 leading-relaxed mt-3">
                The AI interviews you briefly, picks the right skills, sets approval rules, and shows a live preview as it builds.
              </p>
            </Step>

            {/* Step 2 */}
            <Step number="02" title="Connect your tools">
              <p className="text-neutral-400 leading-relaxed">
                Click to install a connector. OAuth flow opens in a popup. Tokens stored encrypted in your own Supabase workspace. You keep full control over what the agent is allowed to do — write, read, or destructive actions can each be gated by approval.
              </p>
              <p className="text-neutral-400 leading-relaxed mt-3">
                Prefer official MCP servers? Linear, GitHub, Atlassian, Stripe and more are one-click installs alongside classic API connectors.
              </p>
            </Step>

            {/* Step 3 */}
            <Step number="03" title="Deploy where you work">
              <p className="text-neutral-400 leading-relaxed">
                Pick a channel: Telegram bot, Slack, webhook, REST API, or scheduled cron. The agent runs on Fly.io, streams progress back to the dashboard, and delivers results to your channel of choice.
              </p>
              <p className="text-neutral-400 leading-relaxed mt-3">
                Every job is logged. Every tool call is traced. Every memory is versioned. Costs are tracked per agent, per workspace.
              </p>
            </Step>
          </div>
        </div>
      </section>

      {/* ── Integrations ───────────────────────────────────── */}
      <section id="integrations" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-neutral-900">
        <div className="max-w-6xl mx-auto">
          <SectionLabel>Integrations</SectionLabel>
          <h2 className="text-2xl sm:text-4xl font-bold text-white mt-3 leading-tight">
            Connects to the tools <span className="text-emerald-400">you already use</span>.
          </h2>
          <p className="text-sm text-neutral-400 mt-4 max-w-2xl leading-relaxed">
            113 ready-made API adapters and 17 official remote MCP servers. Mix both — use the MCP version for official, battle-tested tools; the API adapter when you need specific custom tooling.
          </p>

          <div className="mt-10 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 sm:gap-3">
            {[
              'notion', 'slack', 'gmail', 'google-drive', 'google-sheets', 'google-calendar', 'google-docs',
              'stripe', 'github', 'figma', 'jira', 'confluence', 'discord', 'telegram',
              'hugging-face', 'shopify', 'paypal', 'square', 'sentry', 'cloudflare', 'vercel',
              'zapier', 'intercom', 'mailchimp', 'salesforce', 'zendesk', 'webflow', 'airtable',
              'dropbox', 'trello', 'monday', 'sendgrid',
            ].map(slug => (
              <div key={slug} className="aspect-square bg-[#0d0d0d] border border-neutral-800 rounded-lg flex items-center justify-center p-3 hover:border-emerald-900/40 transition-colors group">
                <img src={`/app-icons/${slug}.svg`} alt={slug} className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center text-xs text-neutral-500">
            <span>+ 80 more API connectors and 14 more MCP servers across 15 categories</span>
          </div>

          {/* Categories */}
          <div className="mt-10 flex flex-wrap gap-2 justify-center">
            {[
              'Productivity', 'Developer Tools', 'Finance & Payments', 'Web & Data', 'Storage & Files',
              'Design', 'CRM', 'Communication', 'Analytics', 'E-commerce', 'Marketing', 'HR',
            ].map(cat => (
              <span key={cat} className="px-3 py-1 rounded-full text-xs text-neutral-400 bg-[#0d0d0d] border border-neutral-800">
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ──────────────────────────────────────── */}
      <section id="use-cases" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-neutral-900">
        <div className="max-w-6xl mx-auto">
          <SectionLabel>Use cases</SectionLabel>
          <h2 className="text-2xl sm:text-4xl font-bold text-white mt-3 leading-tight">
            What can you <span className="text-emerald-400">actually build</span>?
          </h2>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Morning email digest',
                person: 'For busy founders',
                desc: 'Every morning at 8am, summarise unread Gmail, flag urgent threads, and draft responses for you to approve — all in a Telegram message.',
                tools: ['Gmail', 'Telegram'],
              },
              {
                title: 'Job application tracker',
                person: 'For job hunters',
                desc: 'Reads your CV folder, searches new listings, scores fit, writes tailored cover letters, tracks applications in a Notion database.',
                tools: ['Drive', 'Notion', 'Tavily'],
              },
              {
                title: 'Support ticket triage',
                person: 'For customer success',
                desc: 'Watches your Intercom inbox, tags by urgency and topic, drafts replies using your knowledge base, escalates to humans when needed.',
                tools: ['Intercom', 'Notion'],
              },
              {
                title: 'Invoice-from-email',
                person: 'For freelancers',
                desc: 'Forward any email describing billable work — the agent drafts a Stripe invoice with correct line items and sends it for your approval.',
                tools: ['Gmail', 'Stripe'],
              },
              {
                title: 'Release notes generator',
                person: 'For dev teams',
                desc: 'Every Friday, reads the week&apos;s merged PRs from GitHub, summarises by theme, posts to Slack and a Notion changelog.',
                tools: ['GitHub MCP', 'Slack', 'Notion'],
              },
              {
                title: 'Meeting prep brief',
                person: 'For sales teams',
                desc: 'Before each calendar event, researches the attendees on LinkedIn, pulls their CRM history from HubSpot, sends a briefing to your phone.',
                tools: ['Google Calendar', 'HubSpot'],
              },
            ].map(uc => (
              <div key={uc.title} className="bg-[#0d0d0d] border border-neutral-800 rounded-lg p-5 hover:border-emerald-900/40 transition-colors">
                <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-2">{uc.person}</p>
                <h3 className="text-sm font-bold text-white mb-2">{uc.title}</h3>
                <p className="text-xs text-neutral-400 leading-relaxed mb-4">{uc.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {uc.tools.map(t => (
                    <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-neutral-900">
        <div className="max-w-6xl mx-auto">
          <SectionLabel>Features</SectionLabel>
          <h2 className="text-2xl sm:text-4xl font-bold text-white mt-3 leading-tight">
            Everything you need to <span className="text-emerald-400">run agents in production</span>.
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden mt-10">
            {[
              { title: 'AI Configurator', desc: 'Chat-based agent builder with live preview sidebar. Interviews you, selects skills, tests the agent, and deploys when ready.', k: 'new' },
              { title: 'Orchestration', desc: 'Route agents delegate to specialist agents by capability. Planner agents break work into tasks with dependencies. Parallel execution.', k: 'core' },
              { title: 'Task board', desc: 'Cron-based task executor runs every 2 minutes. Dependency resolution. Auto-unblocks tasks as prerequisites complete. Result delivery to Telegram.', k: 'core' },
              { title: '113 API connectors', desc: 'Hand-written adapters for Gmail, Drive, Notion (full coverage), Slack, Stripe, GitHub, Linear, Figma, Shopify, and 100+ more.', k: 'integrations' },
              { title: '17 official MCP servers', desc: 'Remote MCP support for Notion, Linear, Atlassian, GitHub, Stripe, Slack, Asana, PayPal, Sentry, Cloudflare, Vercel, Box, Canva — battle-tested, zero maintenance.', k: 'integrations' },
              { title: 'Approval gates', desc: 'Gate any tool call behind human approval. Telegram push notification with Accept / Reject buttons. Rule-based auto-approve for trusted patterns.', k: 'safety' },
              { title: 'Semantic memory', desc: 'pgvector-backed memories per agent. Automatic embeddings. Similarity search across all past interactions. Memories survive across sessions.', k: 'intelligence' },
              { title: 'Self-improving', desc: 'Agents reflect after tasks. Save learned rules to memory. Stanley (system curator) merges duplicates and keeps the memory clean.', k: 'intelligence' },
              { title: 'Cost budgets', desc: 'Daily and monthly token caps per agent. Auto-pause on overage. Visual usage bars. Quota-aware retry guard prevents wasted spend.', k: 'control' },
              { title: 'Multi-channel delivery', desc: 'Ship results via Telegram, Slack, Discord, webhook, or REST API. One agent can listen on multiple channels.', k: 'automation' },
              { title: 'Full observability', desc: 'Trace every tool call. Stream job progress via SSE. Replay past runs. Per-agent cost breakdown. Export audit logs.', k: 'monitoring' },
              { title: 'BYOK + multi-workspace', desc: '11 LLM providers (Anthropic, OpenAI, Gemini, Mistral, Groq…). Workspace isolation via RLS. One account, many clients.', k: 'control' },
            ].map(f => (
              <div key={f.title} className="bg-[#0d0d0d] p-4 sm:p-5 hover:bg-[#131313] transition-colors group">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs sm:text-sm font-bold text-white">{f.title}</h3>
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                    f.k === 'new'
                      ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/40'
                      : 'text-neutral-600 group-hover:text-neutral-500'
                  }`}>
                    {f.k}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Developers ─────────────────────────────────────── */}
      <section id="developers" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-neutral-900">
        <div className="max-w-6xl mx-auto">
          <SectionLabel>For developers</SectionLabel>
          <h2 className="text-2xl sm:text-4xl font-bold text-white mt-3 leading-tight">
            Self-host it. <span className="text-emerald-400">Extend it.</span> Own your data.
          </h2>
          <p className="text-sm text-neutral-400 mt-4 max-w-2xl leading-relaxed">
            MIT-licensed. Python backend on Fly.io, Next.js dashboard on Vercel, your data in your own Supabase project. Ship your own skills. Fork and extend.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mt-10">
            <StackTable title="dashboard" rows={[
              ['framework', 'next.js 16 + react 19 + typescript'],
              ['style', 'tailwind 4 + dark/light theme'],
              ['data', 'server actions + swr'],
              ['auth', 'supabase + email + google oauth'],
              ['realtime', 'sse streaming for job progress'],
              ['deploy', 'vercel / docker / self-hosted'],
            ]} />
            <StackTable title="backend (AgentOne)" rows={[
              ['runtime', 'python 3.12 + fastapi + uvicorn'],
              ['llm', '11 providers (BYOK + operator key)'],
              ['db', 'postgresql + pgvector'],
              ['memory', 'semantic search + reflection'],
              ['tools', 'built-ins + 113 skill adapters + MCP'],
              ['deploy', 'fly.io (paris) / docker'],
            ]} />
          </div>

          {/* Quick start */}
          <div className="mt-12">
            <h3 className="text-sm font-bold text-white mb-4">Quick start</h3>
            <div className="border border-neutral-800 rounded-lg p-4 bg-[#0d0d0d]">
              <p className="text-xs text-neutral-400 mb-3">Prerequisites</p>
              <div className="text-xs text-neutral-400">
                Node 20+ · Python 3.12+ · <a href="https://supabase.com" className="text-emerald-500 hover:text-emerald-400 underline underline-offset-2" target="_blank" rel="noopener">Supabase</a> project · an LLM API key (Anthropic recommended)
              </div>
            </div>

            <div className="mt-4 flex gap-px bg-neutral-900 rounded-t-lg overflow-hidden border border-b-0 border-neutral-800">
              {(['vercel', 'docker', 'local'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`flex-1 px-3 py-2.5 text-xs font-mono transition-colors ${activeTab === t ? 'bg-[#131313] text-emerald-500' : 'bg-[#0a0a0a] text-neutral-500 hover:text-neutral-300'}`}>
                  {t}
                </button>
              ))}
            </div>

            <div className="border border-neutral-800 rounded-b-lg bg-[#0d0d0d] p-4 sm:p-5 space-y-4">
              {activeTab === 'vercel' && <>
                <CodeBlock title="clone">{`git clone https://github.com/your-org/kwint-dashboard.git
git clone https://github.com/your-org/kwint-agent-one.git`}</CodeBlock>
                <CodeBlock title="deploy dashboard">{`cd kwint-dashboard && npm i && npx vercel --prod`}</CodeBlock>
                <CodeBlock title="deploy backend">{`cd kwint-agent-one && fly launch`}</CodeBlock>
                <p className="text-xs text-neutral-500">
                  Env vars: <code className="font-mono text-neutral-400">NEXT_PUBLIC_SUPABASE_URL</code>, <code className="font-mono text-neutral-400">SUPABASE_SERVICE_ROLE_KEY</code>, <code className="font-mono text-neutral-400">WORKER_SECRET</code>, <code className="font-mono text-neutral-400">ANTHROPIC_API_KEY</code>.
                </p>
              </>}
              {activeTab === 'docker' && <>
                <CodeBlock title="dashboard">{`cd kwint-dashboard
docker build -t kwint-dashboard .
docker run -p 3000:3000 --env-file .env kwint-dashboard`}</CodeBlock>
                <CodeBlock title="backend">{`cd kwint-agent-one
docker build -t kwint-agent-one .
docker run -p 3001:3001 --env-file .env kwint-agent-one`}</CodeBlock>
              </>}
              {activeTab === 'local' && <>
                <CodeBlock title="dashboard">{`cd kwint-dashboard && npm i && npm run dev`}</CodeBlock>
                <CodeBlock title="backend">{`cd kwint-agent-one && pip install -r requirements.txt && python server.py`}</CodeBlock>
                <CodeBlock title="tests">{`npm test  &&  python -m pytest tests/ -v`}</CodeBlock>
              </>}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-neutral-900 bg-gradient-to-b from-[#0a0a0a] via-[#0c0f0c] to-[#0a0a0a]">
        <div className="max-w-2xl mx-auto text-center">
          <p className="font-mono text-xs text-emerald-500 mb-4">$ kwint start</p>
          <h2 className="text-3xl sm:text-5xl font-bold text-white leading-tight">
            Your first agent in <span className="text-emerald-400">under 2 minutes</span>.
          </h2>
          <p className="mt-5 text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
            Sign in, describe what you want, watch the Configurator build it live. No credit card. Bring your own API key or use ours to start.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login" className="inline-flex items-center justify-center px-6 py-3 text-sm font-mono font-bold text-black bg-emerald-500 rounded hover:bg-emerald-400 transition-colors">
              Start free →
            </Link>
            <a href="#developers" className="inline-flex items-center justify-center px-6 py-3 text-sm text-neutral-300 border border-neutral-700 rounded hover:border-neutral-500 hover:text-white transition-colors">
              Self-host instead
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-neutral-900 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-mono text-sm">$</span>
            <span className="text-sm font-mono font-bold text-white tracking-tight">kwint-agents</span>
            <span className="text-xs text-neutral-500 font-mono ml-2">· MIT · 2026</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-neutral-500">
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">How it works</a>
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#developers" className="hover:text-emerald-400 transition-colors">Developers</a>
            <Link href="/login" className="hover:text-emerald-400 transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Components ──────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-mono text-emerald-500">
      <span className="inline-block w-8 h-px bg-emerald-500/60" />
      {children}
    </span>
  )
}

function Step({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="grid md:grid-cols-[auto_1fr] gap-4 sm:gap-8">
      <div className="flex items-start gap-3">
        <span className="font-mono text-xs text-emerald-500 border border-emerald-800/60 rounded px-2 py-1 shrink-0">{number}</span>
      </div>
      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">{title}</h3>
        <div className="text-sm sm:text-base">{children}</div>
      </div>
    </div>
  )
}

function Chip({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border ${
      highlight
        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
        : 'bg-neutral-900 text-neutral-500 border-neutral-800'
    }`}>
      {children}
    </span>
  )
}

function Check() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function StackTable({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-neutral-800 bg-[#161616]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-xs font-mono text-neutral-500">{title}</span>
      </div>
      <div className="divide-y divide-neutral-900/50">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between px-4 py-2 text-xs font-mono bg-[#0a0a0a] hover:bg-[#0d0d0d] transition-colors">
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
      <p className="text-xs font-mono text-neutral-500 mb-1"># {title}</p>
      <pre className="bg-[#0a0a0a] border border-neutral-800/50 rounded px-3 py-2 text-xs font-mono text-emerald-500 overflow-x-auto leading-relaxed whitespace-pre-wrap sm:whitespace-pre">
        {children}
      </pre>
    </div>
  )
}
