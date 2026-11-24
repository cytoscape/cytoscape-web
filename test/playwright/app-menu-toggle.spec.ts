import type { Page } from '@playwright/test'

import { expect, gotoAndWaitReady, installFixtureApp, test } from './fixtures'

// An App API show/hide toggle in the Apps menu (#1015), end to end against
// the real bundle and a real federated remote.
//
// The fixture remote (test/fixtures/remote-app/AppConfig.tsx) registers
// 'toggle-panel' with `isChecked` and a function `tooltip`; its onClick flips
// app-owned state. The host snapshots both each time the menu opens, so a
// click shows up as a changed checkmark, aria-checked and tooltip on the next
// open. Unit tests cover the rendering rules; this proves the contract holds
// across the federation boundary, where the functions are the remote's.

const menuButton = '[data-testid="toolbar-apps-menu-menu-button"]'
const toggleItem = '[data-testid="apps-menu-item-testRemoteApp-toggle-panel"]'

/** The row that owns the role, around the host-rendered template. */
const toggleRow = (page: Page) =>
  page.getByRole('menuitemcheckbox', { name: 'Fixture Panel' })

const expectToggleState = async (page: Page, shown: boolean) => {
  await page.locator(menuButton).click()
  const row = toggleRow(page)
  await expect(row).toBeVisible()
  await expect(row).toHaveAttribute('aria-checked', String(shown))
  // The checkmark sits in the icon slot; a toggle never shows an app icon.
  await expect(row.locator('[data-testid="CheckIcon"]')).toHaveCount(
    shown ? 1 : 0,
  )
  await expect(row.locator('[data-testid="apps-menu-item-icon"]')).toHaveCount(
    0,
  )
  // The tooltip names what a click will do. (The dropdown's own Popper also
  // has role="tooltip", so select MUI's tooltip popper by class.)
  await page.locator(toggleItem).hover()
  await expect(page.locator('.MuiTooltip-popper')).toHaveText(
    shown ? 'Hide the Fixture panel' : 'Show the Fixture panel',
  )
}

test.describe('Apps menu show/hide toggle', () => {
  test('an app toggle reports its state as a checkmark, aria-checked and tooltip', async ({
    page,
  }) => {
    await gotoAndWaitReady(page, '/')
    await installFixtureApp(page)

    await expectToggleState(page, false)

    // A click closes the menu (as every row does) and reaches the app.
    await page.locator(toggleItem).click()
    await expect(page.getByTestId('remote-toggle-marker')).toHaveText('shown')
    await expect(toggleRow(page)).toHaveCount(0)

    await expectToggleState(page, true)

    // And back.
    await page.locator(toggleItem).click()
    await expect(page.getByTestId('remote-toggle-marker')).toHaveText('hidden')
    await expectToggleState(page, false)
  })
})
