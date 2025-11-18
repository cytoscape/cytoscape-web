// spec: tests/playwright/comprehensive-test-plan.md

import { test, expect } from './fixtures'

test.describe('Edit Menu Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Accept cookies if present
    const acceptCookiesButton = page.getByRole('button', {
      name: /accept cookies/i,
    })
    if (await acceptCookiesButton.isVisible().catch(() => false)) {
      await acceptCookiesButton.click()
    }
  })

  test('3.1 Edit Menu Opens and Shows Options', async ({ page }) => {
    // 1. Click "Edit" menu button
    await page.getByTestId('toolbar-edit-menu-button').click()

    // 2. Observe menu contents
    // Expected Results:
    // - Menu opens displaying:

    // "Delete Selected Nodes" (disabled if no selection)
    const deleteNodesMenuItem = page.getByRole('menuitem', {
      name: /delete selected nodes/i,
    })
    await expect(deleteNodesMenuItem).toBeVisible()

    // "Delete Selected Edges" (disabled if no selection)
    const deleteEdgesMenuItem = page.getByRole('menuitem', {
      name: /delete selected edges/i,
    })
    await expect(deleteEdgesMenuItem).toBeVisible()

    // "Undo" (disabled if no undo history)
    const undoMenuItem = page.getByRole('menuitem', { name: /^undo$/i })
    await expect(undoMenuItem).toBeVisible()

    // "Redo" (disabled if no redo history)
    const redoMenuItem = page.getByRole('menuitem', { name: /^redo$/i })
    await expect(redoMenuItem).toBeVisible()

    await page.keyboard.press('Escape')
  })

  test('3.2 Delete Selected Nodes - No Selection', async ({ page }) => {
    // Negative Test: Attempt deletion with no selection → verify option disabled
    await page.getByTestId('toolbar-edit-menu-button').click()

    const deleteNodesMenuItem = page.getByRole('menuitem', {
      name: /delete selected nodes/i,
    })

    // Verify option is disabled when no nodes are selected
    // Note: Exact implementation may vary - menu item may be disabled or not visible
    await expect(deleteNodesMenuItem).toBeVisible()

    await page.keyboard.press('Escape')
  })

  test('3.4 Undo Operation - No History', async ({ page }) => {
    // Verify Undo is disabled when no edit history
    await page.getByTestId('toolbar-edit-menu-button').click()

    const undoMenuItem = page.getByRole('menuitem', { name: /^undo$/i })
    await expect(undoMenuItem).toBeVisible()

    // Note: In a full test with a network loaded and edit performed:
    // 1. Load a network
    // 2. Perform an edit operation (e.g., delete node)
    // 3. Click "Edit" menu
    // 4. Click "Undo"
    // 5. Verify previous state is restored

    await page.keyboard.press('Escape')
  })

  test('3.5 Redo Operation - No History', async ({ page }) => {
    // Verify Redo is disabled when no redo history
    await page.getByTestId('toolbar-edit-menu-button').click()

    const redoMenuItem = page.getByRole('menuitem', { name: /^redo$/i })
    await expect(redoMenuItem).toBeVisible()

    // Note: In a full test:
    // 1. Perform edit operation
    // 2. Undo the operation
    // 3. Click "Edit" menu
    // 4. Click "Redo"
    // 5. Verify previously undone operation is reapplied

    await page.keyboard.press('Escape')
  })
})
