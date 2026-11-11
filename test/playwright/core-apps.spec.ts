import type { Page } from '@playwright/test'

import {
  expect,
  FIXTURE_REMOTE_MANIFEST_URL,
  gotoAndWaitReady,
  test,
} from './fixtures'

// Core apps: every entry in the deployment's own apps.json starts on, and
// stays off once the user turns it off in the current workspace. A core app
// that cannot start says so in a toast.
//
// The e2e build ships the repository's apps.json, which is empty, so each test
// plays the deployment: it answers the host's request for its default catalog
// (`<base>apps.json`) with the list under test. The fixture remote
// (test/fixtures/remote-app/, served on :4191) is the app.

const APP_ID = 'testRemoteApp'

/** Answer the host's default-catalog request with the fixture's manifest. */
const serveFixtureAsCoreApp = async (page: Page): Promise<void> => {
  await page.route('**/apps.json', async (route) => {
    const response = await route.fetch({ url: FIXTURE_REMOTE_MANIFEST_URL })
    await route.fulfill({ response })
  })
}

// A second build of the fixture app (vite.config.ts, `--mode v2`) whose marker
// says "fixture v2". Its code differs from v1's, so the tests can tell which
// version actually runs, not only which URL the host loaded.
const V2_ENTRY_URL = 'http://localhost:4191/v2/remoteEntry.js'
// An install link's single-entry manifest, answered by `serveFixtureManifest`.
const LINK_MANIFEST_URL = 'http://localhost:4191/link-manifest.json'

/**
 * Answer requests matching `pattern` with the fixture's manifest entry,
 * declaring `version` and, when given, loading from `entryUrl`.
 */
const serveFixtureManifest = async (
  page: Page,
  pattern: string,
  version: string,
  entryUrl?: string,
): Promise<void> => {
  await page.route(pattern, async (route) => {
    const response = await route.fetch({ url: FIXTURE_REMOTE_MANIFEST_URL })
    const [fixture] = (await response.json()) as Array<Record<string, unknown>>
    await route.fulfill({
      json: [
        {
          ...fixture,
          version,
          ...(entryUrl !== undefined && { url: entryUrl }),
        },
      ],
      headers: { 'access-control-allow-origin': '*' },
    })
  })
}

const openAppManager = async (page: Page): Promise<void> => {
  const appsMenuButton = page.locator(
    '[data-testid="toolbar-apps-menu-menu-button"]',
  )
  await expect(appsMenuButton).toBeEnabled({ timeout: 15_000 })
  await appsMenuButton.click()
  await page.getByRole('menuitem', { name: 'Manage Apps...' }).click()
  await expect(page.locator('[data-testid="app-settings-dialog"]')).toBeVisible(
    { timeout: 15_000 },
  )
}

/** The workspace status record IndexedDB holds for `appId`, if any. */
const storedAppStatus = async (
  page: Page,
  appId: string,
): Promise<string | null> =>
  await page.evaluate(
    async (id: string) =>
      await new Promise<string | null>((resolve) => {
        const open = indexedDB.open('cyweb-db')
        open.onerror = () => resolve(null)
        open.onsuccess = () => {
          const db = open.result
          const done = (value: string | null): void => {
            db.close()
            resolve(value)
          }
          let request: IDBRequest<
            Array<{
              installedApps?: Array<{ entry: { id: string }; status: string }>
            }>
          >
          try {
            request = db
              .transaction('workspace', 'readonly')
              .objectStore('workspace')
              .getAll()
          } catch {
            done(null)
            return
          }
          request.onerror = () => done(null)
          request.onsuccess = () => {
            const record = request.result
              .flatMap((ws) => ws.installedApps ?? [])
              .find((app) => app.entry.id === id)
            done(record?.status ?? null)
          }
        }
      }),
    appId,
  )

test.describe('core apps from the deployment catalog', () => {
  test('a core app is on when Cytoscape Web starts', async ({ page }) => {
    // 1. The deployment's apps.json lists the app
    await serveFixtureAsCoreApp(page)

    // 2. Open Cytoscape Web
    await gotoAndWaitReady(page)

    // 3. The app runs although nobody turned it on
    await expect(page.locator('[data-testid="remote-app-marker"]')).toBeVisible(
      { timeout: 15_000 },
    )

    // 4. App Manager shows it turned on
    await openAppManager(page)
    await expect(
      page.locator(`[data-testid="app-toggle-${APP_ID}"] input`),
    ).toBeChecked()
  })

  test('a core app the user turned off stays off after a reload', async ({
    page,
  }) => {
    // 1. The deployment's apps.json lists the app, and it starts on
    await serveFixtureAsCoreApp(page)
    await gotoAndWaitReady(page)
    const marker = page.locator('[data-testid="remote-app-marker"]')
    await expect(marker).toBeVisible({ timeout: 15_000 })

    // 2. Turn it off in App Manager
    await openAppManager(page)
    await page.locator(`[data-testid="app-toggle-${APP_ID}"]`).click()
    await expect(marker).toBeHidden()

    // 3. The workspace records the choice before the page goes away
    await expect
      .poll(async () => await storedAppStatus(page, APP_ID), {
        timeout: 15_000,
      })
      .toBe('inactive')

    // 4. Reload
    await gotoAndWaitReady(page)

    // 5. App Manager lists it turned off, and it did not run
    await openAppManager(page)
    const toggle = page.locator(`[data-testid="app-toggle-${APP_ID}"]`)
    await expect(toggle).toBeVisible({ timeout: 15_000 })
    await expect(toggle.locator('input')).not.toBeChecked()
    await expect(marker).toHaveCount(0)
  })

  test('a core app that cannot start is reported to the user', async ({
    page,
  }) => {
    // 1. The deployment's apps.json lists an app whose code is missing
    await page.route('**/apps.json', async (route) => {
      await route.fulfill({
        json: [
          {
            id: 'brokenCoreApp',
            name: 'Broken Core App',
            url: 'http://localhost:4191/missing/remoteEntry.js',
            author: 'Test',
          },
        ],
      })
    })

    // 2. Open Cytoscape Web
    await gotoAndWaitReady(page)

    // 3. A toast names the app that could not be loaded
    await expect(
      page
        .locator('[data-testid="snackbar-message-list"]')
        .getByText('Could not load "Broken Core App"', { exact: false }),
    ).toBeVisible({ timeout: 15_000 })
  })
})

// An App Store install link for an app apps.json already ships. The newer
// version wins, compared as semver: a newer link replaces the running version
// in place, and an older one leaves the installed version alone.
test.describe('install links for a core app', () => {
  test('a newer version from an install link replaces the core app', async ({
    page,
  }) => {
    // 1. apps.json ships the app at 1.0.0; the link offers 2.0.0
    await serveFixtureManifest(page, '**/apps.json', '1.0.0')
    await serveFixtureManifest(page, LINK_MANIFEST_URL, '2.0.0', V2_ENTRY_URL)

    // 2. Open Cytoscape Web through the link; 1.0.0 starts as a core app
    await gotoAndWaitReady(
      page,
      `/?installApp=${encodeURIComponent(LINK_MANIFEST_URL)}`,
    )
    const marker = page.locator('[data-testid="remote-app-marker"]')
    const runningVersion = page.locator('[data-testid="remote-app-version"]')
    await expect(marker).toBeVisible({ timeout: 15_000 })
    await expect(runningVersion).toHaveText('fixture v1')

    // 3. The dialog says the link updates the installed version
    await expect(
      page.locator(`[data-testid="app-install-version-${APP_ID}"]`),
    ).toHaveText('Updates the installed version 1.0.0 to 2.0.0')

    // 4. Confirm
    await page
      .locator('[data-testid="app-install-confirmation-dialog-confirm"]')
      .click()
    await expect(
      page.getByText('Updated Test Remote App to 2.0.0'),
    ).toBeVisible({ timeout: 15_000 })

    // 5. One copy runs, and it is version 2's code, without a reload
    await expect(runningVersion).toHaveText('fixture v2', { timeout: 15_000 })
    await expect(marker).toHaveCount(1)

    // 6. App Manager lists 2.0.0
    await openAppManager(page)
    await expect(
      page.locator('[data-testid="app-settings-dialog"]'),
    ).toContainText('v2.0.0')
    await page
      .locator('[data-testid="app-settings-dialog-close-button"]')
      .click()

    // 7. After a reload, version 2 still runs
    await page.unroute(LINK_MANIFEST_URL)
    await gotoAndWaitReady(page)
    await expect(marker).toBeVisible({ timeout: 15_000 })
    await expect(marker).toHaveCount(1)
    await expect(runningVersion).toHaveText('fixture v2')
    await openAppManager(page)
    await expect(
      page.locator('[data-testid="app-settings-dialog"]'),
    ).toContainText('v2.0.0')
  })

  test('an older version from an install link keeps the newer core app', async ({
    page,
  }) => {
    // 1. apps.json ships the app at 2.0.0; the link offers 1.0.0
    await serveFixtureManifest(page, '**/apps.json', '2.0.0', V2_ENTRY_URL)
    await serveFixtureManifest(page, LINK_MANIFEST_URL, '1.0.0')

    // 2. Open Cytoscape Web through the link; version 2 runs
    await gotoAndWaitReady(
      page,
      `/?installApp=${encodeURIComponent(LINK_MANIFEST_URL)}`,
    )
    const runningVersion = page.locator('[data-testid="remote-app-version"]')
    await expect(runningVersion).toHaveText('fixture v2', { timeout: 15_000 })

    // 3. The dialog says the installed, newer version is kept
    await expect(
      page.locator(`[data-testid="app-install-version-${APP_ID}"]`),
    ).toHaveText('Version 2.0.0 is installed, which is newer; it is kept')

    // 4. Confirm: the user is told 2.0.0 was kept
    await page
      .locator('[data-testid="app-install-confirmation-dialog-confirm"]')
      .click()
    await expect(
      page.getByText(
        'Test Remote App 2.0.0 is already installed; kept it instead of 1.0.0',
      ),
    ).toBeVisible({ timeout: 15_000 })

    // 5. Version 2 still runs, and App Manager still lists 2.0.0
    await expect(runningVersion).toHaveText('fixture v2')
    await expect(page.locator('[data-testid="remote-app-marker"]')).toHaveCount(
      1,
    )
    await openAppManager(page)
    await expect(
      page.locator('[data-testid="app-settings-dialog"]'),
    ).toContainText('v2.0.0')
  })
})

// Review: an app installed off was never checked for host compatibility, so
// its row had a switch and no reason. The row now derives it from the entry.
test.describe('an app this Cytoscape Web cannot run', () => {
  test('an install link adds it turned off, with the reason and no switch', async ({
    page,
  }) => {
    // 1. The site ships no core apps; a link offers an app that needs a
    //    Cytoscape Web that does not exist yet
    await page.route('**/apps.json', async (route) => {
      await route.fulfill({ json: [] })
    })
    await page.route(LINK_MANIFEST_URL, async (route) => {
      const response = await route.fetch({ url: FIXTURE_REMOTE_MANIFEST_URL })
      const [fixture] = (await response.json()) as Array<
        Record<string, unknown>
      >
      await route.fulfill({
        json: [{ ...fixture, compatibleHostVersions: '>=999.0.0' }],
        headers: { 'access-control-allow-origin': '*' },
      })
    })

    // 2. Open Cytoscape Web through the link and confirm
    await gotoAndWaitReady(
      page,
      `/?installApp=${encodeURIComponent(LINK_MANIFEST_URL)}`,
    )
    await page
      .locator('[data-testid="app-install-confirmation-dialog-confirm"]')
      .click({ timeout: 15_000 })
    await expect(
      page.getByText('is not compatible with this host version', {
        exact: false,
      }),
    ).toBeVisible({ timeout: 15_000 })

    // 3. App Manager lists it with the reason, and no switch; it never ran
    await openAppManager(page)
    const reason = page.locator(`[data-testid="app-failure-${APP_ID}"]`)
    await expect(reason).toContainText('Needs Cytoscape Web >=999.0.0')
    await expect(
      page.locator(`[data-testid="app-toggle-${APP_ID}"]`),
    ).toHaveCount(0)
    await expect(page.locator('[data-testid="remote-app-marker"]')).toHaveCount(
      0,
    )

    // 4. After a reload it is still explained, not offered a switch
    await expect
      .poll(async () => await storedAppStatus(page, APP_ID), {
        timeout: 15_000,
      })
      .toBe('inactive')
    await page.unroute(LINK_MANIFEST_URL)
    await gotoAndWaitReady(page)
    await openAppManager(page)
    await expect(reason).toContainText('Needs Cytoscape Web >=999.0.0')
    await expect(
      page.locator(`[data-testid="app-toggle-${APP_ID}"]`),
    ).toHaveCount(0)
  })
})

// Review: Refresh replaces the catalog without reloading, so the row must go
// by the version actually running, and a stale incompatibility must not
// outlive a catalog that fixed it.
test.describe('catalog Refresh', () => {
  /** Serve apps.json listing the fixture app with `extra` fields. */
  const serveCatalog = async (
    page: Page,
    extra: Record<string, unknown>,
  ): Promise<void> => {
    await page.unroute('**/apps.json')
    await page.route('**/apps.json', async (route) => {
      const response = await route.fetch({ url: FIXTURE_REMOTE_MANIFEST_URL })
      const [fixture] = (await response.json()) as Array<
        Record<string, unknown>
      >
      await route.fulfill({ json: [{ ...fixture, ...extra }] })
    })
  }

  test('a running app keeps its switch when Refresh brings a version it cannot run', async ({
    page,
  }) => {
    // 1. Version 1 starts as a core app
    await serveCatalog(page, { version: '1.0.0' })
    await gotoAndWaitReady(page)
    const marker = page.locator('[data-testid="remote-app-marker"]')
    await expect(marker).toBeVisible({ timeout: 15_000 })

    // 2. The catalog now offers version 2, which this host cannot run; Refresh
    await serveCatalog(page, {
      version: '2.0.0',
      url: V2_ENTRY_URL,
      compatibleHostVersions: '>=999.0.0',
    })
    await openAppManager(page)
    await page.getByTestId('app-settings-refresh-button').click()
    await expect(
      page.locator('[data-testid="app-settings-dialog"]'),
    ).toContainText('v2.0.0')

    // 3. Version 1 still runs, and its switch can turn it off
    const toggle = page.locator(`[data-testid="app-toggle-${APP_ID}"]`)
    await expect(toggle.locator('input')).toBeChecked()
    await toggle.click()
    await expect(marker).toHaveCount(0)

    // 4. Off, it is explained like any app this host cannot run
    await expect(
      page.locator(`[data-testid="app-failure-${APP_ID}"]`),
    ).toContainText('Needs Cytoscape Web >=999.0.0')
    await expect(toggle).toHaveCount(0)
  })

  test('Refresh to a compatible version makes an incompatible app available', async ({
    page,
  }) => {
    // 1. The core app needs a host that does not exist yet: not started
    await serveCatalog(page, { compatibleHostVersions: '>=999.0.0' })
    await gotoAndWaitReady(page)
    await openAppManager(page)
    await expect(
      page.locator(`[data-testid="app-failure-${APP_ID}"]`),
    ).toContainText('Needs Cytoscape Web >=999.0.0')

    // 2. The catalog is fixed; Refresh, without a reload
    await serveCatalog(page, { version: '1.0.1' })
    await page.getByTestId('app-settings-refresh-button').click()

    // 3. The row offers its switch, and turning it on runs the app
    const toggle = page.locator(`[data-testid="app-toggle-${APP_ID}"]`)
    await expect(toggle).toBeVisible({ timeout: 15_000 })
    await expect(
      page.locator(`[data-testid="app-failure-${APP_ID}"]`),
    ).toHaveCount(0)
    await toggle.click()
    await expect(page.locator('[data-testid="remote-app-marker"]')).toBeVisible(
      { timeout: 15_000 },
    )
  })
})

// A core app is tried at every start and cannot be uninstalled, so a broken
// one must be possible to turn off; one this host cannot run is not started;
// and a fixed version shipped in apps.json replaces a broken one on reload.
test.describe('when a core app cannot run', () => {
  const BROKEN_ID = 'brokenCoreApp'

  /** Serve apps.json listing one app whose code is missing. */
  const serveBrokenCoreApp = async (page: Page): Promise<void> => {
    await page.route('**/apps.json', async (route) => {
      await route.fulfill({
        json: [
          {
            id: BROKEN_ID,
            name: 'Broken Core App',
            version: '1.0.0',
            url: 'http://localhost:4191/missing/remoteEntry.js',
            author: 'Test',
          },
        ],
      })
    })
  }

  test('a failed core app can be turned off, and stays off', async ({
    page,
  }) => {
    // 1. The core app fails at startup
    await serveBrokenCoreApp(page)
    await gotoAndWaitReady(page)
    await expect(
      page.getByText('Could not load "Broken Core App"', { exact: false }),
    ).toBeVisible({ timeout: 15_000 })

    // 2. App Manager shows why, with the switch still on
    await openAppManager(page)
    const toggle = page.locator(`[data-testid="app-toggle-${BROKEN_ID}"]`)
    await expect(
      page.locator(`[data-testid="app-failure-${BROKEN_ID}"]`),
    ).toBeVisible()
    await expect(toggle.locator('input')).toBeChecked()

    // 3. Turn it off
    await toggle.click()
    await expect(toggle.locator('input')).not.toBeChecked()
    await expect(
      page.locator(`[data-testid="app-failure-${BROKEN_ID}"]`),
    ).toHaveCount(0)
    await expect
      .poll(async () => await storedAppStatus(page, BROKEN_ID), {
        timeout: 15_000,
      })
      .toBe('inactive')

    // 4. Reload: it is not tried again
    await gotoAndWaitReady(page)
    await openAppManager(page)
    await expect(toggle.locator('input')).not.toBeChecked()
    await expect(
      page.locator(`[data-testid="app-failure-${BROKEN_ID}"]`),
    ).toHaveCount(0)
    await expect(
      page.getByText('Could not load "Broken Core App"', { exact: false }),
    ).toHaveCount(0)
  })

  test('a core app this Cytoscape Web cannot run is not started', async ({
    page,
  }) => {
    // 1. apps.json lists the app, requiring a host that does not exist yet
    await page.route('**/apps.json', async (route) => {
      const response = await route.fetch({ url: FIXTURE_REMOTE_MANIFEST_URL })
      const [fixture] = (await response.json()) as Array<
        Record<string, unknown>
      >
      await route.fulfill({
        json: [{ ...fixture, compatibleHostVersions: '>=999.0.0' }],
      })
    })

    // 2. Open Cytoscape Web
    await gotoAndWaitReady(page)

    // 3. App Manager says why it is off, and offers no switch
    await openAppManager(page)
    await expect(
      page.locator(`[data-testid="app-failure-${APP_ID}"]`),
    ).toContainText('Needs Cytoscape Web >=999.0.0')
    await expect(
      page.locator(`[data-testid="app-toggle-${APP_ID}"]`),
    ).toHaveCount(0)

    // 4. Its code never ran
    await expect(page.locator('[data-testid="remote-app-marker"]')).toHaveCount(
      0,
    )
  })

  test('a fixed version in apps.json runs after a reload', async ({ page }) => {
    // 1. apps.json lists version 1.0.0 of the app, whose code is broken (here:
    //    missing). It fails at startup, and the user does nothing.
    await page.route('**/apps.json', async (route) => {
      const response = await route.fetch({ url: FIXTURE_REMOTE_MANIFEST_URL })
      const [fixture] = (await response.json()) as Array<
        Record<string, unknown>
      >
      await route.fulfill({
        json: [
          {
            ...fixture,
            version: '1.0.0',
            url: 'http://localhost:4191/missing/remoteEntry.js',
          },
        ],
      })
    })
    await gotoAndWaitReady(page)
    await expect(
      page.getByText('Could not load "Test Remote App"', { exact: false }),
    ).toBeVisible({ timeout: 15_000 })

    // 2. The deployment ships the fixed version, 1.0.1, in apps.json
    await page.unroute('**/apps.json')
    await serveFixtureManifest(page, '**/apps.json', '1.0.1')

    // 3. Reload: the fixed version runs, with no click
    await gotoAndWaitReady(page)
    await expect(page.locator('[data-testid="remote-app-marker"]')).toBeVisible(
      { timeout: 15_000 },
    )

    // 4. App Manager shows it on, at 1.0.1, with no failure
    await openAppManager(page)
    await expect(
      page.locator(`[data-testid="app-toggle-${APP_ID}"] input`),
    ).toBeChecked()
    await expect(
      page.locator('[data-testid="app-settings-dialog"]'),
    ).toContainText('v1.0.1')
    await expect(
      page.locator(`[data-testid="app-failure-${APP_ID}"]`),
    ).toHaveCount(0)
  })
})
