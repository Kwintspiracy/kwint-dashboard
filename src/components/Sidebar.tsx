'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChartPieSlice,
  UsersThree,
  ClipboardText,
  Brain,
  Plug,
  BookOpenText,
  ClockCountdown,
  ListMagnifyingGlass,
  ShieldCheck,
  List,
  X,
  Moon,
  Sun,
  type Icon,
} from '@phosphor-icons/react'
import { useTheme } from '@/components/ThemeProvider'

type NavItem = { href: string; label: string; icon: Icon }
type NavGroup = { section: string | null; items: NavItem[] }

const NAV_ITEMS: NavGroup[] = [
  {
    section: null,
    items: [
      { href: '/stats', label: 'Dashboard', icon: ChartPieSlice },
      { href: '/agents', label: 'Agents', icon: UsersThree },
    ],
  },
  {
    section: 'Data',
    items: [
      { href: '/jobs', label: 'Jobs', icon: ClipboardText },
      { href: '/memories', label: 'Memories', icon: Brain },
      { href: '/connectors', label: 'Connectors', icon: Plug },
      { href: '/skills', label: 'Skills', icon: BookOpenText },
    ],
  },
  {
    section: 'Automation',
    items: [
      { href: '/automations', label: 'Automations', icon: ClockCountdown },
      { href: '/approvals', label: 'Approvals', icon: ShieldCheck },
      { href: '/logs', label: 'Logs', icon: ListMagnifyingGlass },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { theme, toggle: toggleTheme } = useTheme()

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Close on escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const nav = (
    <>
      <div className="px-5 py-5 border-b border-neutral-800/50 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white tracking-tight">Kwint Agents</p>
          <p className="text-xs text-neutral-600 mt-0.5">Multi-agent platform</p>
        </div>
        {/* Close button — mobile only */}
        <button onClick={() => setOpen(false)} className="lg:hidden text-neutral-500 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>
      <nav className="flex-1 py-4 space-y-6 overflow-y-auto">
        {NAV_ITEMS.map((group, gi) => (
          <div key={gi}>
            {group.section && (
              <p className="px-5 pb-2 text-[10px] text-neutral-600 uppercase tracking-widest font-semibold">{group.section}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href
                const IconComponent = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-5 py-3 lg:py-2.5 text-base lg:text-sm transition-colors ${
                      active
                        ? 'text-white bg-neutral-800/60 border-r-2 border-emerald-500'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
                    }`}
                  >
                    <IconComponent size={20} weight="duotone" className="shrink-0 lg:w-[18px] lg:h-[18px]" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-neutral-800/50 flex items-center justify-between">
        <p className="text-[10px] text-neutral-700 uppercase tracking-wider">v1.0</p>
        <button onClick={toggleTheme} className="text-neutral-500 hover:text-white transition-colors" title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}>
          {theme === 'dark' ? <Sun size={16} weight="duotone" /> : <Moon size={16} weight="duotone" />}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-neutral-950 border-b border-neutral-800/50 flex items-center px-4 gap-3">
        <button onClick={() => setOpen(true)} className="text-neutral-400 hover:text-white transition-colors p-2 -ml-2 rounded-lg active:bg-neutral-800">
          <List size={28} weight="bold" />
        </button>
        <p className="text-base font-bold text-white tracking-tight">Kwint Agents</p>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar — always visible on desktop, slide-in on mobile */}
      <aside className={`
        fixed top-0 h-screen w-56 bg-neutral-950 border-r border-neutral-800/50 flex flex-col z-50
        transition-transform duration-200 ease-out
        lg:left-0 lg:translate-x-0
        ${open ? 'left-0 translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {nav}
      </aside>
    </>
  )
}
