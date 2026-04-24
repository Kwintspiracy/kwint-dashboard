/**
 * Wave 4.3 — SSRF guard for outbound fetches to user-supplied URLs.
 *
 * An admin (or a compromised admin account) can register an MCP server with
 * any URL. Before this guard, the dashboard would follow that URL to hit
 * its `/.well-known/oauth-authorization-server` endpoint — including
 * http://localhost:5432/ (internal Postgres), http://169.254.169.254/
 * (AWS IMDS), http://10.x.x.x/ (internal VPC). That's SSRF: a malicious
 * MCP server URL exfiltrates the Vercel runtime's internal network.
 *
 * The guard enforces:
 *   - HTTPS only (production) or HTTP/HTTPS (dev) via NODE_ENV.
 *   - Host must not resolve to a private / link-local / loopback IP.
 *     We do a syntactic check here; true DNS resolution + re-binding
 *     defense needs a custom `fetch` `lookup` hook, which is scheduled
 *     for Wave 5.
 *   - No credentials in the URL (`user:pass@host` → reject).
 */

const PRIVATE_IPV4_RANGES: Array<[number, number, string]> = [
  // [start, end, label]
  [0x0A000000, 0x0AFFFFFF, '10.0.0.0/8'],
  [0xAC100000, 0xAC1FFFFF, '172.16.0.0/12'],
  [0xC0A80000, 0xC0A8FFFF, '192.168.0.0/16'],
  [0x7F000000, 0x7FFFFFFF, '127.0.0.0/8 (loopback)'],
  [0x00000000, 0x00FFFFFF, '0.0.0.0/8 (unspecified)'],
  [0xA9FE0000, 0xA9FEFFFF, '169.254.0.0/16 (link-local incl. AWS IMDS)'],
]

function ipv4ToInt(ip: string): number | null {
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (!m) return null
  const parts = m.slice(1).map(Number)
  for (const p of parts) if (p < 0 || p > 255) return null
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

export class UrlGuardError extends Error {
  readonly reason: string
  constructor(reason: string) {
    super(`URL rejected by SSRF guard: ${reason}`)
    this.reason = reason
  }
}

export function assertSafeOutboundUrl(input: string): URL {
  let parsed: URL
  try {
    parsed = new URL(input)
  } catch {
    throw new UrlGuardError('malformed URL')
  }
  const allowHttp = process.env.NODE_ENV !== 'production'
  if (parsed.protocol !== 'https:' && !(allowHttp && parsed.protocol === 'http:')) {
    throw new UrlGuardError(`protocol ${parsed.protocol} not allowed (https only in prod)`)
  }
  if (parsed.username || parsed.password) {
    throw new UrlGuardError('credentials in URL')
  }
  const host = parsed.hostname.toLowerCase()
  // IPv6 literals like [::1] — reject all for now (link-local + loopback).
  if (host.startsWith('[')) {
    throw new UrlGuardError('IPv6 literal hosts not allowed')
  }
  // Loopback hostnames.
  if (host === 'localhost' || host.endsWith('.localhost') || host === 'ip6-localhost') {
    throw new UrlGuardError(`loopback hostname (${host})`)
  }
  // IPv4 literal host — check against private ranges.
  const ipInt = ipv4ToInt(host)
  if (ipInt !== null) {
    for (const [start, end, label] of PRIVATE_IPV4_RANGES) {
      if (ipInt >= start && ipInt <= end) {
        throw new UrlGuardError(`private/link-local IPv4 range (${label})`)
      }
    }
  }
  // `.local` mDNS.
  if (host.endsWith('.local')) {
    throw new UrlGuardError('.local mDNS hostname not allowed')
  }
  // Metadata service hostnames (cloud).
  if (
    host === 'metadata.google.internal' ||
    host === 'metadata.gce.internal' ||
    host === 'instance-data'
  ) {
    throw new UrlGuardError('cloud metadata hostname')
  }
  return parsed
}
