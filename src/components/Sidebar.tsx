'use client'

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
  type Icon,
} from '@phosphor-icons/react'

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

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-neutral-950 border-r border-neutral-800/50 flex flex-col">
      <div className="px-5 py-5 border-b border-neutral-800/50">
        <p className="text-sm font-bold text-white tracking-tight">Kwint Agents</p>
        <p className="text-xs text-neutral-600 mt-0.5">Multi-agent platform</p>
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
                    className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                      active
                        ? 'text-white bg-neutral-800/60 border-r-2 border-emerald-500'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
                    }`}
                  >
                    <IconComponent size={18} weight="duotone" className="shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-neutral-800/50">
        <p className="text-[10px] text-neutral-700 uppercase tracking-wider">v1.0</p>
      </div>
    </aside>
  )
}
