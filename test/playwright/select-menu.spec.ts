import type { Page } from '@playwright/test'

import { expect, gotoAndWaitReady, test } from './fixtures'

// The Select menu end to end (#834): select and deselect, hide the selection
// with its edges, show everything again, Show All releasing a FILTER tab
// filter applied in show mode, and Ctrl/⌘+A on the canvas. Unit tests cover
// the commands and the menu; this covers the wiring between the toolbar, the
// stores and the renderer. See src/features/ToolBar/SelectMenu/.

type ApiWindow = { CyWebApi?: any }

// alpha - beta - gamma - delta
const seedNetwork = async (page: Page): Promise<string> => {
  const networkId = await page.evaluate(() => {
    const api = (window as unknown as ApiWindow).CyWebApi
    api.network.createNetworkFromEdgeList({
      name: 'Select menu network',
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

const nodeIdsByName = (page: Page, networkId: string, names: string[]) =>
  page.evaluate(
    ({ id, wanted }) => {
      const api = (window as unknown as ApiWindow).CyWebApi
      const rows: { id: string; name: string }[] = api.table.getTable(
        id,
        'node',
      ).data.rows
      return rows
        .filter((row) => wanted.includes(row.name))
        .map((row) => String(row.id))
    },
    { id: networkId, wanted: names },
  )

const selectionCounts = (page: Page, networkId: string) =>
  page.evaluate((id) => {
    const api = (window as unknown as ApiWindow).CyWebApi
    const { selectedNodes, selectedEdges } = api.selection.getSelection(id).data
    return { nodes: selectedNodes.length, edges: selectedEdges.length }
  }, networkId)

const hiddenCounts = (page: Page, networkId: string) =>
  page.evaluate((id) => {
    const api = (window as unknown as ApiWindow).CyWebApi
    const count = (vp: string): number =>
      Object.values(api.visualStyle.getBypasses(id, vp).data.bypasses).filter(
        (value) => value === 'none',
      ).length
    return { nodes: count('nodeVisibility'), edges: count('edgeVisibility') }
  }, networkId)

const openSelectMenu = async (page: Page): Promise<void> => {
  await page.locator('[data-testid="toolbar-select-menu-menu-button"]').click()
  await expect(page.getByRole('menu')).toBeVisible()
}

const clickSelectMenuRow = async (page: Page, testId: string) => {
  await openSelectMenu(page)
  await page.locator(`[data-testid="${testId}"]`).click()
  // The menu fades out still covering the page; wait until it is gone
  await expect(page.getByRole('menu', { includeHidden: true })).toHaveCount(0)
}

const isRowDisabled = async (page: Page, testId: string): Promise<boolean> =>
  (await page
    .locator(`[data-testid="${testId}"]`)
    .getAttribute('aria-disabled')) === 'true'

test.describe('Select menu', () => {
  test('selects, hides the selection with its edges, and shows all', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)
    const networkId = await seedNetwork(page)

    await clickSelectMenuRow(page, 'select-menu-select-all-nodes')
    await expect
      .poll(() => selectionCounts(page, networkId))
      .toEqual({ nodes: 4, edges: 0 })
    await expect(
      page.locator('[data-testid="table-browser-nodes-tab"]'),
    ).toContainText('Nodes (4)')

    await clickSelectMenuRow(page, 'select-menu-select-all-edges')
    await expect
      .poll(() => selectionCounts(page, networkId))
      .toEqual({ nodes: 4, edges: 3 })

    await clickSelectMenuRow(page, 'select-menu-deselect-all')
    await expect
      .poll(() => selectionCounts(page, networkId))
      .toEqual({ nodes: 0, edges: 0 })

    // Nothing selected, nothing hidden
    await openSelectMenu(page)
    expect(await isRowDisabled(page, 'select-menu-hide-selected')).toBe(true)
    expect(await isRowDisabled(page, 'select-menu-show-all')).toBe(true)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu', { includeHidden: true })).toHaveCount(0)

    // beta has two edges; both go with it, and nothing stays selected
    const [beta] = await nodeIdsByName(page, networkId, ['beta'])
    await page.evaluate(
      ({ id, node }) =>
        (window as unknown as ApiWindow).CyWebApi.selection.exclusiveSelect(
          id,
          [node],
          [],
        ),
      { id: networkId, node: beta },
    )
    await clickSelectMenuRow(page, 'select-menu-hide-selected')
    await expect
      .poll(() => hiddenCounts(page, networkId))
      .toEqual({ nodes: 1, edges: 2 })
    expect(await selectionCounts(page, networkId)).toEqual({
      nodes: 0,
      edges: 0,
    })

    await clickSelectMenuRow(page, 'select-menu-show-all')
    await expect
      .poll(() => hiddenCounts(page, networkId))
      .toEqual({ nodes: 0, edges: 0 })
  })

  test('hidden elements stay hidden in the canvas when selected', async ({
    page,
  }) => {
    // window.debug.cy (registerDebugTool in CyjsRenderer) needs debug on
    await page.addInitScript(() => {
      localStorage.setItem('cyweb-debug-enabled', 'true')
    })
    await gotoAndWaitReady(page)
    const networkId = await seedNetwork(page)
    const [beta] = await nodeIdsByName(page, networkId, ['beta'])
    await page.waitForFunction(
      (node) =>
        (window as any).debug?.cy?.getElementById(node).nonempty() === true,
      beta,
    )
    // Rendered visibility of beta and of the edges, as Cytoscape.js sees it
    const rendered = (): Promise<{ beta: boolean; visibleEdges: number }> =>
      page.evaluate((node) => {
        const cy = (window as any).debug.cy
        return {
          beta: cy.getElementById(node).visible(),
          visibleEdges: cy.edges().filter((e: any) => e.visible()).length,
        }
      }, beta)

    await page.evaluate(
      ({ id, node }) =>
        (window as unknown as ApiWindow).CyWebApi.selection.exclusiveSelect(
          id,
          [node],
          [],
        ),
      { id: networkId, node: beta },
    )
    await clickSelectMenuRow(page, 'select-menu-hide-selected')
    await expect.poll(rendered).toEqual({ beta: false, visibleEdges: 1 })

    // Selecting (and deselecting) everything must not show them again (#834)
    await clickSelectMenuRow(page, 'select-menu-select-all')
    await expect
      .poll(() => selectionCounts(page, networkId))
      .toEqual({ nodes: 4, edges: 3 })
    expect(await rendered()).toEqual({ beta: false, visibleEdges: 1 })
    await clickSelectMenuRow(page, 'select-menu-deselect-all')
    await expect
      .poll(() => selectionCounts(page, networkId))
      .toEqual({ nodes: 0, edges: 0 })
    expect(await rendered()).toEqual({ beta: false, visibleEdges: 1 })

    await clickSelectMenuRow(page, 'select-menu-show-all')
    await expect.poll(rendered).toEqual({ beta: true, visibleEdges: 3 })
  })

  test('Show All releases a FILTER tab filter applied in show mode', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)
    const networkId = await seedNetwork(page)

    await page
      .locator('[data-testid="network-browser-panel-filter-tab"]')
      .click()
    await expect(page.locator('[data-testid="filter-select"]')).toHaveValue(
      /.+/,
    )
    await page.locator('[data-testid="filter-condition-root-add"]').click()
    await page
      .locator('[data-testid="filter-condition-root-add-column"]')
      .click()
    await page
      .locator('[data-testid="filter-condition-0-column"]')
      .locator('xpath=..')
      .getByRole('combobox')
      .click()
    await page.getByRole('option', { name: 'Node: name' }).click()
    await page.locator('[data-testid="filter-condition-0-text"]').fill('ta')
    await page
      .locator('[data-testid="filter-display-mode-show"]')
      .locator('input')
      .check()
    // beta and delta pass; alpha and gamma are hidden
    await expect
      .poll(() => hiddenCounts(page, networkId))
      .toEqual({ nodes: 2, edges: 0 })
    await expect(page.locator('[data-testid="filter-status"]')).toHaveText(
      /^Showing 2 nodes/,
    )

    await clickSelectMenuRow(page, 'select-menu-show-all')
    await expect
      .poll(() => hiddenCounts(page, networkId))
      .toEqual({ nodes: 0, edges: 0 })
    // The filter no longer reports a run, since it hides nothing now
    await expect(page.locator('[data-testid="filter-status"]')).toHaveText('')
  })

  test('Ctrl/⌘+A on the canvas selects every node and edge', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)
    const networkId = await seedNetwork(page)

    // A click on the canvas background leaves the keyboard with the canvas
    await page
      .locator('[data-testid="cyjs-renderer"]')
      .first()
      .click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('ControlOrMeta+a')
    await expect
      .poll(() => selectionCounts(page, networkId))
      .toEqual({ nodes: 4, edges: 3 })
  })
})
