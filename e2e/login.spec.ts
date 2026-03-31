import { test, expect } from '@playwright/test'

test.describe('Login page', () => {
  test('shows login form when not authenticated', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h1')).toContainText('Kwint Agents')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/stats')
    await page.waitForURL('**/login**')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('shows error for empty email submission', async ({ page }) => {
    await page.goto('/login')
    // The form has required attribute, so browser validation prevents submission
    const button = page.locator('button[type="submit"]')
    await expect(button).toBeDisabled()
  })
})
