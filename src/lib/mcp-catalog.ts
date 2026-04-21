// Marketplace of official remote MCP servers. Four auth modes:
//  - "mcp_oauth": server exposes OAuth 2.1 + DCR at /.well-known/oauth-authorization-server
//                 (tokens live in mcp_servers.env_vars after the callback completes).
//  - "mcp_oauth_preregistered": OAuth 2.1 without DCR — client_id/secret come from env vars
//                               set at deploy time (e.g. GITHUB_MCP_CLIENT_ID).
//  - "reuse_connector": authenticate as Bearer using a plain connector's api_key/OAuth token
//                       (requires requires_connector_slug to exist + be active first).
//  - "api_key": use an existing connector's API key as Bearer token (no OAuth flow needed).

export type McpAuthMode = "mcp_oauth" | "mcp_oauth_preregistered" | "reuse_connector" | "api_key";

export type McpCatalogEntry = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  mcp_url: string;
  category: string;
  auth_mode: McpAuthMode;
  requires_connector_slug?: string;
  oauth_client_id_env?: string;
  oauth_client_secret_env?: string;
  api_key_connector_slug?: string;
  docs_url?: string;
};

export const MCP_CATEGORIES = {
  Productivity: { label: "Productivity" },
  DevTools: { label: "Developer Tools" },
  Finance: { label: "Finance & Payments" },
  "Web & Data": { label: "Web & Data" },
  Storage: { label: "Storage & Files" },
  Design: { label: "Design" },
} as const;

export const MCP_CATALOG: McpCatalogEntry[] = [
  // ── Productivity ────────────────────────────────────────────────────────────
  {
    slug: "notion",
    name: "Notion",
    description:
      "Official Notion MCP — pages, databases, blocks, comments, users, and search. Auto-chunked and schema-validated by Notion.",
    icon: "📝",
    mcp_url: "https://mcp.notion.com/mcp",
    category: "Productivity",
    auth_mode: "mcp_oauth",
    docs_url: "https://developers.notion.com/docs/mcp",
  },
  {
    slug: "linear",
    name: "Linear",
    description:
      "Official Linear MCP — issues, projects, cycles, initiatives, milestones, and comments. Real-time access to your Linear workspace.",
    icon: "🔷",
    mcp_url: "https://mcp.linear.app/mcp",
    category: "Productivity",
    auth_mode: "mcp_oauth",
    docs_url: "https://linear.app/docs/mcp",
  },
  {
    slug: "atlassian",
    name: "Atlassian (Jira & Confluence)",
    description:
      "Official Atlassian Rovo MCP — 72+ tools across Jira issues, Confluence pages, and Compass. Enterprise-ready with permission-scoped access.",
    icon: "🔵",
    mcp_url: "https://mcp.atlassian.com/v1/sse",
    category: "Productivity",
    auth_mode: "mcp_oauth_preregistered",
    oauth_client_id_env: "ATLASSIAN_MCP_CLIENT_ID",
    oauth_client_secret_env: "ATLASSIAN_MCP_CLIENT_SECRET",
    docs_url: "https://www.atlassian.com/platform/remote-mcp-server",
  },
  {
    slug: "asana",
    name: "Asana",
    description:
      "Official Asana MCP — tasks, projects, workspaces, comments, and deadlines. Interact with the Asana Work Graph using natural language.",
    icon: "🟠",
    mcp_url: "https://mcp.asana.com/sse",
    category: "Productivity",
    auth_mode: "mcp_oauth",
    docs_url: "https://developers.asana.com",
  },
  {
    slug: "cogni",
    name: "Cogni (Cortex)",
    description:
      "Cogni MCP — read the feed, post, comment, vote, and store memories inside The Cortex. Typed tools (create_post, create_comment, vote, store_memory) eliminate body-assembly mistakes that plague the generic HTTP path.",
    icon: "🧠",
    mcp_url: "https://cogni-web-psi.vercel.app/api/mcp",
    category: "Productivity",
    auth_mode: "reuse_connector",
    requires_connector_slug: "cogni",
    docs_url: "https://cogni-web-psi.vercel.app/docs",
  },
  {
    slug: "airtable-mcp",
    name: "Airtable",
    description:
      "Official Airtable MCP — list/search/update records, inspect schema, filter by column values, and access interface pages. Authenticates with an existing Airtable connector PAT.",
    icon: "🗂️",
    mcp_url: "https://mcp.airtable.com/mcp",
    category: "Productivity",
    auth_mode: "api_key",
    api_key_connector_slug: "airtable",
    docs_url: "https://support.airtable.com/docs/using-the-airtable-mcp-server",
  },
  {
    slug: "slack-mcp",
    name: "Slack",
    description:
      "Official Slack MCP — search messages, send messages, read channel history, manage canvases, and access member profiles.",
    icon: "💬",
    mcp_url: "https://mcp.slack.com/mcp",
    category: "Productivity",
    auth_mode: "mcp_oauth_preregistered",
    oauth_client_id_env: "SLACK_MCP_CLIENT_ID",
    oauth_client_secret_env: "SLACK_MCP_CLIENT_SECRET",
    docs_url: "https://docs.slack.dev/ai/slack-mcp-server/",
  },

  // ── Developer Tools ─────────────────────────────────────────────────────────
  {
    slug: "github-mcp",
    name: "GitHub",
    description:
      "Official GitHub MCP — repositories, issues, PRs, code search, and workflow automation. Hosted by GitHub with automatic updates.",
    icon: "🐙",
    mcp_url: "https://api.githubcopilot.com/mcp",
    category: "DevTools",
    auth_mode: "mcp_oauth_preregistered",
    oauth_client_id_env: "GITHUB_MCP_CLIENT_ID",
    oauth_client_secret_env: "GITHUB_MCP_CLIENT_SECRET",
    docs_url: "https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md",
  },
  {
    slug: "sentry",
    name: "Sentry",
    description:
      "Official Sentry MCP — query errors, issues, and events across projects. Create projects, capture setup info, and inspect organization data.",
    icon: "🛡️",
    mcp_url: "https://mcp.sentry.io/sse",
    category: "DevTools",
    auth_mode: "mcp_oauth",
    docs_url: "https://blog.sentry.io/yes-sentry-has-an-mcp-server-and-its-pretty-good/",
  },
  {
    slug: "cloudflare-mcp",
    name: "Cloudflare",
    description:
      "Official Cloudflare MCP — Workers, R2, D1, KV, logs, and infrastructure management. Manage deployments and debug from your agent.",
    icon: "☁️",
    mcp_url: "https://bindings.mcp.cloudflare.com/sse",
    category: "DevTools",
    auth_mode: "mcp_oauth",
    docs_url: "https://blog.cloudflare.com/thirteen-new-mcp-servers-from-cloudflare/",
  },
  {
    slug: "vercel-mcp",
    name: "Vercel",
    description:
      "Official Vercel MCP — projects, deployments, build logs, runtime logs, and domain management.",
    icon: "▲",
    mcp_url: "https://mcp.vercel.com/",
    category: "DevTools",
    auth_mode: "mcp_oauth",
    docs_url: "https://vercel.com/docs",
  },

  // ── Finance & Payments ──────────────────────────────────────────────────────
  {
    slug: "stripe-mcp",
    name: "Stripe",
    description:
      "Official Stripe MCP — 25 tools for customers, products, prices, invoices, subscriptions, refunds, and Stripe docs search.",
    icon: "💳",
    mcp_url: "https://mcp.stripe.com/",
    category: "Finance",
    auth_mode: "api_key",
    api_key_connector_slug: "stripe",
    docs_url: "https://docs.stripe.com/mcp",
  },
  {
    slug: "paypal",
    name: "PayPal",
    description:
      "Official PayPal MCP — invoicing, payments, catalog management, and commerce capabilities via natural language.",
    icon: "🅿️",
    mcp_url: "https://mcp.paypal.com/sse",
    category: "Finance",
    auth_mode: "mcp_oauth",
    docs_url: "https://docs.paypal.ai/developer/tools/ai/mcp-quickstart",
  },

  // ── Web & Data ──────────────────────────────────────────────────────────────
  {
    slug: "firecrawl",
    name: "Firecrawl",
    description:
      "Official Firecrawl MCP — scrape pages, crawl sites, extract structured data, and search the web with JS rendering and anti-bot handling.",
    icon: "🔥",
    mcp_url: "https://mcp.firecrawl.dev/v2/mcp",
    category: "Web & Data",
    auth_mode: "reuse_connector",
    requires_connector_slug: "firecrawl",
    docs_url: "https://docs.firecrawl.dev/mcp",
  },
  {
    slug: "apify",
    name: "Apify",
    description:
      "Official Apify MCP — access 5,000+ Actors for web scraping, automation, and data extraction through a single connection.",
    icon: "🕷️",
    mcp_url: "https://mcp.apify.com",
    category: "Web & Data",
    auth_mode: "mcp_oauth",
    docs_url: "https://docs.apify.com/platform/integrations/mcp",
  },
  {
    slug: "hubspot-mcp",
    name: "HubSpot",
    description:
      "Official HubSpot MCP — CRM contacts, companies, deals, tickets, and marketing tools via API key authentication.",
    icon: "🟧",
    mcp_url: "https://app.hubspot.com/mcp/v1/http",
    category: "Web & Data",
    auth_mode: "api_key",
    api_key_connector_slug: "hubspot",
    docs_url: "https://developers.hubspot.com",
  },

  // ── Storage & Files ─────────────────────────────────────────────────────────
  {
    slug: "box",
    name: "Box",
    description:
      "Official Box MCP — file management, sharing, search, and collaboration across your Box enterprise content.",
    icon: "📦",
    mcp_url: "https://mcp.box.com",
    category: "Storage",
    auth_mode: "mcp_oauth",
    docs_url: "https://developer.box.com",
  },

  // ── Design ──────────────────────────────────────────────────────────────────
  {
    slug: "canva",
    name: "Canva",
    description:
      "Official Canva MCP — create and edit designs, access templates, manage brand assets, and collaborate on visual content.",
    icon: "🎨",
    mcp_url: "https://mcp.canva.com/mcp",
    category: "Design",
    auth_mode: "mcp_oauth",
    docs_url: "https://www.canva.dev",
  },
];

export function getMcpCatalogEntry(slug: string): McpCatalogEntry | undefined {
  return MCP_CATALOG.find((e) => e.slug === slug);
}
