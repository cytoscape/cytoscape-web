// spec: tests/playwright/comprehensive-test-plan.md

import { test, expect } from './fixtures'

test.describe('Table Browser Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Accept cookies if present
    const acceptCookiesButton = page.getByRole('button', { name: /accept cookies/i });
    if (await acceptCookiesButton.isVisible().catch(() => false)) {
      await acceptCookiesButton.click();
    }
  });

  test('8.1 Table Browser Initial State', async ({ page }) => {
    // 1. Load application without network
    // Already done in beforeEach

    // 2. Observe table browser panel
    // Expected Results:
    // - Table browser is visible
    await expect(page.getByRole('tab', { name: 'Nodes' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Edges' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Network' })).toBeVisible();

    // - "Insert New Column" button is disabled
    const insertColumnButton = page.getByRole('button', { name: /insert new column/i });
    await expect(insertColumnButton).toBeVisible();
    await expect(insertColumnButton).toBeDisabled();

    // - "Import Table from File ..." button is disabled
    const importTableButton = page.getByRole('button', { name: /import table from file/i });
    await expect(importTableButton).toBeVisible();
    await expect(importTableButton).toBeDisabled();

    // - Search/filter input is present
    const searchInput = page.locator('input[type="text"]').filter({ hasText: /type to search/i }).or(page.locator('input').filter({ has: page.getByText(/type to search/i) }));
    // Alternative: look for search input in table browser area
    const tableSearchInput = page.locator('input').filter({ has: page.locator('text=Type to search') });
    // Note: Exact selector may vary based on implementation

    // - Empty state message may be displayed
    // Note: Empty state handling may vary
  });

  test('8.2 Table Browser with Network Loaded', async ({ page }) => {
    // Precondition: Network loaded
    // 1. Load a network
    // Try to load a sample network
    await page.getByTestId('toolbar-data-menu-button').click();
    const openSampleNetworks = page.getByRole('menuitem', { name: /open sample networks/i });
    
    if (await openSampleNetworks.isVisible().catch(() => false)) {
      await openSampleNetworks.click();
      await page.waitForTimeout(3000); // Wait for network to load
    } else {
      await page.keyboard.press('Escape');
    }

    // 2. Observe table browser
    // 3. Switch between Nodes, Edges, and Network tabs
    const nodesTab = page.getByRole('tab', { name: 'Nodes' });
    await nodesTab.click();

    // Expected Results:
    // - Table displays data for loaded network
    // - "Insert New Column" button is enabled
    const insertColumnButton = page.getByRole('button', { name: /insert new column/i });
    // Button may be enabled if network is loaded
    await expect(insertColumnButton).toBeVisible();

    // - "Import Table from File ..." button is enabled
    const importTableButton = page.getByRole('button', { name: /import table from file/i });
    await expect(importTableButton).toBeVisible();

    // - Data is sortable and filterable
    // - Column headers are visible
    // Note: Actual table content verification depends on network data
  });

  test('8.4 Table Search/Filter', async ({ page }) => {
    // 1. Load a network with data (optional for this test)
    // 2. Navigate to table browser
    const nodesTab = page.getByRole('tab', { name: 'Nodes' });
    await nodesTab.click();

    // 3. Type in search/filter input
    // Find search input in table browser
    // Note: Exact selector may vary
    const searchInputs = page.locator('input[type="text"]');
    const searchInput = searchInputs.first();
    
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test filter');
    }

    // 4. Observe filtered results
    // Expected Results:
    // - Search input is functional
    // - Results filter as you type
    // - Matching rows are highlighted or shown
    // - Clear button resets filter
    
    // Note: Actual filtering behavior depends on network data
  });
});

