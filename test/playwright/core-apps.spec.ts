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
