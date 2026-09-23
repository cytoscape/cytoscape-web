import { expect, gotoAndWaitReady, test } from './fixtures'
import type { Page } from '@playwright/test'

// Regression: a pan or zoom followed by a network switch within the 300 ms
// viewport-save debounce saved the NEXT network's viewport under the previous
// network's id. CyjsRenderer reuses one Cytoscape.js instance for every
// network, and `renderNetwork` dropped the old `viewport` listener with
// `cy.removeAllListeners()` but never flushed the already-scheduled debounced
// save. That call fired after the new network was rendered, read its pan/zoom
// from the shared instance, and stored them under the old network's id, so
// switching back restored the other network's camera.
//
// The cy instance is reached through `window.debug.cy`, enabled by seeding the
// debug localStorage override before navigation (see node-graphics-hook.spec).

type DebugGlobals = { debug?: Record<string, any>; CyWebApi?: any }

interface Viewport {
  zoom: number
  pan: { x: number; y: number }
}

// Distinct node counts tell the two networks apart on the shared instance.
const NETWORK_A_NODES = 20
const NETWORK_B_NODES = 12

const ringEdges = (prefix: string, count: number): Array<[string, string]> =>
  Array.from({ length: count }, (_, i) => [
    `${prefix}${i}`,
    `${prefix}${(i + 1) % count}`,
  ])

const createNetwork = async (
  page: Page,
  name: string,
  edgeList: Array<[string, string]>,
): Promise<string> => {
  const networkId = await page.evaluate(
    ({ name, edgeList }) => {
      const result = (
        window as unknown as DebugGlobals
      ).CyWebApi.network.createNetworkFromEdgeList({
        name,
        edgeList,
        addToWorkspace: true,
      })
      return result.success ? (result.data.networkId as string) : undefined
    },
    { name, edgeList },
  )
  expect(networkId).toBeTruthy()
  return networkId!
}

const readViewport = (page: Page): Promise<Viewport> =>
  page.evaluate(() => {
    const cy = (window as unknown as DebugGlobals).debug!.cy
    const pan = cy.pan()
    return { zoom: cy.zoom(), pan: { x: pan.x, y: pan.y } }
  })

/** Wait until the shared instance shows the network with `nodeCount` nodes. */
const waitForRenderedNetwork = (page: Page, nodeCount: number) =>
  page.waitForFunction(
    (count) =>
      (window as unknown as DebugGlobals).debug?.cy?.nodes().length === count,
    nodeCount,
    { timeout: 30_000 },
  )

/**
 * Wait until the camera stops moving: a default layout and its fit can still be
 * settling after the elements appear, and the viewport save is debounced.
 */
const waitForStableViewport = async (page: Page): Promise<Viewport> => {
  let previous = JSON.stringify(await readViewport(page))
  await expect
    .poll(
      async () => {
        const current = JSON.stringify(await readViewport(page))
        const stable = current === previous
        previous = current
        return stable
      },
      { intervals: [700], timeout: 20_000 },
    )
    .toBe(true)
  return readViewport(page)
}

const switchTo = (page: Page, networkId: string) =>
  page.evaluate(
    (id) =>
      (
        window as unknown as DebugGlobals
      ).CyWebApi.workspace.switchCurrentNetwork(id),
    networkId,
  )

test.describe('Viewport across network switches', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cyweb-debug-enabled', 'true')
    })
  })

  test('a pan right before switching networks is saved for the right network', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)

    const networkA = await createNetwork(
      page,
      'Viewport A',
      ringEdges('a', NETWORK_A_NODES),
    )
    await createNetwork(page, 'Viewport B', ringEdges('b', NETWORK_B_NODES))
    const networkB = await page.evaluate(() => {
      const result = (
        window as unknown as DebugGlobals
      ).CyWebApi.workspace.getCurrentNetworkId()
      return result.success ? (result.data.networkId as string) : undefined
    })
    expect(networkB).toBeTruthy()
    expect(networkB).not.toBe(networkA)

    // Let B settle, then give it a camera of its own — two ring networks fit to
    // nearly the same one — and let that be saved. Then show A and let it settle.
    await waitForRenderedNetwork(page, NETWORK_B_NODES)
    await waitForStableViewport(page)
    await page.evaluate(() => {
      const cy = (window as unknown as DebugGlobals).debug!.cy
      cy.zoom(cy.zoom() * 2.5)
      cy.panBy({ x: -150, y: 90 })
    })
    await waitForStableViewport(page)
    await switchTo(page, networkA)
    await waitForRenderedNetwork(page, NETWORK_A_NODES)
    await waitForStableViewport(page)

    // Pan A and switch away in the same task — far inside the 300 ms debounce.
    const expectedA: Viewport = await page.evaluate((id) => {
      const w = window as unknown as DebugGlobals
      const cy = w.debug!.cy
      cy.panBy({ x: 80, y: 40 })
      const pan = cy.pan()
      w.CyWebApi.workspace.switchCurrentNetwork(id)
      return { zoom: cy.zoom(), pan: { x: pan.x, y: pan.y } }
    }, networkB!)

    await waitForRenderedNetwork(page, NETWORK_B_NODES)
    const shownB = await waitForStableViewport(page)
    // Guard against a vacuous pass: the two cameras must differ.
    expect(shownB).not.toEqual(expectedA)

    await switchTo(page, networkA)
    await waitForRenderedNetwork(page, NETWORK_A_NODES)
    const restoredA = await waitForStableViewport(page)

    // The failure this guards against: A restored with B's camera.
    expect(restoredA).not.toEqual(shownB)
    expect(restoredA.zoom).toBeCloseTo(expectedA.zoom, 5)
    expect(restoredA.pan.x).toBeCloseTo(expectedA.pan.x, 1)
    expect(restoredA.pan.y).toBeCloseTo(expectedA.pan.y, 1)
  })
})
