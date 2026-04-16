import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

// Detect whether the smoke/e2e env is wired — when it is, the suite runs
// with a real local Supabase and the authenticated specs can use the
// shared user.json storage state. When it's not, we skip globalSetup
// (which requires admin credentials) and authenticated specs will fail
// fast with a clear error pointing to the setup steps.
const hasAuthEnv = !!(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  globalSetup: hasAuthEnv ? require.resolve('./e2e/global-setup') : undefined,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Default to authenticated state. Specs that need an anonymous page
    // override with `test.use({ storageState: 'e2e/.auth/anon.json' })`.
    storageState: hasAuthEnv ? path.resolve('./e2e/.auth/user.json') : undefined,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Forward Supabase env to the Next.js prod server started by Playwright.
      // Without these the server boots with placeholder keys and auth fails
      // silently at runtime — you'd get 401s instead of a real sign-in.
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    },
  },
})
