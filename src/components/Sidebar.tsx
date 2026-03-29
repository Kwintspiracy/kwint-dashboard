'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    section: null,
    items: [
      { href: '/stats', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
      { href: '/agents', label: 'Agents', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    ],
  },
  {
    section: 'Data',
    items: [
      { href: '/jobs', label: 'Jobs', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { href: '/memories', label: 'Memories', icon: 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342' },
      { href: '/connectors', label: 'Connectors', icon: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-6.364-6.364L4.5 8.25l4.5 4.5' },
      { href: '/skills', label: 'Skills', icon: 'M11.42 15.17l-5.66-5.66a8 8 0 1111.31 0l-5.65 5.66zm0 0L12 21' },
    ],
  },
  {
    section: 'Automation',
    items: [
      { href: '/automations', label: 'Automations', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
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
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
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
