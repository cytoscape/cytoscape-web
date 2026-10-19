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
      page.locator('[data-testid="llm-query-options-provider-select"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="llm-query-options-model-select"]'),
    ).toBeVisible()
    // OpenAI is the default provider and needs no endpoint field
    await expect(
      page.locator('[data-testid="llm-query-options-base-url-input"]'),
    ).toHaveCount(0)
    await expect(
      page.locator('[data-testid="llm-query-options-api-key-input"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="llm-query-options-template-select"]'),
    ).toBeVisible()
  })

  test('selecting Ollama shows the local endpoint and a typed model is kept', async ({
    page,
  }) => {
    await openDialog(page)

    await page
      .locator('[data-testid="llm-query-options-provider-select"]')
      .getByRole('combobox')
      .click()
    await page
      .locator('[data-testid="llm-query-options-provider-ollama"]')
      .click()

    const baseUrl = page
      .locator('[data-testid="llm-query-options-base-url-input"]')
      .getByRole('textbox')
    await expect(baseUrl).toHaveValue('http://localhost:11434/v1')
    await expect(
      page.locator('[data-testid="llm-query-options-refresh-models-button"]'),
    ).toBeVisible()

    const modelInput = page.locator(
      '[data-testid="llm-query-options-model-input"]',
    )
    await modelInput.fill('qwen2.5:7b')
    // Leave the field so any suggestion popup closes, as a user would
    await modelInput.press('Tab')
    await page
      .locator('[data-testid="llm-query-options-confirm-button"]')
      .click()
    await expect(
      page.locator('[data-testid="llm-query-options-dialog"]'),
    ).not.toBeVisible()

    // Reopen: the dialog seeds its fields from the store
    await openDialog(page)
    await expect(modelInput).toHaveValue('qwen2.5:7b')
    await expect(baseUrl).toHaveValue('http://localhost:11434/v1')
  })

  test('cancel discards unsaved edits: reopening shows the stored settings', async ({
    page,
  }) => {
    await openDialog(page)

    await page
      .locator('[data-testid="llm-query-options-provider-select"]')
      .getByRole('combobox')
      .click()
    await page
      .locator('[data-testid="llm-query-options-provider-ollama"]')
      .click()
    await expect(
      page.locator('[data-testid="llm-query-options-base-url-input"]'),
    ).toBeVisible()

    await page
      .locator('[data-testid="llm-query-options-cancel-button"]')
      .click()
    await expect(
      page.locator('[data-testid="llm-query-options-dialog"]'),
    ).not.toBeVisible()

    // The Analysis menu keeps the dialog mounted; the form must still re-seed
    await openDialog(page)
    await expect(
      page.locator('[data-testid="llm-query-options-base-url-input"]'),
    ).toHaveCount(0)
    await expect(
      page.locator('[data-testid="llm-query-options-model-input"]'),
    ).toHaveValue('gpt-6-luna')
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

// The WebGPU check runs against a stubbed navigator.gpu so the result does not
// depend on the CI machine's GPU. Init scripts only apply to later
// navigations, so each test installs its stub before loading the app.
test.describe('LLM Query Options Dialog: WebLLM provider', () => {
  const openDialog = async (page: any) => {
    await page
      .locator('[data-testid="toolbar-analysis-menu-menu-button"]')
      .click()
    await page.getByText('LLM Query Options...').click()
    await expect(
      page.locator('[data-testid="llm-query-options-dialog"]'),
    ).toBeVisible()
  }

  const selectWebLLM = async (page: any) => {
    await page
      .locator('[data-testid="llm-query-options-provider-select"]')
      .getByRole('combobox')
      .click()
    await page
      .locator('[data-testid="llm-query-options-provider-webllm"]')
      .click()
  }

  const stubGpu = async (page: any, supported: boolean) => {
    await page.addInitScript((hasGpu: boolean) => {
      const gpu = hasGpu
        ? {
            requestAdapter: async () => ({
              features: new Set(['shader-f16']),
              info: { vendor: 'test', description: 'Playwright GPU' },
            }),
          }
        : undefined
      Object.defineProperty(Navigator.prototype, 'gpu', {
        configurable: true,
        get: () => gpu,
      })
    }, supported)
  }

  test('without WebGPU the model selector and Confirm are disabled', async ({
    page,
  }) => {
    await stubGpu(page, false)
    await gotoAndSeedNetwork(page)
    await openDialog(page)
    await selectWebLLM(page)

    await expect(
      page.locator('[data-testid="llm-query-options-webgpu-unsupported"]'),
    ).toContainText('does not support WebGPU')
    await expect(
      page
        .locator('[data-testid="llm-query-options-webllm-model-select"]')
        .getByRole('combobox'),
    ).toHaveAttribute('aria-disabled', 'true')
    await expect(
      page.locator('[data-testid="llm-query-options-confirm-button"]'),
    ).toBeDisabled()
    // No endpoint or key for an in-browser model
    await expect(
      page.locator('[data-testid="llm-query-options-base-url-input"]'),
    ).toHaveCount(0)
    await expect(
      page.locator('[data-testid="llm-query-options-api-key-input"]'),
    ).toHaveCount(0)

    await page
      .locator('[data-testid="llm-query-options-cancel-button"]')
      .click()
    await expect(
      page.locator('[data-testid="llm-query-options-dialog"]'),
    ).not.toBeVisible()
  })

  test('with WebGPU the curated models are offered with their sizes', async ({
    page,
  }) => {
    await stubGpu(page, true)
    await gotoAndSeedNetwork(page)
    await openDialog(page)
    await selectWebLLM(page)

    await expect(
      page.locator('[data-testid="llm-query-options-webgpu-supported"]'),
    ).toContainText('Playwright GPU')
    await expect(
      page.locator('[data-testid="llm-query-options-confirm-button"]'),
    ).toBeEnabled()

    await page
      .locator('[data-testid="llm-query-options-webllm-model-select"]')
      .getByRole('combobox')
      .click()
    await expect(
      page.locator(
        '[data-testid="llm-query-options-webllm-model-Qwen2.5-3B-Instruct-q4f16_1-MLC"]',
      ),
    ).toContainText('1.7 GB download')
    await page
      .locator(
        '[data-testid="llm-query-options-webllm-model-Llama-3.2-3B-Instruct-q4f16_1-MLC"]',
      )
      .click()
    await expect(
      page.locator('[data-testid="llm-query-options-webllm-status"]'),
    ).toHaveText('Loads in the background after Confirm')
  })

  test('a model that cannot be downloaded shows the failure in the LLM Query panel', async ({
    page,
  }) => {
    // Block the model hosts, so Confirm never starts a real download
    const blocked: string[] = []
    await page
      .context()
      .route(
        /^https:\/\/(huggingface\.co|raw\.githubusercontent\.com)\//,
        (route: any) => {
          blocked.push(route.request().url())
          return route.abort()
        },
      )
    await stubGpu(page, true)
    await gotoAndSeedNetwork(page)
    await openDialog(page)
    await selectWebLLM(page)
    await expect(
      page.locator('[data-testid="llm-query-options-confirm-button"]'),
    ).toBeEnabled()
    await page
      .locator('[data-testid="llm-query-options-confirm-button"]')
      .click()

    await expect(
      page.locator('[data-testid="llm-query-webllm-error"]'),
    ).toBeVisible({ timeout: 30_000 })
    expect(blocked.some((url) => url.includes('huggingface.co'))).toBe(true)
  })
})
