import { describe, it, expect } from 'vitest'
import nextConfig from '../../../next.config'

// Wave 4.1 regression tests (audit 2026-04-23).
// Pin the security headers so a refactor of next.config.ts can't silently
// drop HSTS / CSP / the existing X-Frame-Options chain.

type HeaderRule = { source: string; headers: Array<{ key: string; value: string }> }

async function collectHeaders(): Promise<Record<string, string>> {
  const rules = (await nextConfig.headers?.()) ?? []
  const wildcard = (rules as HeaderRule[]).find(r => r.source === '/(.*)')
  expect(wildcard, 'wildcard header rule must exist').toBeTruthy()
  const bag: Record<string, string> = {}
  for (const h of wildcard!.headers) bag[h.key] = h.value
  return bag
}

describe('next.config security headers', () => {
  it('HSTS is set with 1-year max-age + includeSubDomains', async () => {
    const h = await collectHeaders()
    expect(h['Strict-Transport-Security']).toBeTruthy()
    expect(h['Strict-Transport-Security']).toMatch(/max-age=\d{7,}/)
    expect(h['Strict-Transport-Security']).toContain('includeSubDomains')
  })

  it('CSP (report-only) is set with a default-src none fallback', async () => {
    const h = await collectHeaders()
    // Shipped as report-only first to avoid breaking unknown inline scripts.
    const csp = h['Content-Security-Policy-Report-Only'] ?? h['Content-Security-Policy']
    expect(csp, 'CSP missing').toBeTruthy()
    expect(csp).toContain("default-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("base-uri 'self'")
  })

  it('pre-existing hardening headers survived the Wave 4.1 change', async () => {
    const h = await collectHeaders()
    expect(h['X-Frame-Options']).toBe('DENY')
    expect(h['X-Content-Type-Options']).toBe('nosniff')
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(h['Permissions-Policy']).toContain('camera=()')
  })
})
