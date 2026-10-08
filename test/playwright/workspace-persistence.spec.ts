import {
  expect,
  getWorkspaceNetworkCount,
  gotoAndSeedNetwork,
  gotoAndWaitReady,
  test,
} from './fixtures'

// #600 e2e gap: IndexedDB persistence round-trip.
// A network created in one page load must survive a reload: store writes
// (coalesced by the persistence scheduler, flushed on beforeunload) land in
// cyweb-db, and AppShell rehydrates the workspace from it at next boot.

test.describe('Workspace Persistence', () => {
  test('a created network survives a page reload', async ({ page }) => {
    await gotoAndSeedNetwork(page)
    expect(await getWorkspaceNetworkCount(page)).toBe(1)

    // Store writes are coalesced (300ms trailing); wait until the network
    // row has actually landed in cyweb-db before navigating away. The
    // flush-on-unload path is best-effort only — WebKit in particular does
    // not complete IndexedDB writes started during unload, so reloading
    // inside the coalescing window would test flush luck, not rehydration.
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              new Promise<number>((resolve) => {
                const open = indexedDB.open('cyweb-db')
                open.onerror = () => resolve(-1)
                open.onsuccess = () => {
                  const db = open.result
                  try {
                    const count = db
                      .transaction('cyNetworks', 'readonly')
                      .objectStore('cyNetworks')
                      .count()
                    count.onsuccess = () => {
                      db.close()
                      resolve(count.result)
                    }
                    count.onerror = () => {
                      db.close()
                      resolve(-1)
                    }
                  } catch {
                    db.close()
                    resolve(-1)
                  }
                }
              }),
          ),
        { timeout: 15000 },
      )
      .toBeGreaterThan(0)

    // Reload: boot rehydrates the workspace from IndexedDB
    await gotoAndWaitReady(page)

    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 15000 })
      .toBe(1)
    await expect(page.getByText('Test Network').first()).toBeVisible({
      timeout: 15000,
    })
  })
})
