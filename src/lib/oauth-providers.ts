export type OAuthProviderConfig = {
  name: string
  authUrl: string
  tokenUrl: string
  clientIdEnv: string
  clientSecretEnv: string
  extraAuthParams?: Record<string, string>
}


export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  google: {
    name: 'Google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
  },
  slack: {
    name: 'Slack',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    clientIdEnv: 'SLACK_CLIENT_ID',
    clientSecretEnv: 'SLACK_CLIENT_SECRET',
  },
  github: {
    name: 'GitHub',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    clientIdEnv: 'GITHUB_CLIENT_ID',
    clientSecretEnv: 'GITHUB_CLIENT_SECRET',
  },
  notion: {
    name: 'Notion',
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    clientIdEnv: 'NOTION_CLIENT_ID',
    clientSecretEnv: 'NOTION_CLIENT_SECRET',
  },
  linear: {
    name: 'Linear',
    authUrl: 'https://linear.app/oauth/authorize',
    tokenUrl: 'https://api.linear.app/oauth/token',
    clientIdEnv: 'LINEAR_CLIENT_ID',
    clientSecretEnv: 'LINEAR_CLIENT_SECRET',
  },
  hubspot: {
    name: 'HubSpot',
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    clientIdEnv: 'HUBSPOT_CLIENT_ID',
    clientSecretEnv: 'HUBSPOT_CLIENT_SECRET',
  },
  microsoft: {
    name: 'Microsoft',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    clientIdEnv: 'MICROSOFT_CLIENT_ID',
    clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
  },
}

// Maps connector slug → which OAuth provider + scopes to request
export const CONNECTOR_OAUTH: Record<string, { provider: string; scopes: string[] }> = {
  gmail: {
    provider: 'google',
    scopes: [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  },
  'google-sheets': {
    provider: 'google',
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  },
  'google-drive': {
    provider: 'google',
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  },
  'google-calendar': {
    provider: 'google',
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  },
  'google-docs': {
    provider: 'google',
    scopes: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  },
  slack: {
    provider: 'slack',
    scopes: ['channels:history', 'chat:write', 'users:read', 'channels:read'],
  },
  github: {
    provider: 'github',
    scopes: ['repo', 'user:email'],
  },
  notion: {
    provider: 'notion',
    scopes: ['read_content', 'update_content', 'insert_content'],
  },
  linear: {
    provider: 'linear',
    scopes: ['read', 'write'],
  },
  hubspot: {
    provider: 'hubspot',
    scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write', 'oauth'],
  },
  'microsoft-outlook': {
    provider: 'microsoft',
    scopes: ['offline_access', 'Mail.ReadWrite', 'Mail.Send', 'User.Read'],
  },
  msteams: {
    provider: 'microsoft',
    scopes: ['offline_access', 'ChannelMessage.Read.All', 'Chat.ReadWrite', 'User.Read'],
  },
}
