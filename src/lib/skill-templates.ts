export type SkillTemplate = {
  id: string
  name: string
  slug: string
  description: string
  category: 'google' | 'communication' | 'dev' | 'productivity' | 'search'
  color: string           // brand color for the card accent
  icon: string            // inline SVG path data (just the path d="..." for use in an SVG element)
  connector?: {           // connector to create alongside the skill
    slug: string
    base_url?: string
  }
  fields: {               // what the user needs to configure (connector credentials)
    key: string
    label: string
    type: 'text' | 'password' | 'url'
    placeholder: string
    required: boolean
    help?: string
  }[]
  content: string         // markdown template with {PLACEHOLDER} tokens
}

export const SKILL_CATEGORIES: Record<string, { label: string; color: string }> = {
  google: { label: 'Google', color: 'text-blue-400' },
  communication: { label: 'Communication', color: 'text-purple-400' },
  dev: { label: 'Developer', color: 'text-emerald-400' },
  productivity: { label: 'Productivity', color: 'text-amber-400' },
  search: { label: 'Search', color: 'text-red-400' },
}

export const SKILL_TEMPLATES: SkillTemplate[] = [
  // ═══════ GOOGLE ═══════
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    slug: 'google-sheets',
    description: 'Read and write Google Spreadsheets via the internal proxy',
    category: 'google',
    color: '#34A853',
    icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 7h2v2H7zm0 4h2v2H7zm0 4h2v2H7zm4-8h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6z',
    connector: { slug: 'google-sheets' },
    fields: [],
    content: `# Google Sheets API

Use the \`http_request\` tool to call the internal Sheets proxy.
All authentication is handled server-side — you NEVER need to handle tokens yourself.

## IMPORTANT
- Do NOT call googleapis.com directly
- Do NOT try to sign JWTs or handle OAuth2
- ALWAYS use the internal proxy endpoint

## Read cells
\`\`\`json
{
  "url": "{APP_URL}/api/sheets",
  "method": "POST",
  "body": {
    "spreadsheet_id": "SPREADSHEET_ID",
    "range": "Sheet1!A1:Z100",
    "action": "read"
  }
}
\`\`\`

## Write cells
\`\`\`json
{
  "url": "{APP_URL}/api/sheets",
  "method": "POST",
  "body": {
    "spreadsheet_id": "SPREADSHEET_ID",
    "range": "Sheet1!A1:C2",
    "action": "write",
    "values": [["Col1", "Col2"], ["Val1", "Val2"]]
  }
}
\`\`\`

## Extracting spreadsheet ID
From URL: \`https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit\`
Take the part between \`/d/\` and \`/edit\`.

## Workflow
1. READ first to understand structure
2. WRITE only cells that need changing
3. READ again to verify`,
  },
  {
    id: 'gmail',
    name: 'Gmail',
    slug: 'gmail',
    description: 'Send and read emails via Gmail API',
    category: 'google',
    color: '#EA4335',
    icon: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    connector: { slug: 'gmail', base_url: 'https://gmail.googleapis.com' },
    fields: [
      { key: 'api_key', label: 'Gmail API Key', type: 'password', placeholder: 'AIza...', required: true, help: 'From Google Cloud Console → APIs & Services → Credentials' },
    ],
    content: `# Gmail API

Send and read emails via Gmail.

## Send email
POST {BASE_URL}/gmail/v1/users/me/messages/send
Authorization: Bearer {API_KEY}
\`\`\`json
{
  "raw": "BASE64_ENCODED_EMAIL"
}
\`\`\`

## List messages
GET {BASE_URL}/gmail/v1/users/me/messages?maxResults=10
Authorization: Bearer {API_KEY}

## Read message
GET {BASE_URL}/gmail/v1/users/me/messages/{MESSAGE_ID}
Authorization: Bearer {API_KEY}

## Note
Use skill_slug="gmail" in http_request to auto-inject the API key.`,
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    slug: 'google-drive',
    description: 'List, read, and manage files in Google Drive',
    category: 'google',
    color: '#FBBC04',
    icon: 'M7.71 3.5L1.15 15l3.43 6 6.55-11.5L7.71 3.5zm1.14 0l6.56 11.5H22L15.44 3.5H8.85zM15 16l-3.43 6h13.72l3.43-6H15z',
    connector: { slug: 'google-drive', base_url: 'https://www.googleapis.com/drive/v3' },
    fields: [
      { key: 'api_key', label: 'Drive API Key', type: 'password', placeholder: 'AIza...', required: true },
    ],
    content: `# Google Drive API

## List files
GET {BASE_URL}/files?q=trashed=false&fields=files(id,name,mimeType)
Use skill_slug="google-drive" for auth.

## Download file
GET {BASE_URL}/files/{FILE_ID}?alt=media

## Search files
GET {BASE_URL}/files?q=name contains 'report'&fields=files(id,name,mimeType)

## Note
Use skill_slug="google-drive" in http_request to auto-inject the API key.`,
  },
  {
    id: 'slack',
    name: 'Slack',
    slug: 'slack',
    description: 'Send messages and read channels in Slack',
    category: 'communication',
    color: '#E01E5A',
    icon: 'M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z',
    connector: { slug: 'slack', base_url: 'https://slack.com/api' },
    fields: [
      { key: 'api_key', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...', required: true, help: 'From Slack App → OAuth & Permissions → Bot User OAuth Token' },
    ],
    content: `# Slack API

## Send message
POST {BASE_URL}/chat.postMessage
\`\`\`json
{
  "channel": "CHANNEL_ID",
  "text": "Hello from the agent!"
}
\`\`\`
Use skill_slug="slack" for auth.

## List channels
GET {BASE_URL}/conversations.list?types=public_channel,private_channel

## Read messages
GET {BASE_URL}/conversations.history?channel=CHANNEL_ID&limit=10

## Note
Use skill_slug="slack" in http_request to auto-inject the Bot Token.`,
  },
  {
    id: 'notion',
    name: 'Notion',
    slug: 'notion',
    description: 'Create and query Notion pages and databases',
    category: 'productivity',
    color: '#FFFFFF',
    icon: 'M4 4.5A2.5 2.5 0 0 1 6.5 2H18l4 4.5V22a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 21.5v-17zM8 8h8v2H8V8zm0 4h8v2H8v-2zm0 4h5v2H8v-2z',
    connector: { slug: 'notion', base_url: 'https://api.notion.com/v1' },
    fields: [
      { key: 'api_key', label: 'Integration Token', type: 'password', placeholder: 'ntn_...', required: true, help: 'From notion.so/my-integrations → Create integration → Internal Integration Token' },
    ],
    content: `# Notion API

All requests need header: Notion-Version: 2022-06-28

## Query database
POST {BASE_URL}/databases/{DATABASE_ID}/query
\`\`\`json
{
  "filter": { "property": "Status", "status": { "equals": "In Progress" } }
}
\`\`\`

## Create page
POST {BASE_URL}/pages
\`\`\`json
{
  "parent": { "database_id": "DATABASE_ID" },
  "properties": { "Name": { "title": [{ "text": { "content": "New page" } }] } }
}
\`\`\`

## Search
POST {BASE_URL}/search
\`\`\`json
{ "query": "search term" }
\`\`\`

Use skill_slug="notion" for auth. Add Notion-Version header manually.`,
  },
  {
    id: 'github',
    name: 'GitHub',
    slug: 'github',
    description: 'Manage repos, issues, and pull requests',
    category: 'dev',
    color: '#FFFFFF',
    icon: 'M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z',
    connector: { slug: 'github', base_url: 'https://api.github.com' },
    fields: [
      { key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_...', required: true, help: 'From github.com → Settings → Developer Settings → Personal Access Tokens' },
    ],
    content: `# GitHub API

## List repos
GET {BASE_URL}/user/repos?sort=updated&per_page=10
Use skill_slug="github" for auth.

## Create issue
POST {BASE_URL}/repos/{OWNER}/{REPO}/issues
\`\`\`json
{ "title": "Bug report", "body": "Description..." }
\`\`\`

## List issues
GET {BASE_URL}/repos/{OWNER}/{REPO}/issues?state=open

## Search code
GET {BASE_URL}/search/code?q=keyword+repo:{OWNER}/{REPO}

## Note
Use skill_slug="github" in http_request to auto-inject the token.`,
  },
  {
    id: 'tavily',
    name: 'Tavily Search',
    slug: 'tavily',
    description: 'AI-powered web search with structured results',
    category: 'search',
    color: '#6366F1',
    icon: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    connector: { slug: 'tavily', base_url: 'https://api.tavily.com' },
    fields: [
      { key: 'api_key', label: 'Tavily API Key', type: 'password', placeholder: 'tvly-...', required: true, help: 'From tavily.com → Dashboard → API Keys' },
    ],
    content: `# Tavily Search

AI-powered web search. API key goes in the request body, not header.

## Search
POST {BASE_URL}/search
\`\`\`json
{
  "api_key": "YOUR_API_KEY",
  "query": "your search query",
  "search_depth": "basic",
  "max_results": 5
}
\`\`\`

- search_depth: "basic" (fast) or "advanced" (thorough)
- max_results: 1-10

Returns array of results with title, url, content, score.

**Note:** Tavily uses API key in body, not header. Do NOT use skill_slug for auth.`,
  },
  {
    id: 'resend',
    name: 'Resend',
    slug: 'resend',
    description: 'Send transactional emails',
    category: 'communication',
    color: '#000000',
    icon: 'M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67zM22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z',
    connector: { slug: 'resend', base_url: 'https://api.resend.com' },
    fields: [
      { key: 'api_key', label: 'Resend API Key', type: 'password', placeholder: 're_...', required: true, help: 'From resend.com → API Keys' },
    ],
    content: `# Resend Email API

## Send email
POST {BASE_URL}/emails
\`\`\`json
{
  "from": "Agent <agent@yourdomain.com>",
  "to": ["user@example.com"],
  "subject": "Subject line",
  "text": "Plain text body"
}
\`\`\`
Use skill_slug="resend" for auth.

## Check email status
GET {BASE_URL}/emails/{EMAIL_ID}`,
  },
]
