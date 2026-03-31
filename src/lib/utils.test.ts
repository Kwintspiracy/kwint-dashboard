import { describe, it, expect, vi, beforeEach } from 'vitest'
import { estimateCost, estimateCostBlended, formatDuration, truncate, formatDate, timeAgo } from '@/lib/utils'

describe('estimateCost', () => {
  it('uses Sonnet rates ($3/$15 per 1M) by default', () => {
    // 1M input tokens at $3 = $3.00
    expect(estimateCost(1_000_000, 0, 'claude-sonnet-4-6')).toBe('$3.00')
    // 1M output tokens at $15 = $15.00
    expect(estimateCost(0, 1_000_000, 'claude-sonnet-4-6')).toBe('$15.00')
  })

  it('uses Haiku rates ($0.80/$4 per 1M)', () => {
    // 1M input tokens at $0.80 = $0.80
    expect(estimateCost(1_000_000, 0, 'claude-haiku-4-5')).toBe('$0.80')
    // 1M output tokens at $4 = $4.00
    expect(estimateCost(0, 1_000_000, 'claude-haiku-4-5')).toBe('$4.00')
  })

  it('uses Opus rates ($15/$75 per 1M)', () => {
    // 1M input tokens at $15 = $15.00
    expect(estimateCost(1_000_000, 0, 'claude-opus-4-6')).toBe('$15.00')
    // 1M output tokens at $75 = $75.00
    expect(estimateCost(0, 1_000_000, 'claude-opus-4-6')).toBe('$75.00')
  })

  it('falls back to Sonnet rates for unknown model', () => {
    // Same as Sonnet: $3/$15
    expect(estimateCost(1_000_000, 0, 'unknown-model')).toBe('$3.00')
  })

  it('shows 4 decimal places for small costs (< $0.01)', () => {
    // 100 input tokens at $3/1M = $0.0003
    const result = estimateCost(100, 0, 'claude-sonnet-4-6')
    expect(result).toMatch(/^\$0\.\d{4}$/)
    expect(result).toBe('$0.0003')
  })

  it('shows 2 decimal places for large costs (>= $0.01)', () => {
    // 10000 input + 1000 output at Sonnet rates = $0.045 -> $0.05
    const result = estimateCost(10_000, 1_000, 'claude-sonnet-4-6')
    expect(result).toMatch(/^\$\d+\.\d{2}$/)
  })

  it('uses default model (Sonnet) when model not provided', () => {
    expect(estimateCost(1_000_000, 0)).toBe('$3.00')
  })
})

describe('estimateCostBlended', () => {
  it('delegates to estimateCost with 70/30 split', () => {
    const tokens = 1_000_000
    // 70% input (700k) at $3, 30% output (300k) at $15 = $2.10 + $4.50 = $6.60
    expect(estimateCostBlended(tokens, 'claude-sonnet-4-6')).toBe('$6.60')
  })

  it('uses Sonnet as default model', () => {
    const result = estimateCostBlended(1_000_000)
    expect(result).toBe('$6.60')
  })

  it('works with Haiku model', () => {
    // 700k at $0.80 + 300k at $4 = $0.56 + $1.20 = $1.76
    expect(estimateCostBlended(1_000_000, 'claude-haiku-4-5')).toBe('$1.76')
  })
})

describe('formatDuration', () => {
  it('shows "XXms" for durations under 1000ms', () => {
    expect(formatDuration(0)).toBe('0ms')
    expect(formatDuration(500)).toBe('500ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  it('shows "X.Xs" for durations >= 1000ms', () => {
    expect(formatDuration(1000)).toBe('1.0s')
    expect(formatDuration(1500)).toBe('1.5s')
    expect(formatDuration(10000)).toBe('10.0s')
    expect(formatDuration(2345)).toBe('2.3s')
  })
})

describe('truncate', () => {
  it('returns the string unchanged when within the limit', () => {
    expect(truncate('hello', 10)).toBe('hello')
    expect(truncate('exactly60chars', 60)).toBe('exactly60chars')
  })

  it('truncates with "..." when over the limit', () => {
    const long = 'a'.repeat(61)
    const result = truncate(long, 60)
    expect(result).toBe('a'.repeat(60) + '...')
  })

  it('returns empty string for empty input', () => {
    expect(truncate('')).toBe('')
    expect(truncate('', 10)).toBe('')
  })

  it('uses default maxLen of 60', () => {
    const exactly60 = 'a'.repeat(60)
    expect(truncate(exactly60)).toBe(exactly60)

    const over60 = 'a'.repeat(61)
    expect(truncate(over60)).toBe('a'.repeat(60) + '...')
  })
})

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'))
  })

  it('shows seconds ago', () => {
    const iso = new Date('2024-01-01T11:59:30Z').toISOString() // 30s ago
    expect(timeAgo(iso)).toBe('30s ago')
  })

  it('shows minutes ago', () => {
    const iso = new Date('2024-01-01T11:55:00Z').toISOString() // 5m ago
    expect(timeAgo(iso)).toBe('5m ago')
  })

  it('shows hours ago', () => {
    const iso = new Date('2024-01-01T09:00:00Z').toISOString() // 3h ago
    expect(timeAgo(iso)).toBe('3h ago')
  })

  it('shows days ago', () => {
    const iso = new Date('2023-12-30T12:00:00Z').toISOString() // 2d ago
    expect(timeAgo(iso)).toBe('2d ago')
  })
})
