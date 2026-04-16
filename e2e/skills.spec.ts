import { test, expect } from '@playwright/test'

/**
 * Skills marketplace smoke.
 *
 * Ensures the skills page renders and the static skill templates are listed.
 * Regressions this catches:
 *   - SKILL_TEMPLATES import crashes the page (recent MCP catalog merge
 *     broke this once when a required field was removed from some entries)
 *   - The list collapses to zero items (filter/grouping logic off)
 *   - Unhandled exceptions on mount
 */
test.describe('Skills marketplace', () => {
  test('renders the skill template grid for an authenticated user', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('/skills')
    await expect(page).toHaveURL(/\/skills$/)

    // Any skill template renders a card with at least one of the well-known
    // marketplace skill names. Pick two high-value ones so the test is
    // resilient to rename/reorder.
    const body = page.locator('body')
    await expect(body).toContainText(/Gmail|Google Drive|Notion|Slack|GitHub/i)

    expect(errors, `page errors: ${errors.join(' | ')}`).toHaveLength(0)
  })
})
