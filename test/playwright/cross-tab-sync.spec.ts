import { type Page } from '@playwright/test'

import { TAB_VIEW_STATE_KEY } from '../../src/data/tabState/storageKeys'
import { Panel } from '../../src/models/UiModel/Panel'
import { PanelState } from '../../src/models/UiModel/PanelState'
import { expect, test } from './fixtures'

/**
 * Cross-tab synchronization.
 *
 * Two pages in ONE browser context share an origin, and therefore share the
 * `cyweb-db` IndexedDB database — which is the entire reason cross-tab sync
 * exists. `test.describe.configure({ mode: 'serial' })` is not enough on its own;
 * both pages must come from the same `context`, so these tests take `context`
 * rather than the per-test `page` fixture.
 *
 * These cover the two properties that unit tests cannot: that a real second tab
 * actually receives another tab's edit, and that it does NOT receive that tab's
 * view state.
 */

type ReadyWindow = { __cywebReady?: boolean }

/**
 * The slice of `window.CyWebApi` these tests drive.
 *
 * One declaration for all four `page.evaluate` helpers below. The alternative —
 * an inline shape in some and `(window as any)` in others — meant a renamed API
 * method failed at runtime, mid-poll, instead of at build time.
 *
 * `page.evaluate` callbacks are serialized to the browser, so this type must
 * stay a plain structural shape with no imports behind it.
 */
type CyWebApiWindow = {
  CyWebApi?: {
    network: {
      createNetworkFromEdgeList: (props: {
        name: string
        edgeList: Array<[string, string, string?]>
        addToWorkspace?: boolean
      }) => { success: boolean; data?: { networkId: string } }
    }
    workspace: {
      getNetworks: () => {
        success: boolean
        data?: { networks?: Array<{ name: string; networkId: string }> }
      }
    }
    selection: {
      getSelection: (networkId: string) => {
        success: boolean
        data?: { selectedNodes?: string[]; selectedEdges?: string[] }
      }
      exclusiveSelect: (
        networkId: string,
        nodeIds: string[],
        edgeIds: string[],
      ) => { success: boolean }
    }
  }
}

const gotoReady = async (page: Page): Promise<void> => {
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
  await page.waitForFunction(
    () => (window as unknown as ReadyWindow).__cywebReady === true,
    undefined,
    { timeout: 30_000 },
  )
}

/** Creates a network and returns its id, so tests never guess by index. */
const seedNetwork = async (page: Page, name: string): Promise<string> => {
  const result = await page.evaluate((networkName) => {
    const api = (window as unknown as CyWebApiWindow).CyWebApi
    return api?.network.createNetworkFromEdgeList({
      name: networkName,
      edgeList: [['a', 'b']],
      addToWorkspace: true,
    })
  }, name)

  expect(result?.success).toBe(true)
  const networkId = result?.data?.networkId ?? ''
  expect(networkId).not.toBe('')
  return networkId
}

/** Network names this tab currently has in its workspace, read from the store. */
const workspaceNetworkNames = async (page: Page): Promise<string[]> =>
  await page.evaluate(() => {
    const api = (window as unknown as CyWebApiWindow).CyWebApi
    const result = api?.workspace.getNetworks()
    return (result?.data?.networks ?? []).map((n) => String(n.name))
  })

test.describe('cross-tab synchronization', () => {
  test.describe.configure({ mode: 'serial' })

  test('a network added in one tab appears in the other', async ({
    context,
  }) => {
    const tabA = await context.newPage()
    const tabB = await context.newPage()
    await gotoReady(tabA)
    await gotoReady(tabB)

    await seedNetwork(tabA, 'Synced From Tab A')

    // dexie-observable polls at up to 500ms, so this is expected to take a
    // moment — but it must happen without tab B reloading.
    await expect
      .poll(async () => await workspaceNetworkNames(tabB), { timeout: 15_000 })
      .toContain('Synced From Tab A')

    await tabA.close()
    await tabB.close()
  })

  test('the receiving tab does not reload', async ({ context }) => {
    const tabA = await context.newPage()
    const tabB = await context.newPage()
    await gotoReady(tabA)
    await gotoReady(tabB)

    // A reload would clear this marker; live hydration leaves it in place.
    await tabB.evaluate(() => {
      ;(window as unknown as { __survivedSync?: boolean }).__survivedSync = true
    })

    await seedNetwork(tabA, 'No Reload Please')
    await expect
      .poll(async () => await workspaceNetworkNames(tabB), { timeout: 15_000 })
      .toContain('No Reload Please')

    const survived = await tabB.evaluate(
      () => (window as unknown as { __survivedSync?: boolean }).__survivedSync,
    )
    expect(survived, 'tab B should hydrate in place, not reload').toBe(true)

    await tabA.close()
    await tabB.close()
  })

  test('each tab keeps its own panel layout', async ({ context }) => {
    const tabA = await context.newPage()
    const tabB = await context.newPage()
    await gotoReady(tabA)
    await gotoReady(tabB)

    // Constants, not repeated literals: a rename of the storage key or of a
    // PanelState member now fails the build here instead of quietly making the
    // assertions below read 'unset' forever.
    const panelState = async (page: Page): Promise<string> =>
      await page.evaluate(
        ({ key, panel }) =>
          JSON.parse(window.sessionStorage.getItem(key) ?? '{}')?.panels?.[
            panel
          ] ?? 'unset',
        { key: TAB_VIEW_STATE_KEY, panel: Panel.LEFT },
      )

    // Collapse the left panel in tab A only.
    await tabA.evaluate(
      ({ key, panel, closed }) => {
        const stored = JSON.parse(window.sessionStorage.getItem(key) ?? '{}')
        window.sessionStorage.setItem(
          key,
          JSON.stringify({
            ...stored,
            panels: { ...stored.panels, [panel]: closed },
          }),
        )
      },
      {
        key: TAB_VIEW_STATE_KEY,
        panel: Panel.LEFT,
        closed: PanelState.CLOSED,
      },
    )

    // Force a shared-row write from tab A, which tab B will hydrate.
    await seedNetwork(tabA, 'Panel Isolation')
    await expect
      .poll(async () => await workspaceNetworkNames(tabB), { timeout: 15_000 })
      .toContain('Panel Isolation')

    // Panel state is per-tab sessionStorage, so hydration must not carry it.
    // Asserting tab B's exact value (not merely "not closed") keeps this from
    // passing vacuously if tab B never stored view state at all.
    expect(await panelState(tabA)).toBe(PanelState.CLOSED)
    expect(await panelState(tabB)).toBe(PanelState.OPEN)

    await tabA.close()
    await tabB.close()
  })

  test('selection made in one tab reaches the other', async ({ context }) => {
    const tabA = await context.newPage()
    const tabB = await context.newPage()
    await gotoReady(tabA)
    await gotoReady(tabB)

    const networkId = await seedNetwork(tabA, 'Selection Sync')
    await expect
      .poll(async () => await workspaceNetworkNames(tabB), { timeout: 15_000 })
      .toContain('Selection Sync')

    // Tab B must have the network's VIEW MODEL loaded, not merely its summary.
    // Hydration deliberately skips applying a selection for a network this tab
    // has not opened, and `getSelection` fails without a view model — so assert
    // on that precondition rather than racing it. A reload makes tab B resolve
    // and load the network through its normal init path.
    await tabB.reload()
    await expect(tabB.locator('[data-testid="app-shell"]')).toBeVisible({
      timeout: 15000,
    })
    await expect
      .poll(
        async () =>
          await tabB.evaluate(
            ({ id }) => {
              const api = (window as unknown as CyWebApiWindow).CyWebApi
              return api?.selection?.getSelection(id)?.success === true
            },
            { id: networkId },
          ),
        { timeout: 20_000 },
      )
      .toBe(true)

    const selected = await tabA.evaluate(
      ({ id }) => {
        const api = (window as unknown as CyWebApiWindow).CyWebApi
        return api?.selection?.exclusiveSelect(id, ['a'], [])
      },
      { id: networkId },
    )
    expect(selected?.success).toBe(true)

    // Selection is shared state, so it must propagate — but via its own
    // viewSelections row rather than by replacing tab B's whole view model.
    await expect
      .poll(
        async () =>
          await tabB.evaluate(
            ({ id }) => {
              const api = (window as unknown as CyWebApiWindow).CyWebApi
              const result = api?.selection?.getSelection(id)
              return result?.data?.selectedNodes ?? []
            },
            { id: networkId },
          ),
        { timeout: 15_000 },
      )
      .toContain('a')

    await tabA.close()
    await tabB.close()
  })
})
