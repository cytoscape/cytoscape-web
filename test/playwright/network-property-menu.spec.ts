import { expect, gotoAndSeedNetwork, test } from './fixtures'

/** This test suite tests the new overflow menu for the network property panels. */

test.describe('Network summary overflow menu', () => {
  test.beforeEach(async ({ page }) => {
    // The summary panel only renders a row when the workspace has a network.
    await gotoAndSeedNetwork(page)
  })

  test('row shows one overflow button and none of the old buttons', async ({
    page,
  }) => {
    await expect(
      page.locator('[data-testid="network-property-menu-button"]').first(),
    ).toBeVisible()

    for (const removed of [
      'network-save-status-button',
      'network-property-edit-button',
      'network-property-delete-button',
    ]) {
      await expect(page.locator(`[data-testid="${removed}"]`)).toHaveCount(0)
    }
  })

  test('overflow menu holds the save, edit and delete actions', async ({
    page,
  }) => {
    await page
      .locator('[data-testid="network-property-menu-button"]')
      .first()
      .click()

    await expect(
      page.locator('[data-testid="network-save-status-menuitem"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="network-property-edit-menuitem"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="network-property-delete-menuitem"]'),
    ).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(
      page.locator('[data-testid="network-property-delete-menuitem"]'),
    ).toHaveCount(0)
  })

  test('edit action opens the network property editor', async ({ page }) => {
    await page
      .locator('[data-testid="network-property-menu-button"]')
      .first()
      .click()
    await page.locator('[data-testid="network-property-edit-menuitem"]').click()

    await expect(
      page.locator('[data-testid="network-property-editor-name-input"]'),
    ).toBeVisible()
    await page
      .locator('[data-testid="network-property-editor-cancel-button"]')
      .click()
  })

  test('delete action opens the removal confirmation dialog', async ({
    page,
  }) => {
    await page
      .locator('[data-testid="network-property-menu-button"]')
      .first()
      .click()
    await page
      .locator('[data-testid="network-property-delete-menuitem"]')
      .click()

    const dialog = page.locator('[data-testid="confirmation-dialog"]')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Remove Network From Workspace')

    await page.locator('[data-testid="confirmation-dialog-cancel"]').click()
    await expect(dialog).toHaveCount(0)
  })
})
