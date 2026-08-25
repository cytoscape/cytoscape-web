import type { Page } from '@playwright/test'

import { expect, gotoAndSeedNetwork, gotoAndWaitReady, test } from './fixtures'

/**
 * Dialog dismissal policy (#628). See
 * `docs/specifications/DIALOG_DISMISS_POLICY.md`.
 *
 * `lightweight` dialogs close on a backdrop click and on Escape; `form` dialogs
 * close on Escape only, so a stray click cannot discard typed state. Add a row
 * to CASES when adding a dialog — the table is the whole test.
 *
 * `blocking` is not covered here: neither of the two blocking dialogs
 * (TaskStatusDialog, EmailVerification) can be opened without an in-flight
 * remote call or an unverified account. `CyDialog.spec.tsx` pins that tier.
 */

type Tier = 'lightweight' | 'form'

interface DialogCase {
  name: string
  testId: string
  tier: Tier
  open: (page: Page) => Promise<void>
}

const openNdexBrowser = async (page: Page): Promise<void> => {
  await page.locator('[data-testid="toolbar-data-menu-menu-button"]').click()
  await page
    .getByRole('menuitem', { name: 'Open Network(s) from NDEx...' })
    .click()
}

const CASES: DialogCase[] = [
  {
    // The dialog from the original report: it could not be dismissed at all.
    name: 'Manage Apps',
    testId: 'app-settings-dialog',
    tier: 'lightweight',
    open: async (page) => {
      await page
        .locator('[data-testid="toolbar-apps-menu-menu-button"]')
        .click()
      await page.getByRole('menuitem', { name: 'Manage Apps...' }).click()
    },
  },
  {
    name: 'Remove Network confirmation',
    testId: 'confirmation-dialog',
    tier: 'lightweight',
    open: async (page) => {
      await page
        .locator('[data-testid="network-property-menu-button"]')
        .first()
        .click()
      await page
        .locator('[data-testid="network-property-delete-menuitem"]')
        .click()
    },
  },
  {
    name: 'LLM Query Options',
    testId: 'llm-query-options-dialog',
    tier: 'form',
    open: async (page) => {
      await page
        .locator('[data-testid="toolbar-analysis-menu-menu-button"]')
        .click()
      await page.getByText('LLM Query Options...').click()
    },
  },
  {
    name: 'Join Table to Network',
    testId: 'join-table-to-network-modal',
    tier: 'form',
    open: async (page) => {
      await page.locator('[data-testid="import-table-button"]').click()
    },
  },
  {
    name: 'NDEx Network Browser',
    testId: 'load-from-ndex-dialog',
    tier: 'form',
    open: openNdexBrowser,
  },
]

/**
 * Press on the modal container outside the paper. MUI arms the backdrop click
 * on `mousedown` and only when the press starts on the container itself, so the
 * click has to land in a corner rather than on the dialog surface.
 */
const clickBackdrop = async (page: Page): Promise<void> => {
  await page
    .locator('.MuiDialog-container')
    .last()
    .click({ position: { x: 4, y: 4 } })
}

test.describe('Dialog dismissal policy', () => {
  test.beforeEach(async ({ page }) => {
    // Network-operating menus and the summary row need a network in the
    // workspace before they are enabled.
    await gotoAndSeedNetwork(page)
  })

  for (const { name, testId, tier, open } of CASES) {
    const dialog = (page: Page) => page.locator(`[data-testid="${testId}"]`)

    test(`${name} (${tier}) closes on Escape`, async ({ page }) => {
      await open(page)
      await expect(dialog(page)).toBeVisible()

      await page.keyboard.press('Escape')
      await expect(dialog(page)).not.toBeVisible()
    })

    test(`${name} (${tier}) ${
      tier === 'lightweight' ? 'closes on' : 'survives'
    } a backdrop click`, async ({ page }) => {
      await open(page)
      await expect(dialog(page)).toBeVisible()

      await clickBackdrop(page)
      if (tier === 'lightweight') {
        await expect(dialog(page)).not.toBeVisible()
      } else {
        await expect(dialog(page)).toBeVisible()
      }
    })
  }
})

/**
 * The sweep removed root-level guards from eight `<Dialog>` tags. They were
 * added believing `stopPropagation()` blocked dismissal — it does not — but two
 * of them also called `preventDefault()`, and a bubble-phase `preventDefault` on
 * keydown DOES suppress text insertion. That is why the NDEx search field still
 * calls `stopPropagation()` of its own (`LoadFromNdexDialog.tsx`): it existed to
 * escape the root handler. Typing must keep working either way.
 */
test.describe('Dialog input is not swallowed by root handlers', () => {
  test('NDEx browser accepts typing in its search field', async ({ page }) => {
    await gotoAndWaitReady(page)
    await openNdexBrowser(page)
    await expect(
      page.locator('[data-testid="load-from-ndex-dialog"]'),
    ).toBeVisible()

    const search = page.locator(
      '[data-testid="load-from-ndex-search-input"] input',
    )
    await search.click()
    await page.keyboard.type('BRCA1')
    await expect(search).toHaveValue('BRCA1')
  })
})
