import { expect, test } from './fixtures'

test.describe('Cookie Consent', () => {
  test.beforeEach(async ({ context }) => {
    // Clear cookies so consent banner always appears
    await context.clearCookies()
  })

  test('consent banner is visible on fresh load', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="cookie-consent"]')).toBeVisible({
      timeout: 10000,
    })
  })

  test('accepting consent removes the banner', async ({ page }) => {
    await page.goto('/')
    const banner = page.locator('[data-testid="cookie-consent"]')
    await expect(banner).toBeVisible({ timeout: 10000 })

    await page.locator('[data-testid="cookie-consent"] button:has-text("Accept")').click()

    await expect(banner).not.toBeVisible()
  })

  test('consent preference persists across reload', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.locator('[data-testid="cookie-consent"]'),
    ).toBeVisible({ timeout: 10000 })

    await page.locator('[data-testid="cookie-consent"] button:has-text("Accept")').click()
    await expect(page.locator('[data-testid="cookie-consent"]')).not.toBeVisible()

    await page.reload()
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({
      timeout: 15000,
    })
    // Banner must not reappear after acceptance
    await expect(page.locator('[data-testid="cookie-consent"]')).not.toBeVisible()
  })
})
