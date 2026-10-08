import { type Page } from '@playwright/test'

import { expect, gotoAndWaitReady, test } from './fixtures'

// `network:loaded` exists for one race: after a page reload the workspace
// holds only summaries, and a network's tables land the first time it is
// shown. `network:switched` fires as soon as currentNetworkId changes, before
// that async load, so an app that reads the table schema on the switch gets
// APP1 — and until this event nothing told it to read again
// (network-analyzer-cw retried on a timer). This drives the real loader
// through the real bundle and checks the order the app relies on.

interface RecordedEvent {
  type: 'network:switched' | 'network:loaded'
  networkId: string
  /** What a getColumns read returned at the moment the event fired */
  read: { success: boolean; code?: string }
}

interface EventWindow {
  __cyEvents: RecordedEvent[]
  __cywebReady?: boolean
  CyWebApi: any
}

const NAME_A = 'Loaded Event Alpha'
const NAME_B = 'Loaded Event Beta'

/** Rows `getCyNetworkFromDb` needs; a reload before they exist is a cache miss */
const NETWORK_ROW_STORES = [
  'cyNetworks',
  'cyTables',
  'cyVisualStyles',
  'cyNetworkViews',
]

const idbHas = async (
  page: Page,
  store: string,
  key: string,
): Promise<boolean> =>
  await page.evaluate(
    async ([storeName, rowKey]: string[]) =>
      await new Promise<boolean>((resolve) => {
        const open = indexedDB.open('cyweb-db')
        open.onerror = () => resolve(false)
        open.onsuccess = () => {
          const db = open.result
          const done = (value: boolean): void => {
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
            done(false)
            return
          }
          request.onerror = () => done(false)
          request.onsuccess = () => done(request.result != null)
        }
      }),
    [store, key],
  )

const networkPersisted = async (
  page: Page,
  networkId: string,
): Promise<boolean> => {
  for (const store of NETWORK_ROW_STORES) {
    if (!(await idbHas(page, store, networkId))) return false
  }
  return true
}

const createNetwork = async (page: Page, name: string): Promise<string> => {
  const result = await page.evaluate((networkName) => {
    const api = (window as unknown as EventWindow).CyWebApi
    return api.network.createNetworkFromEdgeList({
      name: networkName,
      edgeList: [['a', 'b']],
      addToWorkspace: true,
    })
  }, name)
  expect(result).toEqual(expect.objectContaining({ success: true }))
  return result.data.networkId as string
}

const currentNetworkId = (page: Page): Promise<string> =>
  page.evaluate(() => {
    const api = (window as unknown as EventWindow).CyWebApi
    return api.workspace.getCurrentNetworkId().data.networkId as string
  })

const columnsReadable = (page: Page, networkId: string): Promise<boolean> =>
  page.evaluate((id) => {
    const api = (window as unknown as EventWindow).CyWebApi
    return api.table.getColumns(id, 'node').success as boolean
  }, networkId)

const recordedEvents = (page: Page): Promise<RecordedEvent[]> =>
  page.evaluate(() => (window as unknown as EventWindow).__cyEvents)

/**
 * Open a network by clicking its entry in the workspace panel — the path the
 * bug report takes. `workspace.switchCurrentNetwork` moves the store but does
 * not drive the loader, so it cannot reproduce this.
 */
const openNetwork = async (page: Page, name: string): Promise<void> => {
  await page
    .locator('[data-testid="network-browser-panel"]')
    .getByText(name)
    .first()
    .click()
}

test.describe('network:loaded', () => {
  test.beforeEach(async ({ page }) => {
    // Runs on every navigation, so the reload keeps recording. Each event is
    // paired with a schema read made synchronously inside the listener: that
    // is exactly what an app does, and the result at that instant is the
    // thing under test.
    await page.addInitScript(() => {
      const w = window as unknown as EventWindow
      w.__cyEvents = []
      const record = (type: RecordedEvent['type']) => (e: Event) => {
        const networkId = (e as CustomEvent<{ networkId: string }>).detail
          .networkId
        const result = w.CyWebApi?.table.getColumns(networkId, 'node')
        w.__cyEvents.push({
          type,
          networkId,
          read: result?.success
            ? { success: true }
            : { success: false, code: result?.error?.code },
        })
      }
      window.addEventListener('network:switched', record('network:switched'))
      window.addEventListener('network:loaded', record('network:loaded'))
    })
  })

  test('follows network:switched when a reloaded network is shown again, and the schema is readable by then', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)

    const idA = await createNetwork(page, NAME_A)
    const idB = await createNetwork(page, NAME_B)

    // A brand-new network is readable at once: network:loaded fires for it
    // alongside network:created, with the data already there.
    const created = await recordedEvents(page)
    for (const id of [idA, idB]) {
      expect(created).toContainEqual({
        type: 'network:loaded',
        networkId: id,
        read: { success: true },
      })
    }

    // Put B in the address bar so the reload comes back up on B, leaving A
    // to be loaded lazily on the next switch.
    await openNetwork(page, NAME_B)
    await expect.poll(() => currentNetworkId(page)).toBe(idB)
    await expect
      .poll(
        async () =>
          (await networkPersisted(page, idA)) &&
          (await networkPersisted(page, idB)),
        { timeout: 30000 },
      )
      .toBe(true)

    await page.reload()
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({
      timeout: 30000,
    })
    await page.waitForFunction(
      () => (window as unknown as EventWindow).__cywebReady === true,
      undefined,
      { timeout: 30_000 },
    )
    await expect.poll(() => currentNetworkId(page)).toBe(idB)
    // B's own lazy load lands; A stays unloaded (only summaries survive).
    await expect
      .poll(() => columnsReadable(page, idB), { timeout: 30000 })
      .toBe(true)
    expect(await columnsReadable(page, idA)).toBe(false)

    await page.evaluate(() => {
      ;(window as unknown as EventWindow).__cyEvents.length = 0
    })

    // The reproduction: switch back to a network the reload evicted.
    await openNetwork(page, NAME_A)
    await expect
      .poll(
        async () =>
          (await recordedEvents(page)).some(
            (e) => e.type === 'network:loaded' && e.networkId === idA,
          ),
        { timeout: 30000 },
      )
      .toBe(true)

    const events = (await recordedEvents(page)).filter(
      (e) => e.networkId === idA,
    )
    // Switched first — with the schema NOT yet readable (this is the race
    // the event exists for) — then loaded, with the schema readable.
    expect(events.map((e) => e.type)).toEqual([
      'network:switched',
      'network:loaded',
    ])
    expect(events[0].read).toEqual({ success: false, code: 'APP1' })
    expect(events[1].read).toEqual({ success: true })

    // B was already loaded; showing A again must not re-announce B.
    const bEvents = (await recordedEvents(page)).filter(
      (e) => e.type === 'network:loaded' && e.networkId === idB,
    )
    expect(bEvents).toEqual([])
  })
})
