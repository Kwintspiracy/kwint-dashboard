import { describe, it, expect } from 'vitest'
import { CONNECTOR_OAUTH, OAUTH_PROVIDERS } from './oauth-providers'
import { SKILL_TEMPLATES } from './skill-templates'

describe('Google connector unification', () => {
  it('defines a unified `google` slug with all Google scopes', () => {
    // Bug 2026-04-17 "il faut un peu de cohérence produit!" — user shouldn't
    // have to re-OAuth 5 times (Gmail, Drive, Sheets, Docs, Calendar) for the
    // same Google account. A single `google` slug covers everything.
    const g = CONNECTOR_OAUTH.google
    expect(g).toBeDefined()
    expect(g.provider).toBe('google')
    for (const scope of [
      'gmail.modify',
      'drive',
      'spreadsheets',
      'documents',
      'calendar',
    ]) {
      expect(g.scopes.some(s => s.includes(scope))).toBe(true)
    }
  })

  it('keeps legacy per-service google slugs for backward compat', () => {
    for (const slug of ['gmail', 'google-drive', 'google-sheets', 'google-docs', 'google-calendar']) {
      expect(CONNECTOR_OAUTH[slug]).toBeDefined()
      expect(CONNECTOR_OAUTH[slug].provider).toBe('google')
    }
  })

  it('all Google skill templates point to the unified `google` connector slug', () => {
    // If a template still says connector.slug: 'google-sheets' (etc), installing
    // that skill would create a separate connector row and the user would have
    // to OAuth again for that service specifically — the exact UX mess we
    // unified away from.
    const googleSkillIds = ['gmail', 'google-drive', 'google-sheets', 'google-docs', 'google-calendar']
    for (const id of googleSkillIds) {
      const tpl = SKILL_TEMPLATES.find(t => t.id === id)
      expect(tpl, `template ${id} must exist`).toBeDefined()
      expect(tpl!.connector?.slug, `template ${id} must use unified google connector`).toBe('google')
    }
  })

  it('Google OAuth provider config is intact', () => {
    const p = OAUTH_PROVIDERS.google
    expect(p.name).toBe('Google')
    expect(p.authUrl).toContain('accounts.google.com')
    expect(p.tokenUrl).toContain('oauth2.googleapis.com')
    expect(p.extraAuthParams?.access_type).toBe('offline')
    expect(p.extraAuthParams?.prompt).toBe('consent')
  })
})
