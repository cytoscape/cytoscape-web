import type { Page } from '@playwright/test'

import { expect, gotoAndWaitReady, installFixtureApp, test } from './fixtures'

// The Panel API (`panel.open(panel, tabId?)`), end to end against the real
// bundle and a real federated remote.
//
// Unit tests cover tab resolution and the stores. What they cannot reach is
// the reason the API exists: the side panel is UNMOUNTED while the right pane
// is closed, so the selection has to be made in a store first and picked up by
// a component that mounts afterwards. That hand-off only happens in a browser.
//
// The app tab ('appdata') and the menu item that opens it live in the fixture
// remote (test/fixtures/remote-app/AppConfig.tsx).

type ApiWindow = { CyWebApi?: any }

const sidePanelTabs = '[data-testid="side-panel-tabs"]'
const openButton = '[data-testid="side-panel-open-button"]'

const selectedRightTab = (page: Page) =>
  page.locator(`${sidePanelTabs} [role="tab"][aria-selected="true"]`)

test.describe('Panel API', () => {
  test('an Apps menu action opens the closed side panel on the app tab', async ({
    page,
  }) => {
    await gotoAndWaitReady(page, '/')
    // No hierarchy, so no Sub Network Viewer, and no app panel yet: the right
    // pane has no tab, and neither it nor its open button is shown (#877).
    // The editor renders the button, so wait for it before checking.
    await expect(page.getByTestId('workspace-editor')).toBeVisible()
    await expect(page.locator(openButton)).toHaveCount(0)
    await installFixtureApp(page)

    // The right pane is closed: the side panel is not mounted at all.
    await expect(page.locator(openButton)).toBeVisible()
    await expect(page.locator(sidePanelTabs)).toHaveCount(0)

    await page.locator('[data-testid="toolbar-apps-menu-menu-button"]').click()
    await page
      .locator(
        '[data-testid="apps-menu-item-testRemoteApp-show-appdata-panel"]',
      )
      .click()

    await expect(page.locator(sidePanelTabs)).toBeVisible({ timeout: 15_000 })
    await expect(selectedRightTab(page)).toHaveText('App Data')
    // The tab's content is mounted, not just its label selected. (The write
    // button: the panel's spans are empty while no network is loaded.)
    await expect(
      page.locator('[data-testid="remote-app-data-write"]'),
    ).toBeVisible()
  })

  test('window.CyWebApi.panel switches tabs in an open pane and rejects unknown ones', async ({
    page,
  }) => {
    await gotoAndWaitReady(page, '/?right=open')
    await installFixtureApp(page)
    if ((await page.locator(openButton).count()) > 0) {
      await page.locator(openButton).click()
    }
    // Not a hierarchy: the app's tab is the only one, and the built-in viewer
    // is neither shown nor matched (#877).
    await expect(selectedRightTab(page)).toHaveText('App Data')
    await expect(
      page.locator(`${sidePanelTabs} [role="tab"]`, {
        hasText: 'Sub Network Viewer',
      }),
    ).toHaveCount(0)

    const open = (panel: string, tabId?: string) =>
      page.evaluate(
        ([p, t]) => (window as unknown as ApiWindow).CyWebApi.panel.open(p, t),
        [panel, tabId] as const,
      )

    expect(await open('right', 'sub-network-viewer')).toMatchObject({
      success: false,
      error: { code: 'APP7' },
    })

    expect(await open('right', 'appdata')).toEqual({
      success: true,
      data: { panel: 'right', tabId: 'appdata', appId: 'testRemoteApp' },
    })
    await expect(selectedRightTab(page)).toHaveText('App Data')

    // An unknown tab is an error and leaves the selection alone.
    expect(await open('right', 'no-such-tab')).toMatchObject({
      success: false,
      error: { code: 'APP7' },
    })
    await expect(selectedRightTab(page)).toHaveText('App Data')

    // The bottom pane selects by id too.
    expect(await open('bottom', 'edges')).toMatchObject({ success: true })
    await expect(
      page.locator('[data-testid="table-browser-edges-tab"]'),
    ).toHaveAttribute('aria-selected', 'true')
  })
})
