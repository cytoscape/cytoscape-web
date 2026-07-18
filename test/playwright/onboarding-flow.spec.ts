import { expect, test } from './fixtures'

/**
 * Onboarding first-run and relaunch behavior.
 *
 * Network-only tour steps auto-advance when their target is absent (see
 * TourRunner's TARGET_NOT_FOUND handling), so the tour flows end-to-end even in
 * an empty workspace with no network loaded.
 */

const APP_SHELL = '[data-testid="app-shell"]'
const WELCOME = '[data-testid="onboarding-welcome-dialog"]'

test.describe('first-run onboarding', () => {
  test.use({ onboarding: true })

  test('shows the welcome dialog on first load and launches the tour', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator(APP_SHELL)).toBeVisible({ timeout: 15000 })

    await expect(page.locator(WELCOME)).toBeVisible({ timeout: 15000 })

    await page.locator('[data-testid="onboarding-welcome-start-tour"]').click()

    // First tour step spotlights the toolbar.
    await expect(page.getByText('The toolbar')).toBeVisible({ timeout: 10000 })

    // Welcome is marked seen — it must not reappear after a reload.
    await page.reload()
    await expect(page.locator(APP_SHELL)).toBeVisible({ timeout: 15000 })
    await expect(page.locator(WELCOME)).toBeHidden()
  })

  test('“Explore on my own” dismisses without starting a tour', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator(WELCOME)).toBeVisible({ timeout: 15000 })
    await page.locator('[data-testid="onboarding-welcome-skip"]').click()
    await expect(page.locator(WELCOME)).toBeHidden()
    await expect(page.getByText('The toolbar')).toBeHidden()
  })
})

test.describe('relaunch from Help menu', () => {
  // Default fixture suppresses first-run, so we start with no welcome modal.
  test('Help → Take a tour starts the guided tour', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(APP_SHELL)).toBeVisible({ timeout: 15000 })
    await expect(page.locator(WELCOME)).toBeHidden()

    await page.locator('[data-testid="toolbar-help-menu-menu-button"]').click()
    await page.getByText('Take a tour').click()

    await expect(page.getByText('The toolbar')).toBeVisible({ timeout: 10000 })
  })
})
