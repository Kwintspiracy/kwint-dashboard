'use client'

import { useEffect, useRef } from 'react'

type SidePanelProps = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  width?: 'md' | 'lg'   // md = 480px, lg = 600px
  actions?: React.ReactNode
}

export default function SidePanel({ open, onClose, title, subtitle, children, width = 'md', actions }: SidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const widthClass = width === 'lg' ? 'sm:w-[600px]' : 'sm:w-[480px]'

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={[
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={[
          // Positioning & sizing
          'fixed inset-y-0 right-0 z-50 flex flex-col',
          'w-full', widthClass,
          // Background & border
          'bg-neutral-950 border-l border-neutral-800/80 shadow-2xl',
          // Slide animation
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800/60 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-white truncate">{title}</h2>
            {subtitle && <p className="text-xs text-neutral-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all duration-150"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-5">
          {children}
        </div>
      </div>
    </>
  )
}
