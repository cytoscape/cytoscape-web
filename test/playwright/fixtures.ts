import { test as base, expect, type Page } from '@playwright/test'

type Fixtures = {}

export const test = base.extend<Fixtures>({})
export { expect }

type ReadyWindow = { __cywebReady?: boolean }

/**
 * Navigate to the app and seed a minimal network into the workspace via the
 * public window.CyWebApi.
 *
 * Toolbar menus that operate on a network (Layout, Tools, Edit, Analysis) are
 * disabled while the workspace is empty, so tests that need to open those menus
 * must first put a network in the workspace. This creates a tiny two-node
 * network and adds it to the workspace, which enables those menus.
 *
 * The seed must run only after AppShell has hydrated the workspace, otherwise
 * setWorkspace() overwrites the seeded network. AppShell dispatches
 * `cywebapi:ready` immediately after setWorkspace() completes, so we register a
 * ready flag before navigating and wait for it before seeding.
 */
export const gotoAndSeedNetwork = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    ;(window as unknown as ReadyWindow).__cywebReady = false
    window.addEventListener('cywebapi:ready', () => {
      ;(window as unknown as ReadyWindow).__cywebReady = true
    })
  })

  await page.goto('/')
  await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({
    timeout: 15000,
  })

  // Wait until the workspace is hydrated (cywebapi:ready fired) so the seeded
  // network is not clobbered by AppShell's setWorkspace().
  await page.waitForFunction(
    () => (window as unknown as ReadyWindow).__cywebReady === true,
    undefined,
    { timeout: 30_000 },
  )

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
