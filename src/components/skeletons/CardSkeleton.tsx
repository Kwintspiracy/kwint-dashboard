export default function CardSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-800/60 bg-neutral-900 p-5 flex flex-col gap-4">
      {/* Header row: avatar + title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-neutral-800/50 animate-pulse flex-shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="h-3.5 w-2/3 bg-neutral-800/50 rounded animate-pulse" />
          <div className="h-2.5 w-1/3 bg-neutral-800/30 rounded animate-pulse" />
        </div>
      </div>
      {/* Body lines */}
      <div className="flex flex-col gap-2">
        <div className="h-3 w-full bg-neutral-800/40 rounded animate-pulse" style={{ animationDelay: '75ms' }} />
        <div className="h-3 w-4/5 bg-neutral-800/30 rounded animate-pulse" style={{ animationDelay: '100ms' }} />
        <div className="h-3 w-3/5 bg-neutral-800/20 rounded animate-pulse" style={{ animationDelay: '125ms' }} />
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-neutral-800/40">
        <div className="h-2.5 w-16 bg-neutral-800/30 rounded animate-pulse" style={{ animationDelay: '150ms' }} />
        <div className="h-5 w-12 bg-neutral-800/20 rounded-full animate-pulse" style={{ animationDelay: '175ms' }} />
      </div>
    </div>
  )
}
