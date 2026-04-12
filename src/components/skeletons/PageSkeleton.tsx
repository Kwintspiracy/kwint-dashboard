import CardSkeleton from './CardSkeleton'
import TableSkeleton from './TableSkeleton'
import StatCardSkeleton from './StatCardSkeleton'

type Variant = 'cards' | 'table' | 'stats' | 'mixed'

interface PageSkeletonProps {
  variant?: Variant
  title?: string
  /** Number of cards/rows to render */
  count?: number
}

/**
 * Generic page skeleton — rendered by Next.js `loading.tsx` while server actions resolve.
 * Mimics PageHeader + list/grid so navigation feels instant.
 */
export default function PageSkeleton({ variant = 'cards', title, count }: PageSkeletonProps) {
  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header shim */}
      <div className="flex items-center justify-between">
        <div>
          {title ? (
            <p className="text-lg font-semibold text-neutral-300">{title}</p>
          ) : (
            <div className="h-5 w-40 bg-neutral-800/50 rounded animate-pulse" />
          )}
          <div className="h-2.5 w-64 bg-neutral-800/30 rounded animate-pulse mt-2" />
        </div>
        <div className="h-8 w-24 bg-neutral-800/40 rounded-lg animate-pulse" />
      </div>

      {variant === 'stats' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: count ?? 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )}

      {variant === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: count ?? 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {variant === 'table' && (
        <div className="rounded-xl border border-neutral-800/60 bg-neutral-900 overflow-hidden">
          <TableSkeleton rows={count ?? 8} cols={5} />
        </div>
      )}

      {variant === 'mixed' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="rounded-xl border border-neutral-800/60 bg-neutral-900 overflow-hidden">
            <TableSkeleton rows={count ?? 6} cols={5} />
          </div>
        </>
      )}
    </div>
  )
}
