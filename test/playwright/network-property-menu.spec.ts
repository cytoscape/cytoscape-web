import type { Page } from '@playwright/test'

import { expect, gotoAndSeedNetwork, test } from './fixtures'

/**
 * A seeded network carries no stored layout, so WorkspaceEditor applies the
 * default layout when the network loads and, on completion, marks the summary
 * `hasLayout` and clears the network's modified flag. That reset must land
 * before a test edits the network, or it wipes the unsaved state under test.
 *
 * `hasLayout` in the persisted summary is the observable side of that same
 * completion, so wait on it. The wait is best-effort: a network whose layout
 * already ran (or never runs) simply proceeds.
 */
const waitForInitialLayout = async (page: Page): Promise<void> => {
  await page
    .waitForFunction(
      async () => {
        const currentId = (
          window as unknown as {
            CyWebApi: {
              workspace: {
                getCurrentNetworkId: () => {
                  data?: { networkId?: string }
                }
              }
            }
          }
        ).CyWebApi.workspace.getCurrentNetworkId().data?.networkId
        if (currentId === undefined || currentId === '') {
          return false
        }
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('cyweb-db')
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        const summary = await new Promise<{ hasLayout?: boolean } | undefined>(
          (resolve) => {
            const request = db
              .transaction('summaries', 'readonly')
              .objectStore('summaries')
              .get(currentId)
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => resolve(undefined)
          },
        )
        db.close()
        return summary?.hasLayout === true
      },
      undefined,
      { timeout: 10000 },
    )
    .catch(() => undefined)
}

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

  test('overflow button is badged only while the network has unsaved changes', async ({
    page,
  }) => {
    // The badge span is always mounted; MUI collapses it to a zero-sized box
    // (transform: scale(0)) when invisible, which Playwright reports as hidden.
    const badge = page.locator('[data-testid="network-unsaved-badge"]').first()
    const menuButton = page
      .locator('[data-testid="network-property-menu-button"]')
      .first()

    await expect(badge).not.toBeVisible()

    await waitForInitialLayout(page)

    // Renaming the network through the property editor marks it as modified.
    await menuButton.click()
    await page.locator('[data-testid="network-property-edit-menuitem"]').click()
    await page
      .locator('[data-testid="network-property-editor-name-input"]')
      .locator('input')
      .fill('Renamed Network')
    await page
      .locator('[data-testid="network-property-editor-confirm-button"]')
      .click()

    await expect(badge).toBeVisible()
  })
})
