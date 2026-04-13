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
];

export function getMcpCatalogEntry(slug: string): McpCatalogEntry | undefined {
  return MCP_CATALOG.find((e) => e.slug === slug);
}
