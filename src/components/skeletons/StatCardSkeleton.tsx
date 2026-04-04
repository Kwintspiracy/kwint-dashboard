export default function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-800/60 bg-neutral-900 p-5">
      {/* Label */}
      <div className="h-2.5 w-20 bg-neutral-800/50 rounded animate-pulse" />
      {/* Value */}
      <div className="h-9 w-28 bg-neutral-800/50 rounded animate-pulse mt-3" style={{ animationDelay: '50ms' }} />
      {/* Subtext / delta */}
      <div className="h-2.5 w-36 bg-neutral-800/30 rounded animate-pulse mt-2.5" style={{ animationDelay: '100ms' }} />
    </div>
  )
}
