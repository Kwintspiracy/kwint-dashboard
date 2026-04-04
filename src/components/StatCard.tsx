import {
  ChartBar,
  Coins,
  Timer,
  CheckCircle,
  type Icon,
} from '@phosphor-icons/react'

const colorMap = {
  emerald: {
    value: 'text-emerald-400',
    icon: 'text-emerald-500',
    iconBg: 'bg-emerald-500/10',
    border: 'border-emerald-500/10',
  },
  red: {
    value: 'text-red-400',
    icon: 'text-red-500',
    iconBg: 'bg-red-500/10',
    border: 'border-red-500/10',
  },
  amber: {
    value: 'text-amber-400',
    icon: 'text-amber-500',
    iconBg: 'bg-amber-500/10',
    border: 'border-amber-500/10',
  },
  blue: {
    value: 'text-blue-400',
    icon: 'text-blue-500',
    iconBg: 'bg-blue-500/10',
    border: 'border-blue-500/10',
  },
  purple: {
    value: 'text-violet-400',
    icon: 'text-violet-500',
    iconBg: 'bg-violet-500/10',
    border: 'border-violet-500/10',
  },
} as const

const iconMap: Record<string, Icon> = {
  emerald: CheckCircle,
  red: CheckCircle,
  amber: CheckCircle,
  blue: Coins,
  purple: Timer,
}

export default function StatCard({
  label,
  value,
  detail,
  trend,
  color = 'emerald',
  icon: IconOverride,
}: {
  label: string
  value: string | number
  detail?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: 'emerald' | 'red' | 'amber' | 'blue' | 'purple'
  icon?: Icon
}) {
  const c = colorMap[color] ?? colorMap.emerald
  const IconComponent = IconOverride ?? iconMap[color] ?? ChartBar

  return (
    <div className={`
      group relative bg-neutral-900 border border-neutral-800/60 rounded-xl p-5
      hover:border-neutral-700/60 hover:bg-neutral-900/80
      transition-all duration-150 overflow-hidden
    `}>
      {/* Subtle top-left glow on hover */}
      <div className={`absolute -top-6 -left-6 w-16 h-16 rounded-full blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 ${c.iconBg}`} />

      <div className="flex items-start justify-between gap-3 relative">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-neutral-500 uppercase tracking-wide font-semibold">{label}</p>
          <p className={`text-3xl font-bold mt-2 tracking-tight leading-none ${c.value}`}>{value}</p>
          {detail && (
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed">{detail}</p>
          )}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.iconBg}`}>
          <IconComponent size={18} weight="duotone" className={c.icon} />
        </div>
      </div>
    </div>
  )
}
