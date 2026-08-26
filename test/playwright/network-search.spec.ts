import { expect, test } from './fixtures'

// The network search bar (#688). The bar at the top of the Workspace tab is
// hidden until an active app registers a 'search-bar' provider, so this
// spec drives the whole path through the fixture remote
// (test/fixtures/remote-app/): register + activate the app, watch the bar
// appear with the provider's placeholder, exercise the More Options popover
// (a modal form popover: Escape is inert, its Close button is the exit),
// and submit a query the provider echoes into a DOM marker.

const FIXTURE_MANIFEST_URL = 'http://localhost:4191/manifest.json'

test.describe('network search bar', () => {
  test('appears with a provider, runs a search, options close by button only', async ({
    page,
  }) => {
    await page.goto('/')

    // No provider registered → no search bar.
    await expect(page.getByTestId('network-search-bar')).toHaveCount(0)

    // Register + activate the fixture remote (same arrangement as
    // remote-app-load.spec.ts).
    await page.locator('[data-testid="toolbar-apps-menu-menu-button"]').click()
    await page.getByRole('menuitem', { name: 'Manage Apps...' }).click()
    await expect(
      page.locator('[data-testid="app-settings-dialog"]'),
    ).toBeVisible()
    await page.getByText('Manifest Source').click()
    await page.getByLabel('Custom manifest URL').fill(FIXTURE_MANIFEST_URL)
    await page.getByRole('button', { name: 'Apply' }).click()
    const toggle = page.locator('[data-testid="app-toggle-testRemoteApp"]')
    await expect(toggle).toBeVisible({ timeout: 15_000 })
    await toggle.click()
    await expect(page.locator('[data-testid="remote-app-marker"]')).toBeVisible(
      { timeout: 15_000 },
    )
    await page.getByTestId('app-settings-dialog-close-button').click()

    // The bar appears in the Workspace tab, carrying the provider's
    // placeholder (which proves the provider metadata reached the host).
    const input = page.getByTestId('network-search-input')
    await expect(page.getByTestId('network-search-bar')).toBeVisible()
    await expect(input).toHaveAttribute('placeholder', 'Fixture query...')

    // Search is gated on a non-empty query.
    const submit = page.getByTestId('network-search-submit-button')
    await expect(submit).toBeDisabled()
    await input.fill('  BRCA1  ')
    await expect(submit).toBeEnabled()

    // More Options: the app's panel renders in the host tree; Escape leaves
    // the popover open (dialog dismissal policy); the Close button closes it.
    await page.getByTestId('network-search-options-button').click()
    await expect(page.getByTestId('remote-search-options')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('remote-search-options')).toBeVisible()
    await page.getByTestId('remote-search-exact-checkbox').check()
    await page.getByTestId('network-search-options-close-button').click()
    await expect(page.getByTestId('remote-search-options')).toHaveCount(0)

    // Submit → the provider received the trimmed query and read its own
    // options state.
    await submit.click()
    await expect(page.getByTestId('remote-search-result')).toHaveText(
      'query:BRCA1;exact:true',
    )
  })
})
