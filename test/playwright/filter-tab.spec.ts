import type { Page } from '@playwright/test'

import { expect, gotoAndWaitReady, test } from './fixtures'

// The FILTER tab end to end: build a condition through the editor, apply it
// in select and show mode, and read the filter back after a reload. Unit
// tests cover the evaluation and the store; this covers the wiring between
// the tab, the stores, the renderer's selection and the database.
// See docs/specifications/FILTER_SPECIFICATION.md.

type ApiWindow = { CyWebApi?: any }

const seedNetwork = async (page: Page): Promise<string> => {
  const networkId = await page.evaluate(() => {
    const api = (window as unknown as ApiWindow).CyWebApi
    api.network.createNetworkFromEdgeList({
      name: 'Filter tab network',
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

const selectedNodeNames = (page: Page, networkId: string) =>
  page.evaluate((id) => {
    const api = (window as unknown as ApiWindow).CyWebApi
    const nodeIds: string[] = api.selection.getSelection(id).data.selectedNodes
    const rows: { id: string; name: string }[] = api.table.getTable(id, 'node')
      .data.rows
    return rows
      .filter((row) => nodeIds.includes(String(row.id)))
      .map((row) => row.name)
      .sort()
  }, networkId)

const hiddenNodeCount = (page: Page, networkId: string) =>
  page.evaluate((id) => {
    const api = (window as unknown as ApiWindow).CyWebApi
    const result = api.visualStyle.getBypasses(id, 'nodeVisibility')
    return Object.keys(result.data.bypasses).length
  }, networkId)

const pickOption = async (
  page: Page,
  testId: string,
  option: string,
): Promise<void> => {
  // MUI Select: the visible combobox sits next to the hidden input
  await page
    .locator(`[data-testid="${testId}"]`)
    .locator('xpath=..')
    .getByRole('combobox')
    .click()
  await page.getByRole('option', { name: option }).click()
}

test.describe('FILTER tab', () => {
  test('selects and shows the nodes a column condition accepts', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)
    const networkId = await seedNetwork(page)

    await page
      .locator('[data-testid="network-browser-panel-filter-tab"]')
      .click()
    await expect(page.locator('[data-testid="filter-tab"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-select"]')).toHaveValue(
      /.+/,
    )

    await page.locator('[data-testid="filter-condition-root-add"]').click()
    await page
      .locator('[data-testid="filter-condition-root-add-column"]')
      .click()
    await pickOption(page, 'filter-condition-0-column', 'Node: name')
    await page.locator('[data-testid="filter-condition-0-text"]').fill('ta')

    // "Apply when filter changes" is on for a small network
    await expect
      .poll(() => selectedNodeNames(page, networkId))
      .toEqual(['beta', 'delta'])
    await expect(page.locator('[data-testid="filter-status"]')).toHaveText(
      /^Selected 2 nodes and 0 edges/,
    )

    await page
      .locator('[data-testid="filter-display-mode-show"]')
      .locator('input')
      .check()
    await expect.poll(() => hiddenNodeCount(page, networkId)).toBe(2)
    await expect(page.locator('[data-testid="filter-status"]')).toHaveText(
      /^Showing 2 nodes and 3 edges/,
    )

    // Back to select: everything is shown again
    await page
      .locator('[data-testid="filter-display-mode-select"]')
      .locator('input')
      .check()
    await expect.poll(() => hiddenNodeCount(page, networkId)).toBe(0)
  })

  test('keeps filters across a reload', async ({ page }) => {
    await gotoAndWaitReady(page)
    await seedNetwork(page)

    await page
      .locator('[data-testid="network-browser-panel-filter-tab"]')
      .click()
    await page.locator('[data-testid="filter-options-button"]').click()
    await page.locator('[data-testid="filter-new-menu-item"]').click()
    await page.locator('[data-testid="filter-name-input"]').fill('Hubs')
    await page.locator('[data-testid="filter-name-confirm-button"]').click()
    await page.locator('[data-testid="filter-condition-root-add"]').click()
    await page
      .locator('[data-testid="filter-condition-root-add-degree"]')
      .click()
    await expect(
      page.locator('[data-testid="filter-condition-0-row"]'),
    ).toBeVisible()

    // Writes are coalesced; let the last one land before reloading
    await page.waitForTimeout(1000)
    await page.reload()
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({
      timeout: 30_000,
    })
    await page
      .locator('[data-testid="network-browser-panel-filter-tab"]')
      .click()
    await pickOption(page, 'filter-select', 'Hubs')

    await expect(
      page.locator('[data-testid="filter-condition-0-edge-type"]'),
    ).toHaveValue('ANY')
  })
})

// Drag and drop of conditions (@dnd-kit/core). Drags go through many small
// moves: the pointer sensor starts a drag only after a few pixels.
test.describe('FILTER tab: drag and drop', () => {
  const center = async (page: Page, testId: string) => {
    const box = await page.locator(`[data-testid="${testId}"]`).boundingBox()
    expect(box).not.toBeNull()
    return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }
  }

  const addConditions = async (page: Page, kinds: string[]) => {
    await page
      .locator('[data-testid="network-browser-panel-filter-tab"]')
      .click()
    for (const kind of kinds) {
      await page.locator('[data-testid="filter-condition-root-add"]').click()
      await page
        .locator(`[data-testid="filter-condition-root-add-${kind}"]`)
        .click()
      // The menu fades out over the conditions; let it go before dragging
      await expect(page.getByRole('menu', { includeHidden: true })).toHaveCount(
        0,
      )
    }
  }

  test('groups a condition dropped on another and reorders by gaps (mouse)', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)
    await seedNetwork(page)
    await addConditions(page, ['column', 'degree'])

    // Degree onto the column condition: both go into a new group
    const from = await center(page, 'filter-condition-1-drag')
    const onto = await center(page, 'filter-condition-0-row')
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(from.x + 10, from.y - 5, { steps: 5 })
    await expect(
      page.locator('[data-testid="filter-condition-drag-preview"]'),
    ).toHaveText('Degree filter')
    await page.mouse.move(onto.x, onto.y, { steps: 10 })
    await page.mouse.up()

    await expect(
      page.locator('[data-testid="filter-condition-0-match-type"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="filter-condition-0-1-edge-type"]'),
    ).toHaveCount(1)

    // Degree into the gap before the column condition, inside the group.
    // Scrolled to the top first: a drag near the edge of the conditions
    // pane scrolls it, which would move the gap from under the pointer.
    await page
      .locator('[data-testid="filter-conditions"]')
      .evaluate((list) => list.parentElement?.scrollTo(0, 0))
    const handle = await center(page, 'filter-condition-0-1-drag')
    const gap = await center(page, 'filter-condition-0-gap-0')
    await page.mouse.move(handle.x, handle.y)
    await page.mouse.down()
    await page.mouse.move(gap.x, gap.y, { steps: 10 })
    await page.mouse.up()

    await expect(
      page.locator('[data-testid="filter-condition-0-0-edge-type"]'),
    ).toHaveCount(1)
  })

  // The conditions in document order, nested ones included: a group row
  // holds rows of its own, a degree condition has an edge-type picker
  const order = (page: Page) =>
    page
      .locator('[data-testid="filter-conditions"] [data-testid$="-row"]')
      .evaluateAll((rows) =>
        rows.map((row) =>
          row.querySelector('[data-testid$="-row"]') !== null
            ? 'group'
            : row.querySelector('[data-testid$="-edge-type"]') !== null
              ? 'degree'
              : 'column',
        ),
      )

  test('leaves a condition dropped back on itself where it is', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)
    await seedNetwork(page)
    await addConditions(page, ['column', 'degree'])
    expect(await order(page)).toEqual(['column', 'degree'])

    // Start a drag on the first condition and release it over its own row
    const from = await center(page, 'filter-condition-0-drag')
    const row = await center(page, 'filter-condition-0-row')
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(from.x + 20, from.y + 2, { steps: 5 })
    await page.mouse.move(row.x, row.y, { steps: 5 })
    await page.mouse.up()

    await expect(
      page.locator('[data-testid="filter-condition-drag-preview"]'),
    ).toHaveCount(0)
    expect(await order(page)).toEqual(['column', 'degree'])
  })

  test('moves a condition with the keyboard, and Escape cancels', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)
    await seedNetwork(page)
    await addConditions(page, ['column', 'degree'])
    const handle = page.locator('[data-testid="filter-condition-1-drag"]')

    // Picked up, moved onto the column condition, then cancelled
    await handle.focus()
    await page.keyboard.press('Space')
    await expect(
      page.locator('[data-testid="filter-condition-drag-preview"]'),
    ).toHaveText('Degree filter')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Escape')
    await expect(
      page.locator('[data-testid="filter-condition-drag-preview"]'),
    ).toHaveCount(0)
    expect(await order(page)).toEqual(['column', 'degree'])

    // The same moves, dropped with Space: the two are grouped
    await handle.focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Space')
    await expect(
      page.locator('[data-testid="filter-condition-0-match-type"]'),
    ).toBeVisible()
    expect(await order(page)).toEqual(['group', 'column', 'degree'])
  })

  test('drags a condition by touch', async ({ page, browserName }) => {
    // Touch input is driven through the Chrome DevTools Protocol
    test.skip(browserName !== 'chromium', 'Chromium only')
    await gotoAndWaitReady(page)
    await seedNetwork(page)
    await addConditions(page, ['column', 'degree'])

    const from = await center(page, 'filter-condition-1-drag')
    const onto = await center(page, 'filter-condition-0-row')
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true })
    const touch = (
      type: 'touchStart' | 'touchMove' | 'touchEnd',
      x: number,
      y: number,
    ) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
      })
    await touch('touchStart', from.x, from.y)
    for (let step = 1; step <= 10; step++) {
      await touch(
        'touchMove',
        from.x + ((onto.x - from.x) * step) / 10,
        from.y + ((onto.y - from.y) * step) / 10,
      )
    }
    await touch('touchEnd', onto.x, onto.y)

    await expect(
      page.locator('[data-testid="filter-condition-0-match-type"]'),
    ).toBeVisible()
  })
})
