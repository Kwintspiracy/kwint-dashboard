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
  HardDrives,
  CheckSquare,
  List,
  X,
  Moon,
  Sun,
  SignOut,
  GearSix,
  CurrencyDollar,
  type Icon,
} from '@phosphor-icons/react'
import { useTheme } from '@/components/ThemeProvider'
import { useAuth } from '@/components/AuthProvider'
import { useApprovalCount } from '@/hooks/useApprovalCount'
import EntitySwitcher from '@/components/EntitySwitcher'

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
      { href: '/jobs', label: 'Sessions', icon: ClipboardText },
      { href: '/memories', label: 'Memories', icon: Brain },
      { href: '/connectors', label: 'Connectors', icon: Plug },
      { href: '/skills', label: 'Skills', icon: BookOpenText },
    ],
  },
  {
    section: 'Automation',
    items: [
      { href: '/tasks', label: 'Tasks', icon: CheckSquare },
      { href: '/automations', label: 'Automations', icon: ClockCountdown },
      { href: '/approvals', label: 'Approvals', icon: ShieldCheck },
      { href: '/logs', label: 'Logs', icon: ListMagnifyingGlass },
    ],
  },
  {
    section: 'Workspace',
    items: [
      { href: '/billing', label: 'Billing', icon: CurrencyDollar },
      { href: '/settings', label: 'Settings', icon: GearSix },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { theme, toggle: toggleTheme } = useTheme()
  const { signOut, activeEntity } = useAuth()
  const approvalCount = useApprovalCount()

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
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-neutral-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/40">
            <ChartPieSlice size={14} weight="fill" className="text-white" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white tracking-tight leading-none">Kwint Agents</p>
            <p className="text-xs text-neutral-600 mt-0.5 leading-tight">Multi-agent platform</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all duration-150"
        >
          <X size={16} />
        </button>
      </div>

      {/* Entity switcher */}
      <div className="border-b border-neutral-800/60">
        <EntitySwitcher />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_ITEMS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
            {group.section && (
              <p className="text-xs uppercase tracking-wide text-neutral-600 font-semibold px-4 pb-1.5 pt-4">
                {group.section}
              </p>
            )}
            <div className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const active = pathname === item.href
                const IconComponent = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 relative
                      ${active
                        ? 'bg-neutral-800/80 text-white'
                        : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900'
                      }
                    `}
                  >
                    {/* Active indicator dot */}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-emerald-500 rounded-r-full" />
                    )}
                    <IconComponent
                      size={18}
                      weight={active ? 'duotone' : 'regular'}
                      className={`shrink-0 transition-colors duration-150 ${active ? 'text-emerald-400' : 'text-neutral-600 group-hover:text-neutral-400'}`}
                    />
                    <span className="flex-1 leading-none">{item.label}</span>
                    {item.href === '/approvals' && approvalCount > 0 && (
                      <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                        {approvalCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-neutral-800/60 flex items-center justify-between">
        <span className="text-xs text-neutral-700 uppercase tracking-wider font-medium px-1">v1.0</span>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-neutral-200 hover:bg-neutral-800 transition-all duration-150"
          >
            {theme === 'dark'
              ? <Sun size={15} weight="duotone" />
              : <Moon size={15} weight="duotone" />
            }
          </button>
          <button
            onClick={signOut}
            title="Sign out"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <SignOut size={15} weight="duotone" />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-13 bg-[#0a0a0a] border-b border-neutral-800/60 flex items-center px-4 gap-3">
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all duration-150 -ml-1"
        >
          <List size={20} weight="bold" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-md shadow-violet-900/40">
            <ChartPieSlice size={12} weight="fill" className="text-white" />
          </div>
          <p className="text-[13px] font-bold text-white tracking-tight">Kwint Agents</p>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 h-screen w-56 bg-[#0a0a0a] border-r border-neutral-800/60 flex flex-col z-50
        transition-transform duration-200 ease-out
        lg:left-0 lg:translate-x-0
        ${open ? 'left-0 translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {nav}
      </aside>
    </>
  )
}
