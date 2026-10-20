import type { Page } from '@playwright/test'

import { expect, gotoAndWaitReady, test } from './fixtures'

// Delete and Backspace on the canvas delete the selected nodes and edges as
// ONE undo step, and a text field keeps both keys. Unit tests cover the
// command (src/data/edit/deleteSelection.test.tsx) and where the shortcut
// acts; this covers the wiring between the keyboard, the stores, the undo
// stack and the renderer. See src/features/ToolBar/EditMenu/.

type ApiWindow = { CyWebApi?: any }

// alpha - beta - gamma - delta
const seedNetwork = async (page: Page): Promise<string> => {
  const networkId = await page.evaluate(() => {
    const api = (window as unknown as ApiWindow).CyWebApi
    api.network.createNetworkFromEdgeList({
      name: 'Delete shortcut network',
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

/** Selects alpha and the gamma - delta edge, which alpha does not touch */
const selectAlphaAndGammaDelta = (page: Page, networkId: string) =>
  page.evaluate((id) => {
    const api = (window as unknown as ApiWindow).CyWebApi
    const rows: { id: string; name: string }[] = api.table.getTable(id, 'node')
      .data.rows
    const byName = (name: string) =>
      String(rows.find((row) => row.name === name)!.id)
    const [alpha, gamma, delta] = ['alpha', 'gamma', 'delta'].map(byName)
    const edges: { id: string; sourceId: string; targetId: string }[] =
      api.element.getEdges(id).data.edges
    const gammaDelta = edges.find(
      (edge) =>
        [edge.sourceId, edge.targetId].sort().join() ===
        [gamma, delta].sort().join(),
    )!.id
    return api.selection.exclusiveSelect(id, [alpha], [gammaDelta]).success
  }, networkId)

/** Nodes and edges as drawn by Cytoscape.js */
const drawn = (page: Page) =>
  page
    .getByTestId('cyjs-renderer')
    .first()
    .evaluate((container) => {
      const cy = (container as HTMLElement & { _cyreg?: { cy?: any } })._cyreg
        ?.cy
      return cy === undefined
        ? null
        : { nodes: cy.nodes().length, edges: cy.edges().length }
    })

test.describe('Delete selection shortcut', () => {
  test('Delete removes the selected nodes and edges; one undo restores them', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)
    const networkId = await seedNetwork(page)
    await expect.poll(() => drawn(page)).toEqual({ nodes: 4, edges: 3 })

    // A click on the canvas background leaves the keyboard with the canvas
    await page
      .locator('[data-testid="cyjs-renderer"]')
      .first()
      .click({ position: { x: 5, y: 5 } })
    expect(await selectAlphaAndGammaDelta(page, networkId)).toBe(true)

    // alpha takes alpha - beta with it; gamma - delta is selected
    await page.keyboard.press('Delete')
    await expect.poll(() => drawn(page)).toEqual({ nodes: 3, edges: 1 })

    await page.keyboard.press('ControlOrMeta+z')
    await expect.poll(() => drawn(page)).toEqual({ nodes: 4, edges: 3 })

    // Backspace does the same, and redo deletes the same elements again
    expect(await selectAlphaAndGammaDelta(page, networkId)).toBe(true)
    await page.keyboard.press('Backspace')
    await expect.poll(() => drawn(page)).toEqual({ nodes: 3, edges: 1 })
    await page.keyboard.press('ControlOrMeta+z')
    await expect.poll(() => drawn(page)).toEqual({ nodes: 4, edges: 3 })
    await page.keyboard.press('ControlOrMeta+Shift+z')
    await expect.poll(() => drawn(page)).toEqual({ nodes: 3, edges: 1 })
  })

  test('a text field keeps Delete and Backspace', async ({ page }) => {
    await gotoAndWaitReady(page)
    const networkId = await seedNetwork(page)
    await expect.poll(() => drawn(page)).toEqual({ nodes: 4, edges: 3 })
    expect(await selectAlphaAndGammaDelta(page, networkId)).toBe(true)

    const search = page.locator('[data-testid="search-box-input"] input')
    await search.fill('alpha')
    await search.press('Backspace')
    // Caret to the start (Home does not move it in a macOS text field)
    await search.evaluate((input: HTMLInputElement) =>
      input.setSelectionRange(0, 0),
    )
    await search.press('Delete')
    await expect(search).toHaveValue('lph')
    expect(await drawn(page)).toEqual({ nodes: 4, edges: 3 })
  })
})
