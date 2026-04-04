interface TableSkeletonProps {
  rows?: number
  cols?: number
}

// Varied widths to mimic realistic column content
const colWidths = ['w-28', 'w-36', 'w-20', 'w-32', 'w-16']

export default function TableSkeleton({ rows = 8, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="flex flex-col">
      {/* Header row */}
      <div className="flex gap-6 px-4 py-2.5 border-b border-neutral-800/60">
        {Array.from({ length: cols }).map((_, colIndex) => (
          <div
            key={colIndex}
            className={`h-2.5 ${colWidths[colIndex % colWidths.length]} bg-neutral-800/40 rounded animate-pulse`}
            style={{ animationDelay: `${colIndex * 30}ms` }}
          />
        ))}
      </div>

      {/* Body rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-6 px-4 py-3 border-b border-neutral-800/30"
          style={{ opacity: 1 - rowIndex * 0.07 }}
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              className={`h-3.5 ${colWidths[(rowIndex + colIndex) % colWidths.length]} bg-neutral-800/50 rounded animate-pulse`}
              style={{ animationDelay: `${(rowIndex * cols + colIndex) * 20}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
