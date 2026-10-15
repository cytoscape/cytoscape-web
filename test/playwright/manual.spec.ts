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

  test('the page list swaps pages in place', async ({ page }) => {
    await page.goto('/manual/styles')
    await expect(page.locator('[data-testid="manual-page"]')).toHaveAttribute(
      'data-slug',
      'styles',
      { timeout: 30_000 },
    )
    // A marker that a full page load would clear.
    await page.evaluate(() => {
      ;(window as unknown as { __sameDocument?: boolean }).__sameDocument = true
    })

    await page.locator('[data-testid="manual-nav-merge"]').click()

    await expect(page).toHaveURL(/\/manual\/merge$/)
    await expect(page.locator('[data-testid="manual-page"]')).toHaveAttribute(
      'data-slug',
      'merge',
    )
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __sameDocument?: boolean }).__sameDocument,
      ),
    ).toBe(true)
  })

  test('a link in page text opens the linked page and section', async ({
    page,
  }) => {
    await page.goto('/manual/introduction')
    const article = page.locator('[data-testid="manual-page"]')
    await expect(article).toHaveAttribute('data-slug', 'introduction', {
      timeout: 30_000,
    })
    await page.evaluate(() => {
      ;(window as unknown as { __sameDocument?: boolean }).__sameDocument = true
    })

    await article.locator('a[href$="/manual/styles"]').first().click()

    await expect(page).toHaveURL(/\/manual\/styles$/)
    await expect(article).toHaveAttribute('data-slug', 'styles')
    await expect(page.locator('[data-testid="app-shell"]')).toHaveCount(0)
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __sameDocument?: boolean }).__sameDocument,
      ),
    ).toBe(true)
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

  // Every page that carries a demo must start it. The list mirrors the
  // `<LiveDemo` uses in src/features/Manual/content/*.mdx.
  for (const slug of [
    'introduction',
    'quick-tour',
    'creating-networks',
    'node-and-edge-column-data',
    'styles',
    'filters',
    'merge',
    'export',
    'extending',
    'advanced',
  ]) {
    test(`the ${slug} page starts its live demo`, async ({ page }) => {
      await openDemo(page, `/manual/${slug}`)
    })
  }

  test('the merge demo merges two networks without leaving the manual', async ({
    page,
  }) => {
    await openDemo(page, '/manual/merge')
    await page.locator('[data-testid="manual-live-demo-merge"]').click()
    const dialog = page.locator('[data-testid="merge-dialog"]')
    await expect(dialog).toBeVisible({ timeout: 15_000 })

    await dialog.getByText('galFiltered chart_1', { exact: true }).click()
    await dialog.locator('button:has([data-testid="ArrowForwardIcon"])').click()
    await dialog.getByText('HSF1 neighborhood', { exact: true }).click()
    await dialog.locator('button:has([data-testid="ArrowForwardIcon"])').click()
    await dialog.locator('[data-testid="merge-dialog-merge-button"]').click()

    await expect(dialog).toBeHidden({ timeout: 15_000 })
    await expect(page).toHaveURL(/\/manual\/merge$/)
    await page
      .locator('[data-testid="manual-live-demo-network-picker"]')
      .click()
    await expect(page.getByRole('option')).toHaveCount(3)
  })

  test('the export demo opens the Export Network to Image dialog', async ({
    page,
  }) => {
    await openDemo(page, '/manual/export')
    await page.locator('[data-testid="manual-live-demo-export"]').click()
    await expect(
      page.locator('[data-testid="export-network-to-image-dialog"]'),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('the App API demo runs a call and shows its result', async ({
    page,
  }) => {
    await openDemo(page, '/manual/extending')
    await page.locator('[data-testid="manual-demo-api-run"]').first().click()
    await expect(
      page.locator('[data-testid="manual-demo-api-result"]'),
    ).toContainText('"success": true', { timeout: 15_000 })
  })

  test('the link demo encodes the selection', async ({ page }) => {
    const demoId = await openDemo(page, '/manual/advanced')
    await page.evaluate(
      (id) =>
        (
          window as unknown as {
            CyWebApi: {
              selection: {
                exclusiveSelect: (
                  n: string,
                  a: string[],
                  b: string[],
                ) => unknown
              }
            }
          }
        ).CyWebApi.selection.exclusiveSelect(id, ['7998'], []),
      demoId,
    )
    await expect(page.locator('[data-testid="manual-demo-url"]')).toContainText(
      'selectednodes=7998',
    )
  })

  test('the filter demo shows the FILTER tab', async ({ page }) => {
    await openDemo(page, '/manual/filters')
    await expect(page.locator('[data-testid="filter-tab"]')).toBeVisible()
  })

  test('the privacy page counts the workspace without writing to it', async ({
    context,
  }) => {
    const editor = await context.newPage()
    await gotoAndSeedNetwork(editor)
    await expect
      .poll(
        async () => (await storeKeys(editor, 'cyweb-db', 'summaries')).length,
      )
      .toBeGreaterThan(0)

    const manual = await context.newPage()
    await manual.goto('/manual/privacy-policy')
    const table = manual.locator('[data-testid="manual-browser-storage-db"]')
    await expect(table).toContainText('Network names, descriptions and sizes', {
      timeout: 30_000,
    })
    await manual.close()
    await editor.close()
  })

  test.describe('layouts', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('split pins the demo beside the text', async ({ page }) => {
      await openDemo(page, '/manual/styles?layout=split')
      const column = page.locator('[data-testid="manual-demo-column"]')
      await expect(
        column.locator('[data-testid="manual-live-demo"]'),
      ).toBeVisible()
      await expect(
        page.locator('[data-testid="manual-live-demo-pointer"]'),
      ).toBeVisible()

      // The demo stays in view while the text scrolls.
      await page.evaluate(() => window.scrollTo(0, 2000))
      await expect(column).toBeInViewport()
    })

    test('nested lists the current page sections and marks the one in view', async ({
      page,
    }) => {
      await page.goto('/manual/styles?layout=nested')
      const sections = page.locator('[data-testid="manual-nav-sections"]')
      await expect(sections).toContainText('How Mappings Work', {
        timeout: 30_000,
      })
      await expect(page.locator('[data-testid="manual-toc"]')).toHaveCount(0)

      await page
        .locator('[data-testid="manual-nav-section-how-mappings-work"]')
        .click()
      await expect(page).toHaveURL(/#how-mappings-work$/)
      await expect(
        page.locator('[data-testid="manual-nav-section-how-mappings-work"]'),
      ).toHaveAttribute('aria-current', 'location')
    })

    test('current keeps the original layout', async ({ page }) => {
      await page.goto('/manual/styles?layout=current')
      await expect(page.locator('[data-testid="manual-toc"]')).toBeVisible({
        timeout: 30_000,
      })
      await expect(
        page.locator('[data-testid="manual-nav-sections"]'),
      ).toHaveCount(0)
    })

    test('the switch changes the layout and remembers it', async ({ page }) => {
      await page.goto('/manual/merge')
      await page.locator('[data-testid="manual-layout-nested"]').click()
      await expect(page).toHaveURL(/layout=nested/)
      await expect(page.locator('[data-testid="manual-app"]')).toHaveAttribute(
        'data-layout',
        'nested',
      )

      await page.goto('/manual/export')
      await expect(page.locator('[data-testid="manual-app"]')).toHaveAttribute(
        'data-layout',
        'nested',
        { timeout: 30_000 },
      )
    })

    test('next and previous links walk the pages', async ({ page }) => {
      await page.goto('/manual/styles?layout=nested')
      // The cookie banner covers the foot of the page until it is answered.
      await page.locator('[data-testid="cookie-consent-accept-button"]').click()
      const footer = page.locator('[data-testid="manual-page-footer"]')
      await footer.getByRole('link', { name: 'Filters' }).click()
      await expect(page).toHaveURL(/\/manual\/filters/)
    })
  })
})
