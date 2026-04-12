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
  key: string | unknown[],
  fetcher: () => Promise<T>,
  config?: SWRConfiguration<T>
) {
  return useSWR<T>(
    key,
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
