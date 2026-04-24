import { describe, it, expect } from 'vitest'
import { secretsMatch } from '../secrets'

// Regression tests for Wave 0.3 (audit 2026-04-23):
// constant-time webhook secret comparison.
// Pre-fix (`provided !== trigger.secret`) these assertions would have passed
// the match-cases but never exercised the timing-safe path — the point of this
// file is to pin the invariant so a future refactor back to `!==` fails CI.

describe('secretsMatch (timing-safe compare)', () => {
  it('returns true for identical secrets', () => {
    expect(secretsMatch('abc123', 'abc123')).toBe(true)
  })

  it('returns false when one byte differs (equal length)', () => {
    expect(secretsMatch('abc123', 'abc124')).toBe(false)
  })

  it('returns false for different-length secrets (no buffer exception)', () => {
    // Node's timingSafeEqual throws on length mismatch; helper must guard.
    expect(secretsMatch('abc', 'abc123')).toBe(false)
    expect(secretsMatch('abc123', 'abc')).toBe(false)
  })

  it('returns false for empty, null, undefined', () => {
    expect(secretsMatch(null, 'abc')).toBe(false)
    expect(secretsMatch('abc', null)).toBe(false)
    expect(secretsMatch(undefined, 'abc')).toBe(false)
    expect(secretsMatch('abc', undefined)).toBe(false)
    expect(secretsMatch('', 'abc')).toBe(false)
    expect(secretsMatch('abc', '')).toBe(false)
    // Both empty — still false (no secret configured is rejected earlier in the route anyway).
    expect(secretsMatch('', '')).toBe(false)
  })

  it('returns false when only the final byte differs', () => {
    // The original `!==` was strcmp-style and short-circuits on first diff.
    // This case (diff at the last byte) is the classic timing-attack target:
    // an attacker discovers byte N by observing longer response times when
    // bytes 1..N-1 are correct. timingSafeEqual compares all bytes regardless.
    const base = 'k'.repeat(64)
    const tampered = 'k'.repeat(63) + 'j'
    expect(secretsMatch(base, tampered)).toBe(false)
  })

  it('handles unicode / multibyte chars safely', () => {
    expect(secretsMatch('café', 'café')).toBe(true)
    expect(secretsMatch('café', 'cafÉ')).toBe(false)
  })
})
