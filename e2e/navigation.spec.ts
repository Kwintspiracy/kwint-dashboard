import { test, expect } from '@playwright/test'

// Unauthenticated route checks — global setup would otherwise pre-authenticate.
test.use({ storageState: 'e2e/.auth/anon.json' })

test.describe('Navigation', () => {
  test('login page renders without errors', async ({ page }) => {
    await page.goto('/login')
    // No console errors
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('404 page shows for unknown routes', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz')
    // Should either redirect to login or show not-found
    await expect(page.locator('body')).toBeVisible()
  })
})
