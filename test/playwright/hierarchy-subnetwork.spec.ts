import type { Page } from '@playwright/test'

import type { HierarchySubnetworkCase } from './fixtures/hierarchySubnetwork.data'
import {
  hierarchySubnetworkCases,
  runNdexE2E,
} from './fixtures/hierarchySubnetwork.data'
import { appPath, expect, test } from './fixtures'

/**
 * HierarchyViewer subnetwork loading — regression test for the interconnect
 * query CX2 fix.
 *
 * Scenario (music1 sample network):
 *   1. Load the music1 hierarchy network from NDEx by UUID.
 *   2. Simulate a click on the subsystem hierarchy node with CX id 124.
 *   3. The app runs an NDEx interconnect query to fetch the subsystem's
 *      interaction subnetwork, which is rendered in the sub network viewer.
 *
 * Invariant under test:
 *   The interconnect query MUST use the CX2 (v3) endpoint, and the number of
 *   nodes it returns MUST equal the hierarchy node's "Number of proteins"
 *   column. For node 124 both are expected to be 6.
 *
 * This is a live-integration acceptance test: it depends on the NDEx server
 * configured in src/assets/config.json (dev1.ndexbio.org) and the network being
 * publicly readable there. It is opt-in — set RUN_NDEX_E2E=1 to run it.
 *
 * The network/subsystem identifiers and expected values are parameterized in
 * ./fixtures/hierarchySubnetwork.data.ts (overridable via env vars) so the test
 * can be pointed at a different server or network without editing this spec.
 */

// Live-NDEx acceptance tests are opt-in (they hit a real server). Skip the
// whole suite unless RUN_NDEX_E2E is set, keeping the default lane hermetic.
test.skip(
  !runNdexE2E,
  'Live NDEx E2E acceptance test — set RUN_NDEX_E2E=1 to run.',
)

/**
 * Runs the full "click subsystem → subnetwork loads & renders correctly" check
 * for a single parameterized case. Kept as a helper so the body stays at one
 * indentation level; each entry in `hierarchySubnetworkCases` gets its own
 * `test(...)` via the loop at the bottom of this file.
 */
async function runHierarchySubnetworkCase(
  page: Page,
  testCase: HierarchySubnetworkCase,
): Promise<void> {
  const {
    uuid: HIERARCHY_UUID,
    subsystemCxId: SUBSYSTEM_CX_ID,
    subsystemName: SUBSYSTEM_NAME,
    numberOfProteinsColumn: NUMBER_OF_PROTEINS_COLUMN,
    expectedNodeCount: EXPECTED_NODE_COUNT,
  } = testCase

  // 1. Load the music1 hierarchy network by NDEx UUID. The workspace id in the
  //    path is arbitrary — the app ignores ids that don't match the cache.
  await page.goto(appPath(`e2e/networks/${HIERARCHY_UUID}`))

  // Dismiss the cookie consent banner if it appears.
  const acceptCookies = page.getByRole('button', { name: 'Accept' })
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click()
  }

  // 2. Open the hierarchy (circle-packing) view. For a hierarchy network the
  //    renderer tabs are renamed to "NETWORK VIEW" / "CELL VIEW"; the
  //    circle-packing SVG lives in the (initially inactive) CELL VIEW tab.
  await page.getByRole('tab', { name: /cell view/i }).click({ timeout: 90_000 })

  // Wait for the circle-packing hierarchy to render.
  const svg = page.locator('[data-testid="circle-packing-svg"]')
  await expect(svg).toBeVisible({ timeout: 90_000 })
  await expect(svg.locator('circle').first()).toBeAttached({ timeout: 90_000 })

  // Resolve the hierarchy network id the app assigned (from the resulting URL).
  const hierarchyId = page.url().split('/networks/')[1]?.split(/[/?#]/)[0]
  expect(hierarchyId, 'could not resolve hierarchy network id from URL').toBeTruthy()

  // Observe the interconnect query response the app actually receives. We only
  // inspect it — the browser makes and receives its own untouched response, so
  // the test stays out of the network pipeline it is measuring. Register the
  // waiter before the click that triggers the request.
  const interconnectResponsePromise = page.waitForResponse(/interconnectquery/, {
    timeout: 60_000,
  })

  // 3. Simulate a click on the subsystem circle for CX node 124.
  //    We find it via d3's bound datum (__data__) instead of adding a
  //    test-only attribute to production code, then dispatch a real click
  //    event that fires the d3 'click' handler. dispatchEvent also sidesteps
  //    SVG hit-testing (child circles overlap the parent) and zoom visibility.
  const clicked = await page.evaluate((cxId) => {
    const circles = Array.from(
      document.querySelectorAll('[data-testid="circle-packing-svg"] circle'),
    )
    const target = circles.find(
      (circle) => (circle as any).__data__?.data?.id === cxId,
    )
    if (target === undefined) {
      return false
    }
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return true
  }, SUBSYSTEM_CX_ID)
  expect(
    clicked,
    `subsystem circle with CX id ${SUBSYSTEM_CX_ID} was not found in the hierarchy`,
  ).toBe(true)

  // Read the untouched interconnect response the browser received.
  const interconnectResponse = await interconnectResponsePromise
  const interconnectUrl = interconnectResponse.url()
  let interconnectNodeCount: number | null = null
  try {
    const cx2 = await interconnectResponse.json()
    // CX2 is an aspect array; find the { nodes: [...] } aspect.
    const nodesAspect = Array.isArray(cx2)
      ? cx2.find((aspect: any) => Array.isArray(aspect?.nodes))?.nodes
      : undefined
    interconnectNodeCount = Array.isArray(nodesAspect)
      ? nodesAspect.length
      : null
  } catch {
    interconnectNodeCount = null
  }

  // 4. Wait for the subnetwork to load into the sub network viewer. The panel
  //    only renders once the CX2 has been fetched, validated by
  //    getCyNetworkFromCx2, and mounted — so its presence already proves the
  //    CX2 pipeline succeeded (CX1 would fail validation → error panel).
  const subnetworkPanel = page.locator('[data-testid="subnetwork-panel"]')
  await expect(subnetworkPanel).toBeVisible({ timeout: 60_000 })

  // 4a. Verify the correct subsystem is shown in the pane.
  await expect(subnetworkPanel).toContainText(`Subsystem: ${SUBSYSTEM_NAME}`)

  // 4b. Verify the subnetwork MODEL loaded into the pane has the expected node
  //     count. The subnetwork is stored under `<hierarchyId>_<subsystemId>`.
  //     The panel becoming visible and the table store settling can happen on
  //     slightly different ticks, so read via a poller rather than once.
  const subnetworkId = `${hierarchyId}_${SUBSYSTEM_CX_ID}`
  const readModelNodeCount = () =>
    page.evaluate((sid) => {
      const api = (window as any).CyWebApi
      const result = api?.table?.getTable(sid, 'node')
      return result?.success === true ? result.data.rows.length : null
    }, subnetworkId)

  // 4c. Verify the subnetwork was actually RENDERED. CyjsRenderer paints the
  //     graph onto stacked Cytoscape.js <canvas> layers. Assert the canvases
  //     exist with non-zero size and that pixels were actually painted (the
  //     graph is not blank). Poll because drawing/fit happens async after mount.
  //     We don't need an exact painted-pixel count — only "non-blank" — so we
  //     stride-sample the alpha channel and short-circuit on the first hit.
  //     That bounds cost (this runs in a poll loop across 3 browsers) while a
  //     real rendered graph covers far more than one in every `STRIDE` pixels.
  const readRenderStats = () =>
    subnetworkPanel.evaluate((el) => {
      const STRIDE = 16 // sample every 16th pixel
      const canvases = Array.from(el.querySelectorAll('canvas'))
      const sized = canvases.filter((c) => c.width > 0 && c.height > 0)
      let painted = false
      for (const c of sized) {
        try {
          const ctx = c.getContext('2d')
          if (ctx === null) continue
          const { data } = ctx.getImageData(0, 0, c.width, c.height)
          for (let i = 3; i < data.length; i += 4 * STRIDE) {
            if (data[i] !== 0) {
              painted = true
              break
            }
          }
        } catch {
          // ignore any layer that can't be read back
        }
        if (painted) break
      }
      return { sizedCanvases: sized.length, painted }
    })

  await expect
    .poll(async () => (await readRenderStats()).painted, {
      timeout: 30_000,
    })
    .toBe(true)

  const renderStats = await readRenderStats()

  // 5. Read the "Number of proteins" column for node 124 from the hierarchy
  //    node table via the public CyWebApi.
  const numberOfProteins = await page.evaluate(
    ({ networkId, elementId, column }) => {
      const api = (window as any).CyWebApi
      const result = api?.table?.getValue(networkId, 'node', elementId, column)
      return result?.success === true ? Number(result.data.value) : null
    },
    {
      networkId: hierarchyId,
      elementId: SUBSYSTEM_CX_ID,
      column: NUMBER_OF_PROTEINS_COLUMN,
    },
  )

  // 6. Assertions.
  // Regression guard for the CX2 fix: interconnect must hit the v3 (CX2) API.
  expect(interconnectUrl).toContain('/v3/')
  // The interconnect query for node 124 returns 6 nodes.
  expect(interconnectNodeCount).toBe(EXPECTED_NODE_COUNT)
  // The hierarchy node's "Number of proteins" is 6.
  expect(numberOfProteins).toBe(EXPECTED_NODE_COUNT)
  // The two agree — the subnetwork contains exactly the subsystem's proteins.
  expect(interconnectNodeCount).toBe(numberOfProteins)

  // The subnetwork MODEL loaded into the pane has the expected node count.
  // Poll: the table store may settle a tick or two after the panel appears.
  await expect.poll(readModelNodeCount, { timeout: 30_000 }).toBe(EXPECTED_NODE_COUNT)

  // The subnetwork was actually rendered: Cytoscape.js created sized canvas
  // layers and painted a non-blank graph onto them.
  expect(renderStats.sizedCanvases).toBeGreaterThan(0)
  expect(renderStats.painted).toBe(true)
}

// Generate one test per case. Add cases by editing
// ./fixtures/hierarchySubnetwork.data.ts — no changes needed here.
for (const testCase of hierarchySubnetworkCases) {
  // Tagged @ndex so the default (hermetic) lane can exclude it with
  // `--grep-invert @ndex`; the acceptance lane selects it with `--grep @ndex`.
  test(
    `hierarchy subnetwork [${testCase.name}]: subsystem ${testCase.subsystemCxId} loads & renders ${testCase.expectedNodeCount} node(s)`,
    { tag: '@ndex' },
    async ({ page }) => {
      test.setTimeout(120_000)
      await runHierarchySubnetworkCase(page, testCase)
    },
  )
}
