import { type Page } from '@playwright/test'

import { expect, gotoAndWaitReady, test } from './fixtures'

// #859: CyjsRenderer re-applies the visual style on every style or table
// change and writes the result back to ViewModelStore. The result had no
// viewId, so the store appended a full copy of the view each time instead of
// replacing it, and every copy was persisted to `cyNetworkViews`. views[0] —
// the one every reader gets — never received the computed values.
//
// This drives the real renderer and reads the row the app reloads from, with
// the raw IndexedDB API so nothing in the page's own persistence path can hide
// an extra view.
//
// The cy instance is reached through `window.debug.cy`, enabled by seeding the
// debug localStorage override before navigation (see node-graphics-hook.spec).

type DebugGlobals = { debug?: Record<string, any>; CyWebApi?: any }

/** One serialized view as `putNetworkViewsToDb` writes it. */
interface PersistedView {
  viewId?: string
  type?: string
  nodeViews: Record<string, { values: Array<[string, unknown]> }>
}

const FINAL_WIDTH = 123
const FINAL_NAME = 'renamed-2'

const createNetwork = async (page: Page): Promise<string> => {
  const networkId = await page.evaluate(() => {
    const result = (
      window as unknown as DebugGlobals
    ).CyWebApi.network.createNetworkFromEdgeList({
      name: 'View Count',
      edgeList: [
        ['a', 'b'],
        ['b', 'c'],
      ],
      addToWorkspace: true,
    })
    return result.success ? (result.data.networkId as string) : undefined
  })
  expect(networkId).toBeTruthy()
  return networkId!
}

/** Creates the network, waits until it is on screen, and picks a node. */
const openNetwork = async (
  page: Page,
): Promise<{ networkId: string; nodeId: string }> => {
  await gotoAndWaitReady(page)
  const networkId = await createNetwork(page)

  await page.waitForFunction(
    () => (window as unknown as DebugGlobals).debug?.cy?.nodes().length === 3,
    undefined,
    { timeout: 30_000 },
  )
  const nodeId = await page.evaluate(
    (id) =>
      (window as unknown as DebugGlobals).CyWebApi.table.getTable(id, 'node')
        .data.rows[0].id as string,
    networkId,
  )
  return { networkId, nodeId }
}

/** The persisted node-link views of a network; [] while the row is absent. */
const persistedViews = async (
  page: Page,
  networkId: string,
): Promise<PersistedView[]> =>
  await page.evaluate(
    async (rowKey) =>
      await new Promise<PersistedView[]>((resolve) => {
        const open = indexedDB.open('cyweb-db')
        open.onerror = () => resolve([])
        open.onsuccess = () => {
          const db = open.result
          const done = (value: PersistedView[]): void => {
            db.close()
            resolve(value)
          }
          let request: IDBRequest
          try {
            request = db
              .transaction('cyNetworkViews', 'readonly')
              .objectStore('cyNetworkViews')
              .get(rowKey)
          } catch {
            done([])
            return
          }
          request.onerror = () => done([])
          request.onsuccess = () => done(request.result?.views ?? [])
        }
      }),
    networkId,
  )

const valueOf = (
  view: PersistedView | undefined,
  nodeId: string,
  vp: string,
): unknown => view?.nodeViews[nodeId]?.values.find(([name]) => name === vp)?.[1]

test.describe('Node-link view write-back (#859, #861)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cyweb-debug-enabled', 'true')
    })
  })

  test('style and table changes replace the one node-link view in place', async ({
    page,
  }) => {
    const { networkId, nodeId } = await openNetwork(page)

    // Apply one change and wait until a persisted view carries its computed
    // value, which proves it went through the renderer's style effect.
    const change = async (
      apply: () => Promise<{ success: boolean }>,
      vp: string,
      expected: unknown,
    ): Promise<void> => {
      expect((await apply()).success).toBe(true)
      await expect
        .poll(
          async () =>
            (await persistedViews(page, networkId)).some(
              (view) => valueOf(view, nodeId, vp) === expected,
            ),
          { timeout: 15_000 },
        )
        .toBe(true)
    }
    const setWidth = (width: number): Promise<void> =>
      change(
        () =>
          page.evaluate(
            ([id, w]) =>
              (
                window as unknown as DebugGlobals
              ).CyWebApi.visualStyle.setDefault(id, 'nodeWidth', w),
            [networkId, width] as const,
          ),
        'nodeWidth',
        width,
      )
    // A table edit shows up as the node label: createNetworkFromEdgeList maps
    // `name` to it.
    const setName = (name: string): Promise<void> =>
      change(
        () =>
          page.evaluate(
            ([id, n, value]) =>
              (window as unknown as DebugGlobals).CyWebApi.table.setValue(
                id,
                'node',
                n,
                'name',
                value,
              ),
            [networkId, nodeId, name] as const,
          ),
        'nodeLabel',
        name,
      )

    for (const width of [40, 60]) await setWidth(width)
    for (const name of ['renamed-1', FINAL_NAME]) await setName(name)
    await setWidth(FINAL_WIDTH)

    const views = await persistedViews(page, networkId)
    expect(views.map((view) => view.viewId)).toEqual([
      `${networkId}-nodeLink-1`,
    ])
    expect(views[0].type).toBe('nodeLink')
    // views[0] is the one getViewModel returns; it used to keep stale values.
    expect(valueOf(views[0], nodeId, 'nodeWidth')).toBe(FINAL_WIDTH)
    expect(valueOf(views[0], nodeId, 'nodeLabel')).toBe(FINAL_NAME)
  })

  // #861: every style or table change used to redraw the whole network, and
  // each redraw closed the renderer's write-back for one second. Of several
  // changes made within a second, only the canvas saw the later ones; the view
  // model, and so the persisted row, kept the first. Each change here sets a
  // different property, so the row shows whether every one was written back.
  test('changes less than a second apart all reach the persisted view, without a redraw', async ({
    page,
  }) => {
    const { networkId, nodeId } = await openNetwork(page)

    // A full render removes every element and adds a new one in its place, so
    // the element object shows whether one happened.
    await page.evaluate((n) => {
      const w = window as unknown as DebugGlobals & { __node?: unknown }
      w.__node = w.debug!.cy.getElementById(n)[0]
    }, nodeId)

    // Each change commits before the next starts (two frames apart), so each
    // reaches the renderer as a separate update, the way edits from the UI do.
    // The old bug lost a change made within a second of the previous one, so
    // each gap must stay under a second. The total may not: WebKit in CI
    // takes 350–470 ms per change, over a second for all three.
    const gapsMs = await page.evaluate(
      async ([id, n]) => {
        const api = (window as unknown as DebugGlobals).CyWebApi
        const nextFrames = (): Promise<void> =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          )
        const changes = [
          () => api.visualStyle.setDefault(id, 'nodeWidth', 77),
          () => api.visualStyle.setDefault(id, 'nodeBorderWidth', 7),
          () => api.table.setValue(id, 'node', n, 'name', 'burst'),
        ]
        const appliedAt: number[] = []
        for (const apply of changes) {
          appliedAt.push(performance.now())
          if (!apply().success) throw new Error('change rejected')
          await nextFrames()
        }
        return appliedAt.slice(1).map((t, i) => t - appliedAt[i])
      },
      [networkId, nodeId] as const,
    )
    for (const gap of gapsMs) expect(gap).toBeLessThan(1_000)

    await expect
      .poll(
        async () => {
          const [view] = await persistedViews(page, networkId)
          return [
            valueOf(view, nodeId, 'nodeWidth'),
            valueOf(view, nodeId, 'nodeBorderWidth'),
            valueOf(view, nodeId, 'nodeLabel'),
          ]
        },
        { timeout: 15_000 },
      )
      .toEqual([77, 7, 'burst'])

    const onScreen = await page.evaluate((n) => {
      const w = window as unknown as DebugGlobals & { __node?: unknown }
      const node = w.debug!.cy.getElementById(n)
      return {
        sameElement: node[0] === w.__node,
        width: node.data('nodeWidth'),
        label: node.data('nodeLabel'),
      }
    }, nodeId)
    expect(onScreen).toEqual({ sameElement: true, width: 77, label: 'burst' })
  })
})
