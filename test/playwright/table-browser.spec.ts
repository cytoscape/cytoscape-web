import { test, expect } from './fixtures'
import { gotoAndSeedNetwork, gotoAndWaitReady } from './fixtures'

test.describe('Table Browser', () => {
  test.describe('1. Basic Rendering & Tabs', () => {
    test('1.1 Initial Load without Network', async ({ page }) => {
      // Navigate to app without seeding a network. Use the shared helper rather
      // than a bare goto + toBeVisible: the latter gives a whole app boot only
      // expect's 5s default, which is the one thing that still failed the suite.
      await gotoAndWaitReady(page)

      // Table browser tabs should be visible
      const tabs = page.locator('[data-testid="table-browser-tabs"]')
      await expect(tabs).toBeVisible()

      // The network tab should be selected by default, or nodes tab
      await expect(page.locator('[data-testid="table-browser-nodes-tab"]')).toBeVisible()

      // Import button should be disabled when no network is loaded
      const importButton = page.locator('[data-testid="import-table-button"]')
      await expect(importButton).toBeDisabled()
    })

    test('1.2 Tab Switching', async ({ page }) => {
      await gotoAndSeedNetwork(page)

      // By default Nodes tab is active, so node editor is visible
      await expect(page.locator('[data-testid="table-browser-node-editor"]')).toBeVisible()

      // Switch to Edges tab
      await page.click('[data-testid="table-browser-edges-tab"]')
      await expect(page.locator('[data-testid="table-browser-edge-editor"]')).toBeVisible()

      // Switch to Network tab
      await page.click('[data-testid="table-browser-network-tab"]')
      // Network info panel should be visible
      await expect(page.locator('[data-testid="network-info-panel"]').getByText('Test Network')).toBeVisible()
    })
  })

  test.describe('3. Column Operations', () => {
    test('3.1 Insert Column', async ({ page }) => {
      await gotoAndSeedNetwork(page)
      await expect(page.locator('[data-testid="table-browser-nodes-tab"]')).toBeVisible()

      // Click Insert Column button
      await page.click('[data-testid="insert-column-button"]')
      await expect(page.locator('[data-testid="create-table-column-dialog"]')).toBeVisible()

      // Fill in column name
      await page.fill('[data-testid="create-table-column-name-input"] input', 'Test Column')
      
      // Default type is String, default value empty. Fill a default value
      await page.fill('[data-testid="create-table-column-default-value-input"] input', 'test_val')

      // Submit
      await page.click('[data-testid="create-table-column-confirm-button"]')

      // Dialog should close
      await expect(page.locator('[data-testid="create-table-column-dialog"]')).not.toBeVisible()

      // Verify the column was added and the default value applied using CyWebApi
      const nodeTableResult = await page.evaluate(() => {
        const api = (window as any).CyWebApi
        const currentNetworkIdResult = api.workspace.getCurrentNetworkId()
        const currentNetworkId = currentNetworkIdResult.data.networkId
        return api.table.getTable(currentNetworkId, 'node')
      })

      expect(nodeTableResult).toEqual(expect.objectContaining({ success: true }))
      const tableData = nodeTableResult.data
      
      // Expect column to exist
      expect(tableData.columns.find((c: any) => c.name === 'Test Column')).toBeDefined()

      // Expect rows to have the default value
      expect(tableData.rows.length).toBeGreaterThan(0)
      for (const row of tableData.rows) {
        expect(row['Test Column']).toBe('test_val')
      }
    })
  })

  test.describe('6. Toolbar Operations', () => {
    test('6.1 Import Table Dialog', async ({ page }) => {
      await gotoAndSeedNetwork(page)
      await expect(page.locator('[data-testid="table-browser-nodes-tab"]')).toBeVisible()

      // Click Import Table button
      await page.click('[data-testid="import-table-button"]')

      // Verify the join table to network dialog appears
      await expect(page.locator('[data-testid="join-table-upload-dropzone"]')).toBeVisible()

      // Close the dialog by pressing Escape
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-testid="join-table-upload-dropzone"]')).not.toBeVisible()
    })
  })
})
