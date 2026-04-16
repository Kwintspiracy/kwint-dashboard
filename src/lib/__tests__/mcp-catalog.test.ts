import { describe, it, expect } from 'vitest'
import { MCP_CATALOG, getMcpCatalogEntry, MCP_CATEGORIES } from '../mcp-catalog'

describe('MCP_CATALOG', () => {
  it('has no duplicate slugs', () => {
    const slugs = MCP_CATALOG.map(e => e.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('all entries have valid HTTPS URLs', () => {
    for (const entry of MCP_CATALOG) {
      expect(entry.mcp_url, `${entry.slug} URL`).toMatch(/^https:\/\//)
    }
  })

  it('all entries have non-empty name and description', () => {
    for (const entry of MCP_CATALOG) {
      expect(entry.name.length, `${entry.slug} name`).toBeGreaterThan(0)
      expect(entry.description.length, `${entry.slug} description`).toBeGreaterThan(10)
    }
  })

  it('mcp_oauth_preregistered entries have oauth_client_id_env', () => {
    const preregistered = MCP_CATALOG.filter(e => e.auth_mode === 'mcp_oauth_preregistered')
    expect(preregistered.length).toBeGreaterThan(0)
    for (const entry of preregistered) {
      expect(entry.oauth_client_id_env, `${entry.slug} missing oauth_client_id_env`).toBeTruthy()
    }
  })

  it('api_key entries have api_key_connector_slug', () => {
    const apiKey = MCP_CATALOG.filter(e => e.auth_mode === 'api_key')
    expect(apiKey.length).toBeGreaterThan(0)
    for (const entry of apiKey) {
      expect(entry.api_key_connector_slug, `${entry.slug} missing api_key_connector_slug`).toBeTruthy()
    }
  })

  it('reuse_connector entries have requires_connector_slug', () => {
    const reuse = MCP_CATALOG.filter(e => e.auth_mode === 'reuse_connector')
    for (const entry of reuse) {
      expect(entry.requires_connector_slug, `${entry.slug} missing requires_connector_slug`).toBeTruthy()
    }
  })

  it('all categories reference existing MCP_CATEGORIES keys', () => {
    const validCategories = new Set(Object.keys(MCP_CATEGORIES))
    for (const entry of MCP_CATALOG) {
      expect(validCategories.has(entry.category), `${entry.slug} has unknown category "${entry.category}"`).toBe(true)
    }
  })

  it('getMcpCatalogEntry returns correct entry by slug', () => {
    expect(getMcpCatalogEntry('notion')?.name).toBe('Notion')
    expect(getMcpCatalogEntry('stripe-mcp')?.auth_mode).toBe('api_key')
    expect(getMcpCatalogEntry('github-mcp')?.auth_mode).toBe('mcp_oauth_preregistered')
    expect(getMcpCatalogEntry('nonexistent')).toBeUndefined()
  })

  it('has at least 15 entries', () => {
    expect(MCP_CATALOG.length).toBeGreaterThanOrEqual(15)
  })
})
