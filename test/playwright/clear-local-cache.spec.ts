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
    await page
      .getByTestId('confirmation-dialog')
      .getByRole('button', { name: 'Clear Cache' })
      .click()

    // A full page load: wait for the old document to go, then for the new boot.
    await page.waitForEvent('load', { timeout: 30_000 })
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
})
