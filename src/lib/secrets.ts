import { timingSafeEqual } from 'node:crypto'

/**
 * Constant-time comparison of two secrets.
 *
 * Introduced by Wave 0.3 (audit 2026-04-23). The webhook route previously used
 * `provided !== expected`, which leaks secret bytes via response timing — an
 * attacker can discover the secret one character at a time. `timingSafeEqual`
 * requires equal-length buffers; we early-exit on length mismatch (also
 * constant-time for the attacker's purposes: they can't distinguish
 * "wrong-length" from "wrong-content" since both return 403 with no timing
 * difference beyond the initial length check).
 *
 * Returns false for null/undefined inputs so callers can pass raw header
 * values without pre-validating.
 */
export function secretsMatch(provided: string | null | undefined, expected: string | null | undefined): boolean {
  if (!provided || !expected) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
