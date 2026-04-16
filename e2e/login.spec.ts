import { test, expect } from '@playwright/test'

test.describe('Login page', () => {
  test('shows login form when not authenticated', async ({ page }) => {
    await page.goto('/login')
    // Header copy is "Welcome" for signin/signup modes ("Reset password" for forgot).
    await expect(page.locator('h1')).toContainText('Welcome')
    // kwint-agents brand wordmark sits above the heading.
    await expect(page.locator('text=kwint-agents').first()).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/stats')
    await page.waitForURL('**/login**')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('email input is required (browser-level validation)', async ({ page }) => {
    await page.goto('/login')
    // The form relies on HTML5 `required` rather than disabling the submit
    // button — asserting the attribute keeps the test framework-agnostic.
    await expect(page.locator('input[type="email"]')).toHaveAttribute('required', '')
  })
})
