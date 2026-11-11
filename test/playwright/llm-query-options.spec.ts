import type { Page } from '@playwright/test'

import {
  LLM_API_KEYS_SESSION_KEY,
  LLM_QUERY_OPTIONS_SETTING,
} from '../../src/features/LLMQuery/store/storageKeys'
import { expect, gotoAndSeedNetwork, test } from './fixtures'

// Tests for the LLMQueryOptionsDialog extracted in commit 12f0f3a4.
// Verifies dialog opens from Analysis menu with all fields present,
// preview toggling, and cancel/dismiss behavior.
// The toolbar uses PrimeReact TieredMenu with custom templates; menu items are
// found by visible text rather than ARIA roles.

/**
 * The LLM Query options row of the profile database, or undefined. Checks
 * `indexedDB.databases()` first, because opening a missing database creates it.
 */
const savedOptions = (page: Page): Promise<unknown> =>
  page.evaluate(async (settingKey) => {
    const databases = await indexedDB.databases()
    if (!databases.some((info) => info.name === 'cyweb-profile-db')) {
      return undefined
    }
    return await new Promise<unknown>((resolve) => {
      const open = indexedDB.open('cyweb-profile-db')
      open.onerror = () => resolve(undefined)
      open.onsuccess = () => {
        const db = open.result
        if (!db.objectStoreNames.contains('settings')) {
          db.close()
          resolve(undefined)
          return
        }
        const get = db
          .transaction('settings', 'readonly')
          .objectStore('settings')
          .get(settingKey)
        get.onsuccess = () => {
          db.close()
          resolve((get.result as { value?: unknown } | undefined)?.value)
        }
        get.onerror = () => {
          db.close()
          resolve(undefined)
        }
      }
    })
  }, LLM_QUERY_OPTIONS_SETTING)

/**
 * Everything this origin keeps outside sessionStorage, as one string: every
 * row of every IndexedDB database, and all of localStorage.
 */
const durableStorageDump = (page: Page): Promise<string> =>
  page.evaluate(async () => {
    const parts: string[] = [JSON.stringify({ ...window.localStorage })]
    for (const info of await indexedDB.databases()) {
      if (info.name === undefined) continue
      const name = info.name
      const rows = await new Promise<unknown[]>((resolve) => {
        const open = indexedDB.open(name)
        open.onerror = () => resolve([])
        open.onsuccess = () => {
          const db = open.result
          const stores = Array.from(db.objectStoreNames)
          if (stores.length === 0) {
            db.close()
            resolve([])
            return
          }
          const transaction = db.transaction(stores, 'readonly')
          const requests = stores.map((store) =>
            transaction.objectStore(store).getAll(),
          )
          transaction.oncomplete = () => {
            db.close()
            resolve(requests.map((request) => request.result))
          }
          transaction.onabort = () => {
            db.close()
            resolve([])
          }
        }
      })
      parts.push(name, JSON.stringify(rows))
    }
    return parts.join('\n')
  })

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

  // #849: provider, endpoint and model are kept in the profile database.
  test('provider, endpoint and model are still set after a reload', async ({
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
    const modelInput = page.locator(
      '[data-testid="llm-query-options-model-input"]',
    )
    await modelInput.fill('qwen2.5:7b')
    await modelInput.press('Tab')
    await page
      .locator('[data-testid="llm-query-options-confirm-button"]')
      .click()
    await expect(
      page.locator('[data-testid="llm-query-options-dialog"]'),
    ).not.toBeVisible()

    // The write is not awaited by the store: reloading before the row has
    // landed would lose it.
    await expect
      .poll(() => savedOptions(page), { timeout: 15000 })
      .toEqual({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'qwen2.5:7b',
      })

    // A fresh document in the same tab
    await gotoAndSeedNetwork(page)

    await openDialog(page)
    await expect(modelInput).toHaveValue('qwen2.5:7b')
    await expect(
      page
        .locator('[data-testid="llm-query-options-base-url-input"]')
        .getByRole('textbox'),
    ).toHaveValue('http://localhost:11434/v1')
  })

  // #849: the key is kept in this tab's sessionStorage and nowhere else.
  test('the API key survives a reload in this tab and is stored nowhere else', async ({
    page,
  }) => {
    const key = 'sk-e2e-not-a-real-key'
    const keyInput = page.locator(
      '[data-testid="llm-query-options-api-key-input"] input',
    )
    const forgetKey = page.locator(
      '[data-testid="llm-query-options-forget-key-button"]',
    )
    const sessionKeys = (): Promise<string | null> =>
      page.evaluate(
        (name) => window.sessionStorage.getItem(name),
        LLM_API_KEYS_SESSION_KEY,
      )

    await openDialog(page)
    await expect(keyInput).toHaveAttribute('type', 'password')
    await expect(forgetKey).toHaveCount(0)
    await keyInput.fill(key)
    await page
      .locator('[data-testid="llm-query-options-confirm-button"]')
      .click()
    await expect(
      page.locator('[data-testid="llm-query-options-dialog"]'),
    ).not.toBeVisible()
    expect(await sessionKeys()).toContain(key)
    // Wait for the options row, so the dump below sees every write of Confirm
    await expect
      .poll(() => savedOptions(page), { timeout: 15000 })
      .toBeDefined()

    await gotoAndSeedNetwork(page)

    // Still known after the reload: the dialog offers to forget it. It is
    // never put back in the field.
    await openDialog(page)
    await expect(forgetKey).toBeVisible()
    await expect(keyInput).toHaveValue('')
    expect(await sessionKeys()).toContain(key)
    expect(await durableStorageDump(page)).not.toContain(key)

    await forgetKey.click()
    await expect(forgetKey).toHaveCount(0)
    expect(await sessionKeys()).toBeNull()
  })

  // #849: a key is kept only for the provider it was entered for.
  test('confirming another provider forgets the API key, after a warning', async ({
    page,
  }) => {
    const sessionKeys = (): Promise<string | null> =>
      page.evaluate(
        (name) => window.sessionStorage.getItem(name),
        LLM_API_KEYS_SESSION_KEY,
      )
    const warning = page.locator(
      '[data-testid="llm-query-options-forget-warning"]',
    )
    const confirm = page.locator(
      '[data-testid="llm-query-options-confirm-button"]',
    )

    await openDialog(page)
    await page
      .locator('[data-testid="llm-query-options-api-key-input"] input')
      .fill('sk-e2e-not-a-real-key')
    await confirm.click()
    await expect(
      page.locator('[data-testid="llm-query-options-dialog"]'),
    ).not.toBeVisible()
    expect(await sessionKeys()).toContain('sk-e2e-not-a-real-key')

    await openDialog(page)
    await expect(warning).toHaveCount(0)
    await page
      .locator('[data-testid="llm-query-options-provider-select"]')
      .getByRole('combobox')
      .click()
    await page
      .locator('[data-testid="llm-query-options-provider-ollama"]')
      .click()
    await expect(warning).toContainText('OpenAI API key')
    // Still there until Confirm
    expect(await sessionKeys()).toContain('sk-e2e-not-a-real-key')

    await confirm.click()
    await expect(
      page.locator('[data-testid="llm-query-options-dialog"]'),
    ).not.toBeVisible()
    expect(await sessionKeys()).toBeNull()
  })

  // #849: Help > User Manual opens with an opener, so the new tab starts
  // with a copy of this tab's sessionStorage. The key must not stay in it.
  test('the manual tab does not keep a copy of the API key', async ({
    page,
    context,
  }) => {
    const sessionKeys = (target: Page): Promise<string | null> =>
      target.evaluate(
        (name) => window.sessionStorage.getItem(name),
        LLM_API_KEYS_SESSION_KEY,
      )

    await openDialog(page)
    await page
      .locator('[data-testid="llm-query-options-api-key-input"] input')
      .fill('sk-e2e-not-a-real-key')
    await page
      .locator('[data-testid="llm-query-options-confirm-button"]')
      .click()
    await expect(
      page.locator('[data-testid="llm-query-options-dialog"]'),
    ).not.toBeVisible()
    expect(await sessionKeys(page)).toContain('sk-e2e-not-a-real-key')

    await page.locator('[data-testid="toolbar-help-menu-menu-button"]').click()
    const [manual] = await Promise.all([
      context.waitForEvent('page'),
      page.locator('[data-testid="help-menu-user-manual"]').click(),
    ])
    await expect(manual.locator('[data-testid="manual-page"]')).toBeVisible({
      timeout: 30_000,
    })

    expect(await sessionKeys(manual)).toBeNull()
    // The editor tab keeps its own
    expect(await sessionKeys(page)).toContain('sk-e2e-not-a-real-key')
  })
})
