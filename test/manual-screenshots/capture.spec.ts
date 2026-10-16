import path from 'node:path'

import { expect, type Locator, type Page } from '@playwright/test'

import {
  SCREENSHOT_RECIPES,
  type ScreenshotStep,
  type ScreenshotTarget,
  screenshotPath,
} from '../../src/features/Manual/screenshots/recipes'
import { gotoAndWaitReady, test } from '../playwright/fixtures'

/**
 * Captures the manual's screenshots from the running app (one test per
 * recipe in src/features/Manual/screenshots/recipes.ts). Not part of the e2e
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
  if ('role' in target) {
    return page
      .getByRole(target.role as Parameters<Page['getByRole']>[0], {
        name: target.name,
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
  await page.keyboard.press(step.press)
}

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
    // Let menus and dialogs finish opening before the capture.
    await page.waitForTimeout(500)

    const file = path.join(OUT_DIR, screenshotPath(recipe.id))
    const options = {
      path: file,
      animations: 'disabled',
      caret: 'hide',
    } as const
    if (recipe.capture === undefined) {
      await page.screenshot(options)
    } else {
      await locate(page, recipe.capture).screenshot(options)
    }
  })
}
