import { expect, gotoAndSeedNetwork, test } from './fixtures'

// Tests for the LLMQueryOptionsDialog extracted in commit 12f0f3a4.
// Verifies dialog opens from Analysis menu with all fields present,
// preview toggling, and cancel/dismiss behavior.
// The toolbar uses PrimeReact TieredMenu with custom templates; menu items are
// found by visible text rather than ARIA roles.

test.describe('LLM Query Options Dialog', () => {
  test.beforeEach(async ({ page }) => {
    // The Analysis menu is disabled while the workspace is empty; navigate and
    // seed a network so the menu button is enabled and can be opened.
    await gotoAndSeedNetwork(page)
  })

  const openDialog = async (page: any) => {
    await page
      .locator('[data-testid="toolbar-analysis-menu-menu-button"]')
      .click()
    // DropdownMenuItem renders label text directly — wait for it to be visible
    await page.getByText('LLM Query Options...').click()
    await expect(
      page.locator('[data-testid="llm-query-options-dialog"]'),
    ).toBeVisible()
  }

  test('dialog opens from Analysis menu', async ({ page }) => {
    await openDialog(page)
  })

  test('dialog contains all expected fields', async ({ page }) => {
    await openDialog(page)
    await expect(
      page.locator('[data-testid="llm-query-options-model-select"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="llm-query-options-api-key-input"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="llm-query-options-template-select"]'),
    ).toBeVisible()
  })

  test('preview button toggles prompt template preview', async ({ page }) => {
    await openDialog(page)

    const previewButton = page.locator(
      '[data-testid="llm-query-options-preview-button"]',
    )
    await expect(previewButton).toBeVisible()

    // Click preview to show template content; copy button appears once open
    await previewButton.click()
    await expect(
      page.locator('[data-testid="llm-query-options-copy-button"]'),
    ).toBeVisible()
  })

  test('cancel button closes the dialog', async ({ page }) => {
    await openDialog(page)

    await page
      .locator('[data-testid="llm-query-options-cancel-button"]')
      .click()

    await expect(
      page.locator('[data-testid="llm-query-options-dialog"]'),
    ).not.toBeVisible()
  })
})
