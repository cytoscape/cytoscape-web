// spec: tests/playwright/comprehensive-test-plan.md

import { test, expect } from './fixtures'

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Accept cookies if present
    const acceptCookiesButton = page.getByRole('button', { name: /accept cookies/i });
    if (await acceptCookiesButton.isVisible().catch(() => false)) {
      await acceptCookiesButton.click();
    }
  });

  test('11.1 Invalid Network Load - Non-existent NDEx UUID', async ({ page }) => {
    // 1. Attempt to load non-existent NDEx network
    await page.getByTestId('toolbar-data-menu-button').click();
    await page.getByRole('menuitem', { name: /open network.*from ndex/i }).click();

    const dialog = page.getByTestId('load-from-ndex-dialog');
    await expect(dialog).toBeVisible();

    // Enter non-existent UUID
    const searchInput = page.getByTestId('load-from-ndex-search-input').locator('input');
    await searchInput.fill('00000000-0000-0000-0000-000000000000');
    await page.getByTestId('load-from-ndex-search-button').click();

    await page.waitForTimeout(3000);

    // Expected Results:
    // - Error message is displayed clearly
    // - Application does not crash
    // - User can recover and try again
    // - Error state is clear
    
    // Verify application is still functional
    await expect(page.getByTestId('workspace-editor')).toBeVisible();
    
    // Close dialog
    await page.keyboard.press('Escape');
  });

  test('11.2 Network Load Failure - Invalid UUID Format', async ({ page }) => {
    // 1. Attempt to load network with invalid UUID format
    await page.getByTestId('toolbar-data-menu-button').click();
    await page.getByRole('menuitem', { name: /open network.*from ndex/i }).click();

    const dialog = page.getByTestId('load-from-ndex-dialog');
    await expect(dialog).toBeVisible();

    const searchInput = page.getByTestId('load-from-ndex-search-input').locator('input');
    await searchInput.fill('invalid-uuid-format');
    await page.getByTestId('load-from-ndex-search-button').click();

    await page.waitForTimeout(2000);

    // Expected Results:
    // - Error handling is graceful
    // - User-friendly error message
    // - Application remains functional
    // - Option to retry or cancel
    
    // Verify application is still functional
    await expect(page.getByTestId('workspace-editor')).toBeVisible();
    
    // Close dialog
    await page.keyboard.press('Escape');
  });
});

