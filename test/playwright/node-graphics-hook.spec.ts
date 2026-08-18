import fs from 'fs'
import path from 'path'

import {
  expect,
  getWorkspaceNetworkCount,
  gotoAndWaitReady,
  test,
} from './fixtures'

// Proves the two claims that unit tests cannot reach, against the real bundle
// and a real Cytoscape.js instance:
//
//   1. A render hook's image actually lands on the node, as an ELEMENT STYLE
//      BYPASS. The unit tests use a stub cy, so they verify the call but not
//      that Cytoscape.js accepts it or that a stylesheet reapply preserves it.
//   2. That image never reaches exported CX2, while a Vizmapper custom graphic
//      still does.
//
// The cy instance is reached through `window.debug.cy` (registerDebugTool in
// CyjsRenderer). Debug is enabled by seeding its localStorage override before
// navigation, so this works in both a dev server and a production preview
// build rather than silently skipping in CI.

const CX2_FIXTURE = path.resolve(
  __dirname,
  '../fixtures/cx2/valid/small-network.valid.cx2',
)
const IMPORT_URL = 'https://fixtures.invalid/node-graphics-fixture.cx2'

const SENTINEL_MARKER = 'CYWEB_HOOK_SENTINEL'
const SENTINEL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle id="${SENTINEL_MARKER}" cx="5" cy="5" r="4" fill="#4caf50"/></svg>`

/**
 * `window.debug` and `window.CyWebApi` are already declared by the app
 * (src/custom.d.ts and the api-types package), so this narrows them for the
 * in-page callbacks rather than redeclaring and conflicting. The cast is written
 * out at each use because `page.evaluate` callbacks run in the browser and
 * cannot close over anything defined here.
 */
type DebugGlobals = { debug?: Record<string, any>; CyWebApi?: any }

test.describe('Node graphics render hook', () => {
  test('paints a hook image as a cy style bypass and keeps it out of CX2', async ({
    page,
  }) => {
    const cx2 = fs.readFileSync(CX2_FIXTURE, 'utf8')
    await page.route(IMPORT_URL, (route) =>
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

    // Enable debug before boot so registerDebugTool('cy', cy) reaches window.
    await page.addInitScript(() => {
      localStorage.setItem('cyweb-debug-enabled', 'true')
    })

    await gotoAndWaitReady(page, `/?import=${encodeURIComponent(IMPORT_URL)}`)
    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 15000 })
      .toBe(1)

    // The renderer has mounted and registered its cy instance.
    await page.waitForFunction(
      () => (window as unknown as DebugGlobals).debug?.cy !== undefined,
      undefined,
      {
        timeout: 30_000,
      },
    )
    await page.waitForFunction(
      () =>
        ((window as unknown as DebugGlobals).debug?.cy?.nodes().length ?? 0) >
        0,
      undefined,
      { timeout: 30_000 },
    )

    const networkId = await page.evaluate(() => {
      const result = (
        window as unknown as DebugGlobals
      ).CyWebApi.workspace.getNetworkIds()
      return result.success ? result.data.networkIds[0] : undefined
    })
    expect(networkId).toBeTruthy()

    // Baseline: no hook, so no node carries a background-image bypass.
    const before = await page.evaluate(() =>
      (window as unknown as DebugGlobals)
        .debug!.cy.nodes()
        .map((n: any) => n.style('background-image')),
    )
    expect(
      before.every((v: string) => v === undefined || v === 'none' || v === ''),
    ).toBe(true)

    // ── Register the hook ────────────────────────────────────────────────────

    const registered = await page.evaluate((svg) => {
      return (
        window as unknown as DebugGlobals
      ).CyWebApi.nodeGraphics.setRenderHook(() => svg)
    }, SENTINEL_SVG)
    expect(registered.success).toBe(true)

    // Every node picks up the image. The hook runs in chunks across animation
    // frames, so poll rather than assert immediately.
    await expect
      .poll(
        async () =>
          await page.evaluate(
            () =>
              (window as unknown as DebugGlobals)
                .debug!.cy.nodes()
                .filter((n: any) => {
                  const v = n.style('background-image')
                  return typeof v === 'string' && v.startsWith('data:image/svg')
                }).length,
          ),
        { timeout: 15000 },
      )
      .toBeGreaterThan(0)

    // The image survived, and Cytoscape.js parsed it as a real property value.
    const painted = await page.evaluate(() => {
      const node = (window as unknown as DebugGlobals).debug!.cy.nodes()[0]
      return {
        image: node.style('background-image'),
        fit: node.style('background-fit'),
      }
    })
    expect(painted.image).toContain('data:image/svg')
    expect(decodeURIComponent(painted.image)).toContain(SENTINEL_MARKER)
    expect(painted.fit).toBe('contain')

    // ── The constraint: none of that reaches CX2 ─────────────────────────────
    //
    // Asserted structurally rather than by byte-equality against a pre-hook
    // export: a live app runs its layout asynchronously, so two exports taken
    // seconds apart legitimately differ in node x/y. The deterministic
    // byte-equality claim lives in exporter.nodeGraphics.test.ts, which has no
    // layout to race.

    const exported = await page.evaluate((id) => {
      const result = (
        window as unknown as DebugGlobals
      ).CyWebApi.export.exportToCx2(id)
      if (!result.success) return { ok: false as const }
      const aspects: any[] = result.data
      const find = (key: string) =>
        aspects.find((a) => Object.prototype.hasOwnProperty.call(a, key))?.[key]
      return {
        ok: true as const,
        json: JSON.stringify(aspects),
        nodeBypasses: find('nodeBypasses'),
        nodeDefaults: find('visualProperties')?.[0]?.default?.node ?? {},
      }
    }, networkId)

    expect(exported.ok).toBe(true)
    expect(exported.json).not.toContain(SENTINEL_MARKER)
    expect(exported.json).not.toContain('data:image/svg')
    // Nothing was written as a bypass or a style default.
    expect(exported.nodeBypasses).toEqual([])
    expect(
      Object.keys(exported.nodeDefaults!).filter((k) => k.includes('IMAGE')),
    ).toEqual([])

    // ── Clearing the hook removes the bypass ─────────────────────────────────

    const cleared = await page.evaluate(() =>
      (
        window as unknown as DebugGlobals
      ).CyWebApi.nodeGraphics.clearRenderHook(),
    )
    expect(cleared.success).toBe(true)

    await expect
      .poll(
        async () =>
          await page.evaluate(
            () =>
              (window as unknown as DebugGlobals)
                .debug!.cy.nodes()
                .filter((n: any) => {
                  const v = n.style('background-image')
                  return typeof v === 'string' && v.startsWith('data:image/svg')
                }).length,
          ),
        { timeout: 15000 },
      )
      .toBe(0)
  })

  test('a bypass survives a stylesheet reapply', async ({ page }) => {
    // The load-bearing cytoscape behavior this design rests on: cy.style(sheet)
    // installs a new Style object without clearing element bypasses. A change to
    // the visual style triggers that reapply through onStyleModelUpdate.
    const cx2 = fs.readFileSync(CX2_FIXTURE, 'utf8')
    await page.route(IMPORT_URL, (route) =>
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
    await page.addInitScript(() => {
      localStorage.setItem('cyweb-debug-enabled', 'true')
    })

    await gotoAndWaitReady(page, `/?import=${encodeURIComponent(IMPORT_URL)}`)
    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 15000 })
      .toBe(1)
    await page.waitForFunction(
      () =>
        ((window as unknown as DebugGlobals).debug?.cy?.nodes().length ?? 0) >
        0,
      undefined,
      { timeout: 30_000 },
    )

    const networkId = await page.evaluate(() => {
      const result = (
        window as unknown as DebugGlobals
      ).CyWebApi.workspace.getNetworkIds()
      return result.success ? result.data.networkIds[0] : undefined
    })

    await page.evaluate(
      (svg) =>
        (window as unknown as DebugGlobals).CyWebApi.nodeGraphics.setRenderHook(
          () => svg,
        ),
      SENTINEL_SVG,
    )
    await expect
      .poll(
        async () =>
          await page.evaluate(() =>
            String(
              (window as unknown as DebugGlobals)
                .debug!.cy.nodes()[0]
                .style('background-image'),
            ),
          ),
        { timeout: 15000 },
      )
      .toContain('data:image/svg')

    // Change a default visual property, forcing cy.style(cyStyle) to rerun.
    const styled = await page.evaluate(
      (id) =>
        (window as unknown as DebugGlobals).CyWebApi.visualStyle.setDefault(
          id,
          'nodeBackgroundColor',
          '#123456',
        ),
      networkId,
    )
    expect(styled.success).toBe(true)

    // The stylesheet was replaced; the bypass must still be there.
    await expect
      .poll(
        async () =>
          await page.evaluate(() =>
            String(
              (window as unknown as DebugGlobals)
                .debug!.cy.nodes()[0]
                .style('background-image'),
            ),
          ),
        { timeout: 15000 },
      )
      .toContain('data:image/svg')
  })
})
