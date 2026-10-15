import { type Page } from '@playwright/test'

import { expect, gotoAndSeedNetwork, test } from './fixtures'

/**
 * The in-app manual (/manual/*, #840) and its sandbox database (#839).
 *
 * The isolation test is the one that matters: a manual tab runs real stores on
 * a fixture network, and every store write persists. Those writes must land
 * in `cyweb-manual-db`, never in the editor's `cyweb-db`, and cross-tab sync
 * must not carry them into an open editor tab.
 */

/** Primary keys of one object store, read with the raw IndexedDB API. */
const storeKeys = async (
  page: Page,
  dbName: string,
  store: string,
): Promise<string[]> =>
  await page.evaluate(
    async ([name, storeName]) =>
      await new Promise<string[]>((resolve, reject) => {
        const open = indexedDB.open(name)
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          if (!db.objectStoreNames.contains(storeName)) {
            db.close()
            resolve([])
            return
          }
          const request = db
            .transaction(storeName, 'readonly')
            .objectStore(storeName)
            .getAllKeys()
          request.onsuccess = () => {
            db.close()
            resolve(request.result.map(String))
          }
          request.onerror = () => reject(request.error)
        }
      }),
    [dbName, store] as const,
  )

const uiStateRow = async (page: Page): Promise<string> =>
  await page.evaluate(
    async () =>
      await new Promise<string>((resolve, reject) => {
        const open = indexedDB.open('cyweb-db')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const request = db
            .transaction('uiState', 'readonly')
            .objectStore('uiState')
            .get('uistate')
          request.onsuccess = () => {
            db.close()
            resolve(JSON.stringify(request.result ?? null))
          }
          request.onerror = () => reject(request.error)
        }
      }),
  )

/** Opens a manual page and waits for its live demo to load its network. */
const openDemo = async (page: Page, path: string): Promise<string> => {
  await page.goto(path)
  const demo = page.locator('[data-testid="manual-live-demo"]')
  await expect(demo).toHaveAttribute('data-network-id', /.+/, {
    timeout: 30_000,
  })
  await expect(
    page.locator('[data-testid="manual-live-demo-renderer"] canvas').first(),
  ).toBeVisible()
  return (await demo.getAttribute('data-network-id')) ?? ''
}

test.describe('manual', () => {
  test('opens the first page without mounting the editor', async ({ page }) => {
    await page.goto('/manual')
    await expect(page).toHaveURL(/\/manual\/introduction$/)
    await expect(page.locator('[data-testid="manual-page"]')).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.locator('[data-testid="manual-nav"]')).toBeVisible()
    await expect(page.locator('[data-testid="app-shell"]')).toHaveCount(0)
  })

  test('maps a Read the Docs link to the same page and section', async ({
    page,
  }) => {
    await page.goto('/manual/en/latest/Styles.html#how-mappings-work')
    await expect(page).toHaveURL(/\/manual\/styles#how-mappings-work$/)
    await expect(page.locator('h2#how-mappings-work')).toBeInViewport({
      timeout: 30_000,
    })
  })

  test('lists the visual properties generated from the model', async ({
    page,
  }) => {
    await page.goto('/manual/styles')
    const nodeTable = page.locator(
      '[data-testid="manual-visual-properties-node"]',
    )
    await expect(nodeTable).toContainText('Fill Color', { timeout: 30_000 })
    await expect(nodeTable).toContainText('Image/Chart 1–9')
  })

  test('demo writes stay in the sandbox and never reach the editor', async ({
    context,
  }) => {
    const editor = await context.newPage()
    await gotoAndSeedNetwork(editor)
    await editor.evaluate(() => {
      ;(window as unknown as { __survived?: boolean }).__survived = true
    })
    const editorNetworksBefore = await storeKeys(
      editor,
      'cyweb-db',
      'cyNetworks',
    )

    const manual = await context.newPage()
    const demoId = await openDemo(manual, '/manual/styles')

    // A style edit in the demo, through the same API the Style panel's
    // stores persist from.
    const result = await manual.evaluate(
      (id) =>
        (
          window as unknown as {
            CyWebApi: {
              visualStyle: {
                setDefault: (
                  networkId: string,
                  vp: string,
                  value: string,
                ) => { success: boolean }
              }
            }
          }
        ).CyWebApi.visualStyle.setDefault(id, 'nodeBackgroundColor', '#ff0000'),
      demoId,
    )
    expect(result.success).toBe(true)

    // The sandbox holds the demo's rows.
    await expect
      .poll(
        async () => await storeKeys(manual, 'cyweb-manual-db', 'cyNetworks'),
      )
      .toContain(demoId)
    await expect
      .poll(
        async () =>
          await storeKeys(manual, 'cyweb-manual-db', 'cyVisualStyles'),
      )
      .toContain(demoId)

    // dexie-observable polls at up to 500 ms; give a leak time to arrive.
    await editor.waitForTimeout(2_000)

    expect(await storeKeys(editor, 'cyweb-db', 'cyNetworks')).toEqual(
      editorNetworksBefore,
    )
    expect(await storeKeys(editor, 'cyweb-db', 'cyVisualStyles')).not.toContain(
      demoId,
    )
    // The editor writes its own uiState row on its own schedule, so compare
    // content, not the whole row: nothing in it may name the demo network.
    expect(await uiStateRow(editor)).not.toContain(demoId)
    expect(
      await editor.evaluate(
        () => (window as unknown as { __survived?: boolean }).__survived,
      ),
    ).toBe(true)

    await manual.close()
    await editor.close()
  })

  test('Help → User Manual opens the manual in a new tab', async ({
    page,
    context,
  }) => {
    await gotoAndSeedNetwork(page)
    await page.locator('[data-testid="toolbar-help-menu-menu-button"]').click()
    const [manual] = await Promise.all([
      context.waitForEvent('page'),
      page.locator('[data-testid="help-menu-user-manual"]').click(),
    ])
    await expect(manual).toHaveURL(/\/manual\/introduction$/, {
      timeout: 30_000,
    })
    await expect(manual.locator('[data-testid="manual-page"]')).toBeVisible()
  })
})
