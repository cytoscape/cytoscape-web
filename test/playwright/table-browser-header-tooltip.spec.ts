import { expect, test } from './fixtures'
import { gotoAndSeedNetwork } from './fixtures'

// Column headers are painted into the glide-data-grid canvas, so a long
// attribute name is clipped with no DOM node to carry a native title. Hovering
// a header opens a MUI tooltip with the full name and the data type.
test.describe('Table Browser header tooltip', () => {
  const nodeColumnNames = async (page: any): Promise<string[]> => {
    const result = await page.evaluate(() => {
      const api = (window as any).CyWebApi
      const networkId = api.workspace.getCurrentNetworkId().data.networkId
      return api.table.getTable(networkId, 'node')
    })
    expect(result).toEqual(expect.objectContaining({ success: true }))
    return result.data.columns.map((c: any) => c.name)
  }

  // The consent banner overlays the bottom of the window, which is exactly where
  // the table browser lives, and it swallows the hover.
  const acceptCookies = async (page: any): Promise<void> => {
    const accept = page.locator(
      '[data-testid="cookie-consent"] button:has-text("Accept")',
    )
    if (await accept.isVisible()) {
      await accept.click()
      await expect(page.locator('[data-testid="cookie-consent"]')).toBeHidden()
    }
  }

  test('hovering a column header shows the full name and data type', async ({
    page,
  }) => {
    await gotoAndSeedNetwork(page)
    await acceptCookies(page)

    const grid = page.locator('[data-testid="table-browser-node-editor"]')
    await expect(grid).toBeVisible()

    const columnNames = await nodeColumnNames(page)
    expect(columnNames.length).toBeGreaterThan(0)

    // x lands past the row-marker (35px) and CX ID (120px) columns, so this is
    // an attribute header; y stays inside the header row.
    await grid.hover({ position: { x: 200, y: 15 } })

    const tooltip = page.locator('[data-testid="table-header-tooltip-content"]')
    await expect(tooltip).toBeVisible()

    // The title line is the column name, verbatim.
    const title = (await tooltip.locator('p').first().innerText()).trim()
    expect(columnNames).toContain(title)

    // The data type badge is the shared one used across the app.
    await expect(
      tooltip.locator('[data-testid^="data-type-chip-"]'),
    ).toBeVisible()
  })

  test('moving off the header dismisses the tooltip', async ({ page }) => {
    await gotoAndSeedNetwork(page)
    await acceptCookies(page)

    const grid = page.locator('[data-testid="table-browser-node-editor"]')
    await expect(grid).toBeVisible()

    await grid.hover({ position: { x: 200, y: 15 } })
    const tooltip = page.locator('[data-testid="table-header-tooltip-content"]')
    await expect(tooltip).toBeVisible()

    // Out of the grid entirely. The panel sits at the bottom of the window and
    // only a row or two is on screen, so leaving upward is the reliable exit.
    await page.locator('[data-testid="table-browser-nodes-tab"]').hover()
    await expect(tooltip).toBeHidden()
  })
})
