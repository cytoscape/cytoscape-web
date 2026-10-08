import { expect, test } from './fixtures'

test.describe('App Shell', () => {
  test('app loads and main shell is visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({
      timeout: 15000,
    })
  })

  test('toolbar is rendered inside the shell', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({
      timeout: 15000,
    })
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible()
  })

  test('cookie consent banner appears on first load', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="cookie-consent"]')).toBeVisible({
      timeout: 10000,
    })
  })
})
