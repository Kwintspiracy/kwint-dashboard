'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  function link(href: string, label: string) {
    const active = pathname === href
    return (
      <Link
        href={href}
        className={`block px-4 py-2 text-sm ${
          active
            ? 'text-white bg-neutral-800/80'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-52 bg-neutral-950 border-r border-neutral-800 flex flex-col">
      <div className="px-4 py-4 border-b border-neutral-800">
        <p className="text-sm font-semibold text-white">Kwint Agents</p>
      </div>
      <nav className="flex-1 py-2 space-y-4">
        <div>
          {link('/stats', 'Overview')}
          {link('/agents', 'Agents')}
        </div>
        <div>
          <p className="px-4 py-1 text-xs text-neutral-600 uppercase tracking-wide">Data</p>
          {link('/jobs', 'Jobs')}
          {link('/memories', 'Memories')}
          {link('/skills', 'Skills')}
        </div>
        <div>
          <p className="px-4 py-1 text-xs text-neutral-600 uppercase tracking-wide">Automation</p>
          {link('/automations', 'Automations')}
        </div>
      </nav>
      <div className="px-4 py-3 border-t border-neutral-800 text-xs text-neutral-600">
        Multi-agent
      </div>
    </aside>
  )
}
