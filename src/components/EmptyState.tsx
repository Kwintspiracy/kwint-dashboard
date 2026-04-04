import React from 'react'

export default function EmptyState({
  message,
  description,
  icon,
  action,
}: {
  message: string
  description?: string
  icon?: React.ReactNode | string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {icon && (
        <div className="mb-5 flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800/60 text-neutral-500 ring-1 ring-neutral-800/40 ring-offset-2 ring-offset-neutral-950">
          {typeof icon === 'string' ? (
            <span className="text-2xl leading-none">{icon}</span>
          ) : (
            <span className="text-xl">{icon}</span>
          )}
        </div>
      )}
      <p className="text-sm font-medium text-neutral-300 mb-1">{message}</p>
      {description && (
        <p className="text-xs text-neutral-600 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-neutral-800/70 border border-neutral-700/60 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors duration-150"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
