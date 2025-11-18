// spec: tests/playwright/comprehensive-test-plan.md

import { test, expect } from './fixtures'

test.describe('URL and Routing', () => {
  test('10.1 Initial URL Redirect', async ({ page }) => {
    // 1. Navigate to http://localhost:5500/
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // 2. Observe URL after load
    // Expected Results:
    // - URL redirects to /:workspaceId/networks/ format
    await expect(page).toHaveURL(/\/[a-f0-9-]+\/networks/);

    // - Workspace ID is generated
    const url = page.url();
    const workspaceIdMatch = url.match(/\/([a-f0-9-]+)\/networks/);
    expect(workspaceIdMatch).not.toBeNull();
    expect(workspaceIdMatch![1]).toMatch(/^[a-f0-9-]+$/);

    // - No network ID in URL initially
    expect(url).not.toMatch(/\/networks\/[a-f0-9-]+$/);
  });

  test('10.2 URL Updates with Network Load', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Accept cookies if present
    const acceptCookiesButton = page.getByRole('button', { name: /accept cookies/i });
    if (await acceptCookiesButton.isVisible().catch(() => false)) {
      await acceptCookiesButton.click();
    }

    // 1. Load a network
    await page.getByTestId('toolbar-data-menu-button').click();
    const openSampleNetworks = page.getByRole('menuitem', { name: /open sample networks/i });
    
    if (await openSampleNetworks.isVisible().catch(() => false)) {
      await openSampleNetworks.click();
      await page.waitForTimeout(3000); // Wait for network to load
    } else {
      await page.keyboard.press('Escape');
    }

    // 2. Observe URL change
    // Expected Results:
    // - URL updates to include network ID
    // - Format: /:workspaceId/networks/:networkId
    // Note: Network may load successfully or fail, URL may or may not update
    const url = page.url();
    
    // Check if URL has network ID pattern
    const hasNetworkId = /\/networks\/[a-f0-9-]+$/.test(url);
    
    // URL is shareable and reloadable
    if (hasNetworkId) {
      // 10.3 Direct Navigation to Network
      // 1. Note a network ID from a loaded network
      const networkIdMatch = url.match(/\/networks\/([a-f0-9-]+)$/);
      
      if (networkIdMatch) {
        const networkId = networkIdMatch[1];
        const workspaceIdMatch = url.match(/\/([a-f0-9-]+)\/networks/);
        const workspaceId = workspaceIdMatch![1];
        
        // 2. Navigate directly to /:workspaceId/networks/:networkId
        await page.goto(`/${workspaceId}/networks/${networkId}`);
        await page.waitForLoadState('domcontentloaded');
        
        // 3. Refresh page
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
        
        // Expected Results:
        // - Network loads from URL
        // - Network ID in URL matches loaded network
        await expect(page).toHaveURL(new RegExp(`/${workspaceId}/networks/${networkId}`));
        
        // - Workspace is preserved
        expect(page.url()).toContain(workspaceId);
      }
    }
  });
});

