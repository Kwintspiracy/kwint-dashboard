import { test, expect } from '@playwright/test'

/**
 * Authenticated Configurator smoke.
 *
 * Catches the class of Configurator regressions that have hit prod most often:
 *   1. Page throws on mount (missing provider, server action crash, stale import)
 *   2. Sidebar doesn't render (layout split broken)
 *   3. Input / send button missing (form binding regression)
 *
 * Does NOT exercise the LLM round-trip — that would require the AgentOne
 * runner live in e2e, which is out of scope for now. The server-side tool
 * wiring is covered by `src/lib/configurator/tools.test.ts` (unit).
 */
test.describe('Agents > Configurator', () => {
  test('renders chat + sidebar for an authenticated user', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('/agents/configurator')
    // We must land on the configurator, not be bounced to /login.
    await expect(page).toHaveURL(/\/agents\/configurator$/)

    // Chat input must be present.
    const input = page.locator('textarea, input[type="text"]').first()
    await expect(input).toBeVisible()

    // Sidebar preview panel is there — its empty state says so explicitly.
    const sidebarHeading = page.getByText(/Agent Preview|Preview/i).first()
    await expect(sidebarHeading).toBeVisible()

    // No uncaught render errors bubbled to the page.
    expect(errors, `page errors: ${errors.join(' | ')}`).toHaveLength(0)
  })
})
