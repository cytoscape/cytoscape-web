import path from 'path'

import {
  expect,
  getWorkspaceNetworkCount,
  gotoAndWaitReady,
  installFixtureApp,
  test,
} from './fixtures'
import type { Locator, Page } from '@playwright/test'

// Issue #630: a HCX hierarchy can contain edges that are not parent-child
// relationships. The circle packing builder cannot interpret those, so:
//  - a hierarchy with several edge interaction types gets no Cell View tab
//  - any other hierarchy the builder cannot resolve shows a message instead of
//    the blank panel it used to leave behind
const MIXED_INTERACTION_HCX = path.resolve(
  __dirname,
  '../fixtures/hcx/valid/with-interaction-uuid.valid.cx2',
)

const UNIFORM_INTERACTION_CYCLIC_HCX = path.resolve(
  __dirname,
  '../fixtures/hcx/invalid/not-dag-single-interaction.invalid.cx2',
)

const importNetworkFile = async (
  page: Page,
  fixture: string,
  networkName: string,
): Promise<void> => {
  await gotoAndWaitReady(page)
  expect(await getWorkspaceNetworkCount(page)).toBe(0)
  await importAnotherNetworkFile(page, fixture, networkName, 1)
}

/** Import `fixture` into the current workspace, which then holds `count`. */
const importAnotherNetworkFile = async (
  page: Page,
  fixture: string,
  networkName: string,
  count: number,
): Promise<void> => {
  await page.locator('[data-testid="toolbar-data-menu-menu-button"]').click()
  await page.getByRole('menuitem', { name: 'Import' }).click()
  const fromFileItem = page.getByRole('menuitem', {
    name: 'Network from File...',
  })
  await expect(fromFileItem).toBeVisible()
  await fromFileItem.click()
  await expect(
    page.locator('[data-testid="file-upload-dropzone"]'),
  ).toBeVisible()

  await page
    .locator('[data-testid="file-upload-dropzone"] input[type="file"]')
    .setInputFiles(fixture)

  await expect
    .poll(() => getWorkspaceNetworkCount(page), { timeout: 15000 })
    .toBe(count)
  await expect(page.getByText(networkName).first()).toBeVisible({
    timeout: 15000,
  })
}

test.describe('Cell View availability for hierarchies (#630)', () => {
  test('a hierarchy with mixed edge interaction types gets no Cell View tab', async ({
    page,
  }) => {
    await importNetworkFile(
      page,
      MIXED_INTERACTION_HCX,
      'Test Network 50 nodes',
    )

    // The network is recognised as a hierarchy: the Sub Network Viewer is open
    // and waiting for a subsystem selection.
    await expect(page.getByText('Please select a subsystem')).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText('Failed to load network data')).toHaveCount(0)

    // ...yet the Cell View renderer is never registered, so there is no tab for
    // it and no blank circle packing panel.
    await expect(page.getByRole('tab', { name: 'Cell View' })).toHaveCount(0)
    await expect(
      page.locator('[data-testid="circle-packing-svg"]'),
    ).toHaveCount(0)
  })

  test('a hierarchy that cannot be resolved to a tree explains itself instead of rendering blank', async ({
    page,
  }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await importNetworkFile(
      page,
      UNIFORM_INTERACTION_CYCLIC_HCX,
      'Test Network 20 nodes',
    )

    // Every edge shares one interaction type, so the heuristic keeps Cell View.
    const cellViewTab = page.getByRole('tab', { name: 'Cell View' })
    await expect(cellViewTab).toBeVisible({ timeout: 15000 })
    await cellViewTab.click()

    // The network is cyclic, so no single root exists: the panel says so rather
    // than leaving an empty SVG behind.
    await expect(
      page.locator('[data-testid="circle-packing-unavailable"]'),
    ).toBeVisible({ timeout: 15000 })
    await expect(
      page.locator('[data-testid="circle-packing-svg"]'),
    ).toHaveCount(0)

    expect(pageErrors).toEqual([])
  })
})

const REGULAR_CX2 = path.resolve(
  __dirname,
  '../fixtures/cx2/valid/small-network.valid.cx2',
)

// A single-rooted tree with one interaction type: a hierarchy the Cell View
// can draw (the other valid HCX fixtures mix interaction types).
const TREE_HCX = path.resolve(__dirname, '../fixtures/hcx/valid/tree.valid.cx2')

/**
 * Drag the table panel's divider — the horizontal allotment sash right under
 * the network pane — up by `by` pixels, growing the table.
 */
const dragTableDividerUp = async (page: Page, by: number): Promise<void> => {
  const tabsBox = (await page
    .locator('[data-testid="network-tabs"]')
    .boundingBox())!
  const sashY = tabsBox.y + tabsBox.height + 2
  const sashX = tabsBox.x + tabsBox.width / 2
  await page.mouse.move(sashX, sashY)
  await page.mouse.down()
  await page.mouse.move(sashX, sashY - by, { steps: 10 })
  await page.mouse.up()
}

/**
 * Where the drawing sits in the SVG, in px: how far its center is from the SVG's
 * center, how far it sticks out past any edge (0 when it fits), and how much
 * of the SVG's shorter side it spans (0..1).
 */
const placement = (svg: Locator) =>
  svg.evaluate((element) => {
    const box = element.getBoundingClientRect()
    const drawing = element
      .querySelector('g.circle-packing-wrapper')
      ?.getBoundingClientRect()
    if (drawing === undefined || drawing.width === 0) return null
    return {
      offCenter: Math.round(
        Math.max(
          Math.abs(drawing.x + drawing.width / 2 - (box.x + box.width / 2)),
          Math.abs(drawing.y + drawing.height / 2 - (box.y + box.height / 2)),
        ),
      ),
      overflow: Math.round(
        Math.max(
          0,
          box.left - drawing.left,
          drawing.right - box.right,
          box.top - drawing.top,
          drawing.bottom - box.bottom,
        ),
      ),
      coverage:
        Math.max(drawing.width, drawing.height) /
        Math.min(box.width, box.height),
    }
  })

/** Poll until the drawing has stopped moving, then return its placement. */
const settledPlacement = async (
  svg: Locator,
): Promise<{ offCenter: number; overflow: number; coverage: number }> => {
  let previous = ''
  await expect
    .poll(
      async () => {
        const current = JSON.stringify(await placement(svg))
        const stable = current !== 'null' && current === previous
        previous = current
        return stable
      },
      { intervals: [500], timeout: 20_000 },
    )
    .toBe(true)
  return JSON.parse(previous)
}

test.describe('Hierarchy network view tabs', () => {
  // Regression: the box holding the Tree View / Cell View renderers is a flex
  // item, and its default `min-height: auto` kept it from shrinking below the
  // renderer's pixel-sized canvas. Growing the table panel shrank the pane but
  // not the view, whose lower part then disappeared under the table.
  test('the view shrinks with the pane when the table panel grows', async ({
    page,
  }) => {
    await importNetworkFile(
      page,
      UNIFORM_INTERACTION_CYCLIC_HCX,
      'Test Network 20 nodes',
    )

    const tabs = page.locator('[data-testid="network-tabs"]')
    const renderer = tabs.locator('[data-testid="cyjs-renderer"]')
    await expect(renderer).toBeVisible({ timeout: 15000 })

    const bottomOf = async (
      locator: ReturnType<Page['locator']>,
    ): Promise<number> => {
      const box = await locator.boundingBox()
      expect(box).not.toBeNull()
      return box!.y + box!.height
    }
    const heightOf = async (
      locator: ReturnType<Page['locator']>,
    ): Promise<number> => (await locator.boundingBox())!.height

    const rendererHeightBefore = await heightOf(renderer)

    const tabsBox = (await tabs.boundingBox())!
    const shrinkBy = 150
    await dragTableDividerUp(page, shrinkBy)

    // The pane itself shrank...
    await expect
      .poll(() => heightOf(tabs))
      .toBeLessThan(tabsBox.height - shrinkBy / 2)

    // ...and the view followed it rather than overflowing under the table.
    await expect
      .poll(async () => (await bottomOf(renderer)) - (await bottomOf(tabs)))
      .toBeLessThanOrEqual(1)
    expect(await heightOf(renderer)).toBeLessThan(
      rendererHeightBefore - shrinkBy / 2,
    )
  })

  // #751: the Cell View keeps the point at its center fixed when a panel
  // resizes it, like the Tree View does since #749. It used to stay anchored at
  // the top-left, so growing the table panel cropped the bottom of the view.
  test('the Cell View keeps its center when the table panel grows', async ({
    page,
  }) => {
    await importNetworkFile(page, TREE_HCX, 'Test Network 15 nodes')

    const cellViewTab = page.getByRole('tab', { name: 'Cell View' })
    await expect(cellViewTab).toBeVisible({ timeout: 15000 })
    await cellViewTab.click()
    const svg = page.locator('[data-testid="circle-packing-svg"]')
    await expect(svg).toBeVisible({ timeout: 15000 })

    /** The layout point at the center of the SVG, and the zoom level. */
    const readCenter = () =>
      svg.evaluate((element) => {
        const { width, height } = element.getBoundingClientRect()
        const t = (
          element as unknown as { __zoom?: { k: number; x: number; y: number } }
        ).__zoom ?? { k: 1, x: 0, y: 0 }
        return {
          height,
          k: t.k,
          x: (width / 2 - t.x) / t.k,
          y: (height / 2 - t.y) / t.k,
        }
      })

    // Zoom in first, so the check also covers a scale other than 1.
    const svgBox = (await svg.boundingBox())!
    await page.mouse.move(
      svgBox.x + svgBox.width / 3,
      svgBox.y + svgBox.height / 3,
    )
    await page.mouse.wheel(0, -300)
    await expect.poll(async () => (await readCenter()).k).toBeGreaterThan(1)
    const before = await readCenter()

    await dragTableDividerUp(page, 150)

    // Check the size, zoom and center together, retrying: the SVG can report
    // its new size before that frame's ResizeObserver callback has shifted the
    // view, so a single read right after the size changes can see a
    // half-applied state.
    await expect(async () => {
      const after = await readCenter()
      expect(after.height).toBeLessThan(before.height - 75)
      expect(after.k).toBeCloseTo(before.k, 5)
      expect(after.x).toBeCloseTo(before.x, 1)
      expect(after.y).toBeCloseTo(before.y, 1)
    }).toPass({ timeout: 5000 })
  })

  // Regression: leaving a hierarchy for a regular network and coming back with
  // the Cell View tab selected drew the circles off-center, partly outside the
  // view. NetworkTabs measures the renderer box once on mount — on the way
  // back, before the right panel has reopened — and the layout was rebuilt at
  // that size after the view had been fitted. Changing the pane width between
  // the visits makes the measured size differ, as it does with a slow load.
  test('the Cell View is fitted after switching away and back', async ({
    page,
  }) => {
    await importNetworkFile(page, TREE_HCX, 'Test Network 15 nodes')
    await importAnotherNetworkFile(
      page,
      REGULAR_CX2,
      'Test Network 20 nodes',
      2,
    )

    const workspaceItem = (name: string) =>
      page
        .locator('[data-testid="workspace-editor-left-panel-open"]')
        .getByText(name)
        .first()
    const cellViewTab = page.getByRole('tab', { name: 'Cell View' })
    const svg = page.locator('[data-testid="circle-packing-svg"]')

    await workspaceItem('Test Network 15 nodes').click()
    await expect(cellViewTab).toBeVisible({ timeout: 15000 })
    await cellViewTab.click()
    await expect(svg).toBeVisible({ timeout: 15000 })
    await settledPlacement(svg)

    // On the regular network, narrow the left panel: the center pane gets
    // wider, so the size measured on the way back differs from the first one.
    await workspaceItem('Test Network 20 nodes').click()
    await expect(cellViewTab).toHaveCount(0, { timeout: 15000 })
    const pane = (await page
      .locator('[data-testid="workspace-editor-center-pane"]')
      .boundingBox())!
    const sashX = pane.x - 3
    const sashY = pane.y + pane.height / 2
    await page.mouse.move(sashX, sashY)
    await page.mouse.down()
    await page.mouse.move(sashX - 150, sashY, { steps: 10 })
    await page.mouse.up()
    await expect
      .poll(
        async () =>
          (await page
            .locator('[data-testid="workspace-editor-center-pane"]')
            .boundingBox())!.width,
      )
      .toBeGreaterThan(pane.width + 100)

    await workspaceItem('Test Network 15 nodes').click()
    await expect(svg).toBeVisible({ timeout: 15000 })

    // The layout is rebuilt asynchronously after the switch; check the view
    // once the drawing has settled.
    await page.waitForTimeout(1500)
    const { offCenter, overflow } = await settledPlacement(svg)
    // Soft, so a failure reports both symptoms.
    expect
      .soft(offCenter, 'drawing center off the view center')
      .toBeLessThanOrEqual(2)
    expect
      .soft(overflow, 'drawing sticking out of the view')
      .toBeLessThanOrEqual(2)
  })

  // Regression: fit the Tree View, show the Cell View, switch to a regular
  // network and back, then show the Tree View again: it came back shifted.
  // Coming back with the Cell View tab selected, the Tree View's viewport was
  // restored into a hidden (0 x 0) canvas, so the pan could not be adjusted,
  // and nothing recorded which size it belonged to for the first show.
  test('the Tree View comes back as it was after switching away with the Cell View shown', async ({
    page,
  }) => {
    await importNetworkFile(page, TREE_HCX, 'Test Network 15 nodes')
    await importAnotherNetworkFile(
      page,
      REGULAR_CX2,
      'Test Network 20 nodes',
      2,
    )

    const workspaceItem = (name: string) =>
      page
        .locator('[data-testid="workspace-editor-left-panel-open"]')
        .getByText(name)
        .first()
    const treeViewTab = page.getByRole('tab', { name: 'Tree View' })
    const cellViewTab = page.getByRole('tab', { name: 'Cell View' })
    const treeView = page.locator(
      '[data-testid="network-tabs"] [data-testid="cyjs-renderer"]',
    )

    /**
     * The Tree View's camera: the model point at the canvas center, and the
     * zoom. Reached through the container, which Cytoscape.js registers
     * itself on (window.debug.cy can be the side panel's instance).
     */
    const treeCamera = () =>
      treeView.evaluate((element) => {
        const cy = (element as any)._cyreg?.cy
        if (cy === undefined || element.clientWidth === 0) return null
        const pan = cy.pan()
        const zoom = cy.zoom()
        return {
          x: Math.round(((element.clientWidth / 2 - pan.x) / zoom) * 10) / 10,
          y: Math.round(((element.clientHeight / 2 - pan.y) / zoom) * 10) / 10,
          zoom: Math.round(zoom * 1e4) / 1e4,
        }
      })

    /** Poll until the camera has stopped moving, then return it. */
    const settledCamera = async () => {
      let previous = ''
      await expect
        .poll(
          async () => {
            const current = JSON.stringify(await treeCamera())
            const stable = current !== 'null' && current === previous
            previous = current
            return stable
          },
          { intervals: [500], timeout: 20_000 },
        )
        .toBe(true)
      return JSON.parse(previous)
    }

    await workspaceItem('Test Network 15 nodes').click()
    await expect(treeViewTab).toBeVisible({ timeout: 15000 })
    await treeViewTab.click()
    await expect(treeView).toBeVisible({ timeout: 15000 })
    await treeView.evaluate((element) => {
      // No return value: cy.fit() returns the instance, which Playwright
      // would try to serialize (it hangs WebKit).
      ;(element as any)._cyreg.cy.fit()
    })
    const before = await settledCamera()

    await cellViewTab.click()
    await expect(
      page.locator('[data-testid="circle-packing-svg"]'),
    ).toBeVisible({ timeout: 15000 })

    await workspaceItem('Test Network 20 nodes').click()
    await expect(cellViewTab).toHaveCount(0, { timeout: 15000 })
    await workspaceItem('Test Network 15 nodes').click()
    await expect(cellViewTab).toBeVisible({ timeout: 15000 })
    // Let the hierarchy settle with the Tree View still hidden.
    await page.waitForTimeout(1500)

    await treeViewTab.click()
    await expect(treeView).toBeVisible({ timeout: 15000 })
    expect(await settledCamera()).toEqual(before)
  })
})

// Leaving a hierarchy closes the right panel only when the Sub Network Viewer
// is the selected tab. An app tab the user chose is still there on the next
// network, so the panel stays open on it (#881).
const NETWORK_ROW_STORES = [
  'cyNetworks',
  'cyTables',
  'cyVisualStyles',
  'cyNetworkViews',
]

/** Whether every store a network is loaded from holds a row in cyweb-db. */
const networkPersisted = (page: Page): Promise<boolean> =>
  page.evaluate(
    (stores) =>
      new Promise<boolean>((resolve) => {
        const open = indexedDB.open('cyweb-db')
        open.onerror = () => resolve(false)
        open.onsuccess = () => {
          const db = open.result
          // One transaction, so its completion means every count has finished
          const transaction = db.transaction(stores, 'readonly')
          const counts = stores.map((store) =>
            transaction.objectStore(store).count(),
          )
          transaction.oncomplete = () => {
            db.close()
            resolve(counts.every((count) => count.result > 0))
          }
          transaction.onabort = () => {
            db.close()
            resolve(false)
          }
        }
      }),
    NETWORK_ROW_STORES,
  )

test.describe('Cell View after a reload (#935)', () => {
  // The box holding the renderers can be 0 x 0 or at Allotment's 30 px pane
  // minimum when it mounts, depending on timing. It used to be measured once,
  // which left the Cell View blank or tiny. Hold the box in each state through
  // the mount, then let it go, so the timing is the same on every run.
  //
  // The tiny view needs the Cell View showing while the box is held: it is then
  // fitted to 30 px and the box grows around it. Showing it later fits it again.
  for (const [state, css, heldWidth] of [
    ['0 x 0', 'display: none', 0],
    ['30 px wide', 'width: 30px', 30],
  ] as const) {
    for (const activeTab of ['Cell View', 'Tree View'] as const) {
      test(`is fitted when the box is ${state} at mount with the ${activeTab} active`, async ({
        page,
      }) => {
        await importNetworkFile(page, TREE_HCX, 'Test Network 15 nodes')
        await expect(page.getByRole('tab', { name: 'Cell View' })).toBeVisible({
          timeout: 15000,
        })

        // Store writes are coalesced: reloading before the network has landed
        // in cyweb-db would lose it.
        await expect
          .poll(() => networkPersisted(page), { timeout: 15000 })
          .toBe(true)

        // There is no <head> yet when an init script runs. 'interactive' comes
        // before the app's module scripts, so the rule precedes any mount.
        await page.addInitScript((rule) => {
          document.addEventListener(
            'readystatechange',
            () => {
              const style = document.createElement('style')
              style.id = 'hold-box'
              style.textContent = `[data-testid="network-tabs-content"] { ${rule} !important; }`
              document.head.appendChild(style)
            },
            { once: true },
          )
        }, css)
        await page.reload()

        const cellViewTab = page.getByRole('tab', { name: 'Cell View' })
        await expect(cellViewTab).toBeVisible({ timeout: 15000 })
        const box = page.locator('[data-testid="network-tabs-content"]')
        expect(
          await box.evaluate(
            (element) => element.getBoundingClientRect().width,
          ),
          'the box is held while the renderers mount',
        ).toBe(heldWidth)

        await page.getByRole('tab', { name: activeTab }).click()
        // Long enough for a one-shot measurement and a first build to run
        await page.waitForTimeout(1000)
        await page.evaluate(() => document.getElementById('hold-box')?.remove())

        await cellViewTab.click()
        const svg = page.locator('[data-testid="circle-packing-svg"]')
        await expect(svg).toBeVisible({ timeout: 15000 })

        const { offCenter, overflow, coverage } = await settledPlacement(svg)
        expect.soft(offCenter, 'off the view center').toBeLessThanOrEqual(2)
        expect.soft(overflow, 'sticking out of the view').toBeLessThanOrEqual(2)
        expect.soft(coverage, 'share of the view').toBeGreaterThan(0.9)
      })
    }
  }
})

test.describe('Right panel on leaving a hierarchy (#881)', () => {
  const sidePanel = '[data-testid="side-panel"]'
  const openButton = '[data-testid="side-panel-open-button"]'
  const viewerTab = (page: Page) =>
    page.getByTestId(
      'side-panel-tab-button-__builtin__::right-panel::sub-network-viewer',
    )
  const appDataTab = (page: Page) =>
    page.getByTestId(
      'side-panel-tab-button-testRemoteApp::right-panel::appdata',
    )
  const workspaceItem = (page: Page, networkId: string) =>
    page.getByTestId(`workspace-network-${networkId}`)

  /** The workspace network named `name`. */
  const networkIdByName = (page: Page, name: string): Promise<string> =>
    page.evaluate((networkName) => {
      type Result<T> = { success: boolean; data: T }
      const api = (
        window as unknown as {
          CyWebApi: {
            workspace: {
              getNetworkIds: () => Result<{ networkIds: string[] }>
              getNetworkSummary: (id: string) => Result<{ name: string }>
            }
          }
        }
      ).CyWebApi.workspace
      // Not by position: the workspace lists the newest network first.
      return (
        api
          .getNetworkIds()
          .data.networkIds.find(
            (id) => api.getNetworkSummary(id).data.name === networkName,
          ) ?? ''
      )
    }, name)

  /**
   * A hierarchy and a regular network, the fixture app, the hierarchy
   * current. Returns the two network ids.
   */
  const openHierarchyWithAppTab = async (
    page: Page,
  ): Promise<{ hierarchyId: string; regularId: string }> => {
    await importNetworkFile(page, TREE_HCX, 'Test Network 15 nodes')
    await installFixtureApp(page)
    await importAnotherNetworkFile(
      page,
      REGULAR_CX2,
      'Test Network 20 nodes',
      2,
    )
    const hierarchyId = await networkIdByName(page, 'Test Network 15 nodes')
    const regularId = await networkIdByName(page, 'Test Network 20 nodes')
    await workspaceItem(page, hierarchyId).click()
    await expect(viewerTab(page)).toHaveAttribute('aria-selected', 'true', {
      timeout: 15000,
    })
    return { hierarchyId, regularId }
  }

  test('stays open on the app tab the user selected', async ({ page }) => {
    const { regularId } = await openHierarchyWithAppTab(page)
    await appDataTab(page).click()
    await expect(appDataTab(page)).toHaveAttribute('aria-selected', 'true')

    await workspaceItem(page, regularId).click()

    // The viewer's tab is gone, the panel is not.
    await expect(viewerTab(page)).toHaveCount(0)
    await expect(page.locator(sidePanel)).toBeVisible()
    await expect(appDataTab(page)).toHaveAttribute('aria-selected', 'true')
    await expect(appDataTab(page)).toHaveText('App Data')
  })

  test('closes with the Sub Network Viewer selected', async ({ page }) => {
    const { regularId } = await openHierarchyWithAppTab(page)

    await workspaceItem(page, regularId).click()

    // Closed, but the app tab is still there to open it on.
    await expect(page.locator(sidePanel)).toHaveCount(0)
    await expect(page.locator(openButton)).toBeVisible()
  })
})

// The HCX fixtures name their subsystems with an `n` column, not `name`, and
// the node label is not mapped to it. Selecting one used to throw in
// MainPanel and take the app to its error page.
test.describe('Selecting a subsystem without a name', () => {
  test('opens the subsystem under its node id', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    // Hold the subnetwork fetch open, so the panel stays on its loading
    // message, which names the subsystem.
    await page.route('**/*ndexbio.org/**', () => {})

    await importNetworkFile(
      page,
      MIXED_INTERACTION_HCX,
      'Test Network 50 nodes',
    )
    await expect(page.getByText('Please select a subsystem')).toBeVisible({
      timeout: 15000,
    })

    const selected = await page.evaluate(() => {
      type Result<T> = { success: boolean; data: T }
      const api = (
        window as unknown as {
          CyWebApi: {
            workspace: {
              getNetworkIds: () => Result<{ networkIds: string[] }>
            }
            selection: {
              exclusiveSelect: (
                networkId: string,
                nodeIds: string[],
                edgeIds: string[],
              ) => Result<unknown>
            }
          }
        }
      ).CyWebApi
      const [hierarchyId] = api.workspace.getNetworkIds().data.networkIds
      return api.selection.exclusiveSelect(hierarchyId, ['0'], []).success
    })
    expect(selected).toBe(true)

    const mainPanel = page.locator(
      '[data-testid="hierarchy-viewer-main-panel"]',
    )
    await expect(mainPanel.getByText('Loading network data:')).toBeVisible({
      timeout: 15000,
    })
    await expect(mainPanel.getByText('(0)')).toBeVisible()
    await expect(
      page.getByText('An unexpected error has occurred'),
    ).toHaveCount(0)
    expect(pageErrors).toEqual([])
  })
})

// #930: a protein ring has no row in the node table, so the search cannot
// select it; it selects the subsystems that list the protein. The Cell View
// highlights the matched rings inside those subsystems. This fixture names its
// members (HCX::memberNames), so the rings are labelled without NDEx.
const MEMBER_NAMES_HCX = path.resolve(
  __dirname,
  '../fixtures/hcx/valid/member-names.valid.cx2',
)

/**
 * A ring's center on screen. Read through the wrapper's transform, since a ring
 * the zoom level hides is `display: none` and has no box of its own.
 */
const ringCenter = (svg: Locator, ringId: string) =>
  svg.evaluate((element, id) => {
    const ring = [...element.querySelectorAll('circle')].find(
      (circle) =>
        (circle as unknown as { __data__?: { data: { id: string } } }).__data__
          ?.data.id === id,
    )
    const ctm = element
      .querySelector<SVGGElement>('g.circle-packing-wrapper')
      ?.getScreenCTM()
    if (ring === undefined || ctm === undefined || ctm === null) {
      throw new Error(`Ring ${id} is not drawn`)
    }
    return {
      x: ctm.a * Number(ring.getAttribute('cx')) + ctm.e,
      y: ctm.d * Number(ring.getAttribute('cy')) + ctm.f,
    }
  }, ringId)

test.describe('Searching a hierarchy in the Cell View (#930)', () => {
  test('highlights the protein rings the search matched', async ({ page }) => {
    // Nothing here needs NDEx; keep any request from reaching it.
    await page.route('**/*ndexbio.org/**', () => {})

    await importNetworkFile(page, MEMBER_NAMES_HCX, 'Member Names Hierarchy')
    await page.getByRole('tab', { name: 'Cell View' }).click()
    const svg = page.locator('[data-testid="circle-packing-svg"]')
    await expect(svg.locator('circle')).toHaveCount(10)

    // Ring id (`<subsystem node id>-<protein>`) → border color, for the
    // protein rings only.
    const ringBorders = () =>
      svg.evaluate((element) =>
        Object.fromEntries(
          [...element.querySelectorAll('circle')]
            .map(
              (circle) =>
                [
                  circle,
                  (
                    circle as unknown as {
                      __data__?: { data: { id: string; isMember?: boolean } }
                    }
                  ).__data__?.data,
                ] as const,
            )
            .filter(([, data]) => data?.isMember === true)
            .map(([circle, data]) => [data!.id, circle.getAttribute('stroke')]),
        ),
      )
    const redRings = async (): Promise<string[]> =>
      Object.entries(await ringBorders())
        .filter(([, stroke]) => stroke === 'red')
        .map(([id]) => id)
        .sort()

    expect(Object.keys(await ringBorders()).sort()).toEqual([
      '0-WDR18',
      '1-MYC',
      '2-DR1',
      '2-TAF11',
      '3-ACTB',
      '3-TUBB',
    ])

    // Exact mode (the default): Cell, Nucleus and Nucleoplasm list DR1. Only
    // Nucleoplasm draws a DR1 ring; the others hold it through their children.
    const input = page.locator('[data-testid="search-box-input"] input')
    await input.fill('DR1')
    await input.press('Enter')
    await expect(page.getByTestId('search-result-count')).toHaveText('3 nodes')
    await expect.poll(redRings).toEqual(['2-DR1'])

    // Each token matches its own ring.
    await input.fill('DR1 MYC')
    await input.press('Enter')
    await expect.poll(redRings).toEqual(['1-MYC', '2-DR1'])

    // Clearing the search clears the rings with the selection.
    await page.getByTestId('search-clear-button').click()
    await expect.poll(redRings).toEqual([])
  })

  // The outline belongs to the search's selection, not to any equal one:
  // once the selection changes, selecting the same nodes again by other means
  // must not bring it back.
  test('does not bring the outline back when the selection is restored', async ({
    page,
  }) => {
    await page.route('**/*ndexbio.org/**', () => {})

    await importNetworkFile(page, MEMBER_NAMES_HCX, 'Member Names Hierarchy')
    await page.getByRole('tab', { name: 'Cell View' }).click()
    const svg = page.locator('[data-testid="circle-packing-svg"]')
    await expect(svg.locator('circle')).toHaveCount(10)

    const redRings = () =>
      svg.evaluate((element) =>
        [...element.querySelectorAll('circle')]
          .filter((circle) => circle.getAttribute('stroke') === 'red')
          .map(
            (circle) =>
              (circle as unknown as { __data__: { data: { id: string } } })
                .__data__.data.id,
          )
          .sort(),
      )
    const selectMenu = async (item: string): Promise<void> => {
      await page
        .locator('[data-testid="toolbar-select-menu-menu-button"]')
        .click()
      await page.getByRole('menuitem', { name: item, exact: true }).click()
    }

    // Every system lists DR1 or ACTB, so the search selects all four.
    const input = page.locator('[data-testid="search-box-input"] input')
    await input.fill('DR1 ACTB')
    await input.press('Enter')
    await expect(page.getByTestId('search-result-count')).toHaveText('4 nodes')
    await expect.poll(redRings).toEqual(['2-DR1', '3-ACTB'])

    await selectMenu('Deselect All')
    await expect.poll(redRings).toEqual([])

    await selectMenu('Select All Nodes')
    await expect(page.getByText('Multiple nodes are selected')).toBeVisible()
    await expect.poll(redRings).toEqual([])
    // Give a late repaint the chance to bring it back before passing.
    await page.waitForTimeout(500)
    expect(await redRings()).toEqual([])
  })

  // A click in the Cell View can leave the selection as the search left it:
  // here the search selects Nucleoplasm alone, and clicking one of its
  // proteins selects Nucleoplasm again. The search outline must still go.
  test('drops the search outline when a ring is clicked', async ({ page }) => {
    await page.route('**/*ndexbio.org/**', () => {})

    await importNetworkFile(page, MEMBER_NAMES_HCX, 'Member Names Hierarchy')
    await page.getByRole('tab', { name: 'Cell View' }).click()
    const svg = page.locator('[data-testid="circle-packing-svg"]')
    await expect(svg.locator('circle')).toHaveCount(10)

    const strokeOf = (ringId: string) =>
      svg.evaluate(
        (element, id) =>
          [...element.querySelectorAll('circle')]
            .find(
              (circle) =>
                (circle as unknown as { __data__?: { data: { id: string } } })
                  .__data__?.data.id === id,
            )
            ?.getAttribute('stroke'),
        ringId,
      )

    // AND: only Nucleoplasm is named Nucleoplasm and lists DR1.
    await page.getByTestId('search-settings-button').click()
    await page.getByTestId('search-operator-and-radio').click()
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    const input = page.locator('[data-testid="search-box-input"] input')
    await input.fill('Nucleoplasm DR1')
    await input.press('Enter')
    await expect(page.getByTestId('search-result-count')).toHaveText('1 node')
    await expect.poll(() => strokeOf('2-DR1')).toBe('red')

    // Click TAF11, inside Nucleoplasm. The settings popover's invisible backdrop
    // would catch the click until its exit transition has finished.
    await expect(page.getByTestId('search-settings-popover')).toHaveCount(0)
    const taf11 = await ringCenter(svg, '2-TAF11')
    await page.mouse.click(taf11.x, taf11.y)
    await expect.poll(() => strokeOf('2-DR1')).not.toBe('red')
  })
})

// #931: the labels are drawn over the rings and used to catch the click, so a
// click on a label did nothing. On a small protein ring the label covers most
// of the ring. The clicks are real mouse clicks: a click dispatched on the
// circle, or one Playwright aims at the circle, would not go through the label.
//
// NDEx requests hang here, so the Sub Network Viewer never loads and never
// echoes the selection back. The red border of a clicked protein ring therefore
// holds with the viewer open.
test.describe('Clicking a ring label in the Cell View (#931)', () => {
  /** Open the Cell View of a hierarchy whose rings are labelled without NDEx */
  const openCellView = async (page: Page): Promise<Locator> => {
    await page.route('**/*ndexbio.org/**', () => {})
    await importNetworkFile(page, MEMBER_NAMES_HCX, 'Member Names Hierarchy')
    await page.getByRole('tab', { name: 'Cell View' }).click()
    const svg = page.locator('[data-testid="circle-packing-svg"]')
    await expect(svg.locator('circle')).toHaveCount(10)
    return svg
  }

  const strokeOf = (svg: Locator, ringId: string) =>
    svg.evaluate(
      (element, id) =>
        [...element.querySelectorAll('circle')]
          .find(
            (circle) =>
              (circle as unknown as { __data__?: { data: { id: string } } })
                .__data__?.data.id === id,
          )
          ?.getAttribute('stroke'),
      ringId,
    )

  /** The label's on-screen box, or undefined while the zoom level hides it */
  const labelBox = (svg: Locator, ringId: string) =>
    svg.evaluate((element, id) => {
      const label = [...element.querySelectorAll('text')].find(
        (text) =>
          (text as unknown as { __data__?: { data: { id: string } } }).__data__
            ?.data.id === id,
      )
      if (label === undefined) return undefined
      const { x, y, width, height } = label.getBoundingClientRect()
      return width > 0 && height > 0 ? { x, y, width, height } : undefined
    }, ringId)

  /** Zoom in on the ring until its label shows, then click the label's center */
  const clickLabel = async (
    page: Page,
    svg: Locator,
    ringId: string,
  ): Promise<void> => {
    await expect(async () => {
      const box = await labelBox(svg, ringId)
      if (box === undefined) {
        const center = await ringCenter(svg, ringId)
        await page.mouse.move(center.x, center.y)
        await page.mouse.wheel(0, -100)
      }
      expect(box).toBeDefined()
    }).toPass({ timeout: 15000 })

    const box = await labelBox(svg, ringId)
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
  }

  test('selects a protein ring', async ({ page }) => {
    const svg = await openCellView(page)
    await expect.poll(() => strokeOf(svg, '2-DR1')).toBe('#666')

    await clickLabel(page, svg, '2-DR1')

    // A protein has no row in the node table, so its subsystem gets selected.
    await expect.poll(() => strokeOf(svg, '2')).toBe('orange')
    await expect.poll(() => strokeOf(svg, '2-DR1')).toBe('red')
  })

  test('selects a subsystem ring', async ({ page }) => {
    const svg = await openCellView(page)
    await expect.poll(() => strokeOf(svg, '2')).toBe('#666')

    await clickLabel(page, svg, '2')

    await expect.poll(() => strokeOf(svg, '2')).toBe('orange')
  })
})
