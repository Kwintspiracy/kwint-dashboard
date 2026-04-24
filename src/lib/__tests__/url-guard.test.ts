import { describe, it, expect } from 'vitest'
import { assertSafeOutboundUrl, UrlGuardError } from '../url-guard'

// Wave 4.3 regression tests (audit 2026-04-23).
// Before this guard, the MCP discovery fetch would follow any URL set on an
// mcp_servers row, including http://169.254.169.254/ (AWS IMDS) or
// http://localhost:5432/ (internal Postgres). The guard MUST reject every
// common SSRF target + allow legitimate https URLs. Pin the matrix so a
// future refactor can't silently drop a range.

describe('assertSafeOutboundUrl', () => {
  it('accepts a normal https URL', () => {
    const u = assertSafeOutboundUrl('https://api.notion.com/v1/')
    expect(u.host).toBe('api.notion.com')
  })

  it('rejects malformed URL', () => {
    expect(() => assertSafeOutboundUrl('not a url')).toThrow(UrlGuardError)
  })

  it('rejects URL with embedded credentials', () => {
    expect(() => assertSafeOutboundUrl('https://user:pass@example.com/')).toThrow(/credentials/)
  })

  it('rejects loopback hostnames', () => {
    expect(() => assertSafeOutboundUrl('http://localhost/')).toThrow(UrlGuardError)
    expect(() => assertSafeOutboundUrl('http://127.0.0.1/')).toThrow(UrlGuardError)
    expect(() => assertSafeOutboundUrl('http://127.1.2.3/')).toThrow(UrlGuardError)
  })

  it('rejects private IPv4 ranges', () => {
    for (const host of ['10.0.0.1', '10.255.255.255', '172.16.0.1', '172.31.255.254', '192.168.1.1']) {
      expect(() => assertSafeOutboundUrl(`https://${host}/`)).toThrow(UrlGuardError)
    }
  })

  it('rejects link-local + AWS IMDS', () => {
    expect(() => assertSafeOutboundUrl('http://169.254.169.254/latest/meta-data/')).toThrow(/link-local/)
  })

  it('rejects cloud metadata hostnames', () => {
    expect(() => assertSafeOutboundUrl('http://metadata.google.internal/')).toThrow(/metadata/)
  })

  it('rejects .local mDNS', () => {
    expect(() => assertSafeOutboundUrl('http://printer.local/')).toThrow(/mDNS/)
  })

  it('rejects IPv6 literal hosts', () => {
    expect(() => assertSafeOutboundUrl('http://[::1]/')).toThrow(/IPv6 literal/)
  })

  it('accepts public IPv4 not in private ranges', () => {
    const u = assertSafeOutboundUrl('https://8.8.8.8/')
    expect(u.host).toBe('8.8.8.8')
  })

  // NOTE: a cheap bypass is a DNS name that resolves to a private IP at
  // fetch time (DNS rebinding). This test documents the known gap. Full
  // mitigation needs a custom fetch `lookup` hook — scheduled for Wave 5.
  it('does NOT yet resolve DNS names (rebinding gap — Wave 5 follow-up)', () => {
    // Public-looking name — accepted. If it resolves to 127.0.0.1 at
    // fetch time, we'd miss it. Follow-up work.
    const u = assertSafeOutboundUrl('https://attacker.example/')
    expect(u.host).toBe('attacker.example')
  })
})
