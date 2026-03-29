export default function PageHeader({
  title,
  subtitle,
  count,
  children,
}: {
  title: string
  subtitle?: string
  count?: number
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <h1 className="text-lg sm:text-xl font-bold text-white">{title}</h1>
        {count !== undefined && (
          <span className="text-xs text-neutral-500 bg-neutral-800/50 px-2 py-0.5 rounded-full">{count}</span>
        )}
        {subtitle && <span className="text-sm text-neutral-500">{subtitle}</span>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}
