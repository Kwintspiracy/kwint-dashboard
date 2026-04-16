'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Toaster } from 'sonner'

type Theme = 'dark' | 'light'

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'dark',
  toggle: () => {},
})

export function useTheme() { return useContext(ThemeContext) }

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialise from localStorage in the lazy useState form so the first
  // render already has the saved theme — avoids a useEffect setState
  // (react-hooks/set-state-in-effect) and avoids a flash of wrong theme.
  // localStorage isn't available during SSR, so guard for window.
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark'
    return (localStorage.getItem('theme') as Theme | null) ?? 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
      <Toaster position="bottom-right" theme={theme} richColors />
    </ThemeContext.Provider>
  )
}
