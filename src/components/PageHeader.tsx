export default function PageHeader({
  title,
  subtitle,
  description,
  count,
  children,
}: {
  title: string
  subtitle?: string
  description?: string
  count?: number
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-white tracking-tight">{title}</h1>
          {count !== undefined && (
            <span className="text-xs font-medium text-neutral-500 bg-neutral-800/60 border border-neutral-700/40 px-2 py-0.5 rounded-full tabular-nums">
              {count}
            </span>
          )}
          {subtitle && (
            <span className="text-sm text-neutral-600 font-normal">{subtitle}</span>
          )}
        </div>
        {description && (
          <p className="text-xs text-neutral-500 mt-0.5 max-w-lg leading-relaxed">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{children}</div>
      )}
    </div>
  )
}
