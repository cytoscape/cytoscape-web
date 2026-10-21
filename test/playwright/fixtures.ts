import { test as base, expect, type Page } from '@playwright/test'

type Fixtures = {
  /**
   * When false (the default), first-run onboarding is suppressed by seeding
   * `cyweb.onboarding` in localStorage so the welcome modal never blocks a
   * test. Opt in with `test.use({ onboarding: true })` to exercise first-run.
   */
  onboarding: boolean
}

export const test = base.extend<Fixtures>({
  onboarding: [false, { option: true }],
  page: async ({ page, onboarding }, use) => {
    if (!onboarding) {
      await page.addInitScript(() => {
        try {
          window.localStorage.setItem(
            'cyweb.onboarding',
            JSON.stringify({
              hasSeenWelcome: true,
              completedTours: [],
              dismissedHints: [],
            }),
          )
        } catch {
          // Ignore — onboarding will simply show; tests that care opt in.
        }
      })
    }
    await use(page)
  },
})

export { expect }

type ReadyWindow = { __cywebReady?: boolean }

/**
 * Navigate to the given path and wait until AppShell has hydrated the
 * workspace. AppShell dispatches `cywebapi:ready` immediately after
 * setWorkspace() completes; anything seeded into the stores before that
 * point is overwritten, so tests must wait for it before mutating state
 * through window.CyWebApi.
 */
export const gotoAndWaitReady = async (
  page: Page,
  path: string = '/',
): Promise<void> => {
  await page.addInitScript(() => {
    ;(window as unknown as ReadyWindow).__cywebReady = false
    window.addEventListener('cywebapi:ready', () => {
      ;(window as unknown as ReadyWindow).__cywebReady = true
    })
  })

  await page.goto(path)
  // Generous on purpose: several workers each boot the whole app, and a boot that
  // is merely slow under that contention is not a failure worth reporting. Every
  // spec should come through here rather than asserting on app-shell itself with
  // expect's 5s default.
  await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({
    timeout: 30000,
  })

  await page.waitForFunction(
    () => (window as unknown as ReadyWindow).__cywebReady === true,
    undefined,
    { timeout: 30_000 },
  )
}

/**
 * Navigate to the app and seed a minimal network into the workspace via the
 * public window.CyWebApi.
 *
 * Toolbar menus that operate on a network (Layout, Tools, Edit, Analysis) are
 * disabled while the workspace is empty, so tests that need to open those menus
 * must first put a network in the workspace. This creates a tiny two-node
 * network and adds it to the workspace, which enables those menus.
 */
export const gotoAndSeedNetwork = async (page: Page): Promise<void> => {
  await gotoAndWaitReady(page)

  const result = await page.evaluate(() => {
    const api = (
      window as unknown as {
        CyWebApi?: {
          network: {
            createNetworkFromEdgeList: (props: {
              name: string
              edgeList: Array<[string, string, string?]>
              addToWorkspace?: boolean
            }) => { success: boolean }
          }
        }
      }
    ).CyWebApi
    return api?.network.createNetworkFromEdgeList({
      name: 'Test Network',
      edgeList: [['a', 'b']],
      addToWorkspace: true,
    })
  })

  expect(result?.success).toBe(true)
}

/**
 * Number of networks currently in the workspace, read through the public
 * window.CyWebApi. Returns -1 when the API call fails.
 */
export const getWorkspaceNetworkCount = async (page: Page): Promise<number> => {
  return page.evaluate(() => {
    const api = (
      window as unknown as {
        CyWebApi?: {
          workspace: {
            getNetworkIds: () => {
              success: boolean
              data?: { networkIds: string[] }
            }
          }
        }
      }
    ).CyWebApi
    const result = api?.workspace.getNetworkIds()
    return result?.success ? (result.data?.networkIds.length ?? -1) : -1
  })
}

/** The fixture remote (test/fixtures/remote-app), served by the webServer. */
export const FIXTURE_REMOTE_MANIFEST_URL = 'http://localhost:4191/manifest.json'

/**
 * Register and activate the fixture remote (`testRemoteApp`) through Manage
 * Apps, the path remote-app-load covers. Its 'appdata' right-panel tab gives
 * the right pane a tab on a network that is not a hierarchy.
 */
export const installFixtureApp = async (page: Page): Promise<void> => {
  const appsMenuButton = page.locator(
    '[data-testid="toolbar-apps-menu-menu-button"]',
  )
  await expect(appsMenuButton).toBeEnabled({ timeout: 15_000 })
  await appsMenuButton.click()
  await page.getByRole('menuitem', { name: 'Manage Apps...' }).click()
  await expect(page.locator('[data-testid="app-settings-dialog"]')).toBeVisible(
    { timeout: 15_000 },
  )
  await page.getByTestId('app-settings-advanced-button').click()
  await page.getByLabel('Custom manifest URL').fill(FIXTURE_REMOTE_MANIFEST_URL)
  await page.getByRole('button', { name: 'Apply' }).click()

  const toggle = page.locator('[data-testid="app-toggle-testRemoteApp"]')
  await expect(toggle).toBeVisible({ timeout: 15_000 })
  await toggle.click()
  await expect(page.locator('[data-testid="remote-app-marker"]')).toBeVisible({
    timeout: 15_000,
  })
  // By testid: `{ name: 'Close' }` also matches the side panel's "Close panel".
  await page.locator('[data-testid="app-settings-dialog-close-button"]').click()
  await expect(page.locator('[data-testid="app-settings-dialog"]')).toBeHidden()
}
