import type { Page } from '@playwright/test'

import { expect, gotoAndSeedNetwork, gotoAndWaitReady, test } from './fixtures'

/**
 * Dialog dismissal policy (#628). See
 * `docs/specifications/DIALOG_DISMISS_POLICY.md`.
 *
 * Every modal closes through one of its own buttons and nothing else — backdrop
 * click and Escape are both inert. Add a row to CASES when adding a dialog; the
 * table is the whole test.
 */

interface DialogCase {
  name: string
  testId: string
  open: (page: Page) => Promise<void>
  /** The dialog's own exit control. */
  close: (page: Page) => Promise<void>
}

const openNdexBrowser = async (page: Page): Promise<void> => {
  await page.locator('[data-testid="toolbar-data-menu-menu-button"]').click()
  await page
    .getByRole('menuitem', { name: 'Open Network(s) from NDEx...' })
    .click()
}

const CASES: DialogCase[] = [
  {
    // The dialog from the original report.
    name: 'Manage Apps',
    testId: 'app-settings-dialog',
    open: async (page) => {
      await page
        .locator('[data-testid="toolbar-apps-menu-menu-button"]')
        .click()
      await page.getByRole('menuitem', { name: 'Manage Apps...' }).click()
    },
    close: async (page) => {
      await page
        .locator('[data-testid="app-settings-dialog-close-button"]')
        .click()
    },
  },
  {
    name: 'Remove Network confirmation',
    testId: 'confirmation-dialog',
    open: async (page) => {
      await page
        .locator('[data-testid="network-property-menu-button"]')
        .first()
        .click()
      await page
        .locator('[data-testid="network-property-delete-menuitem"]')
        .click()
    },
    close: async (page) => {
      await page.locator('[data-testid="confirmation-dialog-cancel"]').click()
    },
  },
  {
    name: 'LLM Query Options',
    testId: 'llm-query-options-dialog',
    open: async (page) => {
      await page
        .locator('[data-testid="toolbar-analysis-menu-menu-button"]')
        .click()
      await page.getByText('LLM Query Options...').click()
    },
    close: async (page) => {
      await page
        .locator('[data-testid="llm-query-options-cancel-button"]')
        .click()
    },
  },
  {
    name: 'Join Table to Network',
    testId: 'join-table-to-network-modal',
    open: async (page) => {
      await page.locator('[data-testid="import-table-button"]').click()
    },
    close: async (page) => {
      await page
        .locator('[data-testid="join-table-to-network-close-button"]')
        .click()
    },
  },
  {
    name: 'NDEx Network Browser',
    testId: 'load-from-ndex-dialog',
    open: openNdexBrowser,
    close: async (page) => {
      await page.locator('[data-testid="load-from-ndex-cancel-button"]').click()
    },
  },
  {
    // App modals rendered through the modal-launcher slot share one host
    // dialog shell (ModalLauncherHost), so this single row covers every app
    // modal. The open flow registers and activates the fixture remote —
    // the slowest row in the table, and the only way to have an app modal
    // here. Selectors mirror remote-app-load.spec.ts.
    name: 'App modal (modal-launcher)',
    testId: 'modal-launcher-dialog-testRemoteApp-fixture-modal',
    open: async (page) => {
      await page
        .locator('[data-testid="toolbar-apps-menu-menu-button"]')
        .click()
      await page.getByRole('menuitem', { name: 'Manage Apps...' }).click()
      await page.getByText('Manifest Source').click()
      await page
        .getByLabel('Custom manifest URL')
        .fill('http://localhost:4191/manifest.json')
      await page.getByRole('button', { name: 'Apply' }).click()
      const toggle = page.locator('[data-testid="app-toggle-testRemoteApp"]')
      await expect(toggle).toBeVisible({ timeout: 15_000 })
      await toggle.click()
      await expect(
        page.locator('[data-testid="remote-app-marker"]'),
      ).toBeVisible({ timeout: 15_000 })
      await page.getByTestId('app-settings-dialog-close-button').click()
      await page
        .locator('[data-testid="toolbar-apps-menu-menu-button"]')
        .click()
      await page
        .locator('[data-testid="remote-open-modal-menu-item"]')
        .click()
    },
    close: async (page) => {
      // The host shell's structural Close "X" — the exit the slot itself
      // guarantees, independent of the app content.
      await page
        .locator('[data-testid="modal-launcher-close-button"]')
        .click()
    },
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

test.describe('Dialogs close by button only', () => {
  test.beforeEach(async ({ page }) => {
    // Network-operating menus and the summary row need a network in the
    // workspace before they are enabled.
    await gotoAndSeedNetwork(page)
  })

  for (const { name, testId, open, close } of CASES) {
    const dialog = (page: Page) => page.locator(`[data-testid="${testId}"]`)

    test(`${name} ignores Escape and the backdrop, closes on its button`, async ({
      page,
    }) => {
      await open(page)
      await expect(dialog(page)).toBeVisible()

      await page.keyboard.press('Escape')
      await expect(dialog(page)).toBeVisible()

      await clickBackdrop(page)
      await expect(dialog(page)).toBeVisible()

      await close(page)
      await expect(dialog(page)).not.toBeVisible()
    })
  }
})

/**
 * The sweep removed root-level guards from eight `<Dialog>` tags. They were
 * added believing `stopPropagation()` blocked dismissal — it does not — but two
 * of them also called `preventDefault()`, and a bubble-phase `preventDefault` on
 * keydown DOES suppress text insertion — which is why the NDEx search field
 * carries a `stopPropagation()` of its own (`LoadFromNdexDialog.tsx`). The root
 * handler it was escaping is gone, so that guard is now belt-and-braces.
 * Typing must keep working either way.
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
