import type { Locator, Page } from '@playwright/test'

import { expect, gotoAndSeedNetwork, test } from './fixtures'

// Layout Tools is one floating panel in the network view, opened from
// Layout → Layout Tools (#887 removed the collapsible copy below the
// workspace list). Its title bar moves it, and it cannot leave the network
// view. Unit tests (src/features/LayoutTools/FloatingLayoutToolsPanel.spec.tsx)
// cover the same rules against stubbed sizes; this covers real layout.

type Box = { left: number; top: number; right: number; bottom: number }

const PANEL = 'floating-layout-tools-panel'

const openLayoutTools = async (page: Page): Promise<Locator> => {
  await page.getByTestId('toolbar-layout-menu-menu-button').click()
  await page.getByTestId('layout-menu-layout-tools').click()
  const panel = page.getByTestId(PANEL)
  await expect(panel).toBeVisible()
  return panel
}

/** The panel's border box and the padding box of the view it sits in */
const boxes = (panel: Locator): Promise<{ panel: Box; view: Box }> =>
  panel.evaluate((el) => {
    const box = (r: DOMRect): Box => ({
      left: r.left,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
    })
    const view = el.parentElement as HTMLElement
    const r = view.getBoundingClientRect()
    const style = getComputedStyle(view)
    return {
      panel: box(el.getBoundingClientRect()),
      view: {
        left: r.left + parseFloat(style.borderLeftWidth),
        top: r.top + parseFloat(style.borderTopWidth),
        right: r.right - parseFloat(style.borderRightWidth),
        bottom: r.bottom - parseFloat(style.borderBottomWidth),
      },
    }
  })

/**
 * Presses on the title bar and moves the mouse to (x, y) in the window.
 * Targets stay inside the window: Firefox delivers no mouse events outside it.
 */
const dragTitleBarTo = async (
  page: Page,
  x: number,
  y: number,
): Promise<void> => {
  const bar = await page
    .getByTestId('floating-layout-tools-drag-handle')
    .boundingBox()
  expect(bar).not.toBeNull()
  const startX = bar!.x + 20
  const startY = bar!.y + bar!.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(x, y, { steps: 10 })
  await page.mouse.up()
}

test.describe('Layout Tools panel (#887)', () => {
  test('is a single movable panel that stays in the network view', async ({
    page,
  }) => {
    await gotoAndSeedNetwork(page)

    // The left panel no longer has its own Layout Tools section
    await expect(
      page.getByTestId('workspace-editor-left-panel-open'),
    ).toBeVisible()
    await expect(page.getByTestId('layout-tools-accordion')).toHaveCount(0)

    const panel = await openLayoutTools(page)
    await expect(page.getByTestId(PANEL)).toHaveCount(1)
    const start = await boxes(panel)

    // The title bar moves it
    const bar = await page
      .getByTestId('floating-layout-tools-drag-handle')
      .boundingBox()
    await dragTitleBarTo(page, bar!.x + 20 + 120, bar!.y + bar!.height / 2 - 60)
    const moved = await boxes(panel)
    expect(moved.panel.left).toBeCloseTo(start.panel.left + 120, 0)
    expect(moved.panel.top).toBeCloseTo(start.panel.top - 60, 0)

    // To the window's top-right corner, past the view's edges: stops flush
    // with them
    const size = page.viewportSize()!
    await dragTitleBarTo(page, size.width - 1, 1)
    const topRight = await boxes(panel)
    expect(topRight.panel.top).toBeCloseTo(topRight.view.top, 0)
    expect(topRight.panel.right).toBeCloseTo(topRight.view.right, 0)

    // To the window's bottom-left corner
    await dragTitleBarTo(page, 1, size.height - 1)
    const bottomLeft = await boxes(panel)
    expect(bottomLeft.panel.left).toBeCloseTo(bottomLeft.view.left, 0)
    expect(bottomLeft.panel.bottom).toBeCloseTo(bottomLeft.view.bottom, 0)

    // The close button closes it, and it reopens in its corner
    await page.getByTestId('floating-layout-tools-close').click()
    await expect(page.getByTestId(PANEL)).toHaveCount(0)
    const reopened = await boxes(await openLayoutTools(page))
    expect(reopened.panel.left).toBeCloseTo(start.panel.left, 0)
    expect(reopened.panel.top).toBeCloseTo(start.panel.top, 0)
  })
})
