import { test as base, expect, type Page } from '@playwright/test'

type Fixtures = {}

export const test = base.extend<Fixtures>({})
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
