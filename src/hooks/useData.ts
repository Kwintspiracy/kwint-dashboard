'use client'

import useSWR, { SWRConfiguration } from 'swr'

/**
 * Thin wrapper around SWR for Server Action data fetching.
 * Provides client-side caching, stale-while-revalidate, and deduplication.
 *
 * Usage:
 *   const { data, isLoading, mutate } = useData('agents', getAgentsAction)
 *   const { data, isLoading, mutate } = useData(['jobs', filters], () => getJobsAction(filters))
 */
export function useData<T>(
  key: string | unknown[] | null,
  fetcher: () => Promise<T>,
  config?: SWRConfiguration<T>
) {
  // Auto-skip when any element of a tuple key is null/undefined — typically
  // `eid` during AuthProvider bootstrap. Prevents firing every server action
  // twice: once with undefined entity, once with the resolved entity.
  const safeKey: string | unknown[] | null =
    key === null ? null
    : Array.isArray(key) && key.some(k => k === null || k === undefined) ? null
    : key

  return useSWR<T>(
    safeKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,        // Served cached data instantly; only refetch on mutate()
      dedupingInterval: 30_000,        // Same key within 30s → no refetch
      focusThrottleInterval: 60_000,   // If focus revalidation re-enabled, throttle to 1/min
      keepPreviousData: true,
      errorRetryCount: 3,              // Stop retrying after 3 failures
      errorRetryInterval: 5_000,       // Wait 5s between retries
      ...config,
    }
  )
}
