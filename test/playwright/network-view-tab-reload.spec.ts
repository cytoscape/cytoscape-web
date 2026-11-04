import path from 'path'

import { expect, gotoAndWaitReady, test } from './fixtures'
import type { Page } from '@playwright/test'

const TREE_HCX = path.resolve(__dirname, '../fixtures/hcx/valid/tree.valid.cx2')

const NETWORK_ROW_STORES = [
  'cyNetworks',
  'cyTables',
  'cyVisualStyles',
  'cyNetworkViews',
]

/** Whether every store a network is loaded from holds a row in cyweb-db. */
const networkPersisted = (page: Page): Promise<boolean> =>
  page.evaluate(
    (stores) =>
      new Promise<boolean>((resolve) => {
        const open = indexedDB.open('cyweb-db')
        open.onerror = () => resolve(false)
        open.onsuccess = () => {
          const db = open.result
          // One transaction, so its completion means every count has finished
          const transaction = db.transaction(stores, 'readonly')
          const counts = stores.map((store) =>
            transaction.objectStore(store).count(),
          )
          transaction.oncomplete = () => {
            db.close()
            resolve(counts.every((count) => count.result > 0))
          }
          transaction.onabort = () => {
            db.close()
            resolve(false)
          }
        }
      }),
    NETWORK_ROW_STORES,
  )

const importHierarchy = async (page: Page): Promise<void> => {
  await gotoAndWaitReady(page)
  await page.locator('[data-testid="toolbar-data-menu-menu-button"]').click()
  await page.getByRole('menuitem', { name: 'Import' }).click()
  await page.getByRole('menuitem', { name: 'Network from File...' }).click()
  await page
    .locator('[data-testid="file-upload-dropzone"] input[type="file"]')
    .setInputFiles(TREE_HCX)
  await expect(page.getByRole('tab', { name: 'Cell View' })).toBeVisible({
    timeout: 15000,
  })
  // Store writes are coalesced: reloading before the network has landed in
  // cyweb-db would lose it.
  await expect.poll(() => networkPersisted(page), { timeout: 15000 }).toBe(true)
}

test.describe('Network view tab after a reload', () => {
  const tab = (page: Page, name: string) => page.getByRole('tab', { name })

  // The selected view tab was saved only when something else was saved, so
  // the table tab click below stored the Cell View, and the reload restored it
  // although the Tree View had been selected since.
  test('opens the Tree View when the Cell View was saved earlier', async ({
    page,
  }) => {
    await importHierarchy(page)
    await tab(page, 'Cell View').click()
    await tab(page, 'Edges').click()
    await tab(page, 'Tree View').click()
    await expect(tab(page, 'Tree View')).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await page.reload()

    await expect(tab(page, 'Cell View')).toBeVisible({ timeout: 15000 })
    await expect(tab(page, 'Tree View')).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  test('opens the Tree View when the Cell View was selected', async ({
    page,
  }) => {
    await importHierarchy(page)
    await tab(page, 'Cell View').click()
    await tab(page, 'Edges').click()

    await page.reload()

    await expect(tab(page, 'Cell View')).toBeVisible({ timeout: 15000 })
    await expect(tab(page, 'Tree View')).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  test('opens the tab a shared URL names, for that load only', async ({
    page,
  }) => {
    await importHierarchy(page)

    await page.goto(`${page.url()}?activeNetworkViewTab=1`)

    await expect(tab(page, 'Cell View')).toHaveAttribute(
      'aria-selected',
      'true',
      { timeout: 15000 },
    )
    // The parameter applies to one load: it leaves the URL, and the next reload
    // opens the first tab.
    await expect(page).not.toHaveURL(/activeNetworkViewTab/)

    await page.reload()

    await expect(tab(page, 'Cell View')).toBeVisible({ timeout: 15000 })
    await expect(tab(page, 'Tree View')).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
