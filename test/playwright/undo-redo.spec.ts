import { type Page } from '@playwright/test'

import { expect, gotoAndSeedNetwork, test } from './fixtures'

// #600 e2e gap: undo/redo through the Edit menu.
// Seeds a two-node network, deletes a selected node via Edit ▸ Delete
// Selected Nodes, then walks Undo and Redo and asserts the node count
// round-trips. Selection and node-count reads go through window.CyWebApi.
//
// #857: a count is not enough — undo used to restore the topology without the
// node and edge views, so the nodes came back invisible and without positions.
// The second test reads what the renderer actually draws.

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
    viewport: {
      updateNodePositions: (
        networkId: string,
        positions: Record<string, [number, number]>,
      ) => { success: boolean }
    }
  }
}

type Rendered = {
  nodes: Record<string, [number, number]>
  edgeCount: number
  // Elements in the graph that Cytoscape.js does not draw (display: none,
  // visibility: hidden). Membership alone does not prove a redraw.
  hiddenCount: number
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

/**
 * Nodes and edges as drawn, read from the Cytoscape.js instance registered on
 * the renderer's container (the network is a canvas, there is no DOM to read).
 */
const getRendered = async (page: Page): Promise<Rendered | null> =>
  page.getByTestId('cyjs-renderer').evaluate((container) => {
    const cy = (container as HTMLElement & { _cyreg?: { cy?: any } })._cyreg?.cy
    if (cy === undefined) return null
    const nodes: Record<string, [number, number]> = {}
    cy.nodes().forEach((node: any) => {
      const { x, y } = node.position()
      nodes[node.id()] = [Math.round(x), Math.round(y)]
    })
    return {
      nodes,
      edgeCount: cy.edges().length,
      hiddenCount: cy.elements().filter((ele: any) => !ele.visible()).length,
    }
  })

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
      return api?.selection.exclusiveSelect(networkId, [firstNode], [])?.success
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

  test('undoing the deletion of every node redraws them at their original positions', async ({
    page,
  }) => {
    await gotoAndSeedNetwork(page)

    // Give the nodes distinct, known positions and wait for the renderer
    const expected = await page.evaluate(() => {
      const api = (window as unknown as CyWebApiWindow).CyWebApi
      const current = api?.workspace.getCurrentNetworkId()
      if (!current?.success || current.data === undefined) return null
      const { networkId } = current.data
      const nodeIds = api?.element.getNodeIds(networkId)?.data?.nodeIds ?? []
      const positions: Record<string, [number, number]> = {}
      nodeIds.forEach((id, i) => {
        positions[id] = [150 + 200 * i, -75 * (i + 1)]
      })
      api?.viewport.updateNodePositions(networkId, positions)
      return positions
    })
    expect(expected).not.toBeNull()
    expect(Object.keys(expected!)).toHaveLength(2)
    await expect
      .poll(() => getRendered(page), { timeout: 10000 })
      .toEqual({ nodes: expected, edgeCount: 1, hiddenCount: 0 })

    // Select every node and delete them all
    const selected = await page.evaluate((ids) => {
      const api = (window as unknown as CyWebApiWindow).CyWebApi
      const current = api?.workspace.getCurrentNetworkId()
      if (!current?.success || current.data === undefined) return false
      return api?.selection.exclusiveSelect(current.data.networkId, ids, [])
        ?.success
    }, Object.keys(expected!))
    expect(selected).toBe(true)

    await clickEditMenuItem(page, /^Delete Selected Nodes/)
    await expect.poll(() => getNodeCount(page), { timeout: 10000 }).toBe(0)
    await expect
      .poll(() => getRendered(page), { timeout: 10000 })
      .toEqual({ nodes: {}, edgeCount: 0, hiddenCount: 0 })

    // Undo draws both nodes and their edge again, where they were
    await clickEditMenuItem(page, /^Undo - /)
    await expect
      .poll(() => getRendered(page), { timeout: 10000 })
      .toEqual({ nodes: expected, edgeCount: 1, hiddenCount: 0 })
  })
})
