import path from 'path'

import {
  expect,
  getWorkspaceNetworkCount,
  gotoAndWaitReady,
  test,
} from './fixtures'
import type { Page } from '@playwright/test'

// Regression: #675 — annotation canvases from earlier renders were orphaned.
// `renderNetwork` called `cyCanvas()` on every render, which appends a new
// canvas and never reuses one, and `cy.removeAllListeners()` dropped the redraw
// handlers of the older sets. Those canvases kept their last-painted pixels and
// stayed fixed while the network zoomed and panned under them.

const ANNOTATED_CX2 = path.resolve(
  __dirname,
  '../fixtures/ndex/2496d8c5-5c74-11ec-b3be-0ac135e8bacf.valid.cx2',
)

const ANNOTATED_NETWORK_NAME =
  'WP5049 - Glycolysis in senescence - Homo sapiens'

const PLAIN_CX2 = path.resolve(
  __dirname,
  '../fixtures/cx2/valid/small-network.valid.cx2',
)

const PLAIN_NETWORK_NAME = 'Test Network 20 nodes'

// Cytoscape's own three layers plus one annotation set: background (z-index
// -2), bottom (-1) and top (1).
const EXPECTED_CANVAS_COUNT = 6

// The annotation layer the fixture's shape annotation is drawn on: its
// `canvas=background` property puts it on the bottom annotation layer.
const ANNOTATION_CANVAS_Z_INDEX = '-1'

// Signature of a canvas with nothing painted on it.
const BLANK_SIGNATURE = '0:0'

const importNetworkFile = async (page: Page, file: string): Promise<void> => {
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
    .setInputFiles(file)
}

const countCanvases = (page: Page): Promise<number> =>
  page.locator('#cy-container canvas').count()

/**
 * Open a network by clicking its entry in the workspace panel — the same path
 * the bug report takes. `workspace.switchCurrentNetwork` moves the store but
 * does not drive the loader, so the panel would sit on "Loading network data".
 */
const openNetwork = async (page: Page, name: string): Promise<void> => {
  await page
    .locator('[data-testid="network-browser-panel"]')
    .getByText(name)
    .first()
    .click()
}

/**
 * Wait until the renderer has put canvases on screen.
 *
 * A file import can reach the workspace before its network row is readable from
 * IndexedDB. `useLoadCyNetwork` then shows "Failed to load network data" and
 * never retries, so a reload is the only way forward. That race is unrelated to
 * #675; handling it here keeps this spec independent of it.
 */
const waitForRenderedNetwork = async (page: Page): Promise<void> => {
  for (let attempt = 0; attempt < 4; attempt++) {
    const rendered = await page
      .locator('#cy-container canvas')
      .nth(EXPECTED_CANVAS_COUNT - 1)
      .waitFor({ state: 'attached', timeout: 10000 })
      .then(() => true)
      .catch(() => false)

    // The error panel can replace a renderer that already put canvases up, so
    // the state only counts once it has held for a moment. Waiting on the
    // error locator itself (rather than sleeping a flat 1500ms) keeps the
    // guard while bounding the cost: the failed Dexie read that triggers the
    // panel resolves within tens of milliseconds of the canvases attaching.
    if (rendered) {
      const loadFailed = await page
        .getByText('Failed to load network data')
        .first()
        .waitFor({ state: 'visible', timeout: 500 })
        .then(() => true)
        .catch(() => false)
      const stillRendered = (await countCanvases(page)) >= EXPECTED_CANVAS_COUNT
      if (!loadFailed && stillRendered) return
    }

    await page.reload()
    await page.waitForFunction(
      () => (window as unknown as { __cywebReady?: boolean }).__cywebReady,
      undefined,
      { timeout: 30000 },
    )
  }
  throw new Error(
    `the network never rendered ${EXPECTED_CANVAS_COUNT} canvases`,
  )
}

/**
 * Cheap fingerprint of every canvas under `#cy-container`, keyed by the inline
 * z-index the layer was created with. Sampled rather than hashed in full: the
 * test only needs "did these pixels change".
 */
const canvasSignatures = (page: Page): Promise<Record<string, string>> =>
  page.evaluate(() => {
    const signatures: Record<string, string> = {}
    const canvases = Array.from(
      document.querySelectorAll<HTMLCanvasElement>('#cy-container canvas'),
    )
    canvases.forEach((canvas, index) => {
      const ctx = canvas.getContext('2d')
      if (ctx === null || canvas.width === 0) return
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let sum = 0
      let painted = 0
      // Alpha channel of every pixel: a stroke a sparser sample would miss is
      // still counted, and weighting by position makes a translation show up.
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) {
          painted++
          sum = (sum + i) % 2147483647
        }
      }
      const zIndex = canvas.style.zIndex || 'none'
      signatures[`${zIndex}#${index}`] = `${sum}:${painted}`
    })
    return signatures
  })

test.describe('Annotation canvas lifecycle', () => {
  test('keeps one annotation canvas set across re-renders and network switches', async ({
    page,
  }) => {
    // Recovering the import race below can cost several reloads.
    test.setTimeout(120000)

    await gotoAndWaitReady(page)
    await importNetworkFile(page, ANNOTATED_CX2)

    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 30000 })
      .toBe(1)
    await waitForRenderedNetwork(page)
    await expect
      .poll(() => countCanvases(page), { timeout: 30000 })
      .toBe(EXPECTED_CANVAS_COUNT)

    // A second network to switch to and back from.
    await importNetworkFile(page, PLAIN_CX2)
    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 30000 })
      .toBe(2)

    for (let i = 0; i < 3; i++) {
      await openNetwork(page, PLAIN_NETWORK_NAME)
      await waitForRenderedNetwork(page)
      await expect
        .poll(() => countCanvases(page), { timeout: 30000 })
        .toBe(EXPECTED_CANVAS_COUNT)

      await openNetwork(page, ANNOTATED_NETWORK_NAME)
      await waitForRenderedNetwork(page)
      await expect
        .poll(() => countCanvases(page), { timeout: 30000 })
        .toBe(EXPECTED_CANVAS_COUNT)
    }
  })

  test('repaints every annotation layer on zoom', async ({ page }) => {
    test.setTimeout(120000)

    await gotoAndWaitReady(page)
    await importNetworkFile(page, ANNOTATED_CX2)

    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 30000 })
      .toBe(1)
    await waitForRenderedNetwork(page)

    /** Keys of the annotation layers that currently hold painted pixels. */
    const paintedAnnotationKeys = async (): Promise<string[]> => {
      const signatures = await canvasSignatures(page)
      return Object.keys(signatures).filter(
        (key) =>
          key.startsWith(`${ANNOTATION_CANVAS_Z_INDEX}#`) &&
          signatures[key] !== BLANK_SIGNATURE,
      )
    }

    // Capture the container box, the painted layers and their signatures in one
    // step: the panel remounts while the network settles, and a value read
    // before a remount does not describe the canvases that follow it.
    let box: { x: number; y: number; width: number; height: number } | null =
      null
    let keys: string[] = []
    let before: Record<string, string> = {}

    await expect
      .poll(
        async () => {
          // Bounded: the config sets no action timeout, so an unbounded
          // boundingBox() on a briefly detached container blocks the test out.
          const measured = await page
            .locator('#cy-container')
            .boundingBox({ timeout: 2000 })
            .catch(() => null)
          if (measured === null) return false
          const painted = await paintedAnnotationKeys()
          if (painted.length === 0) return false
          box = measured
          keys = painted
          before = await canvasSignatures(page)
          return true
        },
        { timeout: 60000 },
      )
      .toBe(true)

    // Zoom with the wheel over the network, the way a user does.
    const { x, y, width, height } = box as unknown as {
      x: number
      y: number
      width: number
      height: number
    }
    await page.mouse.move(x + width / 2, y + height / 2)
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, -120)
    }

    // Every painted annotation layer must have moved with the network. A layer
    // that keeps its signature is a frozen layer — the #675 symptom.
    await expect
      .poll(
        async () => {
          const after = await canvasSignatures(page)
          return keys.filter((key) => after[key] === before[key])
        },
        { timeout: 30000 },
      )
      .toEqual([])
  })
})
