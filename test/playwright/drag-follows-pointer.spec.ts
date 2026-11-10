import type { Locator, Page } from '@playwright/test'

import { expect, gotoAndSeedNetwork, test } from './fixtures'

// A dragged element must end exactly where the pointer moved it (#901).
// react-draggable's <Draggable> added each move to its last committed
// position, and React 18 commits mouse-move updates in a later task, so
// moves were lost: in WebKit every drag ended short. The Layout Option
// Editor and the continuous-mapping handles now go through PointerDraggable,
// which measures each move from the press. Unit tests
// (src/components/PointerDraggable.spec.tsx, LayoutOptionDialog.spec.tsx,
// ContinuousMappingHandleDrag.spec.tsx) reproduce the lost moves in jsdom;
// this checks the real pointer path.

const box = async (
  locator: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> => {
  const b = await locator.boundingBox()
  expect(b).not.toBeNull()
  return b!
}

/** Presses at (x, y), moves the mouse by (dx, dy) in many steps, releases */
const dragBy = async (
  page: Page,
  x: number,
  y: number,
  dx: number,
  dy: number,
): Promise<void> => {
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 20 })
  await page.mouse.up()
}

test.describe('Dragging follows the pointer (#901)', () => {
  test('the Layout Option Editor moves as far as its title is dragged', async ({
    page,
  }) => {
    await gotoAndSeedNetwork(page)
    await page.getByTestId('toolbar-layout-menu-menu-button').click()
    await page.getByTestId('layout-menu-settings').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const before = await box(dialog)
    const title = await box(page.getByText('Layout Option Editor'))
    await dragBy(page, title.x + 20, title.y + title.height / 2, -150, 60)

    const after = await box(dialog)
    expect(after.x - before.x).toBeCloseTo(-150, 0)
    expect(after.y - before.y).toBeCloseTo(60, 0)
  })

  test('a continuous color mapping handle moves as far as it is dragged', async ({
    page,
  }) => {
    await gotoAndSeedNetwork(page)

    // A numeric column to map: 0 and 10 on the seeded network's two nodes
    const ok = await page.evaluate(() => {
      const api = (window as any).CyWebApi
      const current = api.workspace.getCurrentNetworkId()
      if (!current.success) return false
      const id = current.data.networkId
      if (!api.table.createColumn(id, 'node', 'score', 'double', 0).success) {
        return false
      }
      const table = api.table.getTable(id, 'node')
      if (!table.success) return false
      return api.table.setValues(
        id,
        'node',
        table.data.rows.map((row: { id: string }, i: number) => ({
          id: row.id,
          column: 'score',
          value: i * 10,
        })),
      ).success
    })
    expect(ok).toBe(true)

    await page.getByTestId('network-browser-panel-style-tab').click()
    await page.getByTestId('vizmapper-nodes-tab').click()
    // The Mapping box is the second box of the row labelled with the property
    await page
      .locator(
        '[data-testid="vizmapper"] div:has(> :text-is("Fill Color")) > div',
      )
      .nth(1)
      .click()
    await page.getByTestId('mapping-form-column-select').click()
    await page.getByRole('option', { name: 'score', exact: true }).click()
    await page.getByTestId('mapping-form-type-select').click()
    await page.getByRole('option', { name: 'continuous', exact: true }).click()

    // Add an inner handle a quarter of the way along the gradient; the end
    // handles do not move
    const gradient = page.getByTestId('continuous-mapping-gradient')
    const handles = page.getByTestId('continuous-mapping-handle')
    const count = await handles.count()
    const g = await box(gradient)
    await gradient.click({ position: { x: g.width / 4, y: g.height / 2 } })
    await expect(handles).toHaveCount(count + 1)

    // The new handle is the one nearest the click
    const lefts = await handles.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().left),
    )
    const target = g.x + g.width / 4
    const index = lefts.reduce(
      (best, left, i) =>
        Math.abs(left - target) < Math.abs(lefts[best] - target) ? i : best,
      0,
    )
    // Handles re-sort by value as one passes another, so mark the element
    // instead of keeping its index
    await handles.nth(index).evaluate((el) => {
      el.dataset.dragged = 'true'
    })
    const handle = page.locator('[data-dragged="true"]')
    const before = await box(handle)
    const grip = await box(handle.locator('.handle').first())

    await dragBy(
      page,
      grip.x + grip.width / 2,
      grip.y + grip.height / 2,
      200,
      0,
    )

    const after = await box(handle)
    expect(after.x - before.x).toBeCloseTo(200, 0)
    expect(after.y).toBeCloseTo(before.y, 0)
  })
})
