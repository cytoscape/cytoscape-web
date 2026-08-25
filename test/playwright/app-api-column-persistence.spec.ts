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

/** The fixture is a 20-node / 30-edge network. */
const FIXTURE_NODE_COUNT = 20

/**
 * Read one row out of `cyweb-db` with the raw IndexedDB API, so nothing in
 * the page's own persistence path can mask a missing write. Returns null when
 * the row is absent.
 */
const idbGet = async (
  page: Page,
  store: string,
  key: string,
): Promise<unknown> =>
  await page.evaluate(
    async ([storeName, rowKey]: string[]) =>
      await new Promise<unknown>((resolve) => {
        const open = indexedDB.open('cyweb-db')
        open.onerror = () => resolve(null)
        open.onsuccess = () => {
          const db = open.result
          const done = (value: unknown): void => {
            db.close()
            resolve(value)
          }
          let request: IDBRequest
          try {
            request = db
              .transaction(storeName, 'readonly')
              .objectStore(storeName)
              .get(rowKey)
          } catch {
            done(null)
            return
          }
          request.onerror = () => done(null)
          request.onsuccess = () => done(request.result ?? null)
        }
      }),
    [store, key],
  )

/**
 * Node column names in the `uiState` row as it exists in IndexedDB — the row
 * the app reloads from.
 */
const persistedNodeColumns = async (
  page: Page,
  networkId: string,
): Promise<string[]> => {
  const row = (await idbGet(page, 'uiState', 'uistate')) as any
  const columns =
    row?.visualStyleOptions?.[networkId]?.visualEditorProperties
      ?.tableDisplayConfiguration?.nodeTable?.columnConfiguration ?? []
  return columns.map((c: { attributeName: string }) => c.attributeName)
}

/**
 * Has the whole network reached IndexedDB yet?
 *
 * Reloading before it has is the #665 failure: the writes are debounced, and
 * losing that race brings the app back up with "not found in cache" and an
 * empty store. These are exactly the four rows `getCyNetworkFromDb` throws
 * `CyNetworkCacheMissError` over; checking only the first two still let
 * Firefox reload into a miss. Every reload in this spec waits on this.
 */
const NETWORK_ROW_STORES = [
  'cyNetworks',
  'cyTables',
  'cyVisualStyles',
  'cyNetworkViews',
]

const networkPersisted = async (
  page: Page,
  networkId: string,
): Promise<boolean> => {
  for (const store of NETWORK_ROW_STORES) {
    if ((await idbGet(page, store, networkId)) === null) return false
  }
  return true
}

const currentNetworkId = async (page: Page): Promise<string> =>
  await page.evaluate(() => {
    const api = (window as any).CyWebApi
    return api.workspace.getCurrentNetworkId().data.networkId as string
  })

/**
 * Wait out a boot: app shell painted, CyWebApi ready, and the current
 * network's node table populated from IndexedDB.
 *
 * The table rows are the part that matters. `cywebapi:ready` fires when the
 * workspace is set, which is well before `loadCurrentNetworkById` has run —
 * and that function's first act is
 * `setVisualStyleOptions(networkId, <the copy read from IndexedDB>)`, which
 * persists. An App API write that lands while a load is still in flight is
 * therefore overwritten by the stale DB copy: on WebKit the import's own
 * second load reliably arrived ~200 ms after `createColumn` and wiped it,
 * which is why this spec drives the API from a reloaded, quiet page. The node
 * table is added a few statements after the visual style options in the same
 * function, so rows in the store mean that load has passed the write.
 */
const waitLoaded = async (page: Page, nodeCount: number): Promise<void> => {
  await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({
    timeout: 30000,
  })
  await page.waitForFunction(
    () => (window as unknown as { __cywebReady?: boolean }).__cywebReady,
    undefined,
    { timeout: 30_000 },
  )
  await expect
    .poll(
      async () =>
        await page.evaluate(() => {
          const api = (window as any).CyWebApi
          const id = api.workspace.getCurrentNetworkId().data?.networkId
          if (id === undefined || id === '') return -1
          const result = api.table.getTable(id, 'node')
          return result.success ? result.data.rows.length : -1
        }),
      { timeout: 30000 },
    )
    .toBe(nodeCount)
}

const reloadWhenDurable = async (
  page: Page,
  networkId: string,
): Promise<void> => {
  await expect
    .poll(async () => await networkPersisted(page, networkId), {
      timeout: 30000,
    })
    .toBe(true)
  await page.reload()
  await waitLoaded(page, FIXTURE_NODE_COUNT)
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

    // Reload before touching the App API, so the import's second load cannot
    // race the write (see waitLoaded). It is also what an app run looks like
    // in practice: a network already open, then the app does its work.
    await reloadWhenDurable(page, networkId)

    // Precondition: the network has a display configuration in the persisted
    // row. Without it the rest of the test proves nothing. The fixture
    // declares node attributes n / type / score.
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

    // The assertion that failed before the fix. Nothing else touches
    // UiStateStore here, so no unrelated setter flushes the shared `ui` row on
    // the App API's behalf. Polled because the write is coalesced (300 ms).
    await expect
      .poll(async () => await persistedNodeColumns(page, networkId), {
        timeout: 15000,
      })
      .toContain(NEW_COLUMN)

    // And the load path on the way back up does not undo it: the reload's
    // setVisualStyleOptions writes back what it read, which now has the column.
    await reloadWhenDurable(page, networkId)
    expect(await persistedNodeColumns(page, networkId)).toContain(NEW_COLUMN)
  })
})
