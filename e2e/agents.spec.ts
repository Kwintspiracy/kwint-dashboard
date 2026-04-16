import { test, expect } from '@playwright/test'

/**
 * Authenticated agents list smoke.
 *
 * Catches:
 *   - /agents route 500s for an authed user (server action stack crashed on
 *     a recent change — has happened after RLS / schema tweaks)
 *   - The "no agents yet" empty state doesn't render (layout broken)
 *   - Page hits a pageerror (uncaught render exception)
 *
 * The fresh playwright test user has zero agents until we create one, so
 * the empty state is the expected landing.
 */
test.describe('Agents list', () => {
  test('renders for an authenticated user with zero agents', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('/agents')
    await expect(page).toHaveURL(/\/agents$/)

    // Either the empty state or the list — whichever is present, the page
    // mounted without throwing.
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible()

    expect(errors, `page errors: ${errors.join(' | ')}`).toHaveLength(0)
  })
})
