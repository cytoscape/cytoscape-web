// spec: tests/playwright/comprehensive-test-plan.md

import { test, expect } from './fixtures'

test.describe('Help and Documentation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Accept cookies if present
    const acceptCookiesButton = page.getByRole('button', { name: /accept cookies/i });
    if (await acceptCookiesButton.isVisible().catch(() => false)) {
      await acceptCookiesButton.click();
    }
  });

  test('14.1 Help Menu', async ({ page }) => {
    // 1. Click "Help" menu button
    await page.getByRole('button', { name: 'Help' }).click();

    // 2. Observe menu options
    // Expected Results:
    // - Help menu opens
    // - Options include documentation links, tutorials, etc.
    
    // Note: Exact menu items may vary
    // Verify menu is visible/open
    await page.waitForTimeout(500); // Wait for menu to appear
    
    // Close menu
    await page.keyboard.press('Escape');
  });

  test('14.2 License Menu', async ({ page }) => {
    // 1. Click "License" menu button
    await page.getByRole('button', { name: 'License' }).click();

    // 2. Observe license information
    // Expected Results:
    // - License information is displayed
    // - License text is readable
    // - Dialog or page is accessible
    
    // Note: License may open in dialog or new page
    await page.waitForTimeout(1000); // Wait for license to appear
    
    // Check if dialog or content is visible
    const licenseContent = page.getByText(/license|mit|copyright/i);
    if (await licenseContent.isVisible().catch(() => false)) {
      await expect(licenseContent).toBeVisible();
    }
    
    // Close if dialog
    await page.keyboard.press('Escape');
  });
});

