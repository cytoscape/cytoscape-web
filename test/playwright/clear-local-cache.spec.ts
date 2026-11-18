import type { Page } from '@playwright/test'

import {
  expect,
  getWorkspaceNetworkCount,
  gotoAndSeedNetwork,
  gotoAndWaitReady,
  installFixtureApp,
  test,
} from './fixtures'

/**
 * Help › Developer › Clear Local Cache (#989): moved out of the Data menu, and
 * deletes everything Cytoscape Web keeps in the browser, not only `cyweb-db`.
 */

const openClearLocalCacheDialog = async (page: Page): Promise<void> => {
  await page.locator('[data-testid="toolbar-help-menu-menu-button"]').click()
  await page.getByRole('menuitem', { name: 'Developer' }).click()
  await page.getByRole('menuitem', { name: 'Clear Local Cache' }).click()
  await expect(page.getByTestId('confirmation-dialog')).toBeVisible()
}

const databaseNames = async (page: Page): Promise<string[]> =>
  await page.evaluate(async () =>
    (await indexedDB.databases()).map((info) => info.name ?? ''),
  )

test.describe('Clear Local Cache', () => {
  test('is no longer in the Data menu', async ({ page }) => {
    await gotoAndWaitReady(page)
    await page.locator('[data-testid="toolbar-data-menu-menu-button"]').click()
    await expect(page.getByRole('menuitem', { name: 'Import' })).toBeVisible()

    await expect(page.getByText('Clear Local Database')).toHaveCount(0)
    await expect(page.getByText('Clear Local Cache')).toHaveCount(0)
  })

  test('is the last item of Help › Developer', async ({ page }) => {
    await gotoAndWaitReady(page)
    await page.locator('[data-testid="toolbar-help-menu-menu-button"]').click()
    await page.getByRole('menuitem', { name: 'Developer' }).click()

    const item = page.getByRole('menuitem', { name: 'Clear Local Cache' })
    await expect(item).toBeVisible()
    // Last of its submenu: no menu item follows it in the same list.
    const isLast = await item.evaluate((el) => {
      const row = el.closest('li') ?? el
      let next = row.nextElementSibling
      while (next !== null && next.getAttribute('role') === 'separator') {
        next = next.nextElementSibling
      }
      return next === null
    })
    expect(isLast).toBe(true)
  })

  test('asks first, and Cancel changes nothing', async ({ page }) => {
    await gotoAndSeedNetwork(page)
    await openClearLocalCacheDialog(page)

    const dialog = page.getByTestId('confirmation-dialog')
    await expect(dialog.getByText('Clear Local Cache?')).toBeVisible()
    await expect(
      dialog.getByText(
        'This will permanently delete all cached networks, styles, filters, installed apps and settings. This action cannot be undone.',
      ),
    ).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: 'Clear Cache' }),
    ).toBeVisible()

    await page.getByTestId('confirmation-dialog-cancel').click()
    await expect(dialog).toBeHidden()
    expect(await getWorkspaceNetworkCount(page)).toBe(1)
  })

  test('deletes networks, apps and storage keys, and keeps foreign keys', async ({
    page,
  }) => {
    await gotoAndSeedNetwork(page)
    await installFixtureApp(page)
    await page.evaluate(() => {
      localStorage.setItem('cyweb-network-search', '{}')
      localStorage.setItem('Dexie.Observable/latestRevision/cyweb-db', '1')
      localStorage.setItem('another-app-on-this-origin', 'keep me')
      sessionStorage.setItem('cyweb.tab.networkId', 'stale')
    })

    await openClearLocalCacheDialog(page)
    // Listen before the click: a fast clear can finish the reload before a
    // listener registered afterwards would see it.
    const reloaded = page.waitForEvent('load', { timeout: 30_000 })
    await page
      .getByTestId('confirmation-dialog')
      .getByRole('button', { name: 'Clear Cache' })
      .click()

    // A full page load: wait for the old document to go, then for the new boot.
    await reloaded
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({
      timeout: 30_000,
    })

    await expect
      .poll(async () => await getWorkspaceNetworkCount(page), {
        timeout: 30_000,
      })
      .toBe(0)
    await expect(page.locator('[data-testid="remote-app-marker"]')).toHaveCount(
      0,
    )
    const storage = await page.evaluate(() => ({
      search: localStorage.getItem('cyweb-network-search'),
      dexie: localStorage.getItem('Dexie.Observable/latestRevision/cyweb-db'),
      foreign: localStorage.getItem('another-app-on-this-origin'),
      tabNetwork: sessionStorage.getItem('cyweb.tab.networkId'),
    }))
    expect(storage.search).toBeNull()
    expect(storage.foreign).toBe('keep me')
    expect(storage.tabNetwork).not.toBe('stale')
    // The manual's sandbox databases are gone too (none was opened since).
    const names = await databaseNames(page)
    expect(names).not.toContain('cyweb-manual-db')
    expect(names).not.toContain('cyweb-manual-profile-db')
  })

  test('waits for a tab that holds a database open, says so, then finishes', async ({
    page,
    context,
  }) => {
    await gotoAndSeedNetwork(page)
    await page.evaluate(() => {
      localStorage.setItem('cyweb-network-search', '{}')
    })

    // Same origin, but not the app: it never hears the reset announcement, and
    // a raw connection ignores versionchange, so the delete is blocked.
    const holder = await context.newPage()
    await holder.goto('/silent-check-sso.html')
    await holder.evaluate(
      async () =>
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.open('cyweb-manual-db')
          request.onsuccess = () => {
            ;(window as unknown as { hold: IDBDatabase }).hold = request.result
            resolve()
          }
          request.onerror = () => reject(request.error)
        }),
    )

    await openClearLocalCacheDialog(page)
    await page
      .getByTestId('confirmation-dialog')
      .getByRole('button', { name: 'Clear Cache' })
      .click()

    const waiting = page.getByTestId('clear-local-cache-waiting')
    await expect(waiting).toContainText('cyweb-manual-db', { timeout: 10_000 })
    await expect(waiting).toContainText('Close your other Cytoscape Web tabs')
    // Still waiting, not given up: nothing is cleared yet.
    expect(
      await page.evaluate(() => localStorage.getItem('cyweb-network-search')),
    ).toBe('{}')

    const reloaded = page.waitForEvent('load', { timeout: 30_000 })
    await holder.evaluate(() => {
      ;(window as unknown as { hold: IDBDatabase }).hold.close()
    })
    await reloaded
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({
      timeout: 30_000,
    })
    await expect
      .poll(async () => await getWorkspaceNetworkCount(page), {
        timeout: 30_000,
      })
      .toBe(0)
    expect(
      await page.evaluate(() => localStorage.getItem('cyweb-network-search')),
    ).toBeNull()
    await holder.close()
  })

  test('a tab on the Error page clears its session keys and starts over', async ({
    page,
    context,
  }) => {
    await gotoAndWaitReady(page)

    // A peer that never mounts the editor: the boot listener is all it has.
    const errorTab = await context.newPage()
    await errorTab.goto('/error')
    await expect(
      errorTab.locator('[data-testid="error-reset-workspace-button"]'),
    ).toBeVisible({ timeout: 30_000 })
    await errorTab.evaluate(() => {
      sessionStorage.setItem('cyweb.llm.apiKeys', '{"openai":"sk-test"}')
    })

    await openClearLocalCacheDialog(page)
    await page
      .getByTestId('confirmation-dialog')
      .getByRole('button', { name: 'Clear Cache' })
      .click()

    // It leaves /error for the app root and boots a fresh editor.
    await expect(errorTab).not.toHaveURL(/\/error$/, { timeout: 30_000 })
    await expect(errorTab.locator('[data-testid="app-shell"]')).toBeVisible({
      timeout: 30_000,
    })
    expect(
      await errorTab.evaluate(() =>
        sessionStorage.getItem('cyweb.llm.apiKeys'),
      ),
    ).toBeNull()
    await errorTab.close()
  })
})
