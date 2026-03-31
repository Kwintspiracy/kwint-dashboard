export type SkillCategory =
  | 'design' | 'marketing' | 'finance' | 'planning' | 'communication'
  | 'analytics' | 'storage' | 'ai' | 'ecommerce' | 'dev' | 'crm' | 'hr'
  | 'search' | 'google'

export type SkillTemplate = {
  id: string
  name: string
  slug: string
  description: string
  category: SkillCategory
  color: string
  icon: string
  connector?: {
    slug: string
    base_url?: string
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
    connector: { slug: 'google-sheets' },
    fields: [],
    content: `# Google Sheets API\n\nUse the \`http_request\` tool to call the internal Sheets proxy.\nAll authentication is handled server-side.\n\n## Read cells\n\`\`\`json\n{"url": "{APP_URL}/api/sheets", "method": "POST", "body": {"spreadsheet_id": "ID", "range": "Sheet1!A1:Z100", "action": "read"}}\n\`\`\`\n\n## Write cells\n\`\`\`json\n{"url": "{APP_URL}/api/sheets", "method": "POST", "body": {"spreadsheet_id": "ID", "range": "Sheet1!A1:C2", "action": "write", "values": [["A","B"],["1","2"]]}}\n\`\`\``,
  },
  {
    id: 'gmail', name: 'Gmail', slug: 'gmail',
    description: 'Send and read emails via Gmail API',
    category: 'google', color: '#EA4335',
    icon: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    connector: { slug: 'gmail', base_url: 'https://gmail.googleapis.com' },
    fields: [{ key: 'api_key', label: 'Gmail API Key', type: 'password', placeholder: 'AIza...', required: true, help: 'From Google Cloud Console' }],
    content: `# Gmail API\n\n## Send email\nPOST /gmail/v1/users/me/messages/send\n\n## List messages\nGET /gmail/v1/users/me/messages?maxResults=10\n\nUse connector_slug="gmail" for auth.`,
  },
  {
    id: 'google-drive', name: 'Google Drive', slug: 'google-drive',
    description: 'List, read, and manage files in Google Drive',
    category: 'google', color: '#FBBC04',
    icon: 'M7.71 3.5L1.15 15l3.43 6 6.55-11.5L7.71 3.5zm1.14 0l6.56 11.5H22L15.44 3.5H8.85zM15 16l-3.43 6h13.72l3.43-6H15z',
    connector: { slug: 'google-drive', base_url: 'https://www.googleapis.com/drive/v3' },
    fields: [{ key: 'api_key', label: 'Drive API Key', type: 'password', placeholder: 'AIza...', required: true }],
    content: `# Google Drive API\n\n## List files\nGET /files?q=trashed=false&fields=files(id,name,mimeType)\n\n## Search\nGET /files?q=name contains 'report'\n\nUse connector_slug="google-drive" for auth.`,
  },

  // ═══════════════════════════════════════════════════
  // DESIGN
  // ═══════════════════════════════════════════════════

  {
    id: 'figma', name: 'Figma', slug: 'figma',
    description: 'Read design files, export images, inspect components',
    category: 'design', color: '#A259FF',
    icon: 'M5 5.5A3.5 3.5 0 018.5 2H12v7H8.5A3.5 3.5 0 015 5.5zM12 2h3.5a3.5 3.5 0 110 7H12V2zm0 12.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zm0-5.5h3.5a3.5 3.5 0 110 7H12V9zM5 12a3.5 3.5 0 003.5 3.5H12V9H8.5A3.5 3.5 0 005 12z',
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
    connector: { slug: 'notion', base_url: 'https://api.notion.com/v1' },
    fields: [{ key: 'api_key', label: 'Integration Token', type: 'password', placeholder: 'ntn_...', required: true, help: 'notion.so/my-integrations > Create integration' }],
    content: `# Notion API\n\nAll requests need: Notion-Version: 2022-06-28\n\n## Query database\nPOST /databases/{id}/query\n\`\`\`json\n{"filter": {"property": "Status", "status": {"equals": "In Progress"}}}\n\`\`\`\n\n## Create page\nPOST /pages\n\n## Search\nPOST /search\n\`\`\`json\n{"query": "search term"}\n\`\`\`\n\nUse connector_slug="notion" for auth. Add Notion-Version header manually.`,
  },
  {
    id: 'trello', name: 'Trello', slug: 'trello',
    description: 'Kanban boards for task and project tracking',
    category: 'planning', color: '#0052CC',
    icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm3 2v5h4V6H6zm8 0v8h4V6h-4z',
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
    connector: { slug: 'slack', base_url: 'https://slack.com/api' },
    fields: [{ key: 'api_key', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...', required: true, help: 'Slack App > OAuth & Permissions > Bot User OAuth Token' }],
    content: `# Slack API\n\n## Send message\nPOST /chat.postMessage\n\`\`\`json\n{"channel": "CHANNEL_ID", "text": "Hello!"}\n\`\`\`\n\n## List channels\nGET /conversations.list?types=public_channel\n\n## Read messages\nGET /conversations.history?channel=CHANNEL_ID&limit=10\n\nUse connector_slug="slack" for auth.`,
  },
  {
    id: 'discord', name: 'Discord', slug: 'discord',
    description: 'Send messages and manage channels in Discord servers',
    category: 'communication', color: '#5865F2',
    icon: 'M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z',
    connector: { slug: 'discord', base_url: 'https://discord.com/api/v10' },
    fields: [{ key: 'api_key', label: 'Bot Token', type: 'password', placeholder: 'MTIz...', required: true, help: 'Discord Developer Portal > Bot > Token' }],
    content: `# Discord API\n\nAuth uses "Bot" prefix: Authorization: Bot {token}\n\n## Send message\nPOST /channels/{channel_id}/messages\n\`\`\`json\n{"content": "Hello from the agent!"}\n\`\`\`\n\n## List channels\nGET /guilds/{guild_id}/channels\n\n## Read messages\nGET /channels/{channel_id}/messages?limit=10`,
  },
  {
    id: 'twilio', name: 'Twilio', slug: 'twilio',
    description: 'Send SMS, make calls, WhatsApp messaging',
    category: 'communication', color: '#F22F46',
    icon: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z',
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
    connector: { slug: 'github', base_url: 'https://api.github.com' },
    fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_...', required: true, help: 'GitHub > Settings > Developer Settings > Personal Access Tokens' }],
    content: `# GitHub API\n\n## List repos\nGET /user/repos?sort=updated&per_page=10\n\n## Create issue\nPOST /repos/{owner}/{repo}/issues\n\`\`\`json\n{"title": "Bug report", "body": "Description..."}\n\`\`\`\n\n## List PRs\nGET /repos/{owner}/{repo}/pulls?state=open\n\n## Search code\nGET /search/code?q=keyword+repo:{owner}/{repo}\n\nUse connector_slug="github" for auth.`,
  },
  {
    id: 'gitlab', name: 'GitLab', slug: 'gitlab',
    description: 'DevOps platform with repos, CI/CD, and issue tracking',
    category: 'dev', color: '#FC6D26',
    icon: 'M4.845 7.11l.38-1.15 1.93-5.88a.29.29 0 01.55 0l1.93 5.88H14.4l1.93-5.88a.29.29 0 01.55 0l1.93 5.88.38 1.15a.58.58 0 01-.21.65l-6.98 5.07-6.98-5.07a.58.58 0 01-.21-.65z',
    connector: { slug: 'gitlab', base_url: 'https://gitlab.com/api/v4' },
    fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'glpat-...', required: true, help: 'GitLab > Preferences > Access Tokens' }],
    content: `# GitLab API\n\nAuth uses PRIVATE-TOKEN header (not Authorization Bearer).\n\n## List projects\nGET /projects?membership=true&per_page=10\n\n## Create issue\nPOST /projects/{id}/issues\n\`\`\`json\n{"title": "Bug", "description": "Details..."}\n\`\`\`\n\n## List pipelines\nGET /projects/{id}/pipelines`,
  },
  {
    id: 'sentry', name: 'Sentry', slug: 'sentry',
    description: 'Application monitoring, error tracking, performance',
    category: 'dev', color: '#362D59',
    icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
    connector: { slug: 'sentry', base_url: 'https://sentry.io/api/0' },
    fields: [{ key: 'api_key', label: 'Auth Token', type: 'password', placeholder: 'sntrys_...', required: true, help: 'Sentry > Settings > Auth Tokens' }],
    content: `# Sentry API\n\n## List issues\nGET /organizations/{org}/issues/?query=is:unresolved\n\n## List events\nGET /organizations/{org}/events/\n\n## Create release\nPOST /organizations/{org}/releases/\n\`\`\`json\n{"version": "1.0.0", "projects": ["my-project"]}\n\`\`\`\n\nUse connector_slug="sentry" for auth.`,
  },
  {
    id: 'vercel', name: 'Vercel', slug: 'vercel-api',
    description: 'Manage deployments, domains, and serverless functions',
    category: 'dev', color: '#000000',
    icon: 'M12 2L2 19.5h20L12 2z',
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

]
