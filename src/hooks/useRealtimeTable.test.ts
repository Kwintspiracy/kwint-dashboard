import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { supabase } from '@/lib/supabase'

// The supabase mock is set up globally in src/test/setup.ts.
// We get typed references here to inspect calls.
const mockSubscribe = vi.fn()
const mockOn = vi.fn()
const mockChannel = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  mockOn.mockReturnValue({ subscribe: mockSubscribe })
  mockChannel.mockReturnValue({ on: mockOn, subscribe: mockSubscribe })

  // Override the global mock for this file's tests
  vi.mocked(supabase.channel).mockImplementation(mockChannel)
  mockOn.mockReturnValue({ on: mockOn, subscribe: mockSubscribe })
})

describe('useRealtimeTable', () => {
  it('subscribes to a channel on mount', () => {
    renderHook(() =>
      useRealtimeTable({
        table: 'jobs',
      })
    )

    expect(supabase.channel).toHaveBeenCalledWith(
      expect.stringContaining('realtime:jobs:')
    )
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'jobs', schema: 'public' }),
      expect.any(Function)
    )
    expect(mockSubscribe).toHaveBeenCalled()
  })

  it('does not subscribe when enabled is false', () => {
    renderHook(() =>
      useRealtimeTable({
        table: 'jobs',
        enabled: false,
      })
    )

    expect(supabase.channel).not.toHaveBeenCalled()
    expect(mockSubscribe).not.toHaveBeenCalled()
  })

  it('calls removeChannel on unmount', () => {
    const fakeChannel = { on: mockOn, subscribe: mockSubscribe }
    mockChannel.mockReturnValue(fakeChannel)
    mockOn.mockReturnValue(fakeChannel)

    const { unmount } = renderHook(() =>
      useRealtimeTable({
        table: 'agents',
      })
    )

    unmount()

    expect(supabase.removeChannel).toHaveBeenCalled()
  })

  it('subscribes with the correct event type when specified', () => {
    renderHook(() =>
      useRealtimeTable({
        table: 'jobs',
        event: 'INSERT',
      })
    )

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'INSERT' }),
      expect.any(Function)
    )
  })

  it('subscribes with the correct filter when specified', () => {
    renderHook(() =>
      useRealtimeTable({
        table: 'jobs',
        filter: 'agent_id=eq.abc123',
      })
    )

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ filter: 'agent_id=eq.abc123' }),
      expect.any(Function)
    )
  })
})
