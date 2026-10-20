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

/** Nodes and edges in the network, read from the stores through the API */
const counts = (page: Page, networkId: string) =>
  page.evaluate((id) => {
    const api = (window as unknown as ApiWindow).CyWebApi
    return {
      nodes: api.element.getNodeIds(id).data.nodeIds.length as number,
      edges: api.element.getEdgeIds(id).data.edgeIds.length as number,
    }
  }, networkId)

/** Screen position of the node named `name`, after fitting the view */
const nodeScreenPosition = (page: Page, networkId: string, name: string) =>
  page.evaluate(
    ({ id, wanted }) => {
      const api = (window as unknown as ApiWindow).CyWebApi
      const rows: { id: string; name: string }[] = api.table.getTable(
        id,
        'node',
      ).data.rows
      const nodeId = String(rows.find((row) => row.name === wanted)!.id)
      const container = document.querySelector(
        '[data-testid="cyjs-renderer"]',
      ) as HTMLElement & { _cyreg?: { cy?: any } }
      const cy = container._cyreg?.cy
      if (cy === undefined) return null
      cy.fit(undefined, 100)
      const rendered = cy.getElementById(nodeId).renderedPosition()
      const rect = container.getBoundingClientRect()
      return { x: rect.left + rendered.x, y: rect.top + rendered.y }
    },
    { id: networkId, wanted: name },
  )

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

    // Nothing is selected now: Backspace deletes nothing, and never means
    // Back (an engine that still maps it would leave the page)
    const url = page.url()
    await page.keyboard.press('Backspace')
    expect(await counts(page, networkId)).toEqual({ nodes: 4, edges: 3 })
    expect(page.url()).toBe(url)

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
  test('Delete waits while an edge is being drawn', async ({ page }) => {
    await gotoAndWaitReady(page)
    const networkId = await seedNetwork(page)
    await expect.poll(() => drawn(page)).toEqual({ nodes: 4, edges: 3 })

    // Right-click alpha ▸ Create Edge from this Node
    const alpha = await nodeScreenPosition(page, networkId, 'alpha')
    expect(alpha).not.toBeNull()
    await page.mouse.click(alpha!.x, alpha!.y, { button: 'right' })
    await page
      .getByRole('menuitem', { name: 'Create Edge from this Node' })
      .click()
    await expect(page.getByText('Edge creation mode')).toBeVisible()
    await expect(page.locator('[role="menu"]')).toHaveCount(0)
    const renderer = page.locator('[data-testid="cyjs-renderer"]').first()
    await expect(renderer).toHaveAttribute('data-edge-creation', 'true')

    // The keydown handlers run before press() resolves, so the stores
    // already show whether anything was deleted
    expect(await selectAlphaAndGammaDelta(page, networkId)).toBe(true)
    await page.keyboard.press('Delete')
    await page.keyboard.press('Backspace')
    expect(await counts(page, networkId)).toEqual({ nodes: 4, edges: 3 })

    // Esc leaves the mode, and Delete works again
    await page.keyboard.press('Escape')
    await expect(renderer).not.toHaveAttribute('data-edge-creation', /.*/)
    await page.keyboard.press('Delete')
    await expect
      .poll(() => counts(page, networkId))
      .toEqual({ nodes: 3, edges: 1 })
  })
})
