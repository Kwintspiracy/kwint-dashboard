interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

const colWidths = ['w-24', 'w-32', 'w-16'];

export default function TableSkeleton({ rows = 8, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, colIndex) => (
          <div
            key={colIndex}
            className="h-3 w-20 bg-neutral-800 rounded animate-pulse"
          />
        ))}
      </div>

      {/* Body rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              className={`h-4 ${colWidths[(rowIndex + colIndex) % colWidths.length]} bg-neutral-800/60 rounded animate-pulse`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
