import { type Page } from '@playwright/test'

import { expect, gotoAndSeedNetwork, test } from './fixtures'

// Self-loop creation through the node context menu: right-click a node,
// pick "Create Edge from this Node", then left-click the same node. The
// renderer used to drop that second click, so no edge was created.

type CyWebApiWindow = {
  CyWebApi?: {
    workspace: {
      getCurrentNetworkId: () => {
        success: boolean
        data?: { networkId: string }
      }
    }
    element: {
      getEdgeIds: (networkId: string) => {
        success: boolean
        data?: { edgeIds: string[] }
      }
      getEdge: (
        networkId: string,
        edgeId: string,
      ) => {
        success: boolean
        data?: { sourceId: string; targetId: string }
      }
    }
  }
}

const getCurrentNetworkId = async (page: Page): Promise<string> =>
  page.evaluate(() => {
    const api = (window as unknown as CyWebApiWindow).CyWebApi
    const current = api?.workspace.getCurrentNetworkId()
    return current?.success ? (current.data?.networkId ?? '') : ''
  })

const getEdgeIds = async (page: Page, networkId: string): Promise<string[]> =>
  page.evaluate((id) => {
    const api = (window as unknown as CyWebApiWindow).CyWebApi
    const result = api?.element.getEdgeIds(id)
    return result?.success ? (result.data?.edgeIds ?? []) : []
  }, networkId)

const getEdgeEndpoints = async (
  page: Page,
  networkId: string,
  edgeId: string,
): Promise<{ sourceId: string; targetId: string } | null> =>
  page.evaluate(
    ([id, edge]) => {
      const api = (window as unknown as CyWebApiWindow).CyWebApi
      const result = api?.element.getEdge(id, edge)
      return result?.success ? (result.data ?? null) : null
    },
    [networkId, edgeId],
  )

/**
 * Screen coordinates of the first rendered node, read from the Cytoscape.js
 * instance registered on the renderer's container element. The network is
 * drawn on a canvas, so there is no DOM element to click on instead. The view
 * is fitted first: a seeded network is not laid out, so its nodes can sit
 * outside the visible viewport.
 */
const firstNodeScreenPosition = async (
  page: Page,
): Promise<{ x: number; y: number } | null> =>
  page.evaluate(() => {
    const container = document.getElementById('cy-container') as
      | (HTMLElement & { _cyreg?: { cy?: any } })
      | null
    const cy = container?._cyreg?.cy
    if (container == null || cy === undefined || cy.nodes().length === 0) {
      return null
    }
    cy.fit(undefined, 100)
    const rendered = cy.nodes()[0].renderedPosition()
    const rect = container.getBoundingClientRect()
    const x = rect.left + rendered.x
    const y = rect.top + rendered.y
    const onScreen =
      rendered.x > 0 &&
      rendered.y > 0 &&
      rendered.x < rect.width &&
      rendered.y < rect.height
    return onScreen ? { x, y } : null
  })

test.describe('Self-loop creation', () => {
  test('the node context menu creates an edge from a node to itself', async ({
    page,
  }) => {
    await gotoAndSeedNetwork(page)

    const networkId = await getCurrentNetworkId(page)
    expect(networkId).not.toBe('')

    await expect(page.locator('[data-testid="cyjs-renderer"]')).toBeVisible()
    await expect
      .poll(async () => (await getEdgeIds(page, networkId)).length)
      .toBe(1)

    // Wait until the nodes are rendered and visible in the viewport
    let node: { x: number; y: number } | null = null
    await expect
      .poll(async () => {
        node = await firstNodeScreenPosition(page)
        return node !== null
      })
      .toBe(true)
    const { x, y } = node as unknown as { x: number; y: number }

    await page.mouse.click(x, y, { button: 'right' })

    const menuItem = page.getByRole('menuitem', {
      name: 'Create Edge from this Node',
    })
    await expect(menuItem).toBeVisible()
    await menuItem.click()

    await expect(page.getByText('Edge creation mode')).toBeVisible()
    // The menu's backdrop swallows canvas clicks until the close transition ends
    await expect(page.locator('[role="menu"]')).toHaveCount(0)

    // Click the same node again: this is the self-loop gesture
    await page.mouse.click(x, y)

    await expect
      .poll(async () => (await getEdgeIds(page, networkId)).length)
      .toBe(2)

    // Exactly one of the two edges connects a node to itself
    const edgeIds = await getEdgeIds(page, networkId)
    const endpoints = await Promise.all(
      edgeIds.map(async (edgeId) => getEdgeEndpoints(page, networkId, edgeId)),
    )
    const selfLoops = endpoints.filter(
      (e) => e !== null && e.sourceId === e.targetId,
    )
    expect(selfLoops).toHaveLength(1)
  })
})
