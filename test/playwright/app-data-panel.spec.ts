import fs from 'fs'
import path from 'path'

import type { Page } from '@playwright/test'

import { expect, gotoAndWaitReady, test } from './fixtures'

// The app-api storage domain (#684), end to end against the real bundle and a
// real federated remote.
//
// Unit tests cover both tiers of `appData` directly. What they cannot reach is
// the thing the ticket actually asked for: a panel that shows the results for
// whichever network is current, across a switch and across a reload. Three
// halves have to line up for that, and each fails independently:
//
//   1. Read at mount — no event fires for the network that is already current
//      when the app mounts.
//   2. Re-read on `network:switched` — the panel is keyed by its resource id,
//      not by network, so it stays mounted and React never re-reads for it.
//   3. Local-tier persistence — entries are written to IndexedDB and hydrated
//      back at boot, before the app API is marked ready.
//
// The panel lives in the fixture remote (test/fixtures/remote-app/AppConfig.tsx).

const CX2_FIXTURE = path.resolve(
  __dirname,
  '../fixtures/cx2/valid/small-network.valid.cx2',
)
const IMPORT_URL_A = 'https://fixtures.invalid/app-data-net-a.cx2'
const IMPORT_URL_B = 'https://fixtures.invalid/app-data-net-b.cx2'

const FIXTURE_MANIFEST_URL = 'http://localhost:4191/manifest.json'

// `?right=open` opens the right panel during boot, so the panel's tab is
// reachable without driving the open button first.
const importPath = (...urls: string[]): string =>
  `/?right=open&${urls.map((u) => `import=${encodeURIComponent(u)}`).join('&')}`

type ApiWindow = { CyWebApi?: any }

/**
 * The app's own URL for `networkId`, derived from the current one.
 *
 * Anchored on the `networks` segment rather than a fixed position: under a
 * based deployment the path is `/cytoscape/<ws>/networks/<id>`.
 */
const networkPath = (currentUrl: string, networkId: string): string => {
  const segments = new URL(currentUrl).pathname.split('/')
  const networksAt = segments.indexOf('networks')
  return [...segments.slice(0, networksAt + 1), networkId].join('/')
}

/** Click the open-panel button if the right panel is closed. */
const openRightPanel = async (page: Page): Promise<void> => {
  const openButton = page.locator('[data-testid="side-panel-open-button"]')
  if ((await openButton.count()) > 0) {
    await openButton.click()
  }
  await expect(page.locator('[data-testid="side-panel-tabs"]')).toBeVisible({
    timeout: 15_000,
  })
}

/** The workspace's network ids, in workspace order. */
const networkIds = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const result = (
      window as unknown as ApiWindow
    ).CyWebApi.workspace.getNetworkIds()
    return result.success ? result.data.networkIds : []
  })

/** The workspace's current network id, or '' when there is none. */
const currentNetworkId = (page: Page): Promise<string> =>
  page.evaluate(() => {
    const result = (
      window as unknown as ApiWindow
    ).CyWebApi.workspace.getCurrentNetworkId()
    return result.success ? result.data.networkId : ''
  })

const switchTo = (page: Page, networkId: string): Promise<void> =>
  page.evaluate(
    (id) =>
      (window as unknown as ApiWindow).CyWebApi.workspace.switchCurrentNetwork(
        id,
      ),
    networkId,
  )

test.describe('app data survives a network switch and a reload', () => {
  test.beforeEach(async ({ page }) => {
    const cx2 = fs.readFileSync(CX2_FIXTURE, 'utf8')
    for (const url of [IMPORT_URL_A, IMPORT_URL_B]) {
      await page.route(url, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'access-control-allow-origin': '*',
            'content-length': String(Buffer.byteLength(cx2)),
          },
          body: route.request().method() === 'HEAD' ? undefined : cx2,
        }),
      )
    }
  })

  test('shows each network its own stored results', async ({ page }) => {
    await gotoAndWaitReady(page, importPath(IMPORT_URL_A, IMPORT_URL_B))

    await expect
      .poll(() => networkIds(page).then((ids) => ids.length), {
        timeout: 30_000,
      })
      .toBe(2)
    const ids = await networkIds(page)

    // Register and activate the fixture remote, which registers the panel from
    // mount(). Same path as remote-app-load.spec.ts.
    const appsMenuButton = page.locator(
      '[data-testid="toolbar-apps-menu-menu-button"]',
    )
    await expect(appsMenuButton).toBeEnabled({ timeout: 15_000 })
    await appsMenuButton.click()
    await page.getByRole('menuitem', { name: 'Manage Apps...' }).click()
    await expect(
      page.locator('[data-testid="app-settings-dialog"]'),
    ).toBeVisible({ timeout: 15_000 })
    await page.getByText('Manifest Source').click()
    await page.getByLabel('Custom manifest URL').fill(FIXTURE_MANIFEST_URL)
    await page.getByRole('button', { name: 'Apply' }).click()

    const toggle = page.locator('[data-testid="app-toggle-testRemoteApp"]')
    await expect(toggle).toBeVisible({ timeout: 15_000 })
    await toggle.click()
    await expect(page.locator('[data-testid="remote-app-marker"]')).toBeVisible(
      {
        timeout: 15_000,
      },
    )
    // By testid, not by accessible name: `{ name: 'Close' }` also matches the
    // side panel's "Close panel" button, which closes the very panel this test
    // needs open.
    await page
      .locator('[data-testid="app-settings-dialog-close-button"]')
      .click()
    await expect(
      page.locator('[data-testid="app-settings-dialog"]'),
    ).toBeHidden()

    // Open the right panel. `?right=open` sets the boot UI state, but the
    // dialog flow above can leave it closed, so drive the button when it is
    // showing — it only renders while the panel is closed.
    await openRightPanel(page)

    // Select the app's right-panel tab. The panel unmounts when another tab is
    // selected, so it stays selected for the rest of the test — that is what
    // makes claim 2 (re-read on switch, no remount) meaningful.
    const panelTab = page.getByRole('tab', { name: 'App Data' })
    await expect(panelTab).toBeVisible({ timeout: 15_000 })
    await panelTab.click()

    const shownNetwork = page.locator('[data-testid="remote-app-data-network"]')
    const shownValue = page.locator('[data-testid="remote-app-data-value"]')
    const writeButton = page.locator('[data-testid="remote-app-data-write"]')

    // Read at mount: the panel reports whichever network is current, from
    // getCurrentNetworkId() — no event fired for it. Which of the two imports
    // boot left current is not this test's business, so take it from the panel
    // and cross-check it against the API rather than assuming import order.
    await expect(shownNetwork).not.toBeEmpty()
    const netB = (await shownNetwork.textContent()) as string
    expect(netB).toBe(await currentNetworkId(page))
    const netA = ids.find((id) => id !== netB) as string
    expect(netA).toBeDefined()

    // Nothing is stored for it yet.
    await expect(shownValue).toHaveText('')

    // Write on B, then on A, switching between them through the public API so
    // the assertion is on `network:switched`, not on any particular UI control.
    await writeButton.click()
    await expect(shownValue).toHaveText(`results-for-${netB}`)

    await switchTo(page, netA)
    await expect(shownNetwork).toHaveText(netA)
    // A's entry is absent, not B's leaking through — the panel re-read rather
    // than keeping its last value.
    await expect(shownValue).toHaveText('')

    await writeButton.click()
    await expect(shownValue).toHaveText(`results-for-${netA}`)

    // Switch back and forth: each network keeps its own entry.
    await switchTo(page, netB)
    await expect(shownValue).toHaveText(`results-for-${netB}`)

    await switchTo(page, netA)
    await expect(shownValue).toHaveText(`results-for-${netA}`)

    // Reload straight at A's URL, with no import params: the workspace, the
    // app's active status, and the app data all come back from IndexedDB. The
    // panel mounts fresh, so this is the read-at-mount path against hydrated
    // data — no switch event is involved. The network id has to come from the
    // path, not from the store: an API switch does not move the address bar,
    // and boot resolves the current network from the URL first.
    await gotoAndWaitReady(page, `${networkPath(page.url(), netA)}?right=open`)
    await openRightPanel(page)

    const tabAfterReload = page.getByRole('tab', { name: 'App Data' })
    await expect(tabAfterReload).toBeVisible({ timeout: 30_000 })
    await tabAfterReload.click()

    await expect(
      page.locator('[data-testid="remote-app-data-network"]'),
    ).toHaveText(netA)
    await expect(
      page.locator('[data-testid="remote-app-data-value"]'),
    ).toHaveText(`results-for-${netA}`)
  })
})
