import { Page } from '@playwright/test'
import path from 'path'

import {
  expect,
  getWorkspaceNetworkCount,
  gotoAndWaitReady,
  test,
} from './fixtures'

// #600 e2e gap: local CX2 file import.
// Drives Data ▸ Import ▸ Network from File... end to end with a fixture file
// and asserts the network lands in the workspace (via window.CyWebApi) and
// its name is shown in the UI.

const CX2_FIXTURE = path.resolve(
  __dirname,
  '../fixtures/cx2/valid/small-network.valid.cx2',
)

// Node and edge counts of the only workspace network, via window.CyWebApi.
const getElementCounts = async (
  page: Page,
): Promise<{ nodes: number; edges: number }> =>
  page.evaluate(() => {
    const api = (window as any).CyWebApi
    const ids = api?.workspace.getNetworkIds()
    const networkId = ids?.success ? ids.data.networkIds[0] : undefined
    if (networkId === undefined) return { nodes: -1, edges: -1 }
    const nodes = api.element.getNodeIds(networkId)
    const edges = api.element.getEdgeIds(networkId)
    return {
      nodes: nodes.success ? nodes.data.nodeIds.length : -1,
      edges: edges.success ? edges.data.edgeIds.length : -1,
    }
  })

test.describe('Local Network File Import', () => {
  test('imports a CX2 file through the Data menu', async ({ page }) => {
    await gotoAndWaitReady(page)
    expect(await getWorkspaceNetworkCount(page)).toBe(0)

    // Open Data ▸ Import ▸ Network from File...
    // Activate the TieredMenu submenu with a click, then wait for the child
    // item to be fully visible before clicking it (avoids racing the open
    // animation).
    await page.locator('[data-testid="toolbar-data-menu-menu-button"]').click()
    await page.getByRole('menuitem', { name: 'Import' }).click()
    const fromFileItem = page.getByRole('menuitem', {
      name: 'Network from File...',
    })
    await expect(fromFileItem).toBeVisible()
    await fromFileItem.click()
    await expect(
      page.locator('[data-testid="file-upload-dropzone"]'),
    ).toBeVisible()

    // Provide the CX2 fixture to the dropzone's file input
    await page
      .locator('[data-testid="file-upload-dropzone"] input[type="file"]')
      .setInputFiles(CX2_FIXTURE)

    // The network (20 nodes / 30 edges, named in its networkAttributes)
    // is imported into the workspace
    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 15000 })
      .toBe(1)
    await expect(page.getByText('Test Network 20 nodes').first()).toBeVisible({
      timeout: 15000,
    })
    // #830 regression: every aspect is read, not only those before the last.
    expect(await getElementCounts(page)).toEqual({ nodes: 20, edges: 30 })

    // #665 regression: the view itself must render. The import races the
    // debounced IndexedDB persist, and losing that race used to replace the
    // renderer with "Failed to load network data: Local network ... is not
    // found in cache" until a manual reload.
    await expect(
      page.locator('[data-testid="cyjs-renderer"] canvas').first(),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Failed to load network data')).toHaveCount(0)
  })
})
