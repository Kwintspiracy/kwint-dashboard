'use client'

import { useState } from 'react'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase'

type Mode = 'signin' | 'signup' | 'forgot'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  function reset(nextMode: Mode) {
    setMode(nextMode)
    setError('')
    setInfo('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirm(false)
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      if (error.message.toLowerCase().includes('confirm') || error.message.toLowerCase().includes('verify')) {
        setError('Please confirm your email before signing in.')
      } else {
        setError('Invalid email or password.')
      }
      return
    }
    window.location.href = '/stats'
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setInfo('Check your email — we sent you a confirmation link.')
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setError('Enter your email address first.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setInfo('Password reset link sent — check your email.')
  }

  async function handleResendConfirmation() {
    if (!email) return
    const supabase = createClient()
    await supabase.auth.resend({ type: 'signup', email })
    setInfo('Confirmation email resent.')
    setError('')
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const isEmailNotConfirmed = error.toLowerCase().includes('confirm')

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-1.5 mb-6">
            <span className="text-emerald-500 font-mono text-sm">$</span>
            <span className="text-sm font-mono font-bold text-white tracking-tight">kwint-agents</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {mode === 'forgot' ? 'Reset password' : 'Welcome'}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {mode === 'forgot' ? "We'll send you a reset link" : 'Sign in or create an account to continue'}
          </p>
        </div>

        {/* Tabs — sign in / sign up */}
        {mode !== 'forgot' && (
          <div className="flex mb-6 rounded-lg bg-neutral-900 p-1 border border-neutral-800">
            <button
              type="button"
              onClick={() => reset('signin')}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                mode === 'signin'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => reset('signup')}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                mode === 'signup'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Create account
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-neutral-800/50 bg-neutral-900/50 p-6 space-y-4">

          {/* Google OAuth */}
          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-neutral-700 bg-neutral-800/50 py-2.5 text-sm font-medium text-neutral-200 hover:bg-neutral-800 hover:border-neutral-600 transition-colors disabled:opacity-50"
              >
                {/* Google G icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {googleLoading ? 'Redirecting…' : 'Continue with Google'}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-neutral-800" />
                <span className="text-xs text-neutral-600 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-neutral-800" />
              </div>
            </>
          )}

          {/* Form */}
          <form
            onSubmit={mode === 'signin' ? handleSignIn : mode === 'signup' ? handleSignUp : handleForgotPassword}
            className="space-y-3"
          >
            {/* Email */}
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                data-testid="email-input"
                className="w-full rounded-lg border border-neutral-800/50 bg-neutral-800/30 px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>

            {/* Password */}
            {mode !== 'forgot' && (
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    data-testid="password-input"
                    className="w-full rounded-lg border border-neutral-800/50 bg-neutral-800/30 px-3 py-2.5 pr-10 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    {showPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm password — sign up only */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Confirm password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-lg border border-neutral-800/50 bg-neutral-800/30 px-3 py-2.5 pr-10 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    {showConfirm ? <EyeSlash size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="text-xs text-red-400 space-y-1">
                <p data-testid="login-error">{error}</p>
                {isEmailNotConfirmed && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    className="text-emerald-500 hover:text-emerald-400 underline underline-offset-2"
                  >
                    Resend confirmation email
                  </button>
                )}
              </div>
            )}

            {/* Info */}
            {info && (
              <p className="text-xs text-emerald-400">{info}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              data-testid="login-button"
              className="w-full rounded-lg bg-emerald-500 text-black py-2.5 text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1"
            >
              {loading
                ? '…'
                : mode === 'signin'
                  ? 'Sign in'
                  : mode === 'signup'
                    ? 'Create account'
                    : 'Send reset link'}
            </button>
          </form>
        </div>

        {/* Forgot password link */}
        {mode === 'signin' && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => reset('forgot')}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Forgot your password?
            </button>
          </div>
        )}

        {/* Back to sign in link */}
        {mode === 'forgot' && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => reset('signin')}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              ← Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
