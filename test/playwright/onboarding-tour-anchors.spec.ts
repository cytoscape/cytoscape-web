import fs from 'node:fs'
import path from 'node:path'

import { TOURS } from '../../src/features/Onboarding/tours/registry'
import { expect, gotoAndWaitReady, test } from './fixtures'

/**
 * Anti-staleness guard for onboarding tours.
 *
 * Tour steps anchor to `data-testid`s. If a UI change renames or removes one of
 * those testids, the tour silently breaks. This spec fails the build in that
 * case, so tours stay in sync with the app.
 *
 * Each anchor is considered valid if EITHER:
 *  - it is present in the running app (covers dynamically generated testids like
 *    `toolbar-<id>-menu-button` that never appear as a literal), OR
 *  - it exists as a literal `data-testid` in component source, excluding the
 *    onboarding feature itself (covers targets that only render once a network
 *    or specific route is loaded).
 *
 * A renamed/removed testid satisfies neither and fails the test. Everything
 * derives from the single tour registry, so new tours are covered automatically.
 */

const allSteps = TOURS.flatMap((tour) =>
  tour.steps.map((step) => ({ tourId: tour.id, ...step })),
)

// --- Source scan (excludes the onboarding feature so tour defs don't self-match) ---
const SRC_DIR = path.join(process.cwd(), 'src')
const ONBOARDING_DIR = path.join(SRC_DIR, 'features', 'Onboarding')

const collectSource = (dir: string): string => {
  let blob = ''
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (full.startsWith(ONBOARDING_DIR)) continue
    if (entry.isDirectory()) {
      blob += collectSource(full)
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      blob += fs.readFileSync(full, 'utf8')
    }
  }
  return blob
}

const sourceBlob = collectSource(SRC_DIR)

/**
 * True when the source declares `data-testid` with exactly this value.
 *
 * Matching any quoted occurrence of the string was too loose: an unrelated
 * constant that happened to equal a tour target counted as an anchor, so a
 * removed testid could still pass the guard. This requires an actual attribute
 * assignment, in either the plain or JSX-expression form:
 *   data-testid="x"   data-testid='x'
 *   data-testid={'x'}  data-testid={"x"}  data-testid={`x`}
 *
 * Interpolated testids (`data-testid={`toolbar-${id}-menu-button`}`) do not
 * match by design — those are covered by the running-app check instead.
 */
const testIdLiteralExists = (testId: string): boolean => {
  const escaped = testId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(
    `data-testid\\s*=\\s*(?:["']${escaped}["']|\\{\\s*["'\`]${escaped}["'\`]\\s*\\})`,
  ).test(sourceBlob)
}

test.describe('onboarding tour anchors', () => {
  test('registry has at least one tour with steps', () => {
    expect(TOURS.length).toBeGreaterThan(0)
    for (const tour of TOURS) {
      expect(tour.steps.length).toBeGreaterThan(0)
    }
  })

  test('every tour anchor exists in the app or in component source', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible()

    const broken: string[] = []
    for (const step of allSteps) {
      const inDom =
        (await page.locator(`[data-testid="${step.target}"]`).count()) > 0
      const inSource = testIdLiteralExists(step.target)
      if (!inDom && !inSource) {
        broken.push(`[${step.tourId}] "${step.target}"`)
      }
    }

    expect(
      broken,
      `These tour anchors match no data-testid in the app or component source — a testid was renamed/removed, or the tour is out of date:\n${broken.join('\n')}`,
    ).toEqual([])
  })
})
