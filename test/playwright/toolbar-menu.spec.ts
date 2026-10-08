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

    // TieredMenu root items: "Import" and "Export" are visible
    await expect(page.getByRole('menuitem', { name: 'Import' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Export' })).toBeVisible()
  })

  test('Data menu closes on Escape', async ({ page }) => {
    await page.locator('[data-testid="toolbar-data-menu-menu-button"]').click()
    await expect(page.getByRole('menuitem', { name: 'Import' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('menuitem', { name: 'Import' }),
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

  // The About, Citation and Report a Bug rows (and Developer > Import
  // Database Snapshot) once rendered their dialog inside the menu row. When
  // the dialog took focus the menubar rework closed the menu as a focus-out,
  // which unmounted the dialog with it — the item looked dead. The dialogs
  // are owned by HelpMenu now; this guards the round trip either way.
  test('Help > About opens its dialog and the dialog closes the menu', async ({
    page,
  }) => {
    await page.locator('[data-testid="toolbar-help-menu-menu-button"]').click()
    await page.getByRole('menuitem', { name: 'About Cytoscape Web' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId('about-version-link')).toBeVisible()

    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(
      page.getByRole('menuitem', { name: 'About Cytoscape Web' }),
    ).toBeHidden()
  })
})
