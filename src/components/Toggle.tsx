type ToggleProps = {
  checked: boolean
  onChange: () => void
  color?: 'emerald' | 'violet' | 'amber' | 'red'
  disabled?: boolean
  'aria-label'?: string
}

const TRACK: Record<string, string> = {
  emerald: 'bg-emerald-600',
  violet:  'bg-violet-600',
  amber:   'bg-amber-500',
  red:     'bg-red-600',
}

export default function Toggle({ checked, onChange, color = 'emerald', disabled, 'aria-label': ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={[
        // Fixed dimensions — shrink-0 prevents flex containers from squishing into a circle on mobile
        'relative inline-flex shrink-0 w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900',
        checked ? TRACK[color] : 'bg-neutral-700',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  )
}
