/**
 * Playwright global setup.
 *
 * Provisions a test user + entity in the local Supabase stack, logs them
 * in once via the real login form, and saves the resulting browser storage
 * state so every authenticated test can reuse the session without redoing
 * the full login round-trip.
 *
 * Scenarios that specifically need an UNauthenticated page (login.spec.ts)
 * override `use.storageState` to `'e2e/.auth/anon.json'` (an empty state
 * we also persist below) — otherwise the default storage gives them a
 * session and breaks the redirect assertions.
 */
import { chromium, type FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'
import path from 'node:path'

const AUTH_DIR = path.resolve(__dirname, '.auth')
const USER_STATE = path.join(AUTH_DIR, 'user.json')
const ANON_STATE = path.join(AUTH_DIR, 'anon.json')

const TEST_EMAIL = 'playwright-e2e@kwint.test'
const TEST_PASSWORD = 'playwright-e2e-password-42'

export default async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      '[e2e:global-setup] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. ' +
      'Export from `supabase status -o env` before running `npm run e2e`.'
    )
  }

  await fs.mkdir(AUTH_DIR, { recursive: true })

  // Empty storage state for unauthenticated specs.
  await fs.writeFile(ANON_STATE, JSON.stringify({ cookies: [], origins: [] }, null, 2))

  // 1. Provision the test user + entity via the admin API.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let userId: string | null = null
  const list = await admin.auth.admin.listUsers()
  const existing = list.data.users.find(u => u.email === TEST_EMAIL)
  if (existing) {
    userId = existing.id
    // Re-set the password every run so a stale user doesn't break login.
    // Also confirm the email in case a previous run left it pending.
    await admin.auth.admin.updateUserById(userId, {
      password: TEST_PASSWORD,
      email_confirm: true,
    })
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error) throw new Error(`[e2e:global-setup] createUser failed: ${error.message}`)
    userId = data.user.id
  }

  if (!userId) throw new Error('[e2e:global-setup] failed to resolve test user id')

  // Ensure the user has at least one entity — every protected route expects one.
  const { data: entities } = await admin.from('entities').select('id').eq('user_id', userId)
  if (!entities || entities.length === 0) {
    const { error } = await admin.from('entities').insert({
      user_id: userId,
      name: 'Playwright E2E',
      slug: `e2e-${userId.slice(0, 8)}`,
    })
    if (error) throw new Error(`[e2e:global-setup] entity insert failed: ${error.message}`)
  }

  // 2. Log in via the real UI once and save the storage state.
  const browser = await chromium.launch()
  try {
    const ctx = await browser.newContext({ baseURL })
    const page = await ctx.newPage()
    page.on('pageerror', err => console.error('[e2e:global-setup] pageerror:', err.message))
    page.on('console', msg => {
      if (msg.type() === 'error') console.error('[e2e:browser]', msg.text())
    })
    page.on('requestfailed', req => {
      console.error('[e2e:requestfailed]', req.url(), req.failure()?.errorText)
    })
    page.on('response', async res => {
      if (res.url().includes('/auth/v1/token') && !res.ok()) {
        const body = await res.text().catch(() => '<unreadable>')
        console.error('[e2e:auth response]', res.status(), body.slice(0, 300))
      }
    })

    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('[data-testid="login-button"]')
    // Wait for either a successful redirect OR an error toast — the former is
    // expected, the latter produces a diagnostic instead of a silent timeout.
    const outcome = await Promise.race([
      page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
        .then(() => 'redirected'),
      page.waitForSelector('text=/Invalid email or password|confirm your email/i', { timeout: 30_000 })
        .then(() => 'auth_error'),
    ]).catch(() => 'timeout')

    if (outcome !== 'redirected') {
      const bodyText = await page.locator('body').innerText().catch(() => '<unreadable>')
      throw new Error(`[e2e:global-setup] login did not redirect (${outcome}). Body: ${bodyText.slice(0, 400)}`)
    }

    await ctx.storageState({ path: USER_STATE })
    await ctx.close()
  } finally {
    await browser.close()
  }
}
