import path from 'path'

import {
  expect,
  getWorkspaceNetworkCount,
  gotoAndWaitReady,
  test,
} from './fixtures'
import type { Page } from '@playwright/test'

// Issue #630: a HCX hierarchy can contain edges that are not parent-child
// relationships. The circle packing builder cannot interpret those, so:
//  - a hierarchy with several edge interaction types gets no Cell View tab
//  - any other hierarchy the builder cannot resolve shows a message instead of
//    the blank panel it used to leave behind
const MIXED_INTERACTION_HCX = path.resolve(
  __dirname,
  '../fixtures/hcx/valid/with-interaction-uuid.valid.cx2',
)

const UNIFORM_INTERACTION_CYCLIC_HCX = path.resolve(
  __dirname,
  '../fixtures/hcx/invalid/not-dag-single-interaction.invalid.cx2',
)

const importNetworkFile = async (
  page: Page,
  fixture: string,
  networkName: string,
): Promise<void> => {
  await gotoAndWaitReady(page)
  expect(await getWorkspaceNetworkCount(page)).toBe(0)

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

  await page
    .locator('[data-testid="file-upload-dropzone"] input[type="file"]')
    .setInputFiles(fixture)

  await expect
    .poll(() => getWorkspaceNetworkCount(page), { timeout: 15000 })
    .toBe(1)
  await expect(page.getByText(networkName).first()).toBeVisible({
    timeout: 15000,
  })
}

test.describe('Cell View availability for hierarchies (#630)', () => {
  test('a hierarchy with mixed edge interaction types gets no Cell View tab', async ({
    page,
  }) => {
    await importNetworkFile(
      page,
      MIXED_INTERACTION_HCX,
      'Test Network 50 nodes',
    )

    // The network is recognised as a hierarchy: the Sub Network Viewer is open
    // and waiting for a subsystem selection.
    await expect(page.getByText('Please select a subsystem')).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText('Failed to load network data')).toHaveCount(0)

    // ...yet the Cell View renderer is never registered, so there is no tab for
    // it and no blank circle packing panel.
    await expect(page.getByRole('tab', { name: 'Cell View' })).toHaveCount(0)
    await expect(
      page.locator('[data-testid="circle-packing-svg"]'),
    ).toHaveCount(0)
  })

  test('a hierarchy that cannot be resolved to a tree explains itself instead of rendering blank', async ({
    page,
  }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await importNetworkFile(
      page,
      UNIFORM_INTERACTION_CYCLIC_HCX,
      'Test Network 20 nodes',
    )

    // Every edge shares one interaction type, so the heuristic keeps Cell View.
    const cellViewTab = page.getByRole('tab', { name: 'Cell View' })
    await expect(cellViewTab).toBeVisible({ timeout: 15000 })
    await cellViewTab.click()

    // The network is cyclic, so no single root exists: the panel says so rather
    // than leaving an empty SVG behind.
    await expect(
      page.locator('[data-testid="circle-packing-unavailable"]'),
    ).toBeVisible({ timeout: 15000 })
    await expect(
      page.locator('[data-testid="circle-packing-svg"]'),
    ).toHaveCount(0)

    expect(pageErrors).toEqual([])
  })
})

// A single-rooted tree with one interaction type: a hierarchy the Cell View
// can draw (the other valid HCX fixtures mix interaction types).
const TREE_HCX = path.resolve(__dirname, '../fixtures/hcx/valid/tree.valid.cx2')

/**
 * Drag the table panel's divider — the horizontal allotment sash right under
 * the network pane — up by `by` pixels, growing the table.
 */
const dragTableDividerUp = async (page: Page, by: number): Promise<void> => {
  const tabsBox = (await page
    .locator('[data-testid="network-tabs"]')
    .boundingBox())!
  const sashY = tabsBox.y + tabsBox.height + 2
  const sashX = tabsBox.x + tabsBox.width / 2
  await page.mouse.move(sashX, sashY)
  await page.mouse.down()
  await page.mouse.move(sashX, sashY - by, { steps: 10 })
  await page.mouse.up()
}

test.describe('Hierarchy network view tabs', () => {
  // Regression: the box holding the Tree View / Cell View renderers is a flex
  // item, and its default `min-height: auto` kept it from shrinking below the
  // renderer's pixel-sized canvas. Growing the table panel shrank the pane but
  // not the view, whose lower part then disappeared under the table.
  test('the view shrinks with the pane when the table panel grows', async ({
    page,
  }) => {
    await importNetworkFile(
      page,
      UNIFORM_INTERACTION_CYCLIC_HCX,
      'Test Network 20 nodes',
    )

    const tabs = page.locator('[data-testid="network-tabs"]')
    const renderer = tabs.locator('[data-testid="cyjs-renderer"]')
    await expect(renderer).toBeVisible({ timeout: 15000 })

    const bottomOf = async (
      locator: ReturnType<Page['locator']>,
    ): Promise<number> => {
      const box = await locator.boundingBox()
      expect(box).not.toBeNull()
      return box!.y + box!.height
    }
    const heightOf = async (
      locator: ReturnType<Page['locator']>,
    ): Promise<number> => (await locator.boundingBox())!.height

    const rendererHeightBefore = await heightOf(renderer)

    const tabsBox = (await tabs.boundingBox())!
    const shrinkBy = 150
    await dragTableDividerUp(page, shrinkBy)

    // The pane itself shrank...
    await expect
      .poll(() => heightOf(tabs))
      .toBeLessThan(tabsBox.height - shrinkBy / 2)

    // ...and the view followed it rather than overflowing under the table.
    await expect
      .poll(async () => (await bottomOf(renderer)) - (await bottomOf(tabs)))
      .toBeLessThanOrEqual(1)
    expect(await heightOf(renderer)).toBeLessThan(
      rendererHeightBefore - shrinkBy / 2,
    )
  })

  // #751: the Cell View keeps the point at its center fixed when a panel
  // resizes it, like the Tree View does since #749. It used to stay anchored at
  // the top-left, so growing the table panel cropped the bottom of the view.
  test('the Cell View keeps its center when the table panel grows', async ({
    page,
  }) => {
    await importNetworkFile(page, TREE_HCX, 'Test Network 15 nodes')

    const cellViewTab = page.getByRole('tab', { name: 'Cell View' })
    await expect(cellViewTab).toBeVisible({ timeout: 15000 })
    await cellViewTab.click()
    const svg = page.locator('[data-testid="circle-packing-svg"]')
    await expect(svg).toBeVisible({ timeout: 15000 })

    /** The layout point at the center of the SVG, and the zoom level. */
    const readCenter = () =>
      svg.evaluate((element) => {
        const { width, height } = element.getBoundingClientRect()
        const t = (
          element as unknown as { __zoom?: { k: number; x: number; y: number } }
        ).__zoom ?? { k: 1, x: 0, y: 0 }
        return {
          height,
          k: t.k,
          x: (width / 2 - t.x) / t.k,
          y: (height / 2 - t.y) / t.k,
        }
      })

    // Zoom in first, so the check also covers a scale other than 1.
    const svgBox = (await svg.boundingBox())!
    await page.mouse.move(
      svgBox.x + svgBox.width / 3,
      svgBox.y + svgBox.height / 3,
    )
    await page.mouse.wheel(0, -300)
    await expect.poll(async () => (await readCenter()).k).toBeGreaterThan(1)
    const before = await readCenter()

    await dragTableDividerUp(page, 150)

    // Check the size, zoom and center together, retrying: the SVG can report
    // its new size before that frame's ResizeObserver callback has shifted the
    // view, so a single read right after the size changes can see a
    // half-applied state.
    await expect(async () => {
      const after = await readCenter()
      expect(after.height).toBeLessThan(before.height - 75)
      expect(after.k).toBeCloseTo(before.k, 5)
      expect(after.x).toBeCloseTo(before.x, 1)
      expect(after.y).toBeCloseTo(before.y, 1)
    }).toPass({ timeout: 5000 })
  })
})
