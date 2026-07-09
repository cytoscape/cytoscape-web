import { expect, offlineTest as test } from './fixtures'

// Tests for CW-715 TableBrowser toolbar spacing (commit 62ce68bc).
// Verifies the table browser panel renders with correct tab structure and
// that tab switching activates the correct tabpanel without layout shift.
//
// Note: The data-testid on DataEditor (glide-data-grid canvas) is not
// forwarded to a DOM element. Tab state is asserted via [role="tabpanel"]
// since each TabPanel renders a stable div with hidden={value !== index}.

test.describe('TableBrowser Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({
      timeout: 15000,
    })
  })

  test('table browser panel is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="table-browser"]')).toBeVisible()
  })

  test('all three tabs are present', async ({ page }) => {
    await expect(
      page.locator('[data-testid="table-browser-tabs"]'),
    ).toBeVisible({ timeout: 15000 })
    await expect(
      page.locator('[data-testid="table-browser-nodes-tab"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="table-browser-edges-tab"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="table-browser-network-tab"]'),
    ).toBeVisible()
  })

  test('clicking Edges tab activates edges tabpanel', async ({ page }) => {
    await page.locator('[data-testid="table-browser-edges-tab"]').click()

    // TabPanel index 1 (edges): its div[role="tabpanel"] becomes not hidden
    const panels = page.locator('[data-testid="table-browser"] [role="tabpanel"]')
    await expect(panels.nth(1)).not.toBeHidden()
    // Nodes panel (index 0) is now hidden
    await expect(panels.first()).toBeHidden()
  })

  test('clicking Nodes tab re-activates nodes tabpanel', async ({ page }) => {
    // Switch away first, then back
    await page.locator('[data-testid="table-browser-edges-tab"]').click()
    await page.locator('[data-testid="table-browser-nodes-tab"]').click()

    const panels = page.locator('[data-testid="table-browser"] [role="tabpanel"]')
    await expect(panels.first()).not.toBeHidden()
    await expect(panels.nth(1)).toBeHidden()
  })

  test('tab switching causes no layout shift in the browser panel', async ({
    page,
  }) => {
    const browser = page.locator('[data-testid="table-browser"]')
    const boxBefore = await browser.boundingBox()

    await page.locator('[data-testid="table-browser-edges-tab"]').click()
    const boxAfter = await browser.boundingBox()

    expect(boxBefore?.x).toBeCloseTo(boxAfter?.x ?? 0, 0)
    expect(boxBefore?.y).toBeCloseTo(boxAfter?.y ?? 0, 0)
  })
})
