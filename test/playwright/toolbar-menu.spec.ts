import { expect, gotoAndSeedNetwork, test } from './fixtures'

// Tests for CW-715: darker toolbar visual identity (commit afdee4e5)
// Verifies the toolbar renders correctly and menus open/close via real clicks.
// The toolbar uses PrimeReact TieredMenu inside an OverlayPanel — opened menu items
// appear as `.p-menuitem-link` elements; `.p-tieredmenu` is the container per menu.

test.describe('Toolbar Menus', () => {
  test.beforeEach(async ({ page }) => {
    // Network-operating menus (e.g. Edit) are disabled while the workspace is
    // empty; navigate and seed a network so those menu buttons are enabled.
    await gotoAndSeedNetwork(page)
  })

  test('toolbar is visible after load', async ({ page }) => {
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible()
  })

  test('Data menu opens on click and shows Import and Export items', async ({
    page,
  }) => {
    await page.locator('[data-testid="toolbar-data-menu-menu-button"]').click()

    // Exact: "Export Workspace Backup..." is a sibling entry that would
    // otherwise also match a substring locator for "Export" (#697).
    await expect(
      page.getByRole('menuitem', { name: 'Import', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('menuitem', { name: 'Export', exact: true }),
    ).toBeVisible()
  })

  test('Data menu groups entries under local-first section headings', async ({
    page,
  }) => {
    await page.locator('[data-testid="toolbar-data-menu-menu-button"]').click()

    for (const section of [
      'Open',
      'Local Workspace',
      'Publish / Share',
      'Manage',
    ]) {
      await expect(
        page.locator(`[data-testid="menu-section-${section}"]`),
      ).toBeVisible()
    }

    // Workspace backup moved out of Help > Developer and was renamed for what
    // it is to a user (#697).
    await expect(
      page.getByRole('menuitem', { name: 'Export Workspace Backup...' }),
    ).toBeVisible()
    await expect(
      page.getByRole('menuitem', { name: 'Open Workspace Backup...' }),
    ).toBeVisible()
    await expect(
      page.getByRole('menuitem', { name: 'Clear Local Workspace...' }),
    ).toBeVisible()
  })

  test('Data menu section headings are not menu items', async ({ page }) => {
    await page.locator('[data-testid="toolbar-data-menu-menu-button"]').click()

    const heading = page.locator('[data-testid="menu-section-Manage"]')
    await expect(heading).toBeVisible()
    // No role="menuitem", which is what keeps arrow navigation from stopping
    // on a heading that does nothing (see DropdownMenu.spec.tsx).
    expect(await heading.getAttribute('role')).toBeNull()
  })

  test('Data menu closes on Escape', async ({ page }) => {
    await page.locator('[data-testid="toolbar-data-menu-menu-button"]').click()
    await expect(
      page.getByRole('menuitem', { name: 'Import', exact: true }),
    ).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('menuitem', { name: 'Import', exact: true }),
    ).not.toBeVisible()
  })

  test('Edit menu opens and shows Undo item', async ({ page }) => {
    await page.locator('[data-testid="toolbar-edit-menu-menu-button"]').click()

    // UndoMenuItem renders with label "Undo" when no history exists
    await expect(page.getByText('Undo').first()).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('Help menu opens and shows About item', async ({ page }) => {
    await page.locator('[data-testid="toolbar-help-menu-menu-button"]').click()
    await expect(
      page.getByRole('menuitem', { name: 'About Cytoscape Web' }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
  })
})
