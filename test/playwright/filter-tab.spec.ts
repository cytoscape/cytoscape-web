import type { Page } from '@playwright/test'

import { expect, gotoAndWaitReady, test } from './fixtures'

// The FILTER tab end to end: build a condition through the editor, apply it
// in select and show mode, and read the filter back after a reload. Unit
// tests cover the evaluation and the store; this covers the wiring between
// the tab, the stores, the renderer's selection and the database.
// See docs/specifications/FILTER_SPECIFICATION.md.

type ApiWindow = { CyWebApi?: any }

const seedNetwork = async (page: Page): Promise<string> => {
  const networkId = await page.evaluate(() => {
    const api = (window as unknown as ApiWindow).CyWebApi
    api.network.createNetworkFromEdgeList({
      name: 'Filter tab network',
      edgeList: [
        ['alpha', 'beta'],
        ['beta', 'gamma'],
        ['gamma', 'delta'],
      ],
      addToWorkspace: true,
    })
    return api.workspace.getCurrentNetworkId().data.networkId as string
  })
  expect(networkId).toBeTruthy()
  return networkId
}

const selectedNodeNames = (page: Page, networkId: string) =>
  page.evaluate((id) => {
    const api = (window as unknown as ApiWindow).CyWebApi
    const nodeIds: string[] = api.selection.getSelection(id).data.selectedNodes
    const rows: { id: string; name: string }[] = api.table.getTable(id, 'node')
      .data.rows
    return rows
      .filter((row) => nodeIds.includes(String(row.id)))
      .map((row) => row.name)
      .sort()
  }, networkId)

const hiddenNodeCount = (page: Page, networkId: string) =>
  page.evaluate((id) => {
    const api = (window as unknown as ApiWindow).CyWebApi
    const result = api.visualStyle.getBypasses(id, 'nodeVisibility')
    return Object.keys(result.data.bypasses).length
  }, networkId)

const pickOption = async (
  page: Page,
  testId: string,
  option: string,
): Promise<void> => {
  // MUI Select: the visible combobox sits next to the hidden input
  await page
    .locator(`[data-testid="${testId}"]`)
    .locator('xpath=..')
    .getByRole('combobox')
    .click()
  await page.getByRole('option', { name: option }).click()
}

test.describe('FILTER tab', () => {
  test('selects and shows the nodes a column condition accepts', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)
    const networkId = await seedNetwork(page)

    await page
      .locator('[data-testid="network-browser-panel-filter-tab"]')
      .click()
    await expect(page.locator('[data-testid="filter-tab"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-select"]')).toHaveValue(
      /.+/,
    )

    await page.locator('[data-testid="filter-condition-root-add"]').click()
    await page
      .locator('[data-testid="filter-condition-root-add-column"]')
      .click()
    await pickOption(page, 'filter-condition-0-column', 'Node: name')
    await page.locator('[data-testid="filter-condition-0-text"]').fill('ta')

    // "Apply when filter changes" is on for a small network
    await expect
      .poll(() => selectedNodeNames(page, networkId))
      .toEqual(['beta', 'delta'])
    await expect(page.locator('[data-testid="filter-status"]')).toHaveText(
      /^Selected 2 nodes and 0 edges/,
    )

    await page
      .locator('[data-testid="filter-display-mode-show"]')
      .locator('input')
      .check()
    await expect.poll(() => hiddenNodeCount(page, networkId)).toBe(2)
    await expect(page.locator('[data-testid="filter-status"]')).toHaveText(
      /^Showing 2 nodes and 3 edges/,
    )

    // Back to select: everything is shown again
    await page
      .locator('[data-testid="filter-display-mode-select"]')
      .locator('input')
      .check()
    await expect.poll(() => hiddenNodeCount(page, networkId)).toBe(0)
  })

  test('keeps filters across a reload', async ({ page }) => {
    await gotoAndWaitReady(page)
    await seedNetwork(page)

    await page
      .locator('[data-testid="network-browser-panel-filter-tab"]')
      .click()
    await page.locator('[data-testid="filter-options-button"]').click()
    await page.locator('[data-testid="filter-new-menu-item"]').click()
    await page.locator('[data-testid="filter-name-input"]').fill('Hubs')
    await page.locator('[data-testid="filter-name-confirm-button"]').click()
    await page.locator('[data-testid="filter-condition-root-add"]').click()
    await page
      .locator('[data-testid="filter-condition-root-add-degree"]')
      .click()
    await expect(
      page.locator('[data-testid="filter-condition-0-row"]'),
    ).toBeVisible()

    // Writes are coalesced; let the last one land before reloading
    await page.waitForTimeout(1000)
    await page.reload()
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({
      timeout: 30_000,
    })
    await page
      .locator('[data-testid="network-browser-panel-filter-tab"]')
      .click()
    await pickOption(page, 'filter-select', 'Hubs')

    await expect(
      page.locator('[data-testid="filter-condition-0-edge-type"]'),
    ).toHaveValue('ANY')
  })
})
