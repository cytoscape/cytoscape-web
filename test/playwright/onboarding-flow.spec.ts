import { expect, gotoAndWaitReady, test } from './fixtures'

/**
 * Onboarding first-run and relaunch behavior.
 *
 * Network-only tour steps auto-advance when their target is absent (see
 * TourRunner's TARGET_NOT_FOUND handling), so the tour flows end-to-end even in
 * an empty workspace with no network loaded.
 *
 * Every navigation goes through gotoAndWaitReady so the app is fully hydrated
 * before we assert. That matters most for the negative assertions: a bare
 * `toBeHidden()` passes trivially while React has not mounted yet, so without
 * the ready wait those checks could pass for the wrong reason.
 */

const WELCOME = '[data-testid="onboarding-welcome-dialog"]'
const TAKE_A_TOUR = '[data-testid="help-take-a-tour"]'
/** First step of the getting-started tour, keyed on its anchor not its prose. */
const FIRST_STEP = '[data-testid="tour-step-toolbar"]'

test.describe('first-run onboarding', () => {
  test.use({ onboarding: true })

  test('shows the welcome dialog on first load and launches the tour', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)

    await expect(page.locator(WELCOME)).toBeVisible({ timeout: 15000 })

    await page.locator('[data-testid="onboarding-welcome-start-tour"]').click()

    // First tour step spotlights the toolbar.
    await expect(page.locator(FIRST_STEP)).toBeVisible({ timeout: 10000 })

    // Welcome is marked seen — it must not reappear on a fresh load. A second
    // navigation rather than page.reload() so the ready wait applies again.
    await gotoAndWaitReady(page)
    await expect(page.locator(WELCOME)).toBeHidden()
  })

  test('“Explore on my own” dismisses without starting a tour', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)
    await expect(page.locator(WELCOME)).toBeVisible({ timeout: 15000 })
    await page.locator('[data-testid="onboarding-welcome-skip"]').click()
    await expect(page.locator(WELCOME)).toBeHidden()
    await expect(page.locator(FIRST_STEP)).toBeHidden()
  })
})

test.describe('relaunch from Help menu', () => {
  // Default fixture suppresses first-run, so we start with no welcome modal.
  test('Help → Take a tour starts the guided tour', async ({ page }) => {
    await gotoAndWaitReady(page)
    await expect(page.locator(WELCOME)).toBeHidden()

    await page.locator('[data-testid="toolbar-help-menu-menu-button"]').click()
    await page.locator(TAKE_A_TOUR).click()

    await expect(page.locator(FIRST_STEP)).toBeVisible({ timeout: 10000 })
  })
})
