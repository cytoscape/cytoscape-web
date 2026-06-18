import { expect, test } from './fixtures'

// Tier 3.2 — the gold-standard federation test. A SEPARATELY-built Module
// Federation remote (test/fixtures/remote-app/, served on :4191) is registered
// with the host at runtime via a custom manifest URL, then activated. This
// exercises the full path the Vite migration rewrote in ExternalComponent.tsx:
// script injection → container.init(shareScope) → container.get('./AppConfig')
// → loadRemoteApp → mount(). The remote renders a React (hooks) marker, which
// also demonstrates the shared-React singleton wiring works across two
// independently-built bundles.

const FIXTURE_MANIFEST_URL = 'http://localhost:4191/manifest.json'

test.describe('host loads a real federated remote', () => {
  test('registers, activates, and renders the remote app', async ({ page }) => {
    await page.goto('/')

    // Open Apps menu → Manage Apps... dialog.
    await page.locator('[data-testid="toolbar-apps-menu-menu-button"]').click()
    await page.getByRole('menuitem', { name: 'Manage Apps...' }).click()
    await expect(
      page.locator('[data-testid="app-settings-dialog"]'),
    ).toBeVisible()

    // Expand the "Manifest Source" section and point it at the fixture remote.
    await page.getByText('Manifest Source').click()
    await page.getByLabel('Custom manifest URL').fill(FIXTURE_MANIFEST_URL)
    await page.getByRole('button', { name: 'Apply' }).click()

    // The fixture app appears in the catalog (manifest fetched + parsed).
    const toggle = page.locator('[data-testid="app-toggle-testRemoteApp"]')
    await expect(toggle).toBeVisible({ timeout: 15_000 })

    // Activate it → host injects remoteEntry.js, inits the container, gets
    // ./AppConfig, and calls mount().
    await toggle.click()

    // mount() rendered the remote's React marker into the page.
    const marker = page.locator('[data-testid="remote-app-marker"]')
    await expect(marker).toBeVisible({ timeout: 15_000 })
    await expect(marker).toContainText('hooks-ok')

    // The remote resolved a React instance (shared-singleton wiring intact).
    const remoteReactVersion = await page.evaluate(
      () =>
        (window as unknown as { __remoteReactVersion?: string })
          .__remoteReactVersion,
    )
    expect(typeof remoteReactVersion).toBe('string')
    expect(remoteReactVersion).toMatch(/^\d+\./)
  })
})
