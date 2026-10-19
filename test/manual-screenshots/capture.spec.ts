import path from 'node:path'

import { expect, type Locator, type Page } from '@playwright/test'

import {
  SCREENSHOT_RECIPES,
  SCREENSHOT_SEQUENCES,
  type ScreenshotStep,
  type ScreenshotTarget,
  screenshotPath,
  sequenceFramePath,
} from '../../src/features/Manual/screenshots/recipes'
import { gotoAndWaitReady, test } from '../playwright/fixtures'

/**
 * Captures the manual's screenshots from the running app (one test per
 * recipe, and one per step sequence, in
 * src/features/Manual/screenshots/recipes.ts). Not part of the e2e
 * suite: run it with `node scripts/capture-manual-screenshots.mjs [id…]`.
 *
 * Every capture uses the same conditions so a rerun changes an image only
 * when the app changed: fixed viewport, device scale 1, light theme, reduced
 * motion, animations stopped, caret hidden, cookie banner answered and
 * onboarding suppressed (the `test` fixture).
 */

// COOKIE_NAME in src/features/CookieConsent.tsx; that module cannot load in
// Node (it reads import.meta), so the name is repeated here.
const COOKIE_NAME = 'cytoscapeWebCookieConsent'

const ROOT = path.resolve(__dirname, '../..')
const OUT_DIR = path.join(ROOT, 'public')

const locate = (page: Page, target: ScreenshotTarget): Locator => {
  if ('testid' in target) {
    return page.locator(`[data-testid="${target.testid}"]`).first()
  }
  if ('selector' in target) {
    return page.locator(target.selector).first()
  }
  if ('label' in target) {
    return page.getByLabel(target.label, { exact: true }).first()
  }
  if ('role' in target) {
    return page
      .getByRole(target.role as Parameters<Page['getByRole']>[0], {
        name: target.name,
        // An open list or popover marks the dialog under it aria-hidden; a
        // capture still crops to that dialog.
        includeHidden: true,
      })
      .first()
  }
  return page.getByText(target.text).first()
}

const runStep = async (page: Page, step: ScreenshotStep): Promise<void> => {
  if ('importNetwork' in step) {
    await page.locator('[data-testid="toolbar-data-menu-menu-button"]').click()
    await page.getByRole('menuitem', { name: 'Import' }).click()
    await page.getByRole('menuitem', { name: 'Network from File...' }).click()
    await page
      .locator('[data-testid="file-upload-dropzone"] input[type="file"]')
      .setInputFiles(path.join(ROOT, step.importNetwork))
    await expect(page.getByText(step.expectText).first()).toBeVisible({
      timeout: 30_000,
    })
    await expect(
      page.locator('[data-testid="cyjs-renderer"] canvas').first(),
    ).toBeVisible({ timeout: 30_000 })
    // The automatic layout and fit animate after the first paint.
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)
    return
  }
  if ('upload' in step) {
    await locate(page, step.into)
      .locator('input[type="file"]')
      .setInputFiles(path.join(ROOT, step.upload))
    return
  }
  if ('click' in step) {
    await locate(page, step.click).click()
    return
  }
  if ('hover' in step) {
    await locate(page, step.hover).hover()
    return
  }
  if ('waitFor' in step) {
    await expect(locate(page, step.waitFor)).toBeVisible({ timeout: 30_000 })
    return
  }
  if ('fill' in step) {
    await locate(page, step.fill).fill(step.text)
    return
  }
  if ('wait' in step) {
    await page.waitForTimeout(step.wait)
    return
  }
  if ('selectNodes' in step) {
    await page.evaluate(async (nodeIds) => {
      type Result<T> = { success: boolean; data?: T }
      const api = (
        window as unknown as {
          CyWebApi: {
            workspace: {
              getCurrentNetworkId: () => Result<{ networkId: string }>
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
      const current = api.workspace.getCurrentNetworkId()
      if (!current.success || current.data === undefined) {
        throw new Error('No current network to select in')
      }
      const result = api.selection.exclusiveSelect(
        current.data.networkId,
        [...nodeIds],
        [],
      )
      if (!result.success) throw new Error('Selection failed')
    }, step.selectNodes)
    // What the selection opens may load data over the network and lay it out.
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    return
  }
  await page.keyboard.press(step.press)
}

const HIGHLIGHT_ID = 'manual-capture-highlight'

/**
 * Draws a ring around the union of `targets` for the next capture. A fixed
 * overlay above every dialog and popover; it never takes pointer events.
 */
const drawHighlight = async (
  page: Page,
  targets: readonly ScreenshotTarget[],
): Promise<void> => {
  const boxes = []
  for (const target of targets) {
    const box = await locate(page, target).boundingBox()
    if (box === null) throw new Error(`No box for ${JSON.stringify(target)}`)
    boxes.push(box)
  }
  const left = Math.min(...boxes.map((b) => b.x))
  const top = Math.min(...boxes.map((b) => b.y))
  const right = Math.max(...boxes.map((b) => b.x + b.width))
  const bottom = Math.max(...boxes.map((b) => b.y + b.height))
  await page.evaluate(
    ({ id, rect }) => {
      const ring = document.createElement('div')
      ring.id = id
      const pad = 5
      Object.assign(ring.style, {
        position: 'fixed',
        left: `${rect.left - pad}px`,
        top: `${rect.top - pad}px`,
        width: `${rect.right - rect.left + 2 * pad}px`,
        height: `${rect.bottom - rect.top + 2 * pad}px`,
        border: '3px solid #e8590c',
        borderRadius: '6px',
        boxShadow: '0 0 0 2px #ffffff, 0 0 12px 2px rgba(232, 89, 12, 0.45)',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        zIndex: '2147483647',
      })
      document.body.appendChild(ring)
    },
    { id: HIGHLIGHT_ID, rect: { left, top, right, bottom } },
  )
}

const clearHighlight = async (page: Page): Promise<void> => {
  await page.evaluate(
    (id) => document.getElementById(id)?.remove(),
    HIGHLIGHT_ID,
  )
}

const CAPTURE_OPTIONS = { animations: 'disabled', caret: 'hide' } as const

test.use({
  colorScheme: 'light',
  contextOptions: { reducedMotion: 'reduce' },
  deviceScaleFactor: 1,
})

for (const recipe of SCREENSHOT_RECIPES) {
  test(recipe.id, async ({ page, context, baseURL }) => {
    await page.setViewportSize(recipe.viewport)
    await context.addCookies([
      {
        name: COOKIE_NAME,
        value: 'true',
        url: baseURL ?? 'http://localhost',
      },
    ])
    await gotoAndWaitReady(page)

    for (const step of recipe.steps) {
      await runStep(page, step)
    }
    // As in a sequence frame: no tooltip under the pointer.
    await page.mouse.move(recipe.viewport.width - 1, recipe.viewport.height - 1)
    // Let menus and dialogs finish opening before the capture.
    await page.waitForTimeout(500)

    const file = path.join(OUT_DIR, screenshotPath(recipe.id))
    const options = { ...CAPTURE_OPTIONS, path: file }
    if (recipe.capture === undefined) {
      await page.screenshot(options)
    } else {
      await locate(page, recipe.capture).screenshot(options)
    }
  })
}

for (const sequence of SCREENSHOT_SEQUENCES) {
  test(sequence.id, async ({ page, context, baseURL }) => {
    await page.setViewportSize(sequence.viewport)
    await context.addCookies([
      {
        name: COOKIE_NAME,
        value: 'true',
        url: baseURL ?? 'http://localhost',
      },
    ])
    await gotoAndWaitReady(page)

    for (const frame of sequence.frames) {
      for (const step of frame.steps) {
        await runStep(page, step)
      }
      await page.waitForTimeout(500)
      // A focus ring left by the last click or key is not part of the step.
      // A tooltip under the pointer is not part of the step either: park the
      // pointer in the bottom-right corner.
      await page.mouse.move(
        sequence.viewport.width - 1,
        sequence.viewport.height - 1,
      )
      // An open menu closes when its item loses focus, so keep that focus.
      await page.evaluate(() => {
        const active = document.activeElement
        if (
          active instanceof HTMLElement &&
          active.closest('[role="menu"]') === null
        ) {
          active.blur()
        }
      })
      if (frame.highlight !== undefined) {
        await drawHighlight(page, frame.highlight)
      }
      const options = {
        ...CAPTURE_OPTIONS,
        path: path.join(OUT_DIR, sequenceFramePath(sequence.id, frame.id)),
      }
      if (frame.capture === undefined) {
        await page.screenshot(options)
      } else {
        await locate(page, frame.capture).screenshot(options)
      }
      await clearHighlight(page)
    }
  })
}
