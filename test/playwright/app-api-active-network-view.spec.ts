import { expect, gotoAndWaitReady, test } from './fixtures'
import type { Page } from '@playwright/test'

// Regression (#927): an App API change of the current network left
// `ui.activeNetworkView` naming the network shown before, so the table browser
// (and the layout tools) kept acting on it. Only a URL-driven load set the
// active view, which is why the spec first opens a network from the workspace
// list: until then the view is '' and every consumer falls back to the
// current network.
//
// The table is painted into a canvas, so the spec tells the networks apart by
// the Nodes tab's label, which counts the selected nodes of the table's
// network: one in Alpha, two in Beta, three in Gamma.

type ApiWindow = { CyWebApi?: any }

/** Creates a chain of `nodeCount` nodes and selects all of them. */
const createSelectedNetwork = async (
  page: Page,
  name: string,
  nodeCount: number,
): Promise<string> => {
  const networkId = await page.evaluate(
    ({ networkName, count }) => {
      const api = (window as unknown as ApiWindow).CyWebApi
      const labels = Array.from({ length: count }, (_, i) => `n${i}`)
      // A single node needs a self-loop: the edge list has no isolated nodes.
      const edgeList =
        count === 1
          ? [['n0', 'n0']]
          : labels.slice(1).map((label, i) => [labels[i], label])
      const result = api.network.createNetworkFromEdgeList({
        name: networkName,
        edgeList,
        addToWorkspace: true,
      })
      if (!result.success) return undefined
      return result.data.networkId as string
    },
    { networkName: name, count: nodeCount },
  )
  expect(networkId).toBeTruthy()
  return networkId!
}

const selectAllNodes = async (page: Page, networkId: string): Promise<void> => {
  const selected = await page.evaluate((id) => {
    const api = (window as unknown as ApiWindow).CyWebApi
    const nodes = api.element.getNodeIds(id)
    if (!nodes.success) return false
    return api.selection.exclusiveSelect(id, nodes.data.nodeIds, [])
      .success as boolean
  }, networkId)
  expect(selected).toBe(true)
}

const nodesTab = (page: Page) =>
  page.locator('[data-testid="table-browser-nodes-tab"]')

test.describe('App API network changes move the active view (#927)', () => {
  test('the table browser follows the network the App API made current', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)
    const alphaId = await createSelectedNetwork(page, 'Network Alpha', 1)
    const betaId = await createSelectedNetwork(page, 'Network Beta', 2)

    // Open Alpha through the workspace list: the URL-driven load sets the
    // active view to it.
    await page.getByTestId(`workspace-network-${alphaId}`).click()
    await expect(page).toHaveURL(new RegExp(`/networks/${alphaId}`))
    // The load is done once it records the tab's network; calling the App API
    // before that would race the load's own setCurrentNetworkId.
    await page.waitForFunction(
      (id) => window.sessionStorage.getItem('cyweb.tab.networkId') === id,
      alphaId,
    )
    await selectAllNodes(page, alphaId)
    await selectAllNodes(page, betaId)
    await expect(nodesTab(page)).toHaveText('Nodes (1)')

    const switched = await page.evaluate(
      (id) =>
        (
          window as unknown as ApiWindow
        ).CyWebApi.workspace.switchCurrentNetwork(id).success as boolean,
      betaId,
    )
    expect(switched).toBe(true)
    await expect(nodesTab(page)).toHaveText('Nodes (2)')

    const gammaId = await createSelectedNetwork(page, 'Network Gamma', 3)
    await selectAllNodes(page, gammaId)
    await expect(nodesTab(page)).toHaveText('Nodes (3)')
  })
})
