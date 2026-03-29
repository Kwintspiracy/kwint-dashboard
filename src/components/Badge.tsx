const colorStyles = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  neutral: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
}

export default function Badge({
  label,
  color = 'neutral',
  dot,
}: {
  label: string
  color?: keyof typeof colorStyles
  dot?: boolean
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${colorStyles[color]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${color === 'emerald' ? 'bg-emerald-400' : color === 'red' ? 'bg-red-400' : color === 'amber' ? 'bg-amber-400' : color === 'blue' ? 'bg-blue-400' : 'bg-neutral-400'}`} />}
      {label}
    </span>
  )
}
