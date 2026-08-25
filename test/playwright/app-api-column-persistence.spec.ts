import path from 'path'

import { type Page } from '@playwright/test'

import {
  expect,
  getWorkspaceNetworkCount,
  gotoAndWaitReady,
  test,
} from './fixtures'

// #685: a column created through window.CyWebApi reached cyTables, but its
// tableDisplayConfiguration entry was written to UiStateStore in memory only.
// The Table Browser renders the configured columns, not the table's own, so
// the column disappeared on the next reload — permanently.
//
// The network has to come from CX2: only the extractor builds a
// tableDisplayConfiguration, and without one the Table Browser falls back to
// Table.columns and the defect cannot show.

const CX2_FIXTURE = path.resolve(
  __dirname,
  '../fixtures/cx2/valid/small-network.valid.cx2',
)

const NEW_COLUMN = 'MCODE_Cluster'

/**
 * Node column names in the `uiState` row as it exists in IndexedDB — the row
 * the app reloads from. Read with the raw IndexedDB API so nothing in the
 * page's own persistence path can mask a missing write.
 */
const persistedNodeColumns = async (
  page: Page,
  networkId: string,
): Promise<string[]> =>
  await page.evaluate(
    async (id: string) =>
      await new Promise<string[]>((resolve) => {
        const open = indexedDB.open('cyweb-db')
        open.onerror = () => resolve([])
        open.onsuccess = () => {
          const db = open.result
          let request: IDBRequest
          try {
            request = db
              .transaction('uiState', 'readonly')
              .objectStore('uiState')
              .get('uistate')
          } catch {
            resolve([])
            return
          }
          request.onerror = () => resolve([])
          request.onsuccess = () => {
            const row = request.result as any
            const columns =
              row?.visualStyleOptions?.[id]?.visualEditorProperties
                ?.tableDisplayConfiguration?.nodeTable?.columnConfiguration ??
              []
            resolve(
              columns.map((c: { attributeName: string }) => c.attributeName),
            )
          }
        }
      }),
    networkId,
  )

const currentNetworkId = async (page: Page): Promise<string> =>
  await page.evaluate(() => {
    const api = (window as any).CyWebApi
    return api.workspace.getCurrentNetworkId().data.networkId as string
  })

const waitReady = async (page: Page): Promise<void> => {
  await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({
    timeout: 30000,
  })
  await page.waitForFunction(
    () => (window as unknown as { __cywebReady?: boolean }).__cywebReady,
    undefined,
    { timeout: 30_000 },
  )
}

test.describe('App API column display config survives a reload', () => {
  test('a CyWebApi-created column is still configured after reload', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)

    // Import the CX2 fixture through Data ▸ Import ▸ Network from File...
    await page.locator('[data-testid="toolbar-data-menu-menu-button"]').click()
    await page.getByRole('menuitem', { name: 'Import' }).click()
    const fromFileItem = page.getByRole('menuitem', {
      name: 'Network from File...',
    })
    await expect(fromFileItem).toBeVisible()
    await fromFileItem.click()
    await expect(
      page.locator('[data-testid="file-upload-dropzone"]'),
    ).toBeVisible()
    await page
      .locator('[data-testid="file-upload-dropzone"] input[type="file"]')
      .setInputFiles(CX2_FIXTURE)

    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 15000 })
      .toBe(1)

    const networkId = await currentNetworkId(page)

    // Precondition: the imported network has a display configuration in the
    // persisted row. Without it the rest of the test proves nothing.
    // The fixture declares node attributes n / type / score.
    await expect
      .poll(async () => await persistedNodeColumns(page, networkId), {
        timeout: 15000,
      })
      .toContain('score')

    // What an App API app (mcode) does: create a column and stop.
    const created = await page.evaluate(
      ([id, column]) => {
        const api = (window as any).CyWebApi
        return api.table.createColumn(id, 'node', column, 'integer', 0)
      },
      [networkId, NEW_COLUMN],
    )
    expect(created).toEqual(expect.objectContaining({ success: true }))

    // The write is coalesced (300 ms), so poll rather than assert once.
    // This is the assertion that failed before the fix: nothing else touches
    // UiStateStore, so no unrelated setter flushes the row on its behalf.
    await expect
      .poll(async () => await persistedNodeColumns(page, networkId), {
        timeout: 15000,
      })
      .toContain(NEW_COLUMN)

    await page.reload()
    await waitReady(page)

    // Still configured, and still in the table, after the reload.
    expect(await persistedNodeColumns(page, networkId)).toContain(NEW_COLUMN)

    const columns = await page.evaluate((id: string) => {
      const api = (window as any).CyWebApi
      const result = api.table.getTable(id, 'node')
      return result.success
        ? result.data.columns.map((c: { name: string }) => c.name)
        : null
    }, networkId)
    expect(columns).toContain(NEW_COLUMN)
  })
})
