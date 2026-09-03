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

  test('menu lists every action in order, with a divider before Remove', async ({
    page,
  }) => {
    await page
      .locator('[data-testid="network-property-menu-button"]')
      .first()
      .click()

    const menu = page.getByRole('menu')
    await expect(menu.getByRole('menuitem')).toHaveText([
      /Save a Copy to NDEx/,
      /Edit Network Properties/,
      /Open Network in Cytoscape Desktop/,
      /Duplicate Network/,
      /Download Network File \(\.cx2\)/,
      /Export Network to Image/,
      /Share Network \(Copy URL to Clipboard\)/,
      /Remove the Network from Workspace/,
    ])

    // The divider separates Share (7th item) from Remove (8th).
    await expect(menu.locator('hr')).toHaveCount(1)
  })

  test('actions are enabled for the open network, except sharing a local one', async ({
    page,
  }) => {
    await page
      .locator('[data-testid="network-property-menu-button"]')
      .first()
      .click()

    // The seeded network is the open one, so the actions act on loaded data.
    for (const enabled of [
      'network-duplicate-menuitem',
      'network-download-cx2-menuitem',
      'network-export-image-menuitem',
    ]) {
      await expect(
        page.locator(`[data-testid="${enabled}"]`),
      ).not.toHaveAttribute('aria-disabled', 'true')
    }

    // A seeded network is local, so it has no NDEx URL to share yet.
    const share = page.locator('[data-testid="network-share-url-menuitem"]')
    await expect(share).toHaveAttribute('aria-disabled', 'true')
    await expect(share).toContainText('Save this network to NDEx first')
  })

  test('duplicate action adds a second row to the workspace', async ({
    page,
  }) => {
    const rows = page.locator('[data-testid="network-property-menu-button"]')
    await expect(rows).toHaveCount(1)

    await rows.first().click()
    await page.locator('[data-testid="network-duplicate-menuitem"]').click()

    await expect(rows).toHaveCount(2)
  })

  test('export action opens the image export dialog', async ({ page }) => {
    await page
      .locator('[data-testid="network-property-menu-button"]')
      .first()
      .click()
    await page.locator('[data-testid="network-export-image-menuitem"]').click()

    const dialog = page.locator(
      '[data-testid="export-network-to-image-dialog"]',
    )
    await expect(dialog).toBeVisible()
    await page
      .locator('[data-testid="export-network-to-image-cancel-button"]')
      .click()
    await expect(dialog).toHaveCount(0)
  })

  test('actions are disabled on a row that is not the open network', async ({
    page,
  }) => {
    // Duplicating switches the workspace to the copy, leaving the original row
    // in the list without being the open network.
    const rows = page.locator('[data-testid="network-property-menu-button"]')
    await rows.first().click()
    await page.locator('[data-testid="network-duplicate-menuitem"]').click()
    await expect(rows).toHaveCount(2)

    // Find the row whose actions are gated, i.e. the one that is not current.
    const menuButtons = await rows.all()
    let foundGatedRow = false
    for (const button of menuButtons) {
      await button.click()
      const duplicate = page.locator(
        '[data-testid="network-duplicate-menuitem"]',
      )
      const isDisabled =
        (await duplicate.getAttribute('aria-disabled')) === 'true'
      if (isDisabled) {
        foundGatedRow = true
        for (const gated of [
          'network-open-in-cytoscape-menuitem',
          'network-duplicate-menuitem',
          'network-download-cx2-menuitem',
          'network-export-image-menuitem',
          'network-share-url-menuitem',
        ]) {
          await expect(
            page.locator(`[data-testid="${gated}"]`),
          ).toHaveAttribute('aria-disabled', 'true')
        }
        // Share names its own blocker; the rest point at the open network.
        await expect(
          page.locator('[data-testid="network-duplicate-menuitem"]'),
        ).toContainText('Open this network first')
      }
      await page.keyboard.press('Escape')
      await expect(page.getByRole('menu')).toHaveCount(0)
      if (foundGatedRow) break
    }
    expect(foundGatedRow).toBe(true)
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

  test('overflow button is badged after an app API table write', async ({
    page,
  }) => {
    // #680: nothing in src/app-api/ set the networkModified flag, so a column
    // added by an app left the network looking saved — Save Workspace skipped
    // it and the Save to NDEx entry stayed disabled. The badge is the same
    // flag, so it is the cheapest end-to-end assertion that the write marks.
    const badge = page.locator('[data-testid="network-unsaved-badge"]').first()

    await expect(badge).not.toBeVisible()

    // The initial layout clears the flag on completion; a write before that
    // lands would be wiped by the reset.
    await waitForInitialLayout(page)

    const result = await page.evaluate(() => {
      const api = (
        window as unknown as {
          CyWebApi: {
            workspace: {
              getCurrentNetworkId: () => { data?: { networkId?: string } }
            }
            table: {
              createColumn: (
                networkId: string,
                tableType: 'node' | 'edge',
                columnName: string,
                dataType: string,
                defaultValue: unknown,
              ) => { success: boolean; error?: { message: string } }
            }
          }
        }
      ).CyWebApi
      const networkId =
        api.workspace.getCurrentNetworkId().data?.networkId ?? ''
      return api.table.createColumn(
        networkId,
        'node',
        'appColumn',
        'string',
        'x',
      )
    })

    expect(result.success).toBe(true)
    await expect(badge).toBeVisible()
  })
})
