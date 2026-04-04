export type SkillCategory =
  | 'design' | 'marketing' | 'finance' | 'planning' | 'communication'
  | 'analytics' | 'storage' | 'ai' | 'ecommerce' | 'dev' | 'crm' | 'hr'
  | 'search' | 'google' | 'media'

export type SkillTemplate = {
  id: string
  name: string
  slug: string
  description: string
  category: SkillCategory
  color: string
  icon: string
  brandIcon?: string
  darkBrandIcon?: boolean
  connector?: {
    slug: string
    base_url?: string
    auth_type?: 'api_key' | 'oauth2' | 'bearer' | 'basic' | 'none'
    oauth_token_url?: string
    oauth_scopes?: string
  }
  fields: {
    key: string
    label: string
    type: 'text' | 'password' | 'url'
    placeholder: string
    required: boolean
    help?: string
  }[]
  content: string
  capabilities?: string[]
}

/** Maps skill slug → capability tags (auto-derived, no manual input needed). */
export const SKILL_CAPABILITIES: Record<string, string[]> = {
  // Google
  'gmail':            ['email'],
  'google-sheets':    ['data-analysis', 'spreadsheets'],
  'google-drive':     ['file-storage', 'documents'],
  'google-calendar':  ['scheduling', 'calendar'],
  'google-docs':      ['documents'],
  'google-meet':      ['video-conferencing', 'scheduling'],
  // Design
  'figma':            ['design'],
  'pexels':           ['images', 'research'],
  'unsplash':         ['images', 'research'],
  'miro':             ['design', 'collaboration'],
  'stability-ai':     ['image-generation', 'ai'],
  // Email / Marketing
  'mailchimp':        ['email', 'marketing'],
  'resend':           ['email'],
  'sendgrid':         ['email'],
  'mailgun':          ['email', 'marketing'],
  'loops':            ['email', 'marketing'],
  'convertkit':       ['email', 'marketing'],
  'klaviyo':          ['email', 'marketing'],
  'brevo':            ['email', 'marketing'],
  'activecampaign':   ['email', 'marketing'],
  'beehiiv':          ['email', 'marketing'],
  'mailjet':          ['email', 'marketing'],
  'campaignmonitor':  ['email', 'marketing'],
  'customerio':       ['email', 'marketing'],
  'typeform':         ['forms', 'data-collection'],
  'eventbrite':       ['events', 'marketing'],
  // Finance / Payments
  'stripe':           ['payments'],
  'lemon-squeezy':    ['payments'],
  'paypal':           ['payments'],
  'wise':             ['payments', 'finance'],
  'square':           ['payments'],
  'chargebee':        ['payments', 'subscriptions'],
  'xero':             ['finance', 'invoicing'],
  // Planning / Project Management
  'notion':           ['notes', 'documents'],
  'trello':           ['project-management'],
  'asana':            ['project-management'],
  'linear':           ['project-management'],
  'airtable':         ['data-analysis', 'project-management'],
  'todoist':          ['task-management'],
  'calendly':         ['scheduling'],
  'jira':             ['project-management', 'issue-tracking'],
  'confluence':       ['documents', 'knowledge-base'],
  'monday':           ['project-management'],
  'clickup':          ['project-management'],
  'shortcut':         ['project-management', 'issue-tracking'],
  'smartsheet':       ['project-management', 'spreadsheets'],
  'teamwork':         ['project-management'],
  'basecamp':         ['project-management'],
  'wrike':            ['project-management'],
  // Communication / Messaging
  'slack':            ['messaging', 'notifications'],
  'slack-webhook':    ['messaging', 'notifications'],
  'discord':          ['messaging', 'notifications'],
  'discord-webhook':  ['messaging', 'notifications'],
  'telegram':         ['messaging', 'notifications'],
  'twilio':           ['sms', 'messaging'],
  'whatsapp':         ['messaging', 'notifications'],
  'onesignal':        ['notifications', 'messaging'],
  'msteams':          ['messaging', 'collaboration'],
  'zoom':             ['video-conferencing', 'scheduling'],
  'googlechat':       ['messaging', 'notifications'],
  'webex':            ['video-conferencing', 'messaging'],
  'mattermost':       ['messaging', 'notifications'],
  // Developer / DevOps
  'github':           ['code', 'version-control'],
  'gitlab':           ['code', 'version-control'],
  'bitbucket':        ['code', 'version-control'],
  'sentry':           ['monitoring', 'error-tracking'],
  'vercel-api':       ['deployments', 'hosting'],
  'render':           ['deployments', 'hosting'],
  'netlify':          ['deployments', 'hosting'],
  'heroku':           ['deployments', 'hosting'],
  'cloudflare':       ['deployments', 'security'],
  'circleci':         ['ci-cd', 'deployments'],
  'docker-hub':       ['containers', 'deployments'],
  'supabase-db':      ['database'],
  'firebase':         ['database'],
  // Analytics / Monitoring
  'posthog':          ['analytics'],
  'plausible':        ['analytics'],
  'datadog':          ['monitoring', 'analytics'],
  'segment':          ['analytics'],
  'new-relic':        ['monitoring', 'analytics'],
  'grafana':          ['monitoring', 'analytics'],
  'mixpanel':         ['analytics'],
  // Storage
  'cloudinary':       ['images', 'file-storage'],
  'supabase-storage': ['file-storage'],
  'backblaze-b2':     ['file-storage'],
  'aws-s3':           ['file-storage'],
  // AI
  'openai':           ['ai', 'text-generation', 'image-generation'],
  'replicate':        ['ai', 'image-generation'],
  'elevenlabs':       ['ai', 'voice-synthesis'],
  'anthropic':        ['ai', 'text-generation'],
  'mistral':          ['ai', 'text-generation'],
  // CRM / Support
  'hubspot':          ['crm', 'marketing'],
  'pipedrive':        ['crm', 'sales'],
  'freshdesk':        ['customer-support'],
  'salesforce':       ['crm', 'sales'],
  'intercom':         ['customer-support', 'messaging'],
  // Search / Research
  'serper':           ['web-search', 'research'],
  'tavily':           ['web-search', 'research'],
  'algolia':          ['search'],
  // HR / Recruitment
  'bamboohr':         ['hr'],
  'greenhouse':       ['hr', 'recruitment'],
  'lever':            ['hr', 'recruitment'],
  'workable':         ['hr', 'recruitment'],
  'smartrecruiters':  ['hr', 'recruitment'],
  'teamtailor':       ['hr', 'recruitment'],
  'recruitee':        ['hr', 'recruitment'],
  'adzuna':           ['job-search', 'research'],
  'reed':             ['job-search', 'research'],
  'jsearch':          ['job-search', 'research'],
  // E-commerce
  'shopify':          ['ecommerce'],
  'woocommerce':      ['ecommerce'],
  // CMS / Content
  'contentful':       ['cms', 'content-management'],
  'webflow':          ['cms', 'web'],
  // Video generation
  'runway':        ['video-generation', 'ai'],
  'luma':          ['video-generation', 'ai'],
  'kling':         ['video-generation', 'ai'],
  'fal':           ['image-generation', 'video-generation', 'ai'],
  // Image generation
  'leonardo':      ['image-generation', 'ai'],
  'ideogram':      ['image-generation', 'ai'],
  // AI / LLM
  'gemini':        ['ai', 'text-generation', 'web-search'],
  'perplexity':    ['web-search', 'research', 'ai'],
  'together-ai':   ['ai', 'text-generation'],
}

export const SKILL_CATEGORIES: Record<string, { label: string; color: string }> = {
  design: { label: 'Design', color: 'text-pink-400' },
  marketing: { label: 'Marketing', color: 'text-orange-400' },
  finance: { label: 'Finance', color: 'text-green-400' },
  planning: { label: 'Planning', color: 'text-amber-400' },
  communication: { label: 'Communication', color: 'text-purple-400' },
  analytics: { label: 'Analytics', color: 'text-cyan-400' },
  storage: { label: 'Storage', color: 'text-slate-400' },
  ai: { label: 'AI & ML', color: 'text-violet-400' },
  ecommerce: { label: 'E-commerce', color: 'text-yellow-400' },
  dev: { label: 'Developer', color: 'text-emerald-400' },
  crm: { label: 'CRM', color: 'text-blue-400' },
  hr: { label: 'HR', color: 'text-teal-400' },
  search: { label: 'Search', color: 'text-red-400' },
  google: { label: 'Google', color: 'text-blue-400' },
  media: { label: 'Media & Video', color: 'text-rose-400' },
}

export const SKILL_TEMPLATES: SkillTemplate[] = [

  // ═══════════════════════════════════════════════════
  // GOOGLE
  // ═══════════════════════════════════════════════════

  {
    id: 'google-sheets', name: 'Google Sheets', slug: 'google-sheets',
    description: 'Read and write Google Spreadsheets via the internal proxy',
    category: 'google', color: '#34A853',
    icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 7h2v2H7zm0 4h2v2H7zm0 4h2v2H7zm4-8h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6z',
    brandIcon: '/app-icons/google-sheets.svg',
    connector: { slug: 'google-sheets' },
    fields: [],
    content: `# Google Sheets API\n\nUse the \`http_request\` tool to call the internal Sheets proxy.\nAll authentication is handled server-side.\n\n## Read cells\n\`\`\`json\n{"url": "{APP_URL}/api/sheets", "method": "POST", "body": {"spreadsheet_id": "ID", "range": "Sheet1!A1:Z100", "action": "read"}}\n\`\`\`\n\n## Write cells\n\`\`\`json\n{"url": "{APP_URL}/api/sheets", "method": "POST", "body": {"spreadsheet_id": "ID", "range": "Sheet1!A1:C2", "action": "write", "values": [["A","B"],["1","2"]]}}\n\`\`\``,
  },
  {
    id: 'gmail', name: 'Gmail', slug: 'gmail',
    description: 'Send, reply, draft, label and search emails via Gmail API',
    category: 'google', color: '#EA4335',
    icon: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    brandIcon: '/app-icons/gmail.svg',
    connector: {
      slug: 'gmail', base_url: 'https://gmail.googleapis.com',
      auth_type: 'oauth2',
      oauth_token_url: 'https://oauth2.googleapis.com/token',
      oauth_scopes: 'https://www.googleapis.com/auth/gmail.modify',
    },
    fields: [
      { key: 'oauth_client_id', label: 'Client ID', type: 'text', placeholder: 'xxxxxx.apps.googleusercontent.com', required: true, help: 'Google Cloud Console → Credentials → OAuth 2.0 Client IDs' },
      { key: 'oauth_client_secret', label: 'Client Secret', type: 'password', placeholder: 'GOCSPX-...', required: true, help: 'Google Cloud Console → Credentials → OAuth 2.0 Client IDs' },
      { key: 'oauth_refresh_token', label: 'Refresh Token', type: 'password', placeholder: '1//...', required: true, help: 'Generate at developers.google.com/oauthplayground — enable "offline access", use scope gmail.modify' },
    ],
    content: `# Gmail API\n\nOAuth2 — the runner auto-refreshes the access token using the stored refresh token.\nBase URL: https://gmail.googleapis.com\n\n## Search / list messages\nGET /gmail/v1/users/me/messages?q=QUERY&maxResults=20\n\nUseful query strings:\n- \`is:unread\` — unread only\n- \`from:user@example.com\` — from sender\n- \`subject:invoice\` — subject contains word\n- \`after:2024/01/01\` — received after date\n- \`has:attachment\` — has attachment\n- \`label:INBOX is:unread\` — unread inbox\n\nReturns a list of \`{id, threadId}\`. Use the id to fetch full content.\n\n## Get message (full content)\nGET /gmail/v1/users/me/messages/{id}?format=full\n\nKey fields in response:\n- \`payload.headers\` — array of {name, value}; look for Subject, From, To, Date, Message-ID\n- \`payload.body.data\` — base64url-encoded body (single-part message)\n- \`payload.parts[]\` — for multipart; find part with mimeType "text/plain" or "text/html", body.data is base64url\n- \`threadId\` — use this to reply in-thread\n\nDecoding body: base64url → replace \`-\`→\`+\` and \`_\`→\`/\`, then standard base64 decode.\n\n## Get thread (full conversation)\nGET /gmail/v1/users/me/threads/{threadId}?format=full\n\nReturns \`messages[]\` array in chronological order.\n\n## Send new email\nPOST /gmail/v1/users/me/messages/send\n\nBuild an RFC 2822 message string, then base64url-encode it:\n\`\`\`\nFrom: sender@example.com\nTo: recipient@example.com\nSubject: Hello\nContent-Type: text/plain; charset=utf-8\n\nMessage body here.\n\`\`\`\n\`\`\`json\n{"raw": "<base64url-encoded RFC 2822 string>"}\n\`\`\`\n\n## Reply to an email\nPOST /gmail/v1/users/me/messages/send\n\nInclude \`In-Reply-To\` and \`References\` headers (use original Message-ID), set same \`threadId\`:\n\`\`\`\nFrom: me@example.com\nTo: original-sender@example.com\nSubject: Re: Original Subject\nIn-Reply-To: <original-message-id>\nReferences: <original-message-id>\nContent-Type: text/plain; charset=utf-8\n\nReply body here.\n\`\`\`\n\`\`\`json\n{"raw": "<base64url RFC 2822>", "threadId": "THREAD_ID"}\n\`\`\`\n\n## Create a draft\nPOST /gmail/v1/users/me/drafts\n\`\`\`json\n{"message": {"raw": "<base64url RFC 2822>"}}\n\`\`\`\n\n## Mark as read\nPOST /gmail/v1/users/me/messages/{id}/modify\n\`\`\`json\n{"removeLabelIds": ["UNREAD"]}\n\`\`\`\n\n## Mark as unread\nPOST /gmail/v1/users/me/messages/{id}/modify\n\`\`\`json\n{"addLabelIds": ["UNREAD"]}\n\`\`\`\n\n## Move to trash\nPOST /gmail/v1/users/me/messages/{id}/trash\n\n## Add or remove labels\nPOST /gmail/v1/users/me/messages/{id}/modify\n\`\`\`json\n{"addLabelIds": ["LABEL_ID"], "removeLabelIds": ["LABEL_ID"]}\n\`\`\`\n\n## List labels\nGET /gmail/v1/users/me/labels\n\nSystem label IDs: INBOX, SENT, DRAFT, TRASH, SPAM, UNREAD, STARRED, IMPORTANT\n\nUse connector_slug="gmail" for auth.`,
  },
  {
    id: 'google-drive', name: 'Google Drive', slug: 'google-drive',
    description: 'List, read, and manage files in Google Drive',
    category: 'google', color: '#FBBC04',
    icon: 'M7.71 3.5L1.15 15l3.43 6 6.55-11.5L7.71 3.5zm1.14 0l6.56 11.5H22L15.44 3.5H8.85zM15 16l-3.43 6h13.72l3.43-6H15z',
    brandIcon: '/app-icons/google-drive.svg',
    connector: {
      slug: 'google-drive', base_url: 'https://www.googleapis.com/drive/v3',
      auth_type: 'oauth2',
      oauth_token_url: 'https://oauth2.googleapis.com/token',
      oauth_scopes: 'https://www.googleapis.com/auth/drive',
    },
    fields: [
      { key: 'oauth_client_id', label: 'Client ID', type: 'text', placeholder: 'xxxxxx.apps.googleusercontent.com', required: true, help: 'Google Cloud Console → Credentials → OAuth 2.0 Client IDs' },
      { key: 'oauth_client_secret', label: 'Client Secret', type: 'password', placeholder: 'GOCSPX-...', required: true, help: 'Google Cloud Console → Credentials → OAuth 2.0 Client IDs' },
      { key: 'oauth_refresh_token', label: 'Refresh Token', type: 'password', placeholder: '1//...', required: true, help: 'Generate at developers.google.com/oauthplayground — enable "offline access", use scope drive' },
    ],
    content: `# Google Drive API\n\nOAuth2 — the runner auto-refreshes the access token using the stored refresh token.\n\n## List files\nGET /files?q=trashed=false&fields=files(id,name,mimeType)\n\n## Search\nGET /files?q=name+contains+'report'\n\n## Get file metadata\nGET /files/{fileId}\n\n## Download file\nGET /files/{fileId}?alt=media\n\nUse connector_slug="google-drive" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // DESIGN
  // ═══════════════════════════════════════════════════

  {
    id: 'figma', name: 'Figma', slug: 'figma',
    description: 'Read design files, export images, inspect components',
    category: 'design', color: '#A259FF',
    icon: 'M5 5.5A3.5 3.5 0 018.5 2H12v7H8.5A3.5 3.5 0 015 5.5zM12 2h3.5a3.5 3.5 0 110 7H12V2zm0 12.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zm0-5.5h3.5a3.5 3.5 0 110 7H12V9zM5 12a3.5 3.5 0 003.5 3.5H12V9H8.5A3.5 3.5 0 005 12z',
    brandIcon: '/app-icons/figma.svg',
    connector: { slug: 'figma', base_url: 'https://api.figma.com/v1' },
    fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'figd_...', required: true, help: 'Figma > Account Settings > Personal Access Tokens' }],
    content: `# Figma API\n\nNote: Use X-Figma-Token header instead of Authorization Bearer.\n\n## Get file\nGET /files/{file_key}\n\n## Get specific nodes\nGET /files/{file_key}/nodes?ids={node_id}\n\n## Export images\nGET /images/{file_key}?ids={node_ids}&format=png`,
  },
  {
    id: 'pexels', name: 'Pexels', slug: 'pexels',
    description: 'Free stock photos and videos, no attribution required',
    category: 'design', color: '#05A081',
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    connector: { slug: 'pexels', base_url: 'https://api.pexels.com/v1' },
    fields: [{ key: 'api_key', label: 'Pexels API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Free at pexels.com/api' }],
    content: `# Pexels API\n\n## Search photos\nGET /search?query={query}&per_page=10\n\n## Curated photos\nGET /curated?per_page=10\n\n## Search videos\nGET /videos/search?query={query}\n\nUse connector_slug="pexels" for auth.`,
  },
  {
    id: 'unsplash', name: 'Unsplash', slug: 'unsplash',
    description: 'High-quality free stock photos, 3M+ images',
    category: 'design', color: '#111111',
    icon: 'M7 2v6h4V2h2v6h4V2h2v8H5V2h2zm-2 10v10h14V12H5z',
    connector: { slug: 'unsplash', base_url: 'https://api.unsplash.com' },
    fields: [{ key: 'api_key', label: 'Access Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'From unsplash.com/developers' }],
    content: `# Unsplash API\n\nAuth uses Client-ID format: Authorization: Client-ID {access_key}\n\n## Search photos\nGET /search/photos?query={query}\n\n## Random photo\nGET /photos/random\n\n## Get photo\nGET /photos/{id}`,
  },

  // ═══════════════════════════════════════════════════
  // MARKETING
  // ═══════════════════════════════════════════════════

  {
    id: 'mailchimp', name: 'Mailchimp', slug: 'mailchimp',
    description: 'Email marketing, audience management, campaigns',
    category: 'marketing', color: '#FFE01B',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    brandIcon: '/app-icons/mailchimp.svg',
    darkBrandIcon: true,
    connector: { slug: 'mailchimp' },
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx-us21', required: true, help: 'Account > Extras > API keys. The suffix (e.g. us21) is your data center.' },
      { key: 'base_url', label: 'Base URL', type: 'url', placeholder: 'https://us21.api.mailchimp.com/3.0', required: true, help: 'Replace us21 with your data center from the API key suffix' },
    ],
    content: `# Mailchimp API\n\nAuth uses HTTP Basic: username=anystring, password=API_KEY.\nSet header: Authorization: Basic base64("any:{API_KEY}")\n\n## List audiences\nGET /lists\n\n## Add subscriber\nPOST /lists/{list_id}/members\n\`\`\`json\n{"email_address": "user@example.com", "status": "subscribed"}\n\`\`\`\n\n## Create campaign\nPOST /campaigns`,
  },
  {
    id: 'resend', name: 'Resend', slug: 'resend',
    description: 'Modern transactional email API for developers',
    category: 'marketing', color: '#000000',
    icon: 'M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67zM22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z',
    connector: { slug: 'resend', base_url: 'https://api.resend.com' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 're_...', required: true, help: 'From resend.com > API Keys' }],
    content: `# Resend Email API\n\n## Send email\nPOST /emails\n\`\`\`json\n{"from": "Agent <agent@yourdomain.com>", "to": ["user@example.com"], "subject": "Subject", "text": "Body"}\n\`\`\`\n\nUse connector_slug="resend" for auth.`,
  },
  {
    id: 'sendgrid', name: 'SendGrid', slug: 'sendgrid',
    description: 'Transactional and marketing email delivery at scale',
    category: 'marketing', color: '#1A82E2',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    brandIcon: '/app-icons/sendgrid.svg',
    connector: { slug: 'sendgrid', base_url: 'https://api.sendgrid.com/v3' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'SG.xxxxxxx...', required: true }],
    content: `# SendGrid API\n\n## Send email\nPOST /mail/send\n\`\`\`json\n{"personalizations": [{"to": [{"email": "user@example.com"}]}], "from": {"email": "agent@yourdomain.com"}, "subject": "Hello", "content": [{"type": "text/plain", "value": "Body"}]}\n\`\`\`\n\n## Get stats\nGET /stats?start_date=2026-01-01\n\nUse connector_slug="sendgrid" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // FINANCE
  // ═══════════════════════════════════════════════════

  {
    id: 'stripe', name: 'Stripe', slug: 'stripe',
    description: 'Payment processing, subscriptions, invoices',
    category: 'finance', color: '#635BFF',
    icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
    brandIcon: '/app-icons/stripe.svg',
    connector: { slug: 'stripe', base_url: 'https://api.stripe.com/v1' },
    fields: [{ key: 'api_key', label: 'Secret Key', type: 'password', placeholder: 'sk_test_...', required: true, help: 'From Stripe Dashboard > Developers > API keys' }],
    content: `# Stripe API\n\nNote: Stripe uses form-encoded bodies, not JSON.\nSet Content-Type: application/x-www-form-urlencoded\n\n## List customers\nGET /customers?limit=10\n\n## Create customer\nPOST /customers (body: name=John&email=john@example.com)\n\n## List invoices\nGET /invoices?limit=10\n\n## List payments\nGET /payment_intents?limit=10\n\nUse connector_slug="stripe" for auth.`,
  },
  {
    id: 'lemon-squeezy', name: 'Lemon Squeezy', slug: 'lemon-squeezy',
    description: 'Payments, subscriptions, and tax for digital products',
    category: 'finance', color: '#FFC233',
    icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    connector: { slug: 'lemon-squeezy', base_url: 'https://api.lemonsqueezy.com/v1' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'eyJ0eX...', required: true, help: 'Settings > API in Lemon Squeezy dashboard' }],
    content: `# Lemon Squeezy API\n\nJSON:API format. Include header: Accept: application/vnd.api+json\n\n## List orders\nGET /orders\n\n## List subscriptions\nGET /subscriptions\n\n## Create checkout\nPOST /checkouts\n\nUse connector_slug="lemon-squeezy" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // PLANNING
  // ═══════════════════════════════════════════════════

  {
    id: 'notion', name: 'Notion', slug: 'notion',
    description: 'All-in-one workspace: notes, databases, wikis, projects',
    category: 'planning', color: '#FFFFFF',
    icon: 'M4 4.5A2.5 2.5 0 016.5 2H18l4 4.5V22a2 2 0 01-2 2H6.5A2.5 2.5 0 014 21.5v-17zM8 8h8v2H8V8zm0 4h8v2H8v-2zm0 4h5v2H8v-2z',
    brandIcon: '/app-icons/notion.svg',
    darkBrandIcon: true,
    connector: { slug: 'notion', base_url: 'https://api.notion.com/v1' },
    fields: [{ key: 'api_key', label: 'Integration Token', type: 'password', placeholder: 'ntn_...', required: true, help: 'notion.so/my-integrations > Create integration' }],
    content: `# Notion API\n\nAll requests need: Notion-Version: 2022-06-28\n\n## Query database\nPOST /databases/{id}/query\n\`\`\`json\n{"filter": {"property": "Status", "status": {"equals": "In Progress"}}}\n\`\`\`\n\n## Create page\nPOST /pages\n\n## Search\nPOST /search\n\`\`\`json\n{"query": "search term"}\n\`\`\`\n\nUse connector_slug="notion" for auth. Add Notion-Version header manually.`,
  },
  {
    id: 'trello', name: 'Trello', slug: 'trello',
    description: 'Kanban boards for task and project tracking',
    category: 'planning', color: '#0052CC',
    icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm3 2v5h4V6H6zm8 0v8h4V6h-4z',
    brandIcon: '/app-icons/trello.svg',
    connector: { slug: 'trello', base_url: 'https://api.trello.com/1' },
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'trello.com/power-ups/admin > API key' },
      { key: 'base_url', label: 'Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Generate from the API key page' },
    ],
    content: `# Trello API\n\nAuth uses query params: ?key={api_key}&token={token}\nDo NOT use Authorization header.\n\n## Get boards\nGET /members/me/boards?key=KEY&token=TOKEN\n\n## Get lists on board\nGET /boards/{id}/lists\n\n## Create card\nPOST /cards?idList={list_id}&name=Task+name\n\n## Update card\nPUT /cards/{id}`,
  },
  {
    id: 'asana', name: 'Asana', slug: 'asana',
    description: 'Work management for teams: tasks, projects, timelines',
    category: 'planning', color: '#F06A6A',
    icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
    connector: { slug: 'asana', base_url: 'https://app.asana.com/api/1.0' },
    fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: '1/12345...', required: true, help: 'app.asana.com > My Settings > Apps > Personal access tokens' }],
    content: `# Asana API\n\n## Create task\nPOST /tasks\n\`\`\`json\n{"data": {"name": "Task name", "projects": ["project_gid"]}}\n\`\`\`\n\n## List tasks in project\nGET /projects/{project_gid}/tasks\n\n## Update task\nPUT /tasks/{task_gid}\n\nUse connector_slug="asana" for auth.`,
  },
  {
    id: 'linear', name: 'Linear', slug: 'linear',
    description: 'Modern issue tracking for software teams',
    category: 'planning', color: '#5E6AD2',
    icon: 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z',
    connector: { slug: 'linear', base_url: 'https://api.linear.app' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'lin_api_...', required: true, help: 'Linear > Settings > Security > Personal API keys' }],
    content: `# Linear API (GraphQL)\n\nAll requests are POST to /graphql with JSON body.\n\n## Create issue\n\`\`\`json\n{"query": "mutation { issueCreate(input: {title: \\"Bug\\", teamId: \\"TEAM_ID\\"}) { success issue { id identifier } } }"}\n\`\`\`\n\n## List issues\n\`\`\`json\n{"query": "{ issues(first: 10) { nodes { id title state { name } } } }"}\n\`\`\`\n\nUse connector_slug="linear" for auth.`,
  },
  {
    id: 'airtable', name: 'Airtable', slug: 'airtable',
    description: 'Spreadsheet-database hybrid with powerful REST API',
    category: 'planning', color: '#18BFFF',
    icon: 'M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125',
    brandIcon: '/app-icons/airtable.svg',
    connector: { slug: 'airtable', base_url: 'https://api.airtable.com/v0' },
    fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'pat...', required: true, help: 'airtable.com/create/tokens' }],
    content: `# Airtable API\n\nBase URL includes baseId and tableName: /v0/{baseId}/{tableName}\n\n## List records\nGET /{baseId}/{tableName}?maxRecords=10\n\n## Create records\nPOST /{baseId}/{tableName}\n\`\`\`json\n{"records": [{"fields": {"Name": "Test", "Status": "Active"}}]}\n\`\`\`\n\n## Update records\nPATCH /{baseId}/{tableName}\n\nUse connector_slug="airtable" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // COMMUNICATION
  // ═══════════════════════════════════════════════════

  {
    id: 'slack', name: 'Slack', slug: 'slack',
    description: 'Send messages and read channels in Slack workspaces',
    category: 'communication', color: '#E01E5A',
    icon: 'M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313z',
    brandIcon: '/app-icons/slack.svg',
    connector: { slug: 'slack', base_url: 'https://slack.com/api' },
    fields: [{ key: 'api_key', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...', required: true, help: 'Slack App > OAuth & Permissions > Bot User OAuth Token' }],
    content: `# Slack API\n\n## Send message\nPOST /chat.postMessage\n\`\`\`json\n{"channel": "CHANNEL_ID", "text": "Hello!"}\n\`\`\`\n\n## List channels\nGET /conversations.list?types=public_channel\n\n## Read messages\nGET /conversations.history?channel=CHANNEL_ID&limit=10\n\nUse connector_slug="slack" for auth.`,
  },
  {
    id: 'discord', name: 'Discord', slug: 'discord',
    description: 'Send messages and manage channels in Discord servers',
    category: 'communication', color: '#5865F2',
    icon: 'M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z',
    brandIcon: '/app-icons/discord.svg',
    connector: { slug: 'discord', base_url: 'https://discord.com/api/v10' },
    fields: [{ key: 'api_key', label: 'Bot Token', type: 'password', placeholder: 'MTIz...', required: true, help: 'Discord Developer Portal > Bot > Token' }],
    content: `# Discord API\n\nAuth uses "Bot" prefix: Authorization: Bot {token}\n\n## Send message\nPOST /channels/{channel_id}/messages\n\`\`\`json\n{"content": "Hello from the agent!"}\n\`\`\`\n\n## List channels\nGET /guilds/{guild_id}/channels\n\n## Read messages\nGET /channels/{channel_id}/messages?limit=10`,
  },
  {
    id: 'twilio', name: 'Twilio', slug: 'twilio',
    description: 'Send SMS, make calls, WhatsApp messaging',
    category: 'communication', color: '#F22F46',
    icon: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z',
    brandIcon: '/app-icons/twilio.svg',
    connector: { slug: 'twilio' },
    fields: [
      { key: 'api_key', label: 'Account SID', type: 'text', placeholder: 'ACxxxxxxx...', required: true },
      { key: 'base_url', label: 'Auth Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'From twilio.com/console' },
    ],
    content: `# Twilio API\n\nAuth: HTTP Basic Auth (SID:AuthToken)\nBase URL: https://api.twilio.com/2010-04-01/Accounts/{AccountSid}\n\n## Send SMS\nPOST /Messages.json (form-encoded)\nBody: From=+1234567890&To=+0987654321&Body=Hello\n\n## List messages\nGET /Messages.json`,
  },

  // ═══════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════

  {
    id: 'posthog', name: 'PostHog', slug: 'posthog',
    description: 'Product analytics, session replay, feature flags',
    category: 'analytics', color: '#F9BD2B',
    icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
    connector: { slug: 'posthog', base_url: 'https://us.posthog.com' },
    fields: [{ key: 'api_key', label: 'Personal API Key', type: 'password', placeholder: 'phx_...', required: true, help: 'PostHog > Settings > Personal API keys' }],
    content: `# PostHog API\n\n## Capture event\nPOST /capture\n\`\`\`json\n{"api_key": "PROJECT_KEY", "event": "page_view", "distinct_id": "user123"}\n\`\`\`\n\n## Get insights\nGET /api/projects/{id}/insights\n\n## Get persons\nGET /api/projects/{id}/persons\n\nUse connector_slug="posthog" for auth on private endpoints.`,
  },
  {
    id: 'plausible', name: 'Plausible', slug: 'plausible',
    description: 'Privacy-friendly, cookie-free website analytics',
    category: 'analytics', color: '#5850EC',
    icon: 'M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z',
    connector: { slug: 'plausible', base_url: 'https://plausible.io/api/v1' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Plausible > Settings > API Keys' }],
    content: `# Plausible Analytics API\n\n## Realtime visitors\nGET /stats/realtime/visitors?site_id={domain}\n\n## Timeseries\nGET /stats/timeseries?site_id={domain}&period=30d\n\n## Traffic sources\nGET /stats/breakdown?site_id={domain}&property=visit:source\n\nUse connector_slug="plausible" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // STORAGE
  // ═══════════════════════════════════════════════════

  {
    id: 'cloudinary', name: 'Cloudinary', slug: 'cloudinary',
    description: 'Cloud image and video management, transformation, delivery',
    category: 'storage', color: '#3448C5',
    icon: 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
    brandIcon: '/app-icons/cloudinary.svg',
    connector: { slug: 'cloudinary' },
    fields: [
      { key: 'api_key', label: 'API Key', type: 'text', placeholder: '123456789012345', required: true },
      { key: 'base_url', label: 'Cloud Name', type: 'text', placeholder: 'my-cloud', required: true, help: 'From Cloudinary Dashboard' },
    ],
    content: `# Cloudinary API\n\nBase URL: https://api.cloudinary.com/v1_1/{cloud_name}\nAuth: HTTP Basic (API Key:API Secret)\n\n## Upload image\nPOST /image/upload (multipart form)\n\n## List resources\nGET /resources/image\n\n## Transform (URL-based)\nhttps://res.cloudinary.com/{cloud}/image/upload/w_300,h_300,c_fill/{public_id}`,
  },

  // ═══════════════════════════════════════════════════
  // AI & ML
  // ═══════════════════════════════════════════════════

  {
    id: 'openai', name: 'OpenAI', slug: 'openai',
    description: 'GPT models, DALL-E image generation, embeddings',
    category: 'ai', color: '#10A37F',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
    connector: { slug: 'openai', base_url: 'https://api.openai.com/v1' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-...', required: true, help: 'From platform.openai.com > API keys' }],
    content: `# OpenAI API\n\n## Chat completion\nPOST /chat/completions\n\`\`\`json\n{"model": "gpt-4o", "messages": [{"role": "user", "content": "Hello"}]}\n\`\`\`\n\n## Generate image\nPOST /images/generations\n\`\`\`json\n{"model": "dall-e-3", "prompt": "A cat", "size": "1024x1024"}\n\`\`\`\n\n## Embeddings\nPOST /embeddings\n\`\`\`json\n{"model": "text-embedding-3-small", "input": "text to embed"}\n\`\`\`\n\nUse connector_slug="openai" for auth.`,
  },
  {
    id: 'replicate', name: 'Replicate', slug: 'replicate',
    description: 'Run open-source ML models (Stable Diffusion, LLaMA, etc.)',
    category: 'ai', color: '#262626',
    icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z',
    connector: { slug: 'replicate', base_url: 'https://api.replicate.com/v1' },
    fields: [{ key: 'api_key', label: 'API Token', type: 'password', placeholder: 'r8_...', required: true, help: 'From replicate.com > Account > API tokens' }],
    content: `# Replicate API\n\n## Run a model\nPOST /predictions\n\`\`\`json\n{"version": "MODEL_VERSION_ID", "input": {"prompt": "A photo of a cat"}}\n\`\`\`\n\n## Get prediction\nGET /predictions/{id}\n\n## List models\nGET /models\n\nUse connector_slug="replicate" for auth.`,
  },
  {
    id: 'elevenlabs', name: 'ElevenLabs', slug: 'elevenlabs',
    description: 'AI voice synthesis and text-to-speech',
    category: 'ai', color: '#000000',
    icon: 'M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z',
    connector: { slug: 'elevenlabs', base_url: 'https://api.elevenlabs.io/v1' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Profile > API Keys on elevenlabs.io' }],
    content: `# ElevenLabs API\n\nAuth uses xi-api-key header (not Authorization Bearer).\n\n## Text to speech\nPOST /text-to-speech/{voice_id}\n\`\`\`json\n{"text": "Hello world", "model_id": "eleven_multilingual_v2"}\n\`\`\`\n\n## List voices\nGET /voices\n\n## List models\nGET /models`,
  },

  // ═══════════════════════════════════════════════════
  // E-COMMERCE
  // ═══════════════════════════════════════════════════

  {
    id: 'shopify', name: 'Shopify', slug: 'shopify',
    description: 'Manage products, orders, and customers in your store',
    category: 'ecommerce', color: '#96BF48',
    icon: 'M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
    brandIcon: '/app-icons/shopify.svg',
    connector: { slug: 'shopify' },
    fields: [
      { key: 'api_key', label: 'Admin API Access Token', type: 'password', placeholder: 'shpat_...', required: true, help: 'From Shopify Admin > Settings > Apps > Develop apps' },
      { key: 'base_url', label: 'Store URL', type: 'url', placeholder: 'https://mystore.myshopify.com/admin/api/2025-01', required: true },
    ],
    content: `# Shopify Admin API\n\nAuth: X-Shopify-Access-Token header (not Authorization Bearer)\n\n## List products\nGET /products.json?limit=10\n\n## Get orders\nGET /orders.json?status=any&limit=10\n\n## List customers\nGET /customers.json?limit=10\n\n## Create product\nPOST /products.json\n\`\`\`json\n{"product": {"title": "New Product", "body_html": "Description"}}\n\`\`\``,
  },

  // ═══════════════════════════════════════════════════
  // DEVELOPER
  // ═══════════════════════════════════════════════════

  {
    id: 'github', name: 'GitHub', slug: 'github',
    description: 'Manage repos, issues, pull requests, and CI/CD',
    category: 'dev', color: '#FFFFFF',
    icon: 'M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z',
    brandIcon: '/app-icons/github.svg',
    darkBrandIcon: true,
    connector: { slug: 'github', base_url: 'https://api.github.com' },
    fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_...', required: true, help: 'GitHub > Settings > Developer Settings > Personal Access Tokens' }],
    content: `# GitHub API\n\n## List repos\nGET /user/repos?sort=updated&per_page=10\n\n## Create issue\nPOST /repos/{owner}/{repo}/issues\n\`\`\`json\n{"title": "Bug report", "body": "Description..."}\n\`\`\`\n\n## List PRs\nGET /repos/{owner}/{repo}/pulls?state=open\n\n## Search code\nGET /search/code?q=keyword+repo:{owner}/{repo}\n\nUse connector_slug="github" for auth.`,
  },
  {
    id: 'gitlab', name: 'GitLab', slug: 'gitlab',
    description: 'DevOps platform with repos, CI/CD, and issue tracking',
    category: 'dev', color: '#FC6D26',
    icon: 'M4.845 7.11l.38-1.15 1.93-5.88a.29.29 0 01.55 0l1.93 5.88H14.4l1.93-5.88a.29.29 0 01.55 0l1.93 5.88.38 1.15a.58.58 0 01-.21.65l-6.98 5.07-6.98-5.07a.58.58 0 01-.21-.65z',
    brandIcon: '/app-icons/gitlab.svg',
    connector: { slug: 'gitlab', base_url: 'https://gitlab.com/api/v4' },
    fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'glpat-...', required: true, help: 'GitLab > Preferences > Access Tokens' }],
    content: `# GitLab API\n\nAuth uses PRIVATE-TOKEN header (not Authorization Bearer).\n\n## List projects\nGET /projects?membership=true&per_page=10\n\n## Create issue\nPOST /projects/{id}/issues\n\`\`\`json\n{"title": "Bug", "description": "Details..."}\n\`\`\`\n\n## List pipelines\nGET /projects/{id}/pipelines`,
  },
  {
    id: 'sentry', name: 'Sentry', slug: 'sentry',
    description: 'Application monitoring, error tracking, performance',
    category: 'dev', color: '#362D59',
    icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
    brandIcon: '/app-icons/sentry.svg',
    darkBrandIcon: true,
    connector: { slug: 'sentry', base_url: 'https://sentry.io/api/0' },
    fields: [{ key: 'api_key', label: 'Auth Token', type: 'password', placeholder: 'sntrys_...', required: true, help: 'Sentry > Settings > Auth Tokens' }],
    content: `# Sentry API\n\n## List issues\nGET /organizations/{org}/issues/?query=is:unresolved\n\n## List events\nGET /organizations/{org}/events/\n\n## Create release\nPOST /organizations/{org}/releases/\n\`\`\`json\n{"version": "1.0.0", "projects": ["my-project"]}\n\`\`\`\n\nUse connector_slug="sentry" for auth.`,
  },
  {
    id: 'vercel', name: 'Vercel', slug: 'vercel-api',
    description: 'Manage deployments, domains, and serverless functions',
    category: 'dev', color: '#000000',
    icon: 'M12 2L2 19.5h20L12 2z',
    brandIcon: '/app-icons/vercel.svg',
    darkBrandIcon: true,
    connector: { slug: 'vercel-api', base_url: 'https://api.vercel.com' },
    fields: [{ key: 'api_key', label: 'Bearer Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Vercel > Settings > Tokens' }],
    content: `# Vercel API\n\n## List deployments\nGET /v6/deployments?limit=10\n\n## List domains\nGET /v5/domains\n\n## Get project\nGET /v9/projects/{projectId}\n\nUse connector_slug="vercel-api" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // CRM
  // ═══════════════════════════════════════════════════

  {
    id: 'hubspot', name: 'HubSpot', slug: 'hubspot',
    description: 'CRM with contacts, deals, tickets, and marketing automation',
    category: 'crm', color: '#FF7A59',
    icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
    connector: { slug: 'hubspot', base_url: 'https://api.hubapi.com' },
    fields: [{ key: 'api_key', label: 'Private App Token', type: 'password', placeholder: 'pat-na1-...', required: true, help: 'HubSpot > Settings > Integrations > Private Apps' }],
    content: `# HubSpot API\n\n## Create contact\nPOST /crm/v3/objects/contacts\n\`\`\`json\n{"properties": {"email": "user@example.com", "firstname": "John", "lastname": "Doe"}}\n\`\`\`\n\n## List deals\nGET /crm/v3/objects/deals?limit=10\n\n## Search contacts\nPOST /crm/v3/objects/contacts/search\n\`\`\`json\n{"filterGroups": [{"filters": [{"propertyName": "email", "operator": "CONTAINS_TOKEN", "value": "example"}]}]}\n\`\`\`\n\nUse connector_slug="hubspot" for auth.`,
  },
  {
    id: 'pipedrive', name: 'Pipedrive', slug: 'pipedrive',
    description: 'Sales CRM with visual pipelines and deal tracking',
    category: 'crm', color: '#017737',
    icon: 'M3 4h18v4H3V4zm0 6h8v10H3V10zm10 0h8v4h-8v-4zm0 6h8v4h-8v-4z',
    connector: { slug: 'pipedrive', base_url: 'https://api.pipedrive.com/v1' },
    fields: [{ key: 'api_key', label: 'API Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Pipedrive > Settings > Personal preferences > API' }],
    content: `# Pipedrive API\n\nAuth uses query param: ?api_token={token}\nDo NOT use Authorization header.\n\n## List deals\nGET /deals?api_token={token}&limit=10\n\n## Create deal\nPOST /deals?api_token={token}\n\`\`\`json\n{"title": "New deal", "value": 1000}\n\`\`\`\n\n## List persons\nGET /persons?api_token={token}`,
  },
  {
    id: 'freshdesk', name: 'Freshdesk', slug: 'freshdesk',
    description: 'Customer support helpdesk with ticketing',
    category: 'crm', color: '#25C16F',
    icon: 'M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z',
    connector: { slug: 'freshdesk' },
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Profile > Your API Key in Freshdesk' },
      { key: 'base_url', label: 'Domain URL', type: 'url', placeholder: 'https://yourcompany.freshdesk.com/api/v2', required: true },
    ],
    content: `# Freshdesk API\n\nAuth: HTTP Basic (API Key as username, "X" as password)\n\n## Create ticket\nPOST /tickets\n\`\`\`json\n{"subject": "Issue", "description": "Details...", "email": "user@example.com", "priority": 2, "status": 2}\n\`\`\`\n\n## List tickets\nGET /tickets\n\n## Update ticket\nPUT /tickets/{id}`,
  },

  // ═══════════════════════════════════════════════════
  // HR & RECRUITMENT
  // ═══════════════════════════════════════════════════

  {
    id: 'bamboohr', name: 'BambooHR', slug: 'bamboohr',
    description: 'HR management: employee records, time-off, onboarding',
    category: 'hr', color: '#73C41D',
    icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
    connector: { slug: 'bamboohr' },
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'BambooHR > Account > API Keys' },
      { key: 'base_url', label: 'Company Domain URL', type: 'url', placeholder: 'https://api.bamboohr.com/api/gateway.php/mycompany/v1', required: true },
    ],
    content: `# BambooHR API\n\nAuth: HTTP Basic (API Key as username, "x" as password)\nAdd header: Accept: application/json\n\n## Employee directory\nGET /employees/directory\n\n## Get employee\nGET /employees/{id}/?fields=firstName,lastName,department\n\n## Time-off requests\nGET /time_off/requests/?start=2026-01-01&end=2026-12-31`,
  },

  // ═══════════════════════════════════════════════════
  // SEARCH
  // ═══════════════════════════════════════════════════

  {
    id: 'tavily', name: 'Tavily Search', slug: 'tavily',
    description: 'AI-powered web search with structured results',
    category: 'search', color: '#6366F1',
    icon: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    connector: { slug: 'tavily', base_url: 'https://api.tavily.com' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'tvly-...', required: true, help: 'From tavily.com > Dashboard > API Keys' }],
    content: `# Tavily Search\n\nAPI key goes in the request body, not header.\n\n## Search\nPOST /search\n\`\`\`json\n{"api_key": "YOUR_API_KEY", "query": "search query", "search_depth": "basic", "max_results": 5}\n\`\`\`\n\n- search_depth: "basic" (fast) or "advanced" (thorough)\n- max_results: 1-10\n\n**Note:** Do NOT use connector_slug for auth — Tavily uses API key in body.`,
  },

  // ═══════════════════════════════════════════════════
  // COMMUNICATION (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'whatsapp', name: 'WhatsApp Business', slug: 'whatsapp',
    description: 'Send and receive WhatsApp messages via the Cloud API',
    category: 'communication', color: '#25D366',
    icon: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.123 1.534 5.856L0 24l6.29-1.51A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z',
    brandIcon: '/app-icons/whatsapp.svg',
    connector: { slug: 'whatsapp', base_url: 'https://graph.facebook.com/v19.0' },
    fields: [
      { key: 'api_key', label: 'Permanent Access Token', type: 'password', placeholder: 'EAAxxxxxxx...', required: true, help: 'Meta Developer Portal > App > WhatsApp > API Setup' },
      { key: 'base_url', label: 'Phone Number ID', type: 'text', placeholder: '123456789012345', required: true, help: 'WhatsApp > API Setup > Phone number ID' },
    ],
    content: `# WhatsApp Business Cloud API\n\nBase URL: https://graph.facebook.com/v19.0\nAuth: Bearer token in Authorization header.\n\n## Send text message\nPOST /{phone_number_id}/messages\n\`\`\`json\n{\n  "messaging_product": "whatsapp",\n  "recipient_type": "individual",\n  "to": "15551234567",\n  "type": "text",\n  "text": { "body": "Hello from the agent!" }\n}\n\`\`\`\n\n## Send template message\nPOST /{phone_number_id}/messages\n\`\`\`json\n{\n  "messaging_product": "whatsapp",\n  "to": "15551234567",\n  "type": "template",\n  "template": {\n    "name": "hello_world",\n    "language": { "code": "en_US" }\n  }\n}\n\`\`\`\n\n## Send image message\nPOST /{phone_number_id}/messages\n\`\`\`json\n{\n  "messaging_product": "whatsapp",\n  "to": "15551234567",\n  "type": "image",\n  "image": { "link": "https://example.com/image.jpg" }\n}\n\`\`\`\n\n## Mark message as read\nPUT /{phone_number_id}/messages\n\`\`\`json\n{ "messaging_product": "whatsapp", "status": "read", "message_id": "wamid.xxx" }\n\`\`\`\n\nUse connector_slug="whatsapp" for auth.`,
  },

  {
    id: 'slack-webhook', name: 'Slack Webhook', slug: 'slack-webhook',
    description: 'Post messages to Slack channels via Incoming Webhooks — no OAuth needed',
    category: 'communication', color: '#4A154B',
    icon: 'M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.527 2.527 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.527 2.527 0 012.521 2.521 2.527 2.527 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312z',
    brandIcon: '/app-icons/slack.svg',
    connector: { slug: 'slack-webhook' },
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', placeholder: 'https://hooks.slack.com/services/T.../B.../xxx', required: true, help: 'Slack App > Incoming Webhooks > Add New Webhook to Workspace' },
    ],
    content: `# Slack Incoming Webhooks\n\nNo OAuth required. POST JSON to the webhook URL directly.\n\n## Send a simple message\nPOST {webhook_url}\n\`\`\`json\n{ "text": "Hello from the agent!" }\n\`\`\`\n\n## Send a rich message with blocks\nPOST {webhook_url}\n\`\`\`json\n{\n  "blocks": [\n    {\n      "type": "section",\n      "text": { "type": "mrkdwn", "text": "*Alert:* Something happened." }\n    },\n    {\n      "type": "section",\n      "fields": [\n        { "type": "mrkdwn", "text": "*Status:* :red_circle: Error" },\n        { "type": "mrkdwn", "text": "*Time:* 2026-03-30 12:00" }\n      ]\n    }\n  ]\n}\n\`\`\`\n\n## Send to a specific channel (override)\nPOST {webhook_url}\n\`\`\`json\n{ "text": "Hello", "channel": "#alerts", "username": "My Agent" }\n\`\`\`\n\n**Note:** POST directly to the webhook_url field — do not use connector auth.`,
  },

  {
    id: 'discord-webhook', name: 'Discord Webhook', slug: 'discord-webhook',
    description: 'Post messages and embeds to Discord channels via webhooks — no bot required',
    category: 'communication', color: '#5865F2',
    icon: 'M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z',
    brandIcon: '/app-icons/discord.svg',
    connector: { slug: 'discord-webhook' },
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', placeholder: 'https://discord.com/api/webhooks/...', required: true, help: 'Discord channel > Edit Channel > Integrations > Webhooks' },
    ],
    content: `# Discord Webhooks\n\nNo bot token required. POST JSON to the webhook URL directly.\n\n## Send a plain message\nPOST {webhook_url}\n\`\`\`json\n{ "content": "Hello from the agent!" }\n\`\`\`\n\n## Send with username and avatar override\nPOST {webhook_url}\n\`\`\`json\n{\n  "content": "Deployment succeeded!",\n  "username": "Deploy Bot",\n  "avatar_url": "https://example.com/avatar.png"\n}\n\`\`\`\n\n## Send a rich embed\nPOST {webhook_url}\n\`\`\`json\n{\n  "embeds": [{\n    "title": "Build #42 Passed",\n    "description": "All 57 tests passed.",\n    "color": 3066993,\n    "fields": [\n      { "name": "Branch", "value": "main", "inline": true },\n      { "name": "Duration", "value": "1m 23s", "inline": true }\n    ],\n    "timestamp": "2026-03-30T12:00:00.000Z"\n  }]\n}\n\`\`\`\n\n- color is a decimal integer (e.g. 3066993 = #2ECC71 green)\n- Supports up to 10 embeds per request\n\n**Note:** POST directly to the webhook_url — no auth header needed.`,
  },

  // ═══════════════════════════════════════════════════
  // DEVELOPER (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'jira', name: 'Jira', slug: 'jira',
    description: 'Issue and project tracking for software teams by Atlassian',
    category: 'dev', color: '#0052CC',
    icon: 'M11.571 11.513H0a5.218 5.218 0 005.232 5.215h2.13v2.057A5.215 5.215 0 0012.575 24V12.518a1.005 1.005 0 00-1.004-1.005zm5.723-5.756H5.757a5.215 5.215 0 005.215 5.214h2.129v2.058a5.218 5.218 0 005.215 5.214V6.762a1.005 1.005 0 00-1.022-1.005zM23.013 0H11.455a5.215 5.215 0 005.215 5.215h2.129v2.057A5.215 5.215 0 0024 12.483V1.005A1.001 1.001 0 0023.013 0z',
    brandIcon: '/app-icons/jira.svg',
    connector: { slug: 'jira' },
    fields: [
      { key: 'api_key', label: 'API Token', type: 'password', placeholder: 'ATATTxxxxxxx...', required: true, help: 'id.atlassian.com > Security > Create and manage API tokens' },
      { key: 'base_url', label: 'Cloud Base URL', type: 'url', placeholder: 'https://yourcompany.atlassian.net/rest/api/3', required: true, help: 'Replace "yourcompany" with your Atlassian cloud subdomain' },
    ],
    content: `# Jira REST API v3\n\nAuth: HTTP Basic — email address as username, API token as password.\nEncode as Base64: email:api_token\n\n## Create issue\nPOST /issue\n\`\`\`json\n{\n  "fields": {\n    "project": { "key": "PROJ" },\n    "summary": "Bug in login flow",\n    "issuetype": { "name": "Bug" },\n    "description": {\n      "type": "doc", "version": 1,\n      "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Details here." }] }]\n    }\n  }\n}\n\`\`\`\n\n## Search issues (JQL)\nPOST /issue/search\n\`\`\`json\n{ "jql": "project = PROJ AND status = \\"In Progress\\"", "maxResults": 20 }\n\`\`\`\n\n## Get issue\nGET /issue/{issueIdOrKey}\n\n## Update issue\nPUT /issue/{issueIdOrKey}\n\`\`\`json\n{ "fields": { "summary": "Updated title" } }\n\`\`\`\n\n## Transition issue (change status)\nPOST /issue/{issueIdOrKey}/transitions\n\`\`\`json\n{ "transition": { "id": "31" } }\n\`\`\`\nFirst GET /issue/{issueIdOrKey}/transitions to list available transitions and their IDs.\n\n## Add comment\nPOST /issue/{issueIdOrKey}/comment\n\`\`\`json\n{\n  "body": {\n    "type": "doc", "version": 1,\n    "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Comment text." }] }]\n  }\n}\n\`\`\``,
  },

  {
    id: 'docker-hub', name: 'Docker Hub', slug: 'docker-hub',
    description: 'Manage container image repositories, tags, and builds',
    category: 'dev', color: '#2496ED',
    icon: 'M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.186.186 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.185.186v1.887c0 .102.082.185.184.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z',
    brandIcon: '/app-icons/docker.svg',
    connector: { slug: 'docker-hub', base_url: 'https://hub.docker.com/v2' },
    fields: [
      { key: 'api_key', label: 'Access Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Docker Hub > Account Settings > Security > New Access Token' },
    ],
    content: `# Docker Hub API v2\n\nAuth: Bearer token in Authorization header.\nFirst obtain a JWT: POST https://hub.docker.com/v2/users/login with {"username": "...", "password": "ACCESS_TOKEN"}.\nThe response contains a "token" field — use that as Bearer token.\n\n## List repositories\nGET /repositories/{namespace}/?page_size=25\n\n## Get repository info\nGET /repositories/{namespace}/{repository}/\n\n## List tags\nGET /repositories/{namespace}/{repository}/tags?page_size=25\n\n## Get tag details\nGET /repositories/{namespace}/{repository}/tags/{tag}/\n\n## Delete tag\nDELETE /repositories/{namespace}/{repository}/tags/{tag}/\n\n## Search repositories (public)\nGET /search/repositories/?query={term}&page_size=10\n\n## Get image manifest (via Registry API)\nGET https://registry-1.docker.io/v2/{namespace}/{repository}/manifests/{tag}\nRequires separate auth against registry.docker.io (use token from /token endpoint).`,
  },

  {
    id: 'datadog', name: 'Datadog', slug: 'datadog',
    description: 'Cloud monitoring, metrics, logs, APM, and alerting',
    category: 'analytics', color: '#632CA6',
    icon: 'M14.5 2.5c0 1.5-1.5 3-3 3a3 3 0 01-3-3c0-1.381 1.5-2.5 3-2.5s3 1.119 3 2.5zM2 19v-8.5c0-1.5 1.5-3 3-3h14c1.5 0 3 1.5 3 3V19l-3 3H5l-3-3zm5-6h10v2H7v-2zm0 3h7v2H7v-2z',
    connector: { slug: 'datadog', base_url: 'https://api.datadoghq.com/api/v1' },
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Datadog > Organization Settings > API Keys' },
      { key: 'base_url', label: 'App Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Datadog > Organization Settings > Application Keys — required for read operations' },
    ],
    content: `# Datadog API v1\n\nAuth uses two headers:\n- DD-API-KEY: {api_key}\n- DD-APPLICATION-KEY: {app_key}\n\nNote: For EU region use https://api.datadoghq.eu/api/v1 as base URL.\n\n## Submit metrics\nPOST /series\n\`\`\`json\n{\n  "series": [{\n    "metric": "custom.agent.events",\n    "points": [[1711843200, 42]],\n    "type": "gauge",\n    "tags": ["env:production", "service:api"]\n  }]\n}\n\`\`\`\n\n## Query metrics\nGET /query?from=1711756800&to=1711843200&query=avg:system.cpu.user{*}\n\n## List monitors\nGET /monitor?with_downtimes=true\n\n## Create monitor\nPOST /monitor\n\`\`\`json\n{\n  "name": "High CPU",\n  "type": "metric alert",\n  "query": "avg(last_5m):avg:system.cpu.user{*} > 90",\n  "message": "CPU is high @pagerduty"\n}\n\`\`\`\n\n## List events\nGET /events?start=1711756800&end=1711843200\n\n## Send event\nPOST /events\n\`\`\`json\n{ "title": "Deploy completed", "text": "v1.2.3 deployed to production", "tags": ["env:prod"] }\n\`\`\`\n\n## Get logs (v2)\nPOST https://api.datadoghq.com/api/v2/logs/events/search\n\`\`\`json\n{ "filter": { "query": "service:api status:error", "from": "now-1h", "to": "now" }, "page": { "limit": 50 } }\n\`\`\``,
  },

  // ═══════════════════════════════════════════════════
  // AI & ML (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'stability-ai', name: 'Stability AI', slug: 'stability-ai',
    description: 'Stable Diffusion image generation, editing, and upscaling',
    category: 'ai', color: '#7B2FBE',
    icon: 'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 4a6 6 0 110 12A6 6 0 0112 6zm0 2a4 4 0 100 8 4 4 0 000-8z',
    connector: { slug: 'stability-ai', base_url: 'https://api.stability.ai' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-...', required: true, help: 'platform.stability.ai > Account > API Keys' }],
    content: `# Stability AI API\n\nAuth: Authorization: Bearer {api_key}\n\n## Generate image (Stable Image Core)\nPOST /v2beta/stable-image/generate/core\nContent-Type: multipart/form-data\n\nForm fields:\n- prompt (required): text description\n- negative_prompt: what to avoid\n- aspect_ratio: "1:1" | "16:9" | "9:16" | "3:2" | "2:3" (default "1:1")\n- output_format: "png" | "jpeg" | "webp" (default "png")\n- seed: integer for reproducibility\n\nResponse: image bytes (check Content-Type) or JSON with base64 if Accept: application/json.\n\n## Generate image (Stable Diffusion 3.5)\nPOST /v2beta/stable-image/generate/sd3\nForm fields:\n- prompt (required)\n- model: "sd3.5-large" | "sd3.5-large-turbo" | "sd3.5-medium" (default "sd3.5-large")\n- aspect_ratio, output_format, seed (same as above)\n\n## Image-to-image\nPOST /v2beta/stable-image/generate/core\nForm fields:\n- prompt (required)\n- image: binary file upload\n- strength: 0.0–1.0 (how much to change the image, default 0.5)\n\n## Remove background\nPOST /v2beta/stable-image/edit/remove-background\nForm fields:\n- image: binary file upload\n- output_format: "png" | "webp"\n\n## Upscale image (Conservative)\nPOST /v2beta/stable-image/upscale/conservative\nForm fields:\n- image: binary file upload\n- prompt: description to guide upscaling\n- creativity: 0.2–0.5 (default 0.35)\n\n## List available engines (v1)\nGET /v1/engines/list\n\n**Note:** Use connector_slug="stability-ai" for auth.`,
  },

  {
    id: 'anthropic', name: 'Anthropic Claude', slug: 'anthropic',
    description: 'Claude AI models for text, reasoning, vision, and tool use',
    category: 'ai', color: '#D97706',
    icon: 'M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.18L19 8.5v7l-7 3.88L5 15.5v-7l7-3.82z',
    connector: { slug: 'anthropic', base_url: 'https://api.anthropic.com/v1' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-ant-...', required: true, help: 'console.anthropic.com > API Keys' }],
    content: `# Anthropic Messages API\n\nAuth uses x-api-key header (not Authorization Bearer).\nAlways include: anthropic-version: 2023-06-01\n\n## Basic message\nPOST /messages\n\`\`\`json\n{\n  "model": "claude-opus-4-5",\n  "max_tokens": 1024,\n  "messages": [{ "role": "user", "content": "Hello, Claude." }]\n}\n\`\`\`\n\n## With system prompt\nPOST /messages\n\`\`\`json\n{\n  "model": "claude-sonnet-4-5",\n  "max_tokens": 2048,\n  "system": "You are a helpful assistant.",\n  "messages": [{ "role": "user", "content": "Summarize this text: ..." }]\n}\n\`\`\`\n\n## With vision (image input)\nPOST /messages\n\`\`\`json\n{\n  "model": "claude-opus-4-5",\n  "max_tokens": 1024,\n  "messages": [{\n    "role": "user",\n    "content": [\n      { "type": "image", "source": { "type": "base64", "media_type": "image/jpeg", "data": "BASE64_STRING" } },\n      { "type": "text", "text": "What is in this image?" }\n    ]\n  }]\n}\n\`\`\`\n\n## Streaming\nAdd "stream": true to any request — returns server-sent events.\n\n## Available models\n- claude-opus-4-5 — most capable\n- claude-sonnet-4-5 — balanced speed/quality\n- claude-haiku-3-5 — fastest\n\nUse connector_slug="anthropic" for auth.`,
  },

  {
    id: 'mistral', name: 'Mistral AI', slug: 'mistral',
    description: 'Fast and efficient open-weight language models via API',
    category: 'ai', color: '#FF7000',
    icon: 'M3 4h4v4H3V4zm0 6h4v4H3v-4zm0 6h4v4H3v-4zm6-12h4v4H9V4zm0 6h4v4H9v-4zm0 6h4v4H9v-4zm6-12h4v4h-4V4zm0 6h4v4h-4v-4zm0 6h4v4h-4v-4z',
    connector: { slug: 'mistral', base_url: 'https://api.mistral.ai/v1' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'console.mistral.ai > API Keys' }],
    content: `# Mistral AI API\n\nOpenAI-compatible API. Auth: Authorization: Bearer {api_key}\n\n## Chat completion\nPOST /chat/completions\n\`\`\`json\n{\n  "model": "mistral-large-latest",\n  "messages": [{ "role": "user", "content": "Explain quantum entanglement simply." }]\n}\n\`\`\`\n\n## With streaming\nPOST /chat/completions\n\`\`\`json\n{\n  "model": "mistral-small-latest",\n  "messages": [{ "role": "user", "content": "Hello" }],\n  "stream": true\n}\n\`\`\`\n\n## Embeddings\nPOST /embeddings\n\`\`\`json\n{ "model": "mistral-embed", "input": ["Text to embed"] }\n\`\`\`\n\n## List models\nGET /models\n\n## Available models\n- mistral-large-latest — most capable\n- mistral-small-latest — fast and cost-effective\n- codestral-latest — code-focused\n- mistral-embed — embeddings model\n\nUse connector_slug="mistral" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // PRODUCTIVITY (Todoist, Calendly)
  // ═══════════════════════════════════════════════════

  {
    id: 'todoist', name: 'Todoist', slug: 'todoist',
    description: 'Manage tasks, projects, labels, and due dates in Todoist',
    category: 'planning', color: '#DB4035',
    icon: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    brandIcon: '/app-icons/todoist.svg',
    connector: { slug: 'todoist', base_url: 'https://api.todoist.com/rest/v2' },
    fields: [{ key: 'api_key', label: 'API Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Todoist > Settings > Integrations > Developer > API token' }],
    content: `# Todoist REST API v2\n\nAuth: Authorization: Bearer {api_token}\n\n## Get all tasks\nGET /tasks\n\n## Filter tasks by project\nGET /tasks?project_id={project_id}\n\n## Create task\nPOST /tasks\n\`\`\`json\n{\n  "content": "Buy groceries",\n  "due_string": "tomorrow at 10am",\n  "priority": 2,\n  "project_id": "PROJECT_ID"\n}\n\`\`\`\npriority: 1 (normal) to 4 (urgent).\n\n## Update task\nPOST /tasks/{id}\n\`\`\`json\n{ "content": "Updated task name", "priority": 3 }\n\`\`\`\n\n## Complete task\nPOST /tasks/{id}/close\n\n## Reopen task\nPOST /tasks/{id}/reopen\n\n## Delete task\nDELETE /tasks/{id}\n\n## List projects\nGET /projects\n\n## Create project\nPOST /projects\n\`\`\`json\n{ "name": "My Project", "color": "red" }\n\`\`\`\n\n## Get all labels\nGET /labels\n\nUse connector_slug="todoist" for auth.`,
  },

  {
    id: 'calendly', name: 'Calendly', slug: 'calendly',
    description: 'Query scheduling data: event types, scheduled events, and invitees',
    category: 'planning', color: '#006BFF',
    icon: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z',
    connector: { slug: 'calendly', base_url: 'https://api.calendly.com' },
    fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'eyJhbGci...', required: true, help: 'Calendly > Integrations > API & Webhooks > Personal Access Tokens' }],
    content: `# Calendly API v2\n\nAuth: Authorization: Bearer {personal_access_token}\nAll requests must include your user URI, obtained from /users/me.\n\n## Get current user\nGET /users/me\nReturns your user URI like: https://api.calendly.com/users/XXXXX\n\n## List event types\nGET /event_types?user={user_uri}\n\n## List scheduled events\nGET /scheduled_events?user={user_uri}&count=20\nOptional filters: min_start_time, max_start_time (ISO 8601), status=active|canceled\n\n## Get event details\nGET /scheduled_events/{uuid}\n\n## List invitees for an event\nGET /scheduled_events/{uuid}/invitees\n\n## Cancel an event\nPOST /scheduled_events/{uuid}/cancellation\n\`\`\`json\n{ "reason": "Agent cancelled this meeting." }\n\`\`\`\n\n## Create webhook subscription\nPOST /webhook_subscriptions\n\`\`\`json\n{\n  "url": "https://your-webhook-endpoint.com/hook",\n  "events": ["invitee.created", "invitee.canceled"],\n  "organization": "{org_uri}",\n  "scope": "organization"\n}\n\`\`\`\n\nUse connector_slug="calendly" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // FINANCE (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'paypal', name: 'PayPal', slug: 'paypal',
    description: 'Accept payments, manage orders, issue refunds via PayPal REST API',
    category: 'finance', color: '#003087',
    icon: 'M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944 2.79A.859.859 0 015.79 2.1h6.878c2.625 0 4.608.795 5.895 2.363 1.245 1.517 1.51 3.33.784 5.39-.78 2.197-2.184 3.82-4.173 4.825-1.672.848-3.668 1.275-5.934 1.275h-.003c-.657 0-1.216.476-1.316 1.126l-.845 5.258zm10.85-14.29c-.035.207-.08.42-.135.636-.884 3.387-3.64 5.127-8.196 5.127h-.001c-.457 0-.85.33-.926.782l-1.147 7.278h3.06a.56.56 0 00.552-.474l.048-.248.654-4.143.042-.228a.56.56 0 01.553-.474h.348c2.618 0 4.666-.707 5.788-2.485.935-1.494.947-3.19-.64-5.77z',
    brandIcon: '/app-icons/paypal.svg',
    darkBrandIcon: true,
    connector: { slug: 'paypal', base_url: 'https://api-m.paypal.com/v2' },
    fields: [
      { key: 'api_key', label: 'Client ID', type: 'text', placeholder: 'AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxA', required: true, help: 'developer.paypal.com > Apps & Credentials > Your App' },
      { key: 'base_url', label: 'Client Secret', type: 'password', placeholder: 'Exxxxxxxxx...', required: true, help: 'Same app page as Client ID — keep this secret' },
    ],
    content: `# PayPal REST API v2\n\nPayPal uses OAuth 2.0 client credentials. First obtain an access token:\n\n## Get access token\nPOST https://api-m.paypal.com/v1/oauth2/token\nAuth: HTTP Basic (client_id:client_secret)\nBody (form-encoded): grant_type=client_credentials\n\nResponse: { "access_token": "Bearer ...", "token_type": "Bearer", "expires_in": 32400 }\n\nUse the returned access_token as: Authorization: Bearer {access_token}\n\n**Note:** Use https://api-m.sandbox.paypal.com for sandbox testing.\n\n## Create order\nPOST /checkout/orders\n\`\`\`json\n{\n  "intent": "CAPTURE",\n  "purchase_units": [{\n    "amount": { "currency_code": "USD", "value": "10.00" },\n    "description": "Order description"\n  }]\n}\n\`\`\`\n\n## Capture order (after buyer approval)\nPOST /checkout/orders/{order_id}/capture\n\n## Get order\nGET /checkout/orders/{order_id}\n\n## List transactions\nGET https://api-m.paypal.com/v1/reporting/transactions?start_date=2026-01-01T00:00:00-0700&end_date=2026-03-31T23:59:59-0700\n\n## Issue refund\nPOST https://api-m.paypal.com/v2/payments/captures/{capture_id}/refund\n\`\`\`json\n{ "amount": { "value": "5.00", "currency_code": "USD" }, "note_to_payer": "Partial refund" }\n\`\`\``,
  },

  {
    id: 'wise', name: 'Wise (TransferWise)', slug: 'wise',
    description: 'International money transfers, multi-currency accounts, and FX rates',
    category: 'finance', color: '#00B9FF',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z',
    connector: { slug: 'wise', base_url: 'https://api.transferwise.com/v3' },
    fields: [{ key: 'api_key', label: 'API Token', type: 'password', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true, help: 'Wise > Settings > API tokens > Add new token' }],
    content: `# Wise API v3\n\nAuth: Authorization: Bearer {api_token}\nFor sandbox testing use: https://api.sandbox.transferwise.tech/v3\n\n## List profiles\nGET /profiles\nReturns personal and business profiles. Note the profile id for subsequent calls.\n\n## Get exchange rate\nGET https://api.transferwise.com/v1/rates?source=USD&target=EUR\n\n## Create quote\nPOST /quotes\n\`\`\`json\n{\n  "sourceCurrency": "USD",\n  "targetCurrency": "EUR",\n  "sourceAmount": 1000,\n  "profile": PROFILE_ID\n}\n\`\`\`\n\n## List recipient accounts\nGET https://api.transferwise.com/v1/accounts?profile={profileId}&currency=EUR\n\n## Create recipient account\nPOST https://api.transferwise.com/v1/accounts\n\`\`\`json\n{\n  "profile": PROFILE_ID,\n  "accountHolderName": "John Doe",\n  "currency": "EUR",\n  "type": "iban",\n  "details": { "iban": "DE89370400440532013000" }\n}\n\`\`\`\n\n## Create transfer\nPOST https://api.transferwise.com/v1/transfers\n\`\`\`json\n{\n  "targetAccount": RECIPIENT_ACCOUNT_ID,\n  "quoteUuid": "QUOTE_ID",\n  "customerTransactionId": "unique-uuid",\n  "details": { "reference": "Payment ref" }\n}\n\`\`\`\n\n## Fund transfer\nPOST https://api.transferwise.com/v3/profiles/{profileId}/transfers/{transferId}/payments\n\`\`\`json\n{ "type": "BALANCE" }\n\`\`\`\n\n## Get account balance\nGET /profiles/{profileId}/balances?types=STANDARD\n\nUse connector_slug="wise" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // STORAGE (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'supabase-storage', name: 'Supabase Storage', slug: 'supabase-storage',
    description: 'Store and serve files with Supabase S3-compatible storage buckets',
    category: 'storage', color: '#3ECF8E',
    icon: 'M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z',
    connector: { slug: 'supabase-storage' },
    fields: [
      { key: 'api_key', label: 'Service Role Key', type: 'password', placeholder: 'eyJhbGci...', required: true, help: 'Supabase Dashboard > Project Settings > API > service_role key' },
      { key: 'base_url', label: 'Project Storage URL', type: 'url', placeholder: 'https://xxxx.supabase.co/storage/v1', required: true, help: 'Your Project URL from Settings > API, append /storage/v1' },
    ],
    content: `# Supabase Storage API\n\nAuth: Authorization: Bearer {service_role_key}\nAlso set: apikey: {service_role_key}\nBase URL: https://{project_ref}.supabase.co/storage/v1\n\n## List buckets\nGET /bucket\n\n## Create bucket\nPOST /bucket\n\`\`\`json\n{ "id": "my-bucket", "name": "my-bucket", "public": false }\n\`\`\`\n\n## List files in a bucket\nPOST /object/list/{bucket_name}\n\`\`\`json\n{ "prefix": "folder/", "limit": 100, "offset": 0 }\n\`\`\`\n\n## Upload file\nPOST /object/{bucket_name}/{path_to_file}\nContent-Type: {file_mime_type}\nBody: binary file content\n\n## Download file\nGET /object/{bucket_name}/{path_to_file}\n\n## Get public URL (for public buckets)\nGET /object/public/{bucket_name}/{path_to_file}\nThis is a direct URL — no auth needed if bucket is public.\n\n## Delete file\nDELETE /object/{bucket_name}\n\`\`\`json\n{ "prefixes": ["path/to/file.jpg"] }\n\`\`\`\n\n## Move/rename file\nPOST /object/move\n\`\`\`json\n{ "bucketId": "my-bucket", "sourceKey": "old/path.jpg", "destinationKey": "new/path.jpg" }\n\`\`\`\n\n## Copy file\nPOST /object/copy\n\`\`\`json\n{ "bucketId": "my-bucket", "sourceKey": "original.jpg", "destinationKey": "copy.jpg" }\n\`\`\`\n\nUse connector_slug="supabase-storage" for auth.`,
  },

  {
    id: 'backblaze-b2', name: 'Backblaze B2', slug: 'backblaze-b2',
    description: 'Low-cost S3-compatible cloud object storage',
    category: 'storage', color: '#E3000F',
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    connector: { slug: 'backblaze-b2', base_url: 'https://api.backblazeb2.com/b2api/v3' },
    fields: [
      { key: 'api_key', label: 'Application Key ID', type: 'text', placeholder: '003xxxxxxxxxxxxxxxxxxxxxxxx', required: true, help: 'Backblaze > App Keys > Add a New Application Key' },
      { key: 'base_url', label: 'Application Key', type: 'password', placeholder: 'K003xxxxxxxxxxxxxxxxxxxxxxxx', required: true, help: 'Shown once when key is created — copy it immediately' },
    ],
    content: `# Backblaze B2 API v3\n\nB2 uses a two-step auth: first authorize to get a token and API URLs, then use those for all file operations.\n\n## Step 1: Authorize account\nGET https://api.backblazeb2.com/b2api/v3/b2_authorize_account\nAuth: HTTP Basic (keyID:applicationKey)\n\nResponse includes:\n- authorizationToken: use this as Authorization header for all subsequent calls\n- apiInfo.storageApi.apiUrl: base URL for subsequent calls\n- apiInfo.storageApi.downloadUrl: base URL for downloads\n\n## List buckets\nGET {apiUrl}/b2api/v3/b2_list_buckets?accountId={accountId}\n\n## Upload file (2 steps)\n### Get upload URL\nGET {apiUrl}/b2api/v3/b2_get_upload_url?bucketId={bucketId}\nReturns: uploadUrl, authorizationToken (upload-specific token)\n\n### Upload to that URL\nPOST {uploadUrl}\nHeaders:\n- Authorization: {uploadAuthToken}\n- X-Bz-File-Name: path/to/file.jpg (URL-encoded)\n- Content-Type: image/jpeg\n- Content-Length: {bytes}\n- X-Bz-Content-Sha1: {sha1_of_file}\n\n## Download file\nGET {downloadUrl}/file/{bucketName}/{fileName}\n\n## List files in bucket\nGET {apiUrl}/b2api/v3/b2_list_file_names?bucketId={bucketId}&maxFileCount=100\n\n## Delete file version\nGET {apiUrl}/b2api/v3/b2_delete_file_version?fileId={fileId}&fileName={fileName}`,
  },

  {
    id: 'aws-s3', name: 'AWS S3', slug: 'aws-s3',
    description: 'Store and retrieve files from Amazon S3 buckets',
    category: 'storage', color: '#FF9900',
    icon: 'M2 20h20v2H2v-2zm2-8h2v6H4v-6zm5-3h2v9H9V9zm5 5h2v4h-2v-4zm5-8h2v12h-2V6z',
    brandIcon: '/app-icons/aws-s3.svg',
    connector: { slug: 'aws-s3', base_url: 'https://s3.amazonaws.com' },
    fields: [
      { key: 'api_key', label: 'Access Key ID', type: 'text', placeholder: 'AKIAIOSFODNN7EXAMPLE', required: true, help: 'AWS IAM > Users > Security Credentials > Create Access Key' },
      { key: 'base_url', label: 'Secret Access Key', type: 'password', placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', required: true },
    ],
    content: `# AWS S3 API\n\nS3 uses AWS Signature Version 4 (SigV4) auth — this is complex to compute manually.\nRecommend using the AWS SDK or a pre-signed URL approach.\n\n## Bucket URL format\nPath-style: https://s3.{region}.amazonaws.com/{bucket}/{key}\nVirtual-hosted: https://{bucket}.s3.{region}.amazonaws.com/{key}\n\n## List objects in bucket\nGET https://s3.{region}.amazonaws.com/{bucket}?list-type=2&max-keys=100&prefix={prefix}\n\n## Get object\nGET https://{bucket}.s3.{region}.amazonaws.com/{key}\n\n## Put object (upload)\nPUT https://{bucket}.s3.{region}.amazonaws.com/{key}\nHeaders:\n- Content-Type: {mime_type}\n- Content-Length: {bytes}\nBody: binary file\n\n## Delete object\nDELETE https://{bucket}.s3.{region}.amazonaws.com/{key}\n\n## Generate pre-signed URL (for downloads/uploads without exposing keys)\nThis requires SigV4 signing. The URL includes:\n- X-Amz-Algorithm=AWS4-HMAC-SHA256\n- X-Amz-Credential={AccessKeyId}/{date}/{region}/s3/aws4_request\n- X-Amz-Expires=3600 (seconds)\n- X-Amz-Signature={computed_signature}\n\n**Tip:** For simpler integration, store files via Supabase Storage or Cloudinary which wrap S3 with simpler auth.`,
  },

  // ═══════════════════════════════════════════════════
  // DEVELOPER (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'render', name: 'Render', slug: 'render',
    description: 'Manage cloud services, deploys, and infrastructure on Render',
    category: 'dev', color: '#46E3B7',
    icon: 'M12 2a10 10 0 110 20A10 10 0 0112 2zm0 2a8 8 0 100 16A8 8 0 0012 4zm1 3v5.586l3.707 3.707-1.414 1.414-4-4A1 1 0 0111 13V7h2z',
    connector: { slug: 'render', base_url: 'https://api.render.com/v1' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'rnd_...', required: true, help: 'Render Dashboard > Account Settings > API Keys' }],
    content: `# Render API v1\n\nAuth: Authorization: Bearer {api_key}\n\n## List services\nGET /services?limit=20\n\n## Get service\nGET /services/{serviceId}\n\n## Trigger manual deploy\nPOST /services/{serviceId}/deploys\n\`\`\`json\n{ "clearCache": "do_not_clear" }\n\`\`\`\n\n## List deploys for a service\nGET /services/{serviceId}/deploys?limit=10\n\n## Get deploy\nGET /services/{serviceId}/deploys/{deployId}\n\n## Suspend service\nPOST /services/{serviceId}/suspend\n\n## Resume service\nPOST /services/{serviceId}/resume\n\n## Scale service (instance count)\nPOST /services/{serviceId}/scale\n\`\`\`json\n{ "numInstances": 2 }\n\`\`\`\n\n## List environment variables\nGET /services/{serviceId}/env-vars\n\n## Update environment variable\nPUT /services/{serviceId}/env-vars/{envVarKey}\n\`\`\`json\n{ "value": "new-value" }\n\`\`\`\n\nUse connector_slug="render" for auth.`,
  },

  {
    id: 'supabase-db', name: 'Supabase Database', slug: 'supabase-db',
    description: 'Query and manage your Supabase PostgreSQL database via REST',
    category: 'dev', color: '#3ECF8E',
    icon: 'M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z',
    connector: { slug: 'supabase-db' },
    fields: [
      { key: 'api_key', label: 'Service Role Key', type: 'password', placeholder: 'eyJhbGci...', required: true, help: 'Supabase Dashboard > Project Settings > API > service_role key (bypasses RLS)' },
      { key: 'base_url', label: 'Project REST URL', type: 'url', placeholder: 'https://xxxx.supabase.co/rest/v1', required: true, help: 'Your Project URL from Settings > API, append /rest/v1' },
    ],
    content: `# Supabase REST API (PostgREST)\n\nAuth: Both headers required:\n- Authorization: Bearer {service_role_key}\n- apikey: {service_role_key}\n\nBase URL: https://{project_ref}.supabase.co/rest/v1\n\n## Select rows\nGET /{table}?select=*&limit=10\nGET /{table}?select=id,name,email\nGET /{table}?status=eq.active&select=*\n\n## Filter operators\n- eq, neq, gt, gte, lt, lte\n- like, ilike (case-insensitive), in\nExample: GET /users?age=gte.18&name=ilike.*john*\n\n## Insert row\nPOST /{table}\nPrefer: return=representation\n\`\`\`json\n{ "name": "Alice", "email": "alice@example.com" }\n\`\`\`\n\n## Update rows\nPATCH /{table}?id=eq.{id}\nPrefer: return=representation\n\`\`\`json\n{ "name": "Alice Updated" }\n\`\`\`\n\n## Delete rows\nDELETE /{table}?id=eq.{id}\n\n## Upsert\nPOST /{table}\nPrefer: resolution=merge-duplicates,return=representation\n\`\`\`json\n{ "id": 1, "name": "Alice", "email": "alice@example.com" }\n\`\`\`\n\n## Call RPC function\nPOST /rpc/{function_name}\n\`\`\`json\n{ "param1": "value1" }\n\`\`\`\n\nUse connector_slug="supabase-db" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // MARKETING (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'loops', name: 'Loops', slug: 'loops',
    description: 'Modern email platform for SaaS — transactional and marketing emails',
    category: 'marketing', color: '#7C3AED',
    icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 2v.01L12 13 20 6.01V6H4zm0 12h16V8.99l-8 6.92-8-6.92V18z',
    connector: { slug: 'loops', base_url: 'https://app.loops.so/api/v1' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Loops > Settings > API' }],
    content: `# Loops API v1\n\nAuth: Authorization: Bearer {api_key}\n\n## Send transactional email\nPOST /transactional\n\`\`\`json\n{\n  "transactionalId": "cm_xxxx",\n  "email": "user@example.com",\n  "dataVariables": {\n    "username": "Alice",\n    "confirmUrl": "https://example.com/confirm/abc123"\n  }\n}\n\`\`\`\n\n## Create or update contact\nPOST /contacts/upsert\n\`\`\`json\n{\n  "email": "user@example.com",\n  "firstName": "Alice",\n  "lastName": "Smith",\n  "userGroup": "pro",\n  "subscribed": true\n}\n\`\`\`\n\n## Find contact\nGET /contacts/find?email=user@example.com\n\n## Delete contact\nDELETE /contacts\n\`\`\`json\n{ "email": "user@example.com" }\n\`\`\`\n\n## Send event (trigger automations)\nPOST /events/send\n\`\`\`json\n{\n  "email": "user@example.com",\n  "eventName": "Plan Upgraded",\n  "eventProperties": { "plan": "pro", "mrr": 29 }\n}\n\`\`\`\n\nUse connector_slug="loops" for auth.`,
  },

  {
    id: 'convertkit', name: 'ConvertKit', slug: 'convertkit',
    description: 'Email marketing for creators — subscribers, sequences, and broadcasts',
    category: 'marketing', color: '#FB6970',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z',
    connector: { slug: 'convertkit', base_url: 'https://api.convertkit.com/v3' },
    fields: [{ key: 'api_key', label: 'API Secret', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'ConvertKit > Settings > Advanced > API Secret (use Secret, not Key, for write access)' }],
    content: `# ConvertKit API v3\n\nAuth uses api_secret query parameter (not header) on all requests.\nAppend ?api_secret={api_secret} to every request, or include in JSON body.\n\n## List subscribers\nGET /subscribers?api_secret={api_secret}\n\n## Create subscriber\nPOST /forms/{form_id}/subscribe\n\`\`\`json\n{\n  "api_secret": "API_SECRET",\n  "email": "user@example.com",\n  "first_name": "Alice",\n  "fields": { "company": "Acme Inc" }\n}\n\`\`\`\n\n## Add tag to subscriber\nPOST /tags/{tag_id}/subscribe\n\`\`\`json\n{ "api_secret": "API_SECRET", "email": "user@example.com" }\n\`\`\`\n\n## List tags\nGET /tags?api_key={api_key}\n\n## Create tag\nPOST /tags\n\`\`\`json\n{ "api_secret": "API_SECRET", "tag": { "name": "Paying Customer" } }\n\`\`\`\n\n## List sequences\nGET /sequences?api_key={api_key}\n\n## Subscribe to sequence\nPOST /sequences/{sequence_id}/subscribe\n\`\`\`json\n{ "api_secret": "API_SECRET", "email": "user@example.com" }\n\`\`\`\n\n**Note:** api_key (public) works for read operations; api_secret required for writes.`,
  },

  // ═══════════════════════════════════════════════════
  // ANALYTICS (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'mixpanel', name: 'Mixpanel', slug: 'mixpanel',
    description: 'Event-based product analytics with funnels and cohorts',
    category: 'analytics', color: '#7856FF',
    icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
    connector: { slug: 'mixpanel', base_url: 'https://api.mixpanel.com' },
    fields: [
      { key: 'api_key', label: 'Service Account Username', type: 'text', placeholder: 'service-account.xxxxxxx', required: true, help: 'Mixpanel > Project Settings > Service Accounts > Create' },
      { key: 'base_url', label: 'Service Account Password', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Shown once when service account is created' },
    ],
    content: `# Mixpanel API\n\nTwo separate APIs: Ingestion (track events) and Query (read data).\n\n## Ingest events\nPOST https://api.mixpanel.com/track\nContent-Type: application/x-www-form-urlencoded\nBody: data={base64_encoded_json}\n\nWhere the JSON is:\n\`\`\`json\n[{\n  "event": "Signup",\n  "properties": {\n    "token": "YOUR_PROJECT_TOKEN",\n    "distinct_id": "user123",\n    "plan": "pro",\n    "time": 1711843200\n  }\n}]\n\`\`\`\n\n## Import historical events (server-side)\nPOST https://api.mixpanel.com/import?project_id={project_id}\nAuth: HTTP Basic (service_account_username:service_account_password)\nContent-Type: application/json\n\`\`\`json\n[{ "event": "Purchase", "properties": { "distinct_id": "user123", "time": 1711843200, "amount": 49 } }]\n\`\`\`\n\n## Query: Get events report\nGET https://data.mixpanel.com/api/2.0/export?project_id={project_id}&from_date=2026-01-01&to_date=2026-03-31&event=[\"Signup\"]\nAuth: HTTP Basic (service_account_username:service_account_password)\nReturns newline-delimited JSON.\n\n## Query: Funnel\nGET https://mixpanel.com/api/2.0/funnels?project_id={project_id}&funnel_id={funnel_id}&from_date=2026-01-01&to_date=2026-03-31\n\n## User profiles: Set properties\nPOST https://api.mixpanel.com/engage#profile-set\n\`\`\`json\n[{ "$token": "PROJECT_TOKEN", "$distinct_id": "user123", "$set": { "$name": "Alice", "$email": "alice@example.com" } }]\n\`\`\``,
  },

  // ═══════════════════════════════════════════════════
  // CRM (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'intercom', name: 'Intercom', slug: 'intercom',
    description: 'Customer messaging platform for support, engagement, and onboarding',
    category: 'crm', color: '#1F8DED',
    icon: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z',
    brandIcon: '/app-icons/intercom.svg',
    darkBrandIcon: true,
    connector: { slug: 'intercom', base_url: 'https://api.intercom.io' },
    fields: [{ key: 'api_key', label: 'Access Token', type: 'password', placeholder: 'dG9rZW5...', required: true, help: 'Intercom > Settings > Integrations > Developer Hub > Your App > Authentication' }],
    content: `# Intercom API\n\nAuth: Authorization: Bearer {access_token}\nAlways include: Accept: application/json\nFor specific API versions add: Intercom-Version: 2.10\n\n## Create or update contact\nPOST /contacts\n\`\`\`json\n{\n  "role": "user",\n  "email": "user@example.com",\n  "name": "Alice Smith",\n  "custom_attributes": { "plan": "pro" }\n}\n\`\`\`\n\n## Search contacts\nPOST /contacts/search\n\`\`\`json\n{\n  "query": { "field": "email", "operator": "=", "value": "alice@example.com" }\n}\n\`\`\`\n\n## List conversations\nGET /conversations?order=updated_at&sort=desc&per_page=10\n\n## Create conversation (send message as admin)\nPOST /conversations\n\`\`\`json\n{\n  "from": { "type": "admin", "id": "ADMIN_ID" },\n  "to": { "type": "user", "id": "CONTACT_ID" },\n  "subject": "Hey there",\n  "body": "Hello, how can we help you?"\n}\n\`\`\`\n\n## Reply to conversation\nPOST /conversations/{id}/reply\n\`\`\`json\n{\n  "message_type": "comment",\n  "type": "admin",\n  "admin_id": "ADMIN_ID",\n  "body": "Thanks for reaching out!"\n}\n\`\`\`\n\n## Add tag to contact\nPOST /contacts/{id}/tags\n\`\`\`json\n{ "id": "TAG_ID" }\n\`\`\`\n\nUse connector_slug="intercom" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // SEARCH (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'algolia', name: 'Algolia', slug: 'algolia',
    description: 'Hosted search engine with instant results and AI ranking',
    category: 'search', color: '#003DFF',
    icon: 'M12 2a10 10 0 110 20A10 10 0 0112 2zm0 4a6 6 0 100 12A6 6 0 0012 6zm0 2a4 4 0 110 8 4 4 0 010-8z',
    connector: { slug: 'algolia' },
    fields: [
      { key: 'api_key', label: 'Admin API Key', type: 'password', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', required: true, help: 'Algolia Dashboard > API Keys > Admin API Key (or a limited-scope key)' },
      { key: 'base_url', label: 'App ID', type: 'text', placeholder: 'XXXXXXXXXX', required: true, help: 'Algolia Dashboard > API Keys > Application ID' },
    ],
    content: `# Algolia Search API\n\nAuth uses two headers on every request:\n- X-Algolia-API-Key: {api_key}\n- X-Algolia-Application-Id: {app_id}\n\nBase URL pattern: https://{app_id}.algolia.net/1\nOr use DNS-load-balanced: https://{app_id}-dsn.algolia.net/1 (for search)\n\n## Search an index\nPOST /indexes/{indexName}/query\n\`\`\`json\n{\n  "query": "red shoes",\n  "hitsPerPage": 10,\n  "filters": "price < 100",\n  "attributesToRetrieve": ["name", "price", "image"]\n}\n\`\`\`\n\n## Add / replace object\nPUT /indexes/{indexName}/{objectID}\n\`\`\`json\n{ "name": "Red Sneakers", "price": 89.99, "category": "footwear" }\n\`\`\`\n\n## Add object (auto-generate ID)\nPOST /indexes/{indexName}\n\`\`\`json\n{ "name": "Blue Jeans", "price": 49.99 }\n\`\`\`\n\n## Partial update\nPOST /indexes/{indexName}/{objectID}/partial\n\`\`\`json\n{ "price": 79.99 }\n\`\`\`\n\n## Delete object\nDELETE /indexes/{indexName}/{objectID}\n\n## Batch operations\nPOST /indexes/{indexName}/batch\n\`\`\`json\n{\n  "requests": [\n    { "action": "addObject", "body": { "name": "Product A", "price": 10 } },\n    { "action": "deleteObject", "body": { "objectID": "123" } }\n  ]\n}\n\`\`\`\n\n## Clear index\nPOST /indexes/{indexName}/clear\n\n## List indices\nGET /indexes`,
  },

  {
    id: 'serper', name: 'Serper (Google Search)', slug: 'serper',
    description: 'Real-time Google Search results via a simple API',
    category: 'search', color: '#EA4335',
    icon: 'M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z',
    connector: { slug: 'serper', base_url: 'https://google.serper.dev' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'serper.dev > Dashboard > API Key' }],
    content: `# Serper Google Search API\n\nAuth: X-API-KEY header\n\n## Web search\nPOST /search\n\`\`\`json\n{\n  "q": "best AI tools 2026",\n  "num": 10,\n  "gl": "us",\n  "hl": "en"\n}\n\`\`\`\n\nResponse includes: organic results (title, link, snippet, position), knowledge graph, answer box, related searches.\n\n## Image search\nPOST /images\n\`\`\`json\n{ "q": "cats", "num": 10 }\n\`\`\`\n\n## News search\nPOST /news\n\`\`\`json\n{ "q": "AI news", "num": 10, "tbs": "qdr:d" }\n\`\`\`\ntbs values: qdr:h (past hour), qdr:d (past day), qdr:w (past week), qdr:m (past month)\n\n## Shopping search\nPOST /shopping\n\`\`\`json\n{ "q": "running shoes", "num": 10 }\n\`\`\`\n\n## Autocomplete suggestions\nPOST /autocomplete\n\`\`\`json\n{ "q": "best way to" }\n\`\`\`\n\nUse connector_slug="serper" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // GOOGLE (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'google-calendar', name: 'Google Calendar', slug: 'google-calendar',
    description: 'Create, read, and manage calendar events via Google Calendar API',
    category: 'google', color: '#4285F4',
    icon: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5zm2 4h5v5H7v-5z',
    brandIcon: '/app-icons/google-calendar.svg',
    connector: { slug: 'google-calendar', base_url: 'https://www.googleapis.com/calendar/v3' },
    fields: [{ key: 'api_key', label: 'Calendar API Key', type: 'password', placeholder: 'AIza...', required: true, help: 'From Google Cloud Console' }],
    content: `# Google Calendar API\n\n## List calendars\nGET /users/me/calendarList\n\n## List events\nGET /calendars/{calendarId}/events?timeMin={ISO}&timeMax={ISO}&singleEvents=true&orderBy=startTime\n\n## Create event\nPOST /calendars/{calendarId}/events\n\`\`\`json\n{"summary": "Meeting", "start": {"dateTime": "2026-01-01T10:00:00Z"}, "end": {"dateTime": "2026-01-01T11:00:00Z"}}\n\`\`\`\n\n## Delete event\nDELETE /calendars/{calendarId}/events/{eventId}\n\nUse connector_slug="google-calendar" for auth.`,
  },
  {
    id: 'google-docs', name: 'Google Docs', slug: 'google-docs',
    description: 'Read and write Google Documents via Docs API',
    category: 'google', color: '#4285F4',
    icon: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zM8 12h8v2H8v-2zm0 4h5v2H8v-2z',
    brandIcon: '/app-icons/google-docs.svg',
    connector: { slug: 'google-docs', base_url: 'https://docs.googleapis.com/v1' },
    fields: [{ key: 'api_key', label: 'Docs API Key', type: 'password', placeholder: 'AIza...', required: true }],
    content: `# Google Docs API\n\n## Get document\nGET /documents/{documentId}\n\n## Batch update (insert text)\nPOST /documents/{documentId}:batchUpdate\n\`\`\`json\n{"requests": [{"insertText": {"location": {"index": 1}, "text": "Hello world"}}]}\n\`\`\`\n\nUse connector_slug="google-docs" for auth.`,
  },
  {
    id: 'google-meet', name: 'Google Meet', slug: 'google-meet',
    description: 'Create and manage Google Meet video conferences',
    category: 'google', color: '#00897B',
    icon: 'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z',
    brandIcon: '/app-icons/google-meet.svg',
    connector: { slug: 'google-meet', base_url: 'https://meet.googleapis.com/v2' },
    fields: [{ key: 'api_key', label: 'Meet API Key', type: 'password', placeholder: 'AIza...', required: true }],
    content: `# Google Meet API\n\n## Create meeting space\nPOST /spaces\n\n## Get meeting space\nGET /spaces/{spaceName}\n\n## End active call\nPOST /spaces/{spaceName}:endActiveConference\n\nUse connector_slug="google-meet" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // COMMUNICATION (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'telegram', name: 'Telegram Bot', slug: 'telegram',
    description: 'Send messages, manage groups, and build bots via Telegram Bot API',
    category: 'communication', color: '#26A5E4',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z',
    brandIcon: '/app-icons/telegram.svg',
    connector: { slug: 'telegram', base_url: 'https://api.telegram.org' },
    fields: [{ key: 'api_key', label: 'Bot Token', type: 'password', placeholder: '123456:ABC-DEF...', required: true, help: 'From @BotFather on Telegram' }],
    content: `# Telegram Bot API\n\nBase URL format: /bot{token}/methodName\n\n## Send message\nPOST /bot{token}/sendMessage\n\`\`\`json\n{"chat_id": "123456", "text": "Hello!", "parse_mode": "Markdown"}\n\`\`\`\n\n## Get updates\nGET /bot{token}/getUpdates?offset={offset}&limit=100\n\n## Send photo\nPOST /bot{token}/sendPhoto\n\`\`\`json\n{"chat_id": "123456", "photo": "https://example.com/photo.jpg", "caption": "Caption"}\n\`\`\`\n\n## Get chat info\nGET /bot{token}/getChat?chat_id={chat_id}\n\nUse connector_slug="telegram" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // CRM (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'salesforce', name: 'Salesforce', slug: 'salesforce',
    description: 'Manage leads, contacts, opportunities, and custom objects via Salesforce REST API',
    category: 'crm', color: '#00A1E0',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z',
    brandIcon: '/app-icons/salesforce.svg',
    connector: { slug: 'salesforce', base_url: 'https://login.salesforce.com/services/data/v59.0' },
    fields: [
      { key: 'api_key', label: 'Access Token', type: 'password', placeholder: '00D...', required: true, help: 'From Salesforce Connected App' },
      { key: 'base_url', label: 'Instance URL', type: 'url', placeholder: 'https://yourorg.my.salesforce.com', required: true },
    ],
    content: `# Salesforce REST API\n\n## Query records (SOQL)\nGET /services/data/v59.0/query?q=SELECT+Id,Name+FROM+Account+LIMIT+10\n\n## Get record\nGET /services/data/v59.0/sobjects/{objectType}/{id}\n\n## Create record\nPOST /services/data/v59.0/sobjects/{objectType}\n\`\`\`json\n{"Name": "Acme Corp", "Industry": "Technology"}\n\`\`\`\n\n## Update record\nPATCH /services/data/v59.0/sobjects/{objectType}/{id}\n\n## Delete record\nDELETE /services/data/v59.0/sobjects/{objectType}/{id}\n\nUse connector_slug="salesforce" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // MARKETING (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'mailgun', name: 'Mailgun', slug: 'mailgun',
    description: 'Send transactional emails, manage mailing lists, and track deliveries',
    category: 'marketing', color: '#C02428',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    brandIcon: '/app-icons/mailgun.svg',
    connector: { slug: 'mailgun', base_url: 'https://api.mailgun.net/v3' },
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'key-...', required: true, help: 'Mailgun Dashboard > API Keys' },
      { key: 'base_url', label: 'Domain', type: 'text', placeholder: 'mg.yourdomain.com', required: true },
    ],
    content: `# Mailgun API\n\nAuth: Basic auth with "api" as username and API key as password.\n\n## Send email\nPOST /{domain}/messages\nform-data: from, to, subject, text (or html)\n\n## List events\nGET /{domain}/events?event=delivered&limit=25\n\n## Manage mailing lists\nGET /lists/pages\nPOST /lists\n\nUse connector_slug="mailgun" for auth.`,
  },
  {
    id: 'typeform', name: 'Typeform', slug: 'typeform',
    description: 'Create forms, collect responses, and manage workspaces',
    category: 'marketing', color: '#262627',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    brandIcon: '/app-icons/typeform.svg',
    darkBrandIcon: true,
    connector: { slug: 'typeform', base_url: 'https://api.typeform.com' },
    fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'tfp_...', required: true, help: 'Typeform > Account > Personal tokens' }],
    content: `# Typeform API\n\n## List forms\nGET /forms?page_size=10\n\n## Get form responses\nGET /forms/{form_id}/responses?page_size=25\n\n## Create form\nPOST /forms\n\`\`\`json\n{"title": "Feedback Survey", "fields": [{"type": "short_text", "title": "Your name"}]}\n\`\`\`\n\n## Get form insights\nGET /forms/{form_id}/insights\n\nUse connector_slug="typeform" for auth.`,
  },
  {
    id: 'customerio', name: 'Customer.io', slug: 'customerio',
    description: 'Automate messaging workflows, manage customers, and send targeted campaigns',
    category: 'marketing', color: '#7131FF',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    brandIcon: '/app-icons/customerio.svg',
    connector: { slug: 'customerio', base_url: 'https://api.customer.io/v2' },
    fields: [{ key: 'api_key', label: 'App API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Customer.io > Settings > API Credentials' }],
    content: `# Customer.io API\n\n## List customers\nGET /customers?limit=10\n\n## Create/update customer\nPUT /customers/{customer_id}\n\`\`\`json\n{"email": "user@example.com", "first_name": "John", "plan": "premium"}\n\`\`\`\n\n## Trigger broadcast\nPOST /campaigns/{campaign_id}/triggers\n\n## Send transactional email\nPOST /send/email\n\`\`\`json\n{"to": "user@example.com", "transactional_message_id": "1", "identifiers": {"id": "123"}}\n\`\`\`\n\nUse connector_slug="customerio" for auth.`,
  },
  {
    id: 'eventbrite', name: 'Eventbrite', slug: 'eventbrite',
    description: 'Create events, manage attendees, and sell tickets',
    category: 'marketing', color: '#F05537',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    brandIcon: '/app-icons/eventbrite.svg',
    connector: { slug: 'eventbrite', base_url: 'https://www.eventbriteapi.com/v3' },
    fields: [{ key: 'api_key', label: 'Private Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Eventbrite > Account Settings > Developer > API Keys' }],
    content: `# Eventbrite API\n\n## List my events\nGET /users/me/events?status=live\n\n## Get event details\nGET /events/{event_id}\n\n## List attendees\nGET /events/{event_id}/attendees\n\n## Create event\nPOST /organizations/{org_id}/events\n\`\`\`json\n{"event": {"name": {"html": "My Event"}, "start": {"utc": "2026-06-01T10:00:00Z", "timezone": "America/New_York"}, "end": {"utc": "2026-06-01T18:00:00Z", "timezone": "America/New_York"}, "currency": "USD"}}\n\`\`\`\n\nUse connector_slug="eventbrite" for auth.`,
  },
  {
    id: 'onesignal', name: 'OneSignal', slug: 'onesignal',
    description: 'Send push notifications, emails, and in-app messages at scale',
    category: 'communication', color: '#E44A49',
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    brandIcon: '/app-icons/onesignal.svg',
    connector: { slug: 'onesignal', base_url: 'https://onesignal.com/api/v1' },
    fields: [
      { key: 'api_key', label: 'REST API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'OneSignal > Settings > Keys & IDs' },
      { key: 'base_url', label: 'App ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
    ],
    content: `# OneSignal API\n\n## Send notification\nPOST /notifications\n\`\`\`json\n{"app_id": "{APP_ID}", "included_segments": ["All"], "contents": {"en": "Hello!"}, "headings": {"en": "Title"}}\n\`\`\`\n\n## View notification\nGET /notifications/{id}?app_id={APP_ID}\n\n## List devices\nGET /players?app_id={APP_ID}&limit=50\n\nUse connector_slug="onesignal" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // PLANNING (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'confluence', name: 'Confluence', slug: 'confluence',
    description: 'Create and manage wiki pages, spaces, and knowledge bases',
    category: 'planning', color: '#1868DB',
    icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
    brandIcon: '/app-icons/confluence.svg',
    connector: { slug: 'confluence', base_url: 'https://your-domain.atlassian.net/wiki/api/v2' },
    fields: [
      { key: 'api_key', label: 'API Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Atlassian > Account > Security > API Tokens' },
      { key: 'base_url', label: 'Confluence URL', type: 'url', placeholder: 'https://your-domain.atlassian.net/wiki', required: true },
    ],
    content: `# Confluence API v2\n\n## List spaces\nGET /api/v2/spaces?limit=25\n\n## Get page\nGET /api/v2/pages/{id}?body-format=storage\n\n## Search content\nGET /api/v2/search?cql=text~"keyword"&limit=10\n\n## Create page\nPOST /api/v2/pages\n\`\`\`json\n{"spaceId": "123", "title": "New Page", "body": {"representation": "storage", "value": "<p>Content</p>"}, "status": "current"}\n\`\`\`\n\nAuth: Basic with email + API token.\nUse connector_slug="confluence" for auth.`,
  },
  {
    id: 'miro', name: 'Miro', slug: 'miro',
    description: 'Create boards, sticky notes, shapes, and collaborate visually',
    category: 'planning', color: '#FFD02F',
    icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z',
    brandIcon: '/app-icons/miro.svg',
    connector: { slug: 'miro', base_url: 'https://api.miro.com/v2' },
    fields: [{ key: 'api_key', label: 'Access Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Miro > Your apps > OAuth token' }],
    content: `# Miro API v2\n\n## List boards\nGET /boards?limit=10\n\n## Create sticky note\nPOST /boards/{board_id}/sticky_notes\n\`\`\`json\n{"data": {"content": "My note", "shape": "square"}, "position": {"x": 0, "y": 0}}\n\`\`\`\n\n## Create shape\nPOST /boards/{board_id}/shapes\n\n## Get all items on a board\nGET /boards/{board_id}/items?limit=50\n\nUse connector_slug="miro" for auth.`,
  },
  {
    id: 'wrike', name: 'Wrike', slug: 'wrike',
    description: 'Manage projects, tasks, and team workflows',
    category: 'planning', color: '#08CF65',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    brandIcon: '/app-icons/wrike.svg',
    connector: { slug: 'wrike', base_url: 'https://www.wrike.com/api/v4' },
    fields: [{ key: 'api_key', label: 'Permanent Access Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Wrike > Apps & Integrations > API' }],
    content: `# Wrike API v4\n\n## List folders\nGET /folders\n\n## List tasks\nGET /tasks?limit=100&fields=["description"]\n\n## Create task\nPOST /folders/{folderId}/tasks\n\`\`\`json\n{"title": "New task", "description": "Details", "status": "Active", "dates": {"start": "2026-01-01", "due": "2026-01-15"}}\n\`\`\`\n\n## Update task\nPUT /tasks/{taskId}\n\nUse connector_slug="wrike" for auth.`,
  },
  {
    id: 'basecamp', name: 'Basecamp', slug: 'basecamp',
    description: 'Manage projects, to-dos, messages, and schedules',
    category: 'planning', color: '#17AD49',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
    brandIcon: '/app-icons/basecamp.svg',
    connector: { slug: 'basecamp', base_url: 'https://3.basecampapi.com' },
    fields: [{ key: 'api_key', label: 'OAuth Access Token', type: 'password', placeholder: 'BAhbB0ki...', required: true, help: 'Basecamp > My Apps > OAuth' }],
    content: `# Basecamp 3 API\n\n## List projects\nGET /{account_id}/projects.json\n\n## List to-do lists\nGET /{account_id}/buckets/{project_id}/todolists.json\n\n## Create to-do\nPOST /{account_id}/buckets/{project_id}/todolists/{list_id}/todos.json\n\`\`\`json\n{"content": "New task", "due_on": "2026-01-15", "assignee_ids": [123]}\n\`\`\`\n\n## Post message\nPOST /{account_id}/buckets/{project_id}/message_boards/{board_id}/messages.json\n\nUse connector_slug="basecamp" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // FINANCE (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'xero', name: 'Xero', slug: 'xero',
    description: 'Manage invoices, contacts, bank transactions, and accounting via Xero API',
    category: 'finance', color: '#1FC0E7',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    brandIcon: '/app-icons/xero.svg',
    connector: { slug: 'xero', base_url: 'https://api.xero.com/api.xro/2.0' },
    fields: [{ key: 'api_key', label: 'Access Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Xero Developer > My Apps > OAuth 2.0' }],
    content: `# Xero Accounting API\n\n## List invoices\nGET /Invoices?where=Status=="AUTHORISED"&order=Date DESC\n\n## Create invoice\nPOST /Invoices\n\`\`\`json\n{"Type": "ACCREC", "Contact": {"Name": "Client"}, "LineItems": [{"Description": "Service", "Quantity": 1, "UnitAmount": 100}]}\n\`\`\`\n\n## List contacts\nGET /Contacts?where=ContactStatus=="ACTIVE"\n\n## Get bank transactions\nGET /BankTransactions\n\nUse connector_slug="xero" for auth.`,
  },
  {
    id: 'square', name: 'Square', slug: 'square',
    description: 'Process payments, manage orders, customers, and inventory',
    category: 'finance', color: '#2E3B4E',
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    brandIcon: '/app-icons/square.svg',
    darkBrandIcon: true,
    connector: { slug: 'square', base_url: 'https://connect.squareup.com/v2' },
    fields: [{ key: 'api_key', label: 'Access Token', type: 'password', placeholder: 'EAAAl...', required: true, help: 'Square Developer Dashboard > Credentials' }],
    content: `# Square API v2\n\n## List payments\nGET /payments?limit=10\n\n## Create payment\nPOST /payments\n\`\`\`json\n{"source_id": "cnon:card-nonce-ok", "amount_money": {"amount": 1000, "currency": "USD"}, "idempotency_key": "unique-key"}\n\`\`\`\n\n## List customers\nGET /customers?limit=10\n\n## List catalog\nGET /catalog/list?types=ITEM\n\nUse connector_slug="square" for auth.`,
  },
  {
    id: 'chargebee', name: 'Chargebee', slug: 'chargebee',
    description: 'Manage subscriptions, invoices, and billing workflows',
    category: 'finance', color: '#FF6C36',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    brandIcon: '/app-icons/chargebee.svg',
    connector: { slug: 'chargebee', base_url: 'https://{site}.chargebee.com/api/v2' },
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Chargebee > Settings > API Keys' },
      { key: 'base_url', label: 'Site Name', type: 'text', placeholder: 'your-site', required: true },
    ],
    content: `# Chargebee API v2\n\nAuth: Basic auth with API key as username (no password).\n\n## List subscriptions\nGET /subscriptions?limit=10\n\n## Create subscription\nPOST /subscriptions\nform-data: plan_id, customer[email], customer[first_name]\n\n## List invoices\nGET /invoices?limit=10&sort_by[desc]=date\n\n## List customers\nGET /customers?limit=10\n\nUse connector_slug="chargebee" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // DEV (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'bitbucket', name: 'Bitbucket', slug: 'bitbucket',
    description: 'Manage Git repositories, pull requests, and pipelines',
    category: 'dev', color: '#2684FF',
    icon: 'M10 20l4-16m4 4l4 4-4 4M6 8l-4 4 4 4',
    brandIcon: '/app-icons/bitbucket.svg',
    connector: { slug: 'bitbucket', base_url: 'https://api.bitbucket.org/2.0' },
    fields: [{ key: 'api_key', label: 'App Password', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Bitbucket > Personal Settings > App Passwords' }],
    content: `# Bitbucket API 2.0\n\n## List repositories\nGET /repositories/{workspace}?pagelen=25\n\n## List pull requests\nGET /repositories/{workspace}/{repo_slug}/pullrequests?state=OPEN\n\n## Create pull request\nPOST /repositories/{workspace}/{repo_slug}/pullrequests\n\`\`\`json\n{"title": "My PR", "source": {"branch": {"name": "feature"}}, "destination": {"branch": {"name": "main"}}}\n\`\`\`\n\n## List pipelines\nGET /repositories/{workspace}/{repo_slug}/pipelines?pagelen=10\n\nUse connector_slug="bitbucket" for auth.`,
  },
  {
    id: 'netlify', name: 'Netlify', slug: 'netlify',
    description: 'Manage sites, deploys, and serverless functions',
    category: 'dev', color: '#00C7B7',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    brandIcon: '/app-icons/netlify.svg',
    connector: { slug: 'netlify', base_url: 'https://api.netlify.com/api/v1' },
    fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Netlify > User Settings > Applications > Personal access tokens' }],
    content: `# Netlify API\n\n## List sites\nGET /sites\n\n## Get site\nGET /sites/{site_id}\n\n## List deploys\nGET /sites/{site_id}/deploys?per_page=10\n\n## Trigger new deploy\nPOST /builds\n\`\`\`json\n{"site_id": "xxx"}\n\`\`\`\n\n## List forms\nGET /sites/{site_id}/forms\n\n## List form submissions\nGET /forms/{form_id}/submissions\n\nUse connector_slug="netlify" for auth.`,
  },
  {
    id: 'heroku', name: 'Heroku', slug: 'heroku',
    description: 'Manage apps, dynos, add-ons, and deployments',
    category: 'dev', color: '#430098',
    icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
    brandIcon: '/app-icons/heroku.svg',
    connector: { slug: 'heroku', base_url: 'https://api.heroku.com' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Heroku > Account Settings > API Key' }],
    content: `# Heroku Platform API\n\nHeaders: Accept: application/vnd.heroku+json; version=3\n\n## List apps\nGET /apps\n\n## Get app info\nGET /apps/{app_name}\n\n## List dynos\nGET /apps/{app_name}/dynos\n\n## Restart dyno\nDELETE /apps/{app_name}/dynos/{dyno_id}\n\n## Scale dynos\nPATCH /apps/{app_name}/formation/{type}\n\`\`\`json\n{"quantity": 2, "size": "standard-1X"}\n\`\`\`\n\n## List add-ons\nGET /apps/{app_name}/addons\n\nUse connector_slug="heroku" for auth.`,
  },
  {
    id: 'cloudflare', name: 'Cloudflare', slug: 'cloudflare',
    description: 'Manage DNS records, Workers, firewall rules, and CDN settings',
    category: 'dev', color: '#F4811F',
    icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    brandIcon: '/app-icons/cloudflare.svg',
    connector: { slug: 'cloudflare', base_url: 'https://api.cloudflare.com/client/v4' },
    fields: [{ key: 'api_key', label: 'API Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Cloudflare > My Profile > API Tokens' }],
    content: `# Cloudflare API v4\n\n## List zones\nGET /zones?per_page=20\n\n## List DNS records\nGET /zones/{zone_id}/dns_records\n\n## Create DNS record\nPOST /zones/{zone_id}/dns_records\n\`\`\`json\n{"type": "A", "name": "sub.example.com", "content": "1.2.3.4", "ttl": 3600, "proxied": true}\n\`\`\`\n\n## Purge cache\nPOST /zones/{zone_id}/purge_cache\n\`\`\`json\n{"purge_everything": true}\n\`\`\`\n\n## List Workers\nGET /accounts/{account_id}/workers/scripts\n\nUse connector_slug="cloudflare" for auth.`,
  },
  {
    id: 'circleci', name: 'CircleCI', slug: 'circleci',
    description: 'Manage pipelines, workflows, and jobs for CI/CD',
    category: 'dev', color: '#343434',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    brandIcon: '/app-icons/circleci.svg',
    darkBrandIcon: true,
    connector: { slug: 'circleci', base_url: 'https://circleci.com/api/v2' },
    fields: [{ key: 'api_key', label: 'Personal API Token', type: 'password', placeholder: 'CCIPAT_...', required: true, help: 'CircleCI > User Settings > Personal API Tokens' }],
    content: `# CircleCI API v2\n\n## List pipelines\nGET /project/{project-slug}/pipeline?mine=true\n\n## Get pipeline workflows\nGET /pipeline/{pipeline-id}/workflow\n\n## Get workflow jobs\nGET /workflow/{workflow-id}/job\n\n## Trigger pipeline\nPOST /project/{project-slug}/pipeline\n\`\`\`json\n{"branch": "main", "parameters": {}}\n\`\`\`\n\n## Rerun workflow\nPOST /workflow/{workflow-id}/rerun\n\nProject slug format: gh/org/repo or bb/org/repo\n\nUse connector_slug="circleci" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // ANALYTICS (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'segment', name: 'Segment', slug: 'segment',
    description: 'Track events, identify users, and manage data sources and destinations',
    category: 'analytics', color: '#4FB58B',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    brandIcon: '/app-icons/segment.svg',
    connector: { slug: 'segment', base_url: 'https://api.segment.io/v1' },
    fields: [{ key: 'api_key', label: 'Write Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Segment > Sources > Your Source > Settings > API Keys' }],
    content: `# Segment API\n\n## Track event\nPOST /track\n\`\`\`json\n{"userId": "user123", "event": "Item Purchased", "properties": {"item": "T-shirt", "price": 29.99}}\n\`\`\`\n\n## Identify user\nPOST /identify\n\`\`\`json\n{"userId": "user123", "traits": {"email": "user@example.com", "plan": "premium"}}\n\`\`\`\n\n## Group\nPOST /group\n\`\`\`json\n{"userId": "user123", "groupId": "group456", "traits": {"name": "Acme Corp"}}\n\`\`\`\n\nUse connector_slug="segment" for auth.`,
  },
  {
    id: 'new-relic', name: 'New Relic', slug: 'new-relic',
    description: 'Query application metrics, manage alerts, and monitor infrastructure',
    category: 'analytics', color: '#008C99',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    brandIcon: '/app-icons/new-relic.svg',
    darkBrandIcon: true,
    connector: { slug: 'new-relic', base_url: 'https://api.newrelic.com/v2' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'NRAK-...', required: true, help: 'New Relic > API Keys > Create key (User type)' }],
    content: `# New Relic API\n\n## NRQL query (NerdGraph)\nPOST https://api.newrelic.com/graphql\n\`\`\`json\n{"query": "{ actor { account(id: ACCOUNT_ID) { nrql(query: \\"SELECT count(*) FROM Transaction SINCE 1 hour ago\\") { results } } } }"}\n\`\`\`\n\n## List applications\nGET /applications.json\n\n## Get app metrics\nGET /applications/{id}/metrics/data.json?names[]=HttpDispatcher&values[]=call_count\n\n## List alert policies\nGET /alerts_policies.json\n\nUse connector_slug="new-relic" for auth.`,
  },
  {
    id: 'grafana', name: 'Grafana', slug: 'grafana',
    description: 'Query dashboards, data sources, and alerting rules',
    category: 'analytics', color: '#F46800',
    icon: 'M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z',
    brandIcon: '/app-icons/grafana.svg',
    connector: { slug: 'grafana', base_url: 'https://your-instance.grafana.net/api' },
    fields: [
      { key: 'api_key', label: 'Service Account Token', type: 'password', placeholder: 'glsa_...', required: true, help: 'Grafana > Administration > Service Accounts' },
      { key: 'base_url', label: 'Grafana URL', type: 'url', placeholder: 'https://your-instance.grafana.net', required: true },
    ],
    content: `# Grafana HTTP API\n\n## Search dashboards\nGET /api/search?type=dash-db&query=keyword\n\n## Get dashboard\nGET /api/dashboards/uid/{uid}\n\n## List data sources\nGET /api/datasources\n\n## Query data source\nPOST /api/ds/query\n\`\`\`json\n{"queries": [{"datasource": {"uid": "xxx"}, "expr": "up", "refId": "A"}], "from": "now-1h", "to": "now"}\n\`\`\`\n\n## List alert rules\nGET /api/v1/provisioning/alert-rules\n\nUse connector_slug="grafana" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // ECOMMERCE (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'woocommerce', name: 'WooCommerce', slug: 'woocommerce',
    description: 'Manage products, orders, customers, and coupons for WordPress stores',
    category: 'ecommerce', color: '#7F54B3',
    icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
    brandIcon: '/app-icons/woocommerce.svg',
    connector: { slug: 'woocommerce', base_url: 'https://your-store.com/wp-json/wc/v3' },
    fields: [
      { key: 'api_key', label: 'Consumer Key', type: 'password', placeholder: 'ck_...', required: true, help: 'WooCommerce > Settings > Advanced > REST API' },
      { key: 'base_url', label: 'Store URL', type: 'url', placeholder: 'https://your-store.com', required: true },
    ],
    content: `# WooCommerce REST API v3\n\nAuth: Query params ?consumer_key=ck_xxx&consumer_secret=cs_xxx\n\n## List products\nGET /products?per_page=20\n\n## Create product\nPOST /products\n\`\`\`json\n{"name": "Product", "type": "simple", "regular_price": "29.99", "description": "Details"}\n\`\`\`\n\n## List orders\nGET /orders?per_page=20&status=processing\n\n## Update order status\nPUT /orders/{id}\n\`\`\`json\n{"status": "completed"}\n\`\`\`\n\n## List customers\nGET /customers?per_page=20\n\nUse connector_slug="woocommerce" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // PLANNING (additional 2)
  // ═══════════════════════════════════════════════════

  {
    id: 'monday', name: 'Monday.com', slug: 'monday',
    description: 'Manage boards, items, columns, and automations on Monday.com',
    category: 'planning', color: '#FF3D57',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z',
    connector: { slug: 'monday', base_url: 'https://api.monday.com/v2' },
    fields: [{ key: 'api_key', label: 'API Token', type: 'password', placeholder: 'eyJhbGci...', required: true, help: 'Monday.com > Profile > Developers > My Access Tokens' }],
    content: `# Monday.com API (GraphQL)\n\nAll requests are POST to https://api.monday.com/v2 with JSON body.\n\n## List boards\n\`\`\`json\n{"query": "{ boards(limit: 10) { id name description } }"}\n\`\`\`\n\n## List items on a board\n\`\`\`json\n{"query": "{ boards(ids: [BOARD_ID]) { items_page(limit: 20) { items { id name column_values { id text } } } } }"}\n\`\`\`\n\n## Create item\n\`\`\`json\n{"query": "mutation { create_item(board_id: BOARD_ID, item_name: \\"New task\\") { id } }"}\n\`\`\`\n\n## Update column value\n\`\`\`json\n{"query": "mutation { change_simple_column_value(board_id: BOARD_ID, item_id: ITEM_ID, column_id: \\"status\\", value: \\"Done\\") { id } }"}\n\`\`\`\n\nUse connector_slug="monday" for auth.`,
  },
  {
    id: 'clickup', name: 'ClickUp', slug: 'clickup',
    description: 'Manage tasks, lists, spaces, and projects in ClickUp',
    category: 'planning', color: '#7B68EE',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    connector: { slug: 'clickup', base_url: 'https://api.clickup.com/api/v2' },
    fields: [{ key: 'api_key', label: 'Personal API Token', type: 'password', placeholder: 'pk_...', required: true, help: 'ClickUp > Settings > Apps > API Token' }],
    content: `# ClickUp API v2\n\n## Get workspaces (teams)\nGET /team\n\n## List spaces\nGET /team/{team_id}/space?archived=false\n\n## List tasks in list\nGET /list/{list_id}/task?page=0&limit=100\n\n## Create task\nPOST /list/{list_id}/task\n\`\`\`json\n{"name": "New task", "description": "Details", "priority": 2, "due_date": 1735689600000}\n\`\`\`\n\n## Update task\nPUT /task/{task_id}\n\`\`\`json\n{"status": "complete"}\n\`\`\`\n\n## Get task\nGET /task/{task_id}\n\nUse connector_slug="clickup" for auth.`,
  },
  {
    id: 'shortcut', name: 'Shortcut', slug: 'shortcut',
    description: 'Manage stories, epics, milestones, and sprints for software teams',
    category: 'planning', color: '#A020F0',
    icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
    connector: { slug: 'shortcut', base_url: 'https://api.app.shortcut.com/api/v3' },
    fields: [{ key: 'api_key', label: 'API Token', type: 'password', placeholder: 'xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true, help: 'Shortcut > Settings > API Tokens' }],
    content: `# Shortcut API v3\n\nAuth header: Shortcut-Token: {api_key}\n\n## List stories\nGET /stories?limit=25&page_size=25\n\n## Search stories\nPOST /stories/search\n\`\`\`json\n{"query": "is:unstarted owner:me", "page_size": 25}\n\`\`\`\n\n## Create story\nPOST /stories\n\`\`\`json\n{"name": "New feature", "story_type": "feature", "workflow_state_id": 500000011}\n\`\`\`\n\n## Update story\nPUT /stories/{story_public_id}\n\`\`\`json\n{"completed": true}\n\`\`\`\n\n## List epics\nGET /epics\n\n## List members\nGET /members\n\nUse connector_slug="shortcut" for auth.`,
  },
  {
    id: 'smartsheet', name: 'Smartsheet', slug: 'smartsheet',
    description: 'Manage sheets, rows, columns, and reports for enterprise project tracking',
    category: 'planning', color: '#0073E6',
    icon: 'M3 10h18M3 14h18M10 4v16M6 4v16M14 4v16',
    connector: { slug: 'smartsheet', base_url: 'https://api.smartsheet.com/2.0' },
    fields: [{ key: 'api_key', label: 'API Access Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Smartsheet > Account > Apps & Integrations > API Access' }],
    content: `# Smartsheet API v2\n\n## List sheets\nGET /sheets?pageSize=20\n\n## Get sheet\nGET /sheets/{sheet_id}?include=attachments,discussions\n\n## Add rows\nPOST /sheets/{sheet_id}/rows\n\`\`\`json\n{"toBottom": true, "cells": [{"columnId": 1234, "value": "New task"}, {"columnId": 5678, "value": "In Progress"}]}\n\`\`\`\n\n## Update row\nPUT /sheets/{sheet_id}/rows\n\`\`\`json\n[{"id": ROW_ID, "cells": [{"columnId": 5678, "value": "Done"}]}]\n\`\`\`\n\n## List reports\nGET /reports?pageSize=10\n\nUse connector_slug="smartsheet" for auth.`,
  },
  {
    id: 'teamwork', name: 'Teamwork', slug: 'teamwork',
    description: 'Manage projects, tasks, milestones, and time tracking',
    category: 'planning', color: '#5AC5A7',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    connector: { slug: 'teamwork', base_url: 'https://yoursite.teamwork.com' },
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Teamwork > Profile > Edit Profile > API Keys' },
      { key: 'base_url', label: 'Site URL', type: 'url', placeholder: 'https://yoursite.teamwork.com', required: true },
    ],
    content: `# Teamwork API\n\nAuth: Basic with API key as username (any string as password).\n\n## List projects\nGET /projects.json?pageSize=20\n\n## List tasks in a project\nGET /projects/{project_id}/tasks.json?pageSize=50\n\n## Create task\nPOST /tasklists/{tasklist_id}/tasks.json\n\`\`\`json\n{"todo-item": {"content": "New task", "due-date": "20260101", "priority": "high"}}\n\`\`\`\n\n## Log time\nPOST /tasks/{task_id}/time_entries.json\n\`\`\`json\n{"time-entry": {"hours": 2, "minutes": 30, "date": "20260101", "description": "Work done"}}\n\`\`\`\n\nUse connector_slug="teamwork" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // MARKETING (additional 2)
  // ═══════════════════════════════════════════════════

  {
    id: 'klaviyo', name: 'Klaviyo', slug: 'klaviyo',
    description: 'Manage email/SMS campaigns, segments, profiles, and flows for e-commerce',
    category: 'marketing', color: '#1F1F1F',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    connector: { slug: 'klaviyo', base_url: 'https://a.klaviyo.com/api' },
    fields: [{ key: 'api_key', label: 'Private API Key', type: 'password', placeholder: 'pk_...', required: true, help: 'Klaviyo > Account > Settings > API Keys > Create private key' }],
    content: `# Klaviyo API (v2024-02-15)\n\nHeaders: Authorization: Klaviyo-API-Key {api_key}, revision: 2024-02-15\n\n## List profiles\nGET /profiles?page[size]=20\n\n## Create profile\nPOST /profiles\n\`\`\`json\n{"data": {"type": "profile", "attributes": {"email": "user@example.com", "first_name": "John", "properties": {"plan": "premium"}}}}\n\`\`\`\n\n## List segments\nGET /segments?page[size]=20\n\n## List campaigns\nGET /campaigns?filter=equals(messages.channel,'email')&page[size]=10\n\n## List flows\nGET /flows?page[size]=20\n\n## Subscribe to list\nPOST /profile-subscription-bulk-create-jobs\n\nUse connector_slug="klaviyo" for auth.`,
  },
  {
    id: 'brevo', name: 'Brevo', slug: 'brevo',
    description: 'Send email/SMS campaigns, manage contacts and transactional messages',
    category: 'marketing', color: '#0B996E',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    connector: { slug: 'brevo', base_url: 'https://api.brevo.com/v3' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xkeysib-...', required: true, help: 'Brevo > SMTP & API > API Keys' }],
    content: `# Brevo API v3\n\nHeader: api-key: {api_key}\n\n## Send transactional email\nPOST /smtp/email\n\`\`\`json\n{"sender": {"email": "from@example.com"}, "to": [{"email": "to@example.com"}], "subject": "Hello", "htmlContent": "<p>Message</p>"}\n\`\`\`\n\n## Create contact\nPOST /contacts\n\`\`\`json\n{"email": "contact@example.com", "attributes": {"FIRSTNAME": "John"}, "listIds": [2]}\n\`\`\`\n\n## List contacts\nGET /contacts?limit=50&offset=0\n\n## Get campaign stats\nGET /emailCampaigns?status=sent&limit=10\n\n## Send SMS\nPOST /transactionalSMS/sms\n\nUse connector_slug="brevo" for auth.`,
  },
  {
    id: 'activecampaign', name: 'ActiveCampaign', slug: 'activecampaign',
    description: 'Manage contacts, automations, campaigns, and CRM deals',
    category: 'marketing', color: '#356AE6',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    connector: { slug: 'activecampaign', base_url: 'https://youraccountname.api-us1.com/api/3' },
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'ActiveCampaign > Settings > Developer > API Access' },
      { key: 'base_url', label: 'Account URL', type: 'url', placeholder: 'https://youraccountname.api-us1.com', required: true },
    ],
    content: `# ActiveCampaign API v3\n\nHeader: Api-Token: {api_key}\n\n## List contacts\nGET /contacts?limit=20\n\n## Create contact\nPOST /contacts\n\`\`\`json\n{"contact": {"email": "user@example.com", "firstName": "John", "fieldValues": [{"field": "1", "value": "Custom value"}]}}\n\`\`\`\n\n## Add contact to list\nPOST /contactLists\n\`\`\`json\n{"contactList": {"list": "1", "contact": "1", "status": "1"}}\n\`\`\`\n\n## List automations\nGET /automations?limit=20\n\n## Create deal\nPOST /deals\n\`\`\`json\n{"deal": {"title": "New deal", "contact": "1", "value": "10000", "currency": "usd"}}\n\`\`\`\n\nUse connector_slug="activecampaign" for auth.`,
  },
  {
    id: 'beehiiv', name: 'Beehiiv', slug: 'beehiiv',
    description: 'Manage newsletter publications, subscribers, and posts',
    category: 'marketing', color: '#F4BF00',
    icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
    connector: { slug: 'beehiiv', base_url: 'https://api.beehiiv.com/v2' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'bh_...', required: true, help: 'Beehiiv > Settings > Integrations > API' }],
    content: `# Beehiiv API v2\n\n## List publications\nGET /publications\n\n## List subscribers\nGET /publications/{publication_id}/subscriptions?limit=100&status=active\n\n## Create subscriber\nPOST /publications/{publication_id}/subscriptions\n\`\`\`json\n{"email": "reader@example.com", "reactivate_existing": true, "send_welcome_email": true, "utm_source": "api"}\n\`\`\`\n\n## List posts\nGET /publications/{publication_id}/posts?limit=10&status=confirmed\n\n## Get post stats\nGET /publications/{publication_id}/posts/{post_id}?expand[]=stats\n\nUse connector_slug="beehiiv" for auth.`,
  },
  {
    id: 'mailjet', name: 'Mailjet', slug: 'mailjet',
    description: 'Send transactional and marketing emails, manage contacts and templates',
    category: 'marketing', color: '#FD7E14',
    icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
    connector: { slug: 'mailjet', base_url: 'https://api.mailjet.com/v3.1' },
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Mailjet > Account Settings > REST API > API Key Management' },
      { key: 'base_url', label: 'Secret Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Found alongside the API key' },
    ],
    content: `# Mailjet API v3.1\n\nAuth: Basic auth (API Key as user, Secret Key as password).\n\n## Send email\nPOST /send\n\`\`\`json\n{"Messages": [{"From": {"Email": "from@example.com"}, "To": [{"Email": "to@example.com"}], "Subject": "Hello", "HTMLPart": "<p>Message</p>"}]}\n\`\`\`\n\n## List contacts\nGET https://api.mailjet.com/v3/REST/contact?Count=20\n\n## Create contact\nPOST https://api.mailjet.com/v3/REST/contact\n\`\`\`json\n{"Email": "contact@example.com", "Name": "John"}\n\`\`\`\n\n## Get campaign stats\nGET https://api.mailjet.com/v3/REST/newsletter?CountOnly=false\n\nUse connector_slug="mailjet" for auth.`,
  },
  {
    id: 'campaignmonitor', name: 'Campaign Monitor', slug: 'campaignmonitor',
    description: 'Manage email campaigns, subscriber lists, and transactional email',
    category: 'marketing', color: '#509CF5',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    connector: { slug: 'campaignmonitor', base_url: 'https://api.createsend.com/api/v3.3' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Campaign Monitor > Account Settings > API Keys' }],
    content: `# Campaign Monitor API v3.3\n\nAuth: Basic auth with API key as username.\n\n## List clients\nGET /clients.json\n\n## List subscriber lists\nGET /clients/{client_id}/lists.json\n\n## Add subscriber\nPOST /subscribers/{list_id}.json\n\`\`\`json\n{"EmailAddress": "user@example.com", "Name": "John", "Resubscribe": true, "CustomFields": [{"Key": "Plan", "Value": "Pro"}]}\n\`\`\`\n\n## List campaigns\nGET /clients/{client_id}/campaigns.json\n\n## Get campaign summary\nGET /campaigns/{campaign_id}/summary.json\n\n## Send transactional email\nPOST /transactional/classicemail/send\n\nUse connector_slug="campaignmonitor" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // COMMUNICATION (additional 2)
  // ═══════════════════════════════════════════════════

  {
    id: 'msteams', name: 'Microsoft Teams', slug: 'msteams',
    description: 'Send messages, create channels, and manage Teams via Microsoft Graph API',
    category: 'communication', color: '#6264A7',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    connector: { slug: 'msteams', base_url: 'https://graph.microsoft.com/v1.0' },
    fields: [{ key: 'api_key', label: 'Access Token', type: 'password', placeholder: 'eyJhbGci...', required: true, help: 'Azure AD > App Registrations > OAuth 2.0 token. Requires Team.ReadWrite.All and Channel.Message.Send scopes.' }],
    content: `# Microsoft Teams (Graph API)\n\n## List teams\nGET /me/joinedTeams\n\n## List channels in team\nGET /teams/{team_id}/channels\n\n## Send message to channel\nPOST /teams/{team_id}/channels/{channel_id}/messages\n\`\`\`json\n{"body": {"contentType": "html", "content": "<p>Hello Team!</p>"}}\n\`\`\`\n\n## Send reply to thread\nPOST /teams/{team_id}/channels/{channel_id}/messages/{message_id}/replies\n\n## Create channel\nPOST /teams/{team_id}/channels\n\`\`\`json\n{"displayName": "New Channel", "description": "Channel description", "membershipType": "standard"}\n\`\`\`\n\n## List members\nGET /teams/{team_id}/members\n\nUse connector_slug="msteams" for auth.`,
  },
  {
    id: 'zoom', name: 'Zoom', slug: 'zoom',
    description: 'Create meetings, manage webinars, and retrieve recordings via Zoom API',
    category: 'communication', color: '#2D8CFF',
    icon: 'M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z',
    connector: { slug: 'zoom', base_url: 'https://api.zoom.us/v2' },
    fields: [{ key: 'api_key', label: 'Server-to-Server OAuth Token', type: 'password', placeholder: 'eyJhbGci...', required: true, help: 'Zoom Marketplace > Build App > Server-to-Server OAuth > Generate token' }],
    content: `# Zoom API v2\n\n## Create meeting\nPOST /users/me/meetings\n\`\`\`json\n{"topic": "Team Sync", "type": 2, "start_time": "2026-04-15T10:00:00Z", "duration": 60, "timezone": "Europe/Paris", "settings": {"host_video": true, "participant_video": true}}\n\`\`\`\n\n## List meetings\nGET /users/me/meetings?type=scheduled&page_size=10\n\n## Get meeting\nGET /meetings/{meeting_id}\n\n## Delete meeting\nDELETE /meetings/{meeting_id}\n\n## List recordings\nGET /users/me/recordings?from=2026-01-01&to=2026-04-01\n\n## List webinars\nGET /users/me/webinars\n\nUse connector_slug="zoom" for auth.`,
  },
  {
    id: 'googlechat', name: 'Google Chat', slug: 'googlechat',
    description: 'Send messages and manage spaces in Google Chat via Google API',
    category: 'communication', color: '#34A853',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    connector: { slug: 'googlechat', base_url: 'https://chat.googleapis.com/v1' },
    fields: [{ key: 'api_key', label: 'Service Account Token / Webhook URL', type: 'password', placeholder: 'https://chat.googleapis.com/v1/spaces/...', required: true, help: 'Google Chat > Space settings > Apps & Integrations > Webhooks, or Google Cloud Console for OAuth token' }],
    content: `# Google Chat API\n\n## Send message via webhook (simplest)\nPOST {webhook_url}\n\`\`\`json\n{"text": "Hello from KwintAgents!"}\n\`\`\`\n\n## Send card message\nPOST {webhook_url}\n\`\`\`json\n{"cardsV2": [{"cardId": "1", "card": {"header": {"title": "Update"}, "sections": [{"widgets": [{"textParagraph": {"text": "Task completed."}}]}]}}]}\n\`\`\`\n\n## List spaces (OAuth)\nGET /spaces?pageSize=10\n\n## Send message to space (OAuth)\nPOST /spaces/{space_name}/messages\n\`\`\`json\n{"text": "Message content"}\n\`\`\`\n\nUse connector_slug="googlechat" for auth.`,
  },
  {
    id: 'webex', name: 'Webex', slug: 'webex',
    description: 'Send messages, manage rooms and meetings via Cisco Webex API',
    category: 'communication', color: '#00B140',
    icon: 'M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z',
    connector: { slug: 'webex', base_url: 'https://webexapis.com/v1' },
    fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'developer.webex.com > Getting Started > Your Personal Access Token' }],
    content: `# Webex API\n\n## List rooms (spaces)\nGET /rooms?type=group&max=20\n\n## Create room\nPOST /rooms\n\`\`\`json\n{"title": "Project Room"}\n\`\`\`\n\n## Send message\nPOST /messages\n\`\`\`json\n{"roomId": "ROOM_ID", "text": "Hello team!", "markdown": "**Hello** team!"}\n\`\`\`\n\n## List messages\nGET /messages?roomId={room_id}&max=20\n\n## Create meeting\nPOST /meetings\n\`\`\`json\n{"title": "Sync", "start": "2026-04-15T10:00:00Z", "end": "2026-04-15T11:00:00Z", "enabledAutoRecordMeeting": false}\n\`\`\`\n\n## List people in org\nGET /people?max=20\n\nUse connector_slug="webex" for auth.`,
  },
  {
    id: 'mattermost', name: 'Mattermost', slug: 'mattermost',
    description: 'Send messages, manage channels and users on self-hosted Mattermost',
    category: 'communication', color: '#0058CC',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    connector: { slug: 'mattermost', base_url: 'https://your-mattermost.com/api/v4' },
    fields: [
      { key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Mattermost > Profile > Security > Personal Access Tokens' },
      { key: 'base_url', label: 'Mattermost URL', type: 'url', placeholder: 'https://your-mattermost.com', required: true },
    ],
    content: `# Mattermost API v4\n\n## List teams\nGET /teams\n\n## List channels in team\nGET /teams/{team_id}/channels?page=0&per_page=60\n\n## Send message\nPOST /posts\n\`\`\`json\n{"channel_id": "CHANNEL_ID", "message": "Hello team!", "props": {}}\n\`\`\`\n\n## Reply in thread\nPOST /posts\n\`\`\`json\n{"channel_id": "CHANNEL_ID", "root_id": "PARENT_POST_ID", "message": "Reply"}\n\`\`\`\n\n## List users\nGET /users?page=0&per_page=60\n\n## Search posts\nPOST /teams/{team_id}/posts/search\n\`\`\`json\n{"terms": "keyword", "is_or_search": false}\n\`\`\`\n\nUse connector_slug="mattermost" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // RECRUITING & JOB SEARCH
  // ═══════════════════════════════════════════════════

  {
    id: 'greenhouse', name: 'Greenhouse', slug: 'greenhouse',
    description: 'Manage job postings, candidates, applications, and interview stages',
    category: 'hr', color: '#3AB549',
    icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    connector: { slug: 'greenhouse', base_url: 'https://harvest.greenhouse.io/v1' },
    fields: [{ key: 'api_key', label: 'Harvest API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Greenhouse > Configure > Dev Center > API Credential Management' }],
    content: `# Greenhouse Harvest API v1\n\nAuth: Basic with API key as username, empty password.\n\n## List job postings\nGET /job_posts?active=true&live=true\n\n## List candidates\nGET /candidates?per_page=100\n\n## Get candidate\nGET /candidates/{id}\n\n## List applications\nGET /applications?per_page=100&status=active\n\n## Move application to stage\nPATCH /applications/{id}/move\n\`\`\`json\n{"from_stage_id": 123, "to_stage_id": 456}\n\`\`\`\n\n## Add note to candidate\nPOST /candidates/{id}/activity_feed/notes\n\`\`\`json\n{"user_id": 1, "body": "Strong candidate, follow up", "visibility": "private"}\n\`\`\`\n\n## List jobs\nGET /jobs?status=open&per_page=50\n\nUse connector_slug="greenhouse" for auth.`,
  },
  {
    id: 'lever', name: 'Lever', slug: 'lever',
    description: 'Manage opportunities, candidates, postings, and feedback in Lever ATS',
    category: 'hr', color: '#4B36CC',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    connector: { slug: 'lever', base_url: 'https://api.lever.co/v1' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Lever > Settings > Integrations & API > API Credentials' }],
    content: `# Lever API v1\n\nAuth: Basic with API key as username, empty password.\n\n## List opportunities (candidates in pipeline)\nGET /opportunities?limit=100\n\n## Get opportunity\nGET /opportunities/{id}?expand=applications,stage,owner\n\n## List postings\nGET /postings?state=published&limit=50\n\n## Create opportunity\nPOST /opportunities\n\`\`\`json\n{"name": "John Doe", "headline": "Senior Engineer", "emails": ["john@example.com"], "links": ["https://linkedin.com/in/john"]}\n\`\`\`\n\n## Add note\nPOST /opportunities/{id}/notes\n\`\`\`json\n{"value": "Great phone screen, advance to technical", "score": "thumbsUp"}\n\`\`\`\n\n## Advance to next stage\nPOST /opportunities/{id}/stage\n\`\`\`json\n{"stage": "stage_id"}\n\`\`\`\n\nUse connector_slug="lever" for auth.`,
  },
  {
    id: 'workable', name: 'Workable', slug: 'workable',
    description: 'Post jobs, manage candidates, schedule interviews, and track pipeline',
    category: 'hr', color: '#1D8585',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    connector: { slug: 'workable', base_url: 'https://subdomain.workable.com/spi/v3' },
    fields: [
      { key: 'api_key', label: 'Access Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Workable > Settings > Integrations > Generate API access token' },
      { key: 'base_url', label: 'Subdomain', type: 'text', placeholder: 'yourcompany', required: true, help: 'The subdomain of your Workable account (yourcompany.workable.com)' },
    ],
    content: `# Workable API v3\n\nBase URL: https://{subdomain}.workable.com/spi/v3\n\n## List jobs\nGET /jobs?state=published&limit=50\n\n## Get job\nGET /jobs/{shortcode}\n\n## List candidates for a job\nGET /jobs/{shortcode}/candidates?limit=100\n\n## Get candidate\nGET /candidates/{id}\n\n## Create candidate\nPOST /jobs/{shortcode}/candidates\n\`\`\`json\n{"candidate": {"name": "John Doe", "email": "john@example.com", "resume_url": "https://..."}}\n\`\`\`\n\n## Move candidate stage\nPUT /jobs/{shortcode}/candidates/{id}\n\`\`\`json\n{"candidate": {"stage": "interview"}}\n\`\`\`\n\n## List members (team)\nGET /members\n\nUse connector_slug="workable" for auth.`,
  },
  {
    id: 'smartrecruiters', name: 'SmartRecruiters', slug: 'smartrecruiters',
    description: 'Manage job postings, candidates, interviews, and hiring workflows',
    category: 'hr', color: '#0066CC',
    icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    connector: { slug: 'smartrecruiters', base_url: 'https://api.smartrecruiters.com' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'SmartRecruiters > Admin > Apps & Integrations > API > Generate Key' }],
    content: `# SmartRecruiters API\n\nHeader: X-SmartToken: {api_key}\n\n## List jobs\nGET /jobs?status=PUBLISHED&limit=50\n\n## Get job\nGET /jobs/{jobId}\n\n## List candidates for job\nGET /jobs/{jobId}/candidates?limit=100\n\n## Get candidate\nGET /candidates/{candidateId}\n\n## Create candidate\nPOST /candidates\n\`\`\`json\n{"firstName": "John", "lastName": "Doe", "email": {"address": "john@example.com"}, "tags": {"public": ["sourced"]}}\n\`\`\`\n\n## Update candidate status\nPOST /jobs/{jobId}/candidates/{candidateId}/hiring-process/interviews\n\n## Add comment\nPOST /candidates/{candidateId}/comments\n\`\`\`json\n{"message": "Strong profile, advance to technical interview"}\n\`\`\`\n\nUse connector_slug="smartrecruiters" for auth.`,
  },
  {
    id: 'teamtailor', name: 'Teamtailor', slug: 'teamtailor',
    description: 'Manage job listings, candidates, stages, and career site content',
    category: 'hr', color: '#6E2AFF',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    connector: { slug: 'teamtailor', base_url: 'https://api.teamtailor.com/v1' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Teamtailor > Settings > Integrations > API Key' }],
    content: `# Teamtailor API v1\n\nHeaders: Authorization: Token token={api_key}, X-Api-Version: 20240404\n\n## List jobs\nGET /jobs?filter[status]=published&page[size]=30\n\n## Get job\nGET /jobs/{id}\n\n## List candidates\nGET /candidates?page[size]=50\n\n## Get candidate\nGET /candidates/{id}?include=job-applications\n\n## List job applications\nGET /job-applications?filter[job-id]={job_id}&page[size]=50\n\n## Update application stage\nPATCH /job-applications/{id}\n\`\`\`json\n{"data": {"type": "job-applications", "id": "{id}", "relationships": {"stage": {"data": {"type": "stages", "id": "stage_id"}}}}}\n\`\`\`\n\n## Add note\nPOST /notes\n\`\`\`json\n{"data": {"type": "notes", "attributes": {"body": "Great candidate"}, "relationships": {"candidate": {"data": {"type": "candidates", "id": "cand_id"}}}}}\n\`\`\`\n\nUse connector_slug="teamtailor" for auth.`,
  },
  {
    id: 'recruitee', name: 'Recruitee', slug: 'recruitee',
    description: 'Manage job offers, candidates, pipelines, and hiring tasks',
    category: 'hr', color: '#4CAF50',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    connector: { slug: 'recruitee', base_url: 'https://api.recruitee.com/c' },
    fields: [
      { key: 'api_key', label: 'Personal API Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Recruitee > My Account > Personal API tokens' },
      { key: 'base_url', label: 'Company ID', type: 'text', placeholder: '12345', required: true, help: 'Found in your Recruitee URL: app.recruitee.com/o/{company_id}' },
    ],
    content: `# Recruitee API\n\nBase URL: https://api.recruitee.com/c/{company_id}\n\n## List offers (jobs)\nGET /offers?scope=active\n\n## Get offer\nGET /offers/{id}\n\n## List candidates\nGET /candidates?limit=100\n\n## Get candidate\nGET /candidates/{id}\n\n## List pipeline stages for offer\nGET /offers/{offer_id}/pipeline_templates\n\n## Move candidate to stage\nPATCH /candidates/{candidate_id}\n\`\`\`json\n{"candidate": {"offer_id": 123, "pipeline_template_id": 456}}\n\`\`\`\n\n## Add note\nPOST /candidates/{id}/notes\n\`\`\`json\n{"note": {"body": "Excellent interview, strong hire recommendation"}}\n\`\`\`\n\nUse connector_slug="recruitee" for auth.`,
  },
  {
    id: 'adzuna', name: 'Adzuna', slug: 'adzuna',
    description: 'Search millions of job listings across countries via Adzuna API',
    category: 'hr', color: '#FF6B35',
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    connector: { slug: 'adzuna', base_url: 'https://api.adzuna.com/v1/api' },
    fields: [
      { key: 'api_key', label: 'App ID', type: 'text', placeholder: 'xxxxxxxx', required: true, help: 'developer.adzuna.com > Register > App ID' },
      { key: 'base_url', label: 'App Key', type: 'password', placeholder: 'xxxxxxxx...', required: true, help: 'Found alongside App ID on developer.adzuna.com' },
    ],
    content: `# Adzuna Job Search API v1\n\nAuth: Query params app_id={app_id}&app_key={app_key}\n\n## Search jobs\nGET /jobs/{country}/search/1?app_id=ID&app_key=KEY&results_per_page=20&what=python+developer&where=Paris\n\nCountry codes: gb, us, fr, de, nl, au, ca, br, in, nz, sg, za\n\n## Example — remote jobs in France\nGET /jobs/fr/search/1?app_id=ID&app_key=KEY&results_per_page=20&what=software+engineer&where=remote&sort_by=date\n\n## Get salary histogram\nGET /jobs/{country}/histogram?app_id=ID&app_key=KEY&what=data+scientist\n\n## Top companies\nGET /jobs/{country}/top_companies?app_id=ID&app_key=KEY&what=developer\n\nUse connector_slug="adzuna" for auth.`,
  },
  {
    id: 'reed', name: 'Reed', slug: 'reed',
    description: 'Search UK job listings, get job details and employer information',
    category: 'hr', color: '#E51837',
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    connector: { slug: 'reed', base_url: 'https://www.reed.co.uk/api/1.0' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true, help: 'reed.co.uk/developers/jobseeker > Register for API access' }],
    content: `# Reed Jobs API v1\n\nAuth: Basic with API key as username, empty password.\n\n## Search jobs\nGET /search?keywords=software+engineer&location=london&distancefromlocation=15&resultsToTake=20\n\n## Get job detail\nGET /jobs/{jobId}\n\n## Search with salary filter\nGET /search?keywords=developer&minimumSalary=50000&maximumSalary=100000&fullTime=true\n\n## Search remote jobs\nGET /search?keywords=python&locationName=Remote\n\nResponse includes: jobId, employerName, jobTitle, locationName, minimumSalary, maximumSalary, jobDescription, date, expirationDate, jobUrl\n\nUse connector_slug="reed" for auth.`,
  },
  {
    id: 'jsearch', name: 'JSearch', slug: 'jsearch',
    description: 'Search jobs from LinkedIn, Indeed, Glassdoor and more via one unified API',
    category: 'hr', color: '#0055DA',
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    connector: { slug: 'jsearch', base_url: 'https://jsearch.p.rapidapi.com' },
    fields: [{ key: 'api_key', label: 'RapidAPI Key', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'rapidapi.com > Subscribe to JSearch API > App Keys' }],
    content: `# JSearch API (via RapidAPI)\n\nHeaders: X-RapidAPI-Key: {api_key}, X-RapidAPI-Host: jsearch.p.rapidapi.com\n\nAggregates LinkedIn, Indeed, Glassdoor, ZipRecruiter, and more.\n\n## Search jobs\nGET /search?query=software+engineer+in+Paris&page=1&num_pages=1&date_posted=today\n\n## Example — remote React developer\nGET /search?query=react+developer+remote&employment_types=FULLTIME&date_posted=week\n\n## Get job details\nGET /job-details?job_id={job_id}&extended_publisher_details=false\n\n## Search with filters\nGET /search?query=data+scientist&location=France&job_requirements=no_experience&salary_period=monthly\n\nReturns: job_title, employer_name, job_city, job_country, job_apply_link, job_description, job_salary_min, job_salary_max\n\nUse connector_slug="jsearch" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // STORAGE / CMS (additional)
  // ═══════════════════════════════════════════════════

  {
    id: 'contentful', name: 'Contentful', slug: 'contentful',
    description: 'Manage content entries, assets, and content models in a headless CMS',
    category: 'storage', color: '#0681B6',
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4',
    brandIcon: '/app-icons/contentful.svg',
    connector: { slug: 'contentful', base_url: 'https://cdn.contentful.com' },
    fields: [
      { key: 'api_key', label: 'Content Delivery API Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Contentful > Settings > API Keys' },
      { key: 'base_url', label: 'Space ID', type: 'text', placeholder: 'your-space-id', required: true },
    ],
    content: `# Contentful API\n\n## List entries\nGET /spaces/{space_id}/environments/master/entries?access_token={token}&limit=10\n\n## Get entry\nGET /spaces/{space_id}/environments/master/entries/{entry_id}?access_token={token}\n\n## List content types\nGET /spaces/{space_id}/environments/master/content_types?access_token={token}\n\n## List assets\nGET /spaces/{space_id}/environments/master/assets?access_token={token}&limit=10\n\n## Search\nGET /spaces/{space_id}/environments/master/entries?access_token={token}&query=keyword\n\nUse connector_slug="contentful" for auth.`,
  },
  {
    id: 'webflow', name: 'Webflow', slug: 'webflow',
    description: 'Manage sites, CMS collections, and publish changes via Webflow API',
    category: 'design', color: '#4353FF',
    icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
    brandIcon: '/app-icons/webflow.svg',
    connector: { slug: 'webflow', base_url: 'https://api.webflow.com/v2' },
    fields: [{ key: 'api_key', label: 'API Token', type: 'password', placeholder: 'xxxxxxx...', required: true, help: 'Webflow > Workspace Settings > Integrations > API Access' }],
    content: `# Webflow API v2\n\n## List sites\nGET /sites\n\n## List collections\nGET /sites/{site_id}/collections\n\n## List collection items\nGET /collections/{collection_id}/items?limit=100\n\n## Create collection item\nPOST /collections/{collection_id}/items\n\`\`\`json\n{"fieldData": {"name": "New Item", "slug": "new-item"}}\n\`\`\`\n\n## Publish site\nPOST /sites/{site_id}/publish\n\`\`\`json\n{"publishToWebflowSubdomain": true}\n\`\`\`\n\nUse connector_slug="webflow" for auth.`,
  },
  {
    id: 'firebase', name: 'Firebase', slug: 'firebase',
    description: 'Manage Firestore documents, Realtime Database, and Cloud Storage',
    category: 'storage', color: '#FFCA28',
    icon: 'M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-.95.23-1.78.75-2.49 1.32-2.59 2.08-3.61 5.75-2.39 8.9.04.1.08.2.08.33 0 .22-.15.42-.35.5-.23.1-.47.04-.66-.12a.58.58 0 01-.14-.17c-1.13-1.43-1.31-3.48-.55-5.12C5.78 10 4.87 12.3 5 14.47c.06.5.12 1 .29 1.5.14.6.41 1.2.71 1.73 1.08 1.73 2.95 2.97 4.96 3.22 2.14.27 4.43-.12 6.07-1.6 1.83-1.66 2.47-4.32 1.53-6.6l-.13-.26c-.21-.4-.51-.96-.77-1.26z',
    brandIcon: '/app-icons/firebase.svg',
    connector: { slug: 'firebase', base_url: 'https://firestore.googleapis.com/v1' },
    fields: [
      { key: 'api_key', label: 'Service Account Key / API Key', type: 'password', placeholder: 'AIza...', required: true, help: 'Firebase Console > Project Settings > Service Accounts' },
      { key: 'base_url', label: 'Project ID', type: 'text', placeholder: 'my-project-id', required: true },
    ],
    content: `# Firebase / Firestore REST API\n\n## List documents\nGET /projects/{project_id}/databases/(default)/documents/{collection}\n\n## Get document\nGET /projects/{project_id}/databases/(default)/documents/{collection}/{document_id}\n\n## Create document\nPOST /projects/{project_id}/databases/(default)/documents/{collection}\n\`\`\`json\n{"fields": {"name": {"stringValue": "John"}, "age": {"integerValue": "30"}}}\n\`\`\`\n\n## Delete document\nDELETE /projects/{project_id}/databases/(default)/documents/{collection}/{document_id}\n\nUse connector_slug="firebase" for auth.`,
  },

  // ═══ MEDIA & VIDEO GENERATION ═══

  {
    id: 'runway', name: 'Runway ML', slug: 'runway',
    description: 'Generate videos from text prompts or images using Runway Gen-3',
    category: 'media', color: '#FF0000',
    icon: 'M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z',
    brandIcon: '/app-icons/runway.svg',
    connector: { slug: 'runway', base_url: 'https://api.dev.runwayml.com' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'key_...', required: true, help: 'app.runwayml.com > Account > API Keys' }],
    content: `# Runway ML API\n\nAuth: Authorization: Bearer {api_key}\n\n## Text/image to video (Gen-3 Alpha)\nPOST /v1/image_to_video\n\`\`\`json\n{"promptImage": "https://example.com/image.jpg", "promptText": "The camera slowly zooms in", "model": "gen3a_turbo", "duration": 5, "ratio": "1280:768"}\n\`\`\`\n\nRequired: promptImage (URL or base64 data URI). Optional: promptText (motion description), model (gen3a_turbo or gen3a), duration (5 or 10 seconds), ratio ("1280:768" | "768:1280" | "1104:832" | "832:1104" | "960:960").\n\n## Poll task status\nGET /v1/tasks/{id}\n\nResponse: { id, status, progress, output: [videoUrl], error }\nStatus values: PENDING → RUNNING → SUCCEEDED | FAILED\nPoll every 2–5 seconds until status is SUCCEEDED, then read output[0] for the video URL.\n\n## List available models\nGET /v1/models\n\nUse connector_slug="runway" for auth.`,
  },
  {
    id: 'luma', name: 'Luma AI', slug: 'luma',
    description: 'Generate high-quality videos from text or images with Luma Dream Machine',
    category: 'media', color: '#000000',
    icon: 'M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z',
    brandIcon: '/app-icons/luma.svg',
    connector: { slug: 'luma', base_url: 'https://api.lumalabs.ai' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'luma-...', required: true, help: 'lumalabs.ai > API > Keys' }],
    content: `# Luma AI Dream Machine API\n\nAuth: Authorization: Bearer {api_key}\n\n## Create a generation\nPOST /dream-machine/v1/generations\n\`\`\`json\n{"prompt": "A serene lake at sunset with rippling water", "aspect_ratio": "16:9", "loop": false}\n\`\`\`\n\nFor image-to-video add a keyframes object:\n\`\`\`json\n{"prompt": "Camera drifts forward", "keyframes": {"frame0": {"type": "image", "url": "https://example.com/start.jpg"}}}\n\`\`\`\n\n## Get generation\nGET /dream-machine/v1/generations/{id}\n\nGeneration object shape:\n- id, state (pending | processing | completed | failed)\n- assets.video — URL to the finished video (only present when state=completed)\n- failure_reason — message when state=failed\n\n## List generations\nGET /dream-machine/v1/generations?limit=10&offset=0\n\nPoll GET until state=completed, then read assets.video.\n\nUse connector_slug="luma" for auth.`,
  },
  {
    id: 'fal', name: 'fal.ai', slug: 'fal',
    description: 'Fast inference for 100+ open-source models — FLUX, Stable Video Diffusion, LoRA fine-tuning',
    category: 'media', color: '#7C3AED',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    brandIcon: '/app-icons/fal.svg',
    connector: { slug: 'fal', base_url: 'https://queue.fal.run' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx:yyyyyyy', required: true, help: 'fal.ai > Dashboard > API Keys' }],
    content: `# fal.ai Queue API\n\nAuth: Authorization: Key {api_key}\n\n## Queue a model run\nPOST /fal-ai/flux/schnell\n\`\`\`json\n{"prompt": "A photorealistic cat on a rooftop at dusk", "image_size": "landscape_4_3", "num_images": 1}\n\`\`\`\n\nReturns: { request_id, status_url, response_url }\n\n## Check request status\nGET /fal-ai/flux/schnell/requests/{request_id}/status\n\nResponse: { status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED", queue_position }\n\n## Get result\nGET /fal-ai/flux/schnell/requests/{request_id}\n\nResponse: { images: [{url, width, height}], timings, seed }\n\n## Popular models\n- fal-ai/flux/schnell — fastest FLUX image generation\n- fal-ai/flux/dev — higher quality FLUX images\n- fal-ai/flux-lora — FLUX with custom LoRA weights\n- fal-ai/stable-video — Stable Video Diffusion (image-to-video)\n- fal-ai/kling-video/v1.6/standard/text-to-video — Kling text-to-video via fal\n\nReplace model slug in URL path for any model. Use connector_slug="fal" for auth.`,
  },
  {
    id: 'kling', name: 'Kling AI', slug: 'kling',
    description: 'Text-to-video and image-to-video generation with Kling AI',
    category: 'media', color: '#1A1A2E',
    icon: 'M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z',
    brandIcon: '/app-icons/kling.svg',
    connector: { slug: 'kling', base_url: 'https://api.klingai.com' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx', required: true, help: 'klingai.com > Developer > API Keys' }],
    content: `# Kling AI API\n\nAuth: Authorization: Bearer {api_key}\n\n## Create text-to-video task\nPOST /v1/videos/text2video\n\`\`\`json\n{"model_name": "kling-v1", "prompt": "A dragon flying over a snowy mountain", "negative_prompt": "blurry, low quality", "cfg_scale": 0.5, "mode": "std", "duration": "5"}\n\`\`\`\n\nParameters:\n- model_name: "kling-v1" | "kling-v1-5" | "kling-v2"\n- mode: "std" (standard) | "pro" (higher quality, slower)\n- duration: "5" | "10" (seconds)\n- cfg_scale: 0–1, higher = closer to prompt\n\n## Query task status\nGET /v1/videos/text2video/{task_id}\n\nTask status values: submitted → processing → succeed | failed\nWhen succeed, response contains task_result.videos[].url\n\n## Image-to-video\nPOST /v1/videos/image2video\n\`\`\`json\n{"model_name": "kling-v1", "image": "https://example.com/frame.jpg", "prompt": "The figure walks forward", "duration": "5"}\n\`\`\`\n\nPoll GET /v1/videos/image2video/{task_id} the same way.\n\nUse connector_slug="kling" for auth.`,
  },
  {
    id: 'leonardo', name: 'Leonardo AI', slug: 'leonardo',
    description: 'AI image generation with fine-tuned models, ControlNet, and real-time canvas',
    category: 'media', color: '#FF7C00',
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    brandIcon: '/app-icons/leonardo.svg',
    connector: { slug: 'leonardo', base_url: 'https://cloud.leonardo.ai/api/rest/v1' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true, help: 'app.leonardo.ai > User Settings > API' }],
    content: `# Leonardo AI API\n\nAuth: Authorization: Bearer {api_key}\n\n## Generate images\nPOST /generations\n\`\`\`json\n{"modelId": "b24e16ff-265f-4959-bb68-5b19f1e45f2e", "prompt": "A futuristic city at night, neon lights, cinematic", "negative_prompt": "blurry, watermark", "width": 1024, "height": 768, "num_images": 1, "alchemy": true, "photoReal": false, "presetStyle": "CINEMATIC"}\n\`\`\`\n\nReturns: { sdGenerationJob: { generationId } } — poll for results.\n\n## Get generation\nGET /generations/{id}\n\nResponse: { generations_by_pk: { status, generated_images: [{url, id, nsfw}] } }\nStatus: PENDING → COMPLETE | FAILED\n\n## List platform models\nGET /platformModels\n\nPopular model IDs:\n- b24e16ff-265f-4959-bb68-5b19f1e45f2e — SDXL Lightning\n- e29c1166-62fa-44ac-b84b-2d3f0b85ca3e — Leonardo Phoenix\n- d69c8273-6b17-4a30-a13e-d6637ae1c644 — Leonardo Diffusion XL\n\npresetStyle options: CINEMATIC | CREATIVE | DYNAMIC | ENVIRONMENT | GENERAL | ILLUSTRATION | PHOTOGRAPHY | RAYTRACED | RENDER_3D | SKETCH_BW | SKETCH_COLOR | VIBRANT\n\nUse connector_slug="leonardo" for auth.`,
  },
  {
    id: 'ideogram', name: 'Ideogram', slug: 'ideogram',
    description: 'Photorealistic and stylized image generation with excellent text rendering',
    category: 'media', color: '#0066FF',
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    brandIcon: '/app-icons/ideogram.svg',
    connector: { slug: 'ideogram', base_url: 'https://api.ideogram.ai' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxx', required: true, help: 'ideogram.ai > Settings > API' }],
    content: `# Ideogram API\n\nAuth: Api-Key: {api_key}\n\n## Generate images\nPOST /generate\n\`\`\`json\n{"image_request": {"prompt": "A vintage travel poster of Paris with bold typography", "model": "V_2", "magic_prompt_option": "AUTO", "style_type": "ILLUSTRATION", "aspect_ratio": "ASPECT_16_9"}}\n\`\`\`\n\nmodel options: "V_2" | "V_2_TURBO" | "V_1" | "V_1_TURBO"\nstyle_type: "GENERAL" | "REALISTIC" | "DESIGN" | "ILLUSTRATION" | "RENDER_3D"\naspect_ratio: "ASPECT_1_1" | "ASPECT_16_9" | "ASPECT_9_16" | "ASPECT_4_3" | "ASPECT_3_4"\nmagic_prompt_option: "AUTO" | "ON" | "OFF"\n\nResponse: { data: [{url, prompt, resolution, seed, is_image_safe}] }\n\n## Remix (image + prompt)\nPOST /remix\n\`\`\`json\n{"image_request": {"prompt": "Same scene but in winter", "image_url": "https://example.com/original.jpg", "model": "V_2", "image_weight": 50}}\n\`\`\`\n\n## Describe (analyze an image)\nPOST /describe\n\`\`\`json\n{"image_url": "https://example.com/photo.jpg"}\n\`\`\`\n\nReturns descriptions suitable for use as generation prompts.\n\nUse connector_slug="ideogram" for auth.`,
  },
  {
    id: 'perplexity', name: 'Perplexity AI', slug: 'perplexity',
    description: 'AI-powered search that returns cited, up-to-date answers via chat API',
    category: 'ai', color: '#20B2AA',
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    brandIcon: '/app-icons/perplexity.svg',
    connector: { slug: 'perplexity', base_url: 'https://api.perplexity.ai' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'pplx-...', required: true, help: 'perplexity.ai > Settings > API' }],
    content: `# Perplexity AI API\n\nAuth: Authorization: Bearer {api_key}\n\n## Chat completions (with live web search)\nPOST /chat/completions\n\`\`\`json\n{"model": "sonar", "messages": [{"role": "user", "content": "What are the latest AI funding rounds in 2025?"}], "max_tokens": 1024, "temperature": 0.2}\n\`\`\`\n\nSame request/response format as OpenAI chat completions.\n\n## Models\n- sonar — fast, grounded answers with citations\n- sonar-pro — deeper research, higher accuracy\n- sonar-reasoning — step-by-step reasoning with search\n- sonar-reasoning-pro — most powerful, multi-step research\n\n## Citations\nThe response includes a citations array with source URLs:\n\`\`\`json\n{"choices": [{"message": {"content": "..."}}], "citations": ["https://source1.com", "https://source2.com"]}\n\`\`\`\n\nAlways surface citations to users for transparency.\n\n## Streaming\nAdd "stream": true to get SSE chunks in the same format as OpenAI streaming.\n\nUse connector_slug="perplexity" for auth.`,
  },
  {
    id: 'gemini', name: 'Google Gemini', slug: 'gemini',
    description: 'Google Gemini models for text, vision, code, and long-context tasks up to 1M tokens',
    category: 'ai', color: '#4285F4',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z',
    brandIcon: '/app-icons/gemini.svg',
    connector: { slug: 'gemini', base_url: 'https://generativelanguage.googleapis.com/v1beta' },
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'AIza...', required: true, help: 'aistudio.google.com > Get API key' }],
    content: `# Google Gemini API\n\nAuth: Pass API key as query param — append ?key={api_key} to every request URL.\nNo Authorization header is used.\n\n## Generate content\nPOST /models/gemini-2.0-flash-exp:generateContent?key={api_key}\n\`\`\`json\n{"contents": [{"parts": [{"text": "Summarize the key trends in renewable energy for 2025."}]}]}\n\`\`\`\n\nResponse path: candidates[0].content.parts[0].text\n\n## Vision (image + text)\nPOST /models/gemini-2.0-flash-exp:generateContent?key={api_key}\n\`\`\`json\n{"contents": [{"parts": [{"text": "Describe this image"}, {"inlineData": {"mimeType": "image/jpeg", "data": "<base64-encoded-image>"}}]}]}\n\`\`\`\n\n## Streaming\nPOST /models/gemini-2.0-flash-exp:streamGenerateContent?key={api_key}\n\nReturns a stream of JSON objects; each has candidates[0].content.parts[0].text.\n\n## List available models\nGET /models?key={api_key}\n\nNotable models: gemini-2.0-flash-exp (fast, 1M context), gemini-1.5-pro (complex tasks), gemini-1.5-flash (balanced).\n\nUse connector_slug="gemini" for auth (key is injected as query param by the runner).`,
  },

]
