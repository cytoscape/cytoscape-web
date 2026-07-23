import { type Page } from '@playwright/test'

import { expect, gotoAndSeedNetwork, test } from './fixtures'

// #600 e2e gap: undo/redo through the Edit menu.
// Seeds a two-node network, deletes a selected node via Edit ▸ Delete
// Selected Nodes, then walks Undo and Redo and asserts the node count
// round-trips. Selection and node-count reads go through window.CyWebApi.

type CyWebApiWindow = {
  CyWebApi?: {
    workspace: {
      getCurrentNetworkId: () => {
        success: boolean
        data?: { networkId: string }
      }
    }
    element: {
      getNodeIds: (networkId: string) => {
        success: boolean
        data?: { nodeIds: string[] }
      }
    }
    selection: {
      exclusiveSelect: (
        networkId: string,
        nodeIds: string[],
        edgeIds: string[],
      ) => { success: boolean }
    }
  }
}

const getNodeCount = async (page: Page): Promise<number> =>
  page.evaluate(() => {
    const api = (window as unknown as CyWebApiWindow).CyWebApi
    const current = api?.workspace.getCurrentNetworkId()
    if (!current?.success || current.data === undefined) return -1
    const nodes = api?.element.getNodeIds(current.data.networkId)
    return nodes?.success ? (nodes.data?.nodeIds.length ?? -1) : -1
  })

const clickEditMenuItem = async (page: Page, name: RegExp): Promise<void> => {
  await page.locator('[data-testid="toolbar-edit-menu-menu-button"]').click()
  const item = page.getByRole('menuitem', { name })
  await expect(item).toBeVisible()
  await item.click()
  // The MUI menu (and its pointer-blocking backdrop) does not always close
  // on item click; dismiss it so the next menu interaction is not blocked.
  await page.keyboard.press('Escape')
  await expect(item).not.toBeVisible()
}

test.describe('Undo and Redo', () => {
  test('node deletion is undone and redone through the Edit menu', async ({
    page,
  }) => {
    await gotoAndSeedNetwork(page)
    expect(await getNodeCount(page)).toBe(2)

    // Select one node via the public selection API
    const selected = await page.evaluate(() => {
      const api = (window as unknown as CyWebApiWindow).CyWebApi
      const current = api?.workspace.getCurrentNetworkId()
      if (!current?.success || current.data === undefined) return false
      const { networkId } = current.data
      const nodes = api?.element.getNodeIds(networkId)
      const firstNode = nodes?.data?.nodeIds[0]
      if (firstNode === undefined) return false
      return api?.selection.exclusiveSelect(networkId, [firstNode], [])
        ?.success
    })
    expect(selected).toBe(true)

    // Edit ▸ Delete Selected Nodes removes the node (and its edge)
    await clickEditMenuItem(page, /^Delete Selected Nodes/)
    await expect.poll(() => getNodeCount(page), { timeout: 10000 }).toBe(1)

    // Edit ▸ Undo restores it
    await clickEditMenuItem(page, /^Undo - /)
    await expect.poll(() => getNodeCount(page), { timeout: 10000 }).toBe(2)

    // Edit ▸ Redo deletes it again
    await clickEditMenuItem(page, /^Redo - /)
    await expect.poll(() => getNodeCount(page), { timeout: 10000 }).toBe(1)
  })
})
