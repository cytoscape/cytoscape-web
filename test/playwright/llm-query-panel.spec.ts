import { expect, gotoAndSeedNetwork, test } from './fixtures'

// The LLM QUERY tab is always present (not only for hierarchy networks) and
// walks the user through choosing a provider before a query can run.
test.describe('LLM Query panel', () => {
  test.beforeEach(async ({ page }) => {
    // A plain edge-list network: not a hierarchy
    await gotoAndSeedNetwork(page)
  })

  const openLLMTab = async (page: any) => {
    await page
      .locator('[data-testid="network-browser-panel-llm-query-tab"]')
      .click()
    await expect(
      page.locator('[data-testid="llm-query-result-panel"]'),
    ).toBeVisible()
  }

  test('the tab is shown for a network that is not a hierarchy', async ({
    page,
  }) => {
    await expect(
      page.locator('[data-testid="network-browser-panel-llm-query-tab"]'),
    ).toBeVisible()
    await openLLMTab(page)
  })

  test('without a provider the panel blocks the query and opens the options dialog', async ({
    page,
  }) => {
    await openLLMTab(page)

    await expect(
      page.locator('[data-testid="llm-query-setup-needed"]'),
    ).toContainText('No LLM provider is set up yet')
    await expect(
      page.locator('[data-testid="llm-query-gene-input"] input'),
    ).toBeDisabled()
    await expect(
      page.locator('[data-testid="llm-query-regenerate-button-disabled"]'),
    ).toBeDisabled()

    await page
      .locator('[data-testid="llm-query-select-provider-button"]')
      .click()
    await expect(
      page.locator('[data-testid="llm-query-options-dialog"]'),
    ).toBeVisible()

    await page
      .locator('[data-testid="llm-query-options-cancel-button"]')
      .click()
    await expect(
      page.locator('[data-testid="llm-query-options-dialog"]'),
    ).not.toBeVisible()
    // Nothing was chosen, so the panel still asks for a provider
    await expect(
      page.locator('[data-testid="llm-query-setup-needed"]'),
    ).toBeVisible()
  })

  test('choosing a provider in the dialog unlocks the panel', async ({
    page,
  }) => {
    await openLLMTab(page)
    await page
      .locator('[data-testid="llm-query-select-provider-button"]')
      .click()

    // Ollama pre-fills its local endpoint, which is enough to be set up.
    // Confirm sends no request, so no Ollama server is needed.
    await page
      .locator('[data-testid="llm-query-options-provider-select"]')
      .getByRole('combobox')
      .click()
    await page
      .locator('[data-testid="llm-query-options-provider-ollama"]')
      .click()
    await page
      .locator('[data-testid="llm-query-options-confirm-button"]')
      .click()
    await expect(
      page.locator('[data-testid="llm-query-options-dialog"]'),
    ).not.toBeVisible()

    await expect(
      page.locator('[data-testid="llm-query-setup-needed"]'),
    ).toHaveCount(0)
    const geneInput = page.locator('[data-testid="llm-query-gene-input"] input')
    await expect(geneInput).toBeEnabled()
    await geneInput.fill('FOXA1, HNF1A')
    await expect(
      page.locator('[data-testid="llm-query-regenerate-button"]'),
    ).toBeEnabled()
  })
})
