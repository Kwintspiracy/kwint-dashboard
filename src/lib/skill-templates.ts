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
]
