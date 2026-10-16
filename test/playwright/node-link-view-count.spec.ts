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

/** CyjsRenderer arms its style effect this long after a render (1000 ms). */
const RENDER_GATE_MS = 1_200

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

test.describe('Node-link view count (#859)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cyweb-debug-enabled', 'true')
    })
  })

  test('style and table changes replace the one node-link view in place', async ({
    page,
  }) => {
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

    // Apply one change and wait until a persisted view carries its computed
    // value, which proves it went through the renderer's style effect.
    //
    // The effect is gated on `isViewCreated`, which every (re-)render clears and
    // a 1 s timer sets again — and today a style or table change also triggers
    // a full re-render. A change made inside that window is redrawn on the
    // canvas but never written back, so the spec waits it out first.
    const change = async (
      apply: () => Promise<{ success: boolean }>,
      vp: string,
      expected: unknown,
    ): Promise<void> => {
      await page.waitForTimeout(RENDER_GATE_MS)
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
})
