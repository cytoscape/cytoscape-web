import { expect, test } from './fixtures'

// The network search bar (#688). NDEx ships as a built-in provider
// (registered at boot under the '__builtin__' appId), so the bar is always
// present in the Workspace tab. The first test drives the built-in NDEx
// flow: submit opens the NDEx - Network Browser dialog with the query
// prefilled and the search already running (the NDEx API is route-mocked to
// keep the test hermetic). The second drives an app-registered provider
// end-to-end through the fixture remote (test/fixtures/remote-app/),
// including the provider menu and the More Options popover.

const FIXTURE_MANIFEST_URL = 'http://localhost:4191/manifest.json'

test.describe('network search bar', () => {
  test('built-in NDEx provider opens the NDEx dialog with the query running', async ({
    page,
  }) => {
    // Hermetic: answer every NDEx API call with an empty result set.
    await page.route(/ndexbio\.org/, (route) =>
      route.fulfill({ json: { files: [], numFound: 0 } }),
    )

    await page.goto('/')

    // The bar is present from the start, with NDEx as the default provider.
    await expect(page.getByTestId('network-search-bar')).toBeVisible()
    const input = page.getByTestId('network-search-input')
    await expect(input).toHaveAttribute('placeholder', 'Search NDEx')
    // NDEx registers no options panel, so there is no More Options button.
    await expect(page.getByTestId('network-search-options-button')).toHaveCount(
      0,
    )

    // Submit a query → the NDEx - Network Browser dialog opens with the
    // trimmed text prefilled and the search already executed.
    await input.fill('  BRCA1  ')
    await page.getByTestId('network-search-submit-button').click()

    const dialog = page.locator('[data-testid="load-from-ndex-dialog"]')
    await expect(dialog).toBeVisible()
    await expect(
      page.getByTestId('load-from-ndex-search-input').locator('input'),
    ).toHaveValue('BRCA1')
    await expect(dialog.getByText('Search: "BRCA1"')).toBeVisible()

    // The dialog owns the rest of the flow; Cancel hands control back.
    await page.getByTestId('load-from-ndex-cancel-button').click()
    await expect(dialog).not.toBeVisible()
  })

  test('app provider: menu selection, options popover, and submit', async ({
    page,
  }) => {
    await page.goto('/')

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

    // Both providers are listed in the provider menu; pick the fixture one.
    await page.getByTestId('network-search-provider-button').click()
    await expect(
      page.getByTestId('network-search-provider-item-__builtin__-ndex'),
    ).toBeVisible()
    await page
      .getByTestId('network-search-provider-item-testRemoteApp-fixture-search')
      .click()

    // The bar now carries the fixture provider's placeholder (which proves
    // the provider metadata reached the host).
    const input = page.getByTestId('network-search-input')
    await expect(input).toHaveAttribute('placeholder', 'Fixture query...')

    // Search is gated on a non-empty query.
    const submit = page.getByTestId('network-search-submit-button')
    await expect(submit).toBeDisabled()
    await input.fill('  BRCA1  ')
    await expect(submit).toBeEnabled()

    // More Options: the app's panel renders in the host tree. The popover is
    // an anchored non-modal surface — Escape dismisses it — and it also
    // carries a host-rendered Close button as an explicit exit.
    await page.getByTestId('network-search-options-button').click()
    await expect(page.getByTestId('remote-search-options')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('remote-search-options')).toHaveCount(0)
    await page.getByTestId('network-search-options-button').click()
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
