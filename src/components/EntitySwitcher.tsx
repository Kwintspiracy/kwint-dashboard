'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CaretDown, Check } from '@phosphor-icons/react'
import { useAuth } from '@/components/AuthProvider'

export default function EntitySwitcher() {
  const { entities, activeEntity, switchEntity } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!activeEntity) return null

  return (
    <div ref={ref} className="relative px-3 py-3 border-b border-neutral-800/50">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-neutral-800/60 transition-colors group"
      >
        <span className="text-lg leading-none shrink-0">{activeEntity.icon}</span>
        <span className="flex-1 text-left text-sm font-semibold text-white truncate tracking-tight">
          {activeEntity.name}
        </span>
        <CaretDown
          size={14}
          weight="bold"
          className={`shrink-0 text-neutral-500 group-hover:text-neutral-300 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl border border-neutral-800 bg-neutral-900 shadow-xl shadow-black/40 overflow-hidden">
          <div className="py-1">
            {entities.map(entity => {
              const isActive = entity.id === activeEntity.id
              return (
                <button
                  key={entity.id}
                  onClick={async () => {
                    await switchEntity(entity)
                    setOpen(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-neutral-800/70 transition-colors"
                >
                  <span className="text-base leading-none shrink-0">{entity.icon}</span>
                  <span className={`flex-1 text-left truncate ${isActive ? 'text-white font-medium' : 'text-neutral-400'}`}>
                    {entity.name}
                  </span>
                  {isActive && (
                    <Check size={14} weight="bold" className="shrink-0 text-emerald-400" />
                  )}
                </button>
              )
            })}
          </div>
          <div className="border-t border-neutral-800 py-1">
            <button
              onClick={() => {
                setOpen(false)
                router.push('/onboarding?mode=add')
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800/70 transition-colors"
            >
              <span className="text-base leading-none">+</span>
              <span>New workspace</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
