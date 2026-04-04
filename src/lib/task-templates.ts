export type TaskTemplate = {
  id: string
  category: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
}

export const TASK_TEMPLATE_CATEGORIES = ['Research', 'Content', 'Outreach', 'Data', 'Development', 'Operations']

export const TASK_TEMPLATES: TaskTemplate[] = [
  // Research
  {
    id: 'research-competitors',
    category: 'Research',
    title: 'Research competitors in [market]',
    description: 'Identify the top competitors in [market], summarize their positioning, pricing, and key differentiators.',
    priority: 'medium',
  },
  {
    id: 'research-news',
    category: 'Research',
    title: 'Summarize recent news about [company/topic]',
    description: 'Find and summarize the most relevant news articles from the last 7 days about [company/topic].',
    priority: 'low',
  },
  {
    id: 'research-contacts',
    category: 'Research',
    title: 'Find contact information for [target]',
    description: 'Locate verified email and LinkedIn profile for [target], and note their role and company.',
    priority: 'medium',
  },
  {
    id: 'research-pricing',
    category: 'Research',
    title: 'Benchmark pricing for [product category]',
    description: 'Survey pricing across at least 5 providers in [product category] and produce a comparison table.',
    priority: 'medium',
  },
  {
    id: 'research-market-size',
    category: 'Research',
    title: 'Estimate market size for [segment]',
    description: 'Find recent data on TAM/SAM for [segment] and cite sources with publication dates.',
    priority: 'low',
  },

  // Content
  {
    id: 'content-blog-post',
    category: 'Content',
    title: 'Write a blog post about [topic]',
    description: 'Draft a 600–900 word blog post on [topic] with an intro, 3 key points, and a call to action.',
    priority: 'medium',
  },
  {
    id: 'content-social-posts',
    category: 'Content',
    title: 'Create 5 social media posts for [product/event]',
    description: 'Write 5 varied social posts (Twitter/X, LinkedIn, Instagram) promoting [product/event], each with a hook and CTA.',
    priority: 'medium',
  },
  {
    id: 'content-linkedin-announcement',
    category: 'Content',
    title: 'Draft a LinkedIn announcement for [news]',
    description: 'Write a professional LinkedIn post announcing [news], highlighting impact and inviting engagement.',
    priority: 'high',
  },
  {
    id: 'content-newsletter',
    category: 'Content',
    title: 'Write an email newsletter for [audience]',
    description: 'Compose a newsletter with subject line, intro, 2–3 content sections, and unsubscribe footer for [audience].',
    priority: 'medium',
  },
  {
    id: 'content-product-descriptions',
    category: 'Content',
    title: 'Generate product descriptions for [items]',
    description: 'Write concise, benefit-focused descriptions (50–100 words each) for [items], optimized for conversions.',
    priority: 'low',
  },
  {
    id: 'content-faq',
    category: 'Content',
    title: 'Create an FAQ page for [product/service]',
    description: 'Generate 10 common questions and answers for [product/service], covering features, pricing, and support.',
    priority: 'low',
  },

  // Outreach
  {
    id: 'outreach-personalized',
    category: 'Outreach',
    title: 'Write personalized outreach to [prospect]',
    description: 'Draft a short, tailored cold message to [prospect] referencing their background and proposing a specific next step.',
    priority: 'high',
  },
  {
    id: 'outreach-follow-up',
    category: 'Outreach',
    title: 'Draft follow-up email for [conversation]',
    description: 'Write a polite follow-up to [conversation], recapping key points and requesting a clear action or reply.',
    priority: 'medium',
  },
  {
    id: 'outreach-cold-sequence',
    category: 'Outreach',
    title: 'Prepare cold email sequence (3 emails) for [campaign]',
    description: 'Write a 3-email drip sequence for [campaign]: initial pitch, value-add follow-up, and final breakup email.',
    priority: 'high',
  },
  {
    id: 'outreach-partnership',
    category: 'Outreach',
    title: 'Draft a partnership proposal for [company]',
    description: 'Write a brief partnership proposal to [company] outlining mutual benefits, scope, and suggested next steps.',
    priority: 'medium',
  },

  // Data
  {
    id: 'data-analyze',
    category: 'Data',
    title: 'Analyze [dataset/period] and summarize key insights',
    description: 'Review [dataset/period], identify trends, anomalies, and top-3 actionable insights, presented in bullet form.',
    priority: 'high',
  },
  {
    id: 'data-weekly-report',
    category: 'Data',
    title: 'Generate a weekly performance report',
    description: 'Compile key metrics for the past 7 days, compare against the prior week, and flag items needing attention.',
    priority: 'medium',
  },
  {
    id: 'data-export-clean',
    category: 'Data',
    title: 'Export and clean data from [source]',
    description: 'Pull data from [source], remove duplicates and blank rows, standardize formats, and deliver a clean CSV.',
    priority: 'medium',
  },
  {
    id: 'data-segment',
    category: 'Data',
    title: 'Segment [audience/list] by [criteria]',
    description: 'Group [audience/list] into segments based on [criteria] and provide counts and defining characteristics per segment.',
    priority: 'low',
  },

  // Development
  {
    id: 'dev-code-review',
    category: 'Development',
    title: 'Review this code for bugs and security issues: [paste code]',
    description: 'Audit the provided code for logic errors, security vulnerabilities, and style issues; return annotated findings.',
    priority: 'high',
  },
  {
    id: 'dev-unit-tests',
    category: 'Development',
    title: 'Write unit tests for [function/module]',
    description: 'Generate comprehensive unit tests for [function/module], covering happy paths, edge cases, and error states.',
    priority: 'medium',
  },
  {
    id: 'dev-api-docs',
    category: 'Development',
    title: 'Document the API for [endpoint]',
    description: 'Write OpenAPI-style documentation for [endpoint]: method, path, request body, response schema, and example curl.',
    priority: 'low',
  },
  {
    id: 'dev-refactor',
    category: 'Development',
    title: 'Refactor [file/module] for readability',
    description: 'Improve naming, reduce complexity, and add inline comments in [file/module] without changing external behavior.',
    priority: 'low',
  },

  // Operations
  {
    id: 'ops-meeting-agenda',
    category: 'Operations',
    title: 'Schedule and prepare agenda for [meeting]',
    description: 'Draft a structured agenda for [meeting] with time slots, discussion topics, owners, and desired outcomes.',
    priority: 'medium',
  },
  {
    id: 'ops-crm-update',
    category: 'Operations',
    title: 'Update CRM with [contact/deal] information',
    description: 'Log latest details for [contact/deal] into the CRM: status, notes, next action, and follow-up date.',
    priority: 'high',
  },
  {
    id: 'ops-inbox-triage',
    category: 'Operations',
    title: 'Process and label inbox from last 24h',
    description: 'Review incoming messages from the last 24 hours, categorize by urgency, and draft replies for high-priority items.',
    priority: 'high',
  },
  {
    id: 'ops-sop',
    category: 'Operations',
    title: 'Write an SOP for [process]',
    description: 'Document the step-by-step standard operating procedure for [process], including inputs, outputs, and edge-case handling.',
    priority: 'low',
  },
]
