'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid email or password')
    } else {
      window.location.href = '/stats'
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800/50 bg-neutral-900/50 p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-white tracking-tight">Kwint Agents</h1>
          <p className="text-sm text-neutral-500 mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs text-neutral-400 mb-1.5">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              data-testid="email-input"
              className="w-full rounded-lg border border-neutral-800/50 bg-neutral-800/30 px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-neutral-600 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs text-neutral-400 mb-1.5">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              data-testid="password-input"
              className="w-full rounded-lg border border-neutral-800/50 bg-neutral-800/30 px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-neutral-600 transition-colors"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400" data-testid="login-error">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !email || !password}
            data-testid="login-button"
            className="w-full rounded-lg bg-white text-black py-2.5 text-sm font-medium hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
