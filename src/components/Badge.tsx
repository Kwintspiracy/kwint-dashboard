const colorStyles = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  red:     'bg-red-500/10 text-red-400 border-red-500/20',
  amber:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  blue:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  purple:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  neutral: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
}

const dotColors = {
  emerald: 'bg-emerald-400',
  red:     'bg-red-400',
  amber:   'bg-amber-400',
  blue:    'bg-blue-400',
  purple:  'bg-purple-400',
  neutral: 'bg-neutral-400',
}

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5 gap-1.5',
  lg: 'text-xs px-2.5 py-1 gap-2',
}

export default function Badge({
  label,
  color = 'neutral',
  size = 'sm',
  dot,
  className = '',
}: {
  label: string
  color?: keyof typeof colorStyles
  size?: keyof typeof sizeStyles
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-colors duration-150 ${sizeStyles[size]} ${colorStyles[color]} ${className}`}
    >
      {dot && (
        <span className={`rounded-full flex-shrink-0 ${size === 'lg' ? 'w-1.5 h-1.5' : 'w-1.5 h-1.5'} ${dotColors[color]}`} />
      )}
      {label}
    </span>
  )
}
