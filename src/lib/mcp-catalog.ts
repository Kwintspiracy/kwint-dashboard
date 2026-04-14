// Marketplace of remote MCP servers. Two auth modes:
//  - "mcp_oauth": server exposes OAuth 2.1 + DCR at /.well-known/oauth-authorization-server
//                 (tokens live in mcp_servers.env_vars after the callback completes).
//  - "reuse_connector": authenticate as Bearer using a plain connector's api_key/OAuth token
//                       (requires requires_connector_slug to exist + be active first).

export type McpAuthMode = "mcp_oauth" | "reuse_connector";

export type McpCatalogEntry = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  mcp_url: string;
  category: string;
  auth_mode: McpAuthMode;
  requires_connector_slug?: string;
  docs_url?: string;
};

export const MCP_CATALOG: McpCatalogEntry[] = [
  {
    slug: "notion",
    name: "Notion MCP",
    description:
      "Full Notion API coverage via the official remote MCP server. Replaces hand-written adapters with Notion's own battle-tested tooling (pages, databases, blocks, comments, users — all auto-chunked and schema-validated).",
    icon: "📝",
    mcp_url: "https://mcp.notion.com/mcp",
    category: "Productivity",
    auth_mode: "mcp_oauth",
    docs_url: "https://developers.notion.com/docs/mcp",
  },
  {
    slug: "firecrawl",
    name: "Firecrawl MCP",
    description:
      "Web scraping and crawling via Firecrawl's official remote MCP. Scrape single pages, crawl entire sites, extract structured data, and search the web — all with JS rendering and anti-bot handling built in.",
    icon: "🔥",
    mcp_url: "https://mcp.firecrawl.dev/v2/mcp",
    category: "Web & Data",
    auth_mode: "reuse_connector",
    requires_connector_slug: "firecrawl",
    docs_url: "https://docs.firecrawl.dev/mcp",
  },
  {
    slug: "apify",
    name: "Apify MCP",
    description:
      "Access 5,000+ Apify Actors via the official remote MCP server. Run web scrapers, automation workflows, and data extraction tools — from social media scrapers to browser automation — through a single connection.",
    icon: "🕷️",
    mcp_url: "https://mcp.apify.com",
    category: "Web & Data",
    auth_mode: "mcp_oauth",
    docs_url: "https://docs.apify.com/platform/integrations/mcp",
  },
];

export function getMcpCatalogEntry(slug: string): McpCatalogEntry | undefined {
  return MCP_CATALOG.find((e) => e.slug === slug);
}
