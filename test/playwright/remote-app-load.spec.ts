import { expect, test } from './fixtures'

// Tier 3.2 — the gold-standard federation test. A SEPARATELY-built Module
// Federation remote (test/fixtures/remote-app/, served on :4191) is registered
// with the host at runtime via a custom manifest URL, then activated. This
// exercises the full path the Vite migration rewrote in ExternalComponent.tsx:
// script injection → container.init(shareScope) → container.get('./AppConfig')
// → loadRemoteApp → mount(). The remote renders a React (hooks) marker, which
// also demonstrates the shared-React singleton wiring works across two
// independently-built bundles.
//
// It also covers the REVERSE direction: the fixture imports `cyweb/WorkspaceApi`
// and renders the host's workspaceId. That import can only resolve if the
// fixture's runtime plugin read window.__CYWEB_HOST__ and rewrote its `cyweb`
// remote entry — the fixture compiles in an unloadable sentinel, so a resolver
// that never ran fails the load outright.

const FIXTURE_MANIFEST_URL = 'http://localhost:4191/manifest.json'
// Same fixture server, but its entry names an origin that is neither
// allow-listed nor localhost — the case the catalog path used to load blindly.
const BLOCKED_MANIFEST_URL = 'http://localhost:4191/manifest-blocked.json'

// The host redirects `/` to `<base>/<workspaceId>/networks`, so the URL is an
// independent source for the id the remote should have received.
//
// Anchored on the `networks` segment rather than on position: under a based
// deployment the path is `/cytoscape/<workspaceId>/networks`, and taking the
// first segment would yield `cytoscape`. That is invisible at the default base
// of `/` and wrong on the `/cytoscape/` staging host.
const workspaceIdFromUrl = (url: string): string => {
  const segments = new URL(url).pathname.split('/').filter((s) => s !== '')
  const networksAt = segments.indexOf('networks')
  return networksAt > 0 ? segments[networksAt - 1] : ''
}

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

    // Remote → host: the fixture called cyweb/WorkspaceApi and rendered what it
    // got back. Asserted against the id in the URL rather than "is non-empty" —
    // an empty render, an error branch, or a mis-shaped cyweb.d.ts (which
    // yields `undefined`) would all satisfy a looser check.
    const expectedWorkspaceId = workspaceIdFromUrl(page.url())
    expect(expectedWorkspaceId).not.toBe('')
    await expect(
      page.locator('[data-testid="remote-host-workspace-id"]'),
    ).toHaveText(expectedWorkspaceId)
  })

  test('host renders a remote hooks component (single shared React)', async ({
    page,
  }) => {
    // Fail loudly if React throws "invalid hook call" — the symptom of two
    // separate React copies across the host↔remote boundary.
    const hookErrors: string[] = []
    page.on('pageerror', (e) => {
      if (/invalid hook call|hook/i.test(e.message)) hookErrors.push(e.message)
    })

    await page.goto('/')

    // Register the fixture remote and activate it.
    await page.locator('[data-testid="toolbar-apps-menu-menu-button"]').click()
    await page.getByRole('menuitem', { name: 'Manage Apps...' }).click()
    await page.getByText('Manifest Source').click()
    await page.getByLabel('Custom manifest URL').fill(FIXTURE_MANIFEST_URL)
    await page.getByRole('button', { name: 'Apply' }).click()
    const toggle = page.locator('[data-testid="app-toggle-testRemoteApp"]')
    await expect(toggle).toBeVisible({ timeout: 15_000 })
    await toggle.click()
    await expect(page.locator('[data-testid="remote-app-marker"]')).toBeVisible(
      { timeout: 15_000 },
    )

    // On mount the remote registered an 'apps-menu' item as plain data. The
    // HOST renders the row itself — label and tooltip, no remote component —
    // under a host-owned test id.
    await page.getByTestId('app-settings-dialog-close-button').click()
    await page.locator('[data-testid="toolbar-apps-menu-menu-button"]').click()
    const menuItem = page.locator(
      '[data-testid="apps-menu-item-testRemoteApp-open-dialog"]',
    )
    await expect(menuItem).toBeVisible({ timeout: 10_000 })
    await expect(menuItem).toHaveText('Open Fixture Dialog')
    // The registered icon URI renders as a host-tinted mask in the row (no
    // <img>: the host paints the shape in the row's text color).
    await expect(menuItem.locator('img')).toHaveCount(0)
    await expect(
      menuItem.locator('[data-testid="apps-menu-item-icon"]'),
    ).toHaveCSS('mask-image', /data:image\/svg\+xml/)

    // Its onClick calls apis.dialog.open(...). The host closes the dropdown
    // and renders the dialog in its own shell (AppDialogHost): host title
    // bar, then a hooks-using body from the remote bundle — which only
    // renders if the remote shares the host's single React instance.
    await menuItem.click()
    await expect(menuItem).not.toBeVisible()
    const dialog = page.locator(
      '[data-testid="app-dialog-testRemoteApp-fixture-dialog"]',
    )
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await expect(dialog).toContainText('Fixture Dialog')
    await expect(
      page.locator('[data-testid="remote-dialog-marker"]'),
    ).toContainText('dialog-hooks-ok')
    expect(hookErrors).toEqual([])

    // Three exits, one close path. The backdrop stays inert (dialog policy);
    // app dialogs are the documented exception that also closes on Escape.
    // (1) the `close` handed to render, wired to the app's Done button;
    await page.locator('[data-testid="remote-dialog-done"]').click()
    await expect(dialog).not.toBeVisible()
    // (2) Escape — reopening reuses the stable id, never stacking a second;
    await page.locator('[data-testid="toolbar-apps-menu-menu-button"]').click()
    await menuItem.click()
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await expect(dialog).toHaveCount(1)
    await page
      .locator('.MuiDialog-container')
      .last()
      .click({ position: { x: 4, y: 4 } })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    // (3) the host's own Close "X".
    await page.locator('[data-testid="toolbar-apps-menu-menu-button"]').click()
    await menuItem.click()
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await page.locator('[data-testid="app-dialog-close-button"]').click()
    await expect(dialog).not.toBeVisible()
  })
  test('modal-launcher: a host-rendered modal outlives the dropdown that opened it', async ({
    page,
  }) => {
    await page.goto('/')

    // Register the fixture remote and activate it.
    await page.locator('[data-testid="toolbar-apps-menu-menu-button"]').click()
    await page.getByRole('menuitem', { name: 'Manage Apps...' }).click()
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

    // Open the modal from the fixture's apps-menu item — a host-rendered
    // row whose onClick calls apis.resource.openModal. The host closes the
    // dropdown before running the handler.
    await page.locator('[data-testid="toolbar-apps-menu-menu-button"]').click()
    const menuItem = page.locator(
      '[data-testid="apps-menu-item-testRemoteApp-open-modal"]',
    )
    await expect(menuItem).toBeVisible({ timeout: 10_000 })
    await menuItem.click()

    // The dropdown (and with it the launcher) is gone...
    await expect(menuItem).not.toBeVisible()

    // ...but the modal is host-rendered under AppShell and survives. Its
    // content is a hooks-using component from the remote bundle, rendered
    // inside the host's dialog shell (modal-launcher wrapper stack).
    const dialog = page.locator(
      '[data-testid="modal-launcher-dialog-testRemoteApp-fixture-modal"]',
    )
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await expect(
      page.locator('[data-testid="remote-modal-marker"]'),
    ).toContainText('modal-hooks-ok')

    // The injected requestClose (wired to the app's Cancel button) closes it.
    // (Close-on-deactivation is covered at the unit level: the cleanup
    // registry cannot be driven from here once the modal covers the UI.)
    await page.locator('[data-testid="remote-modal-cancel"]').click()
    await expect(dialog).not.toBeVisible()

    // Reopened, the shell's own exits: backdrop inert, Escape closes (the
    // documented exception for app dialogs), and the structural Close "X".
    await page.locator('[data-testid="toolbar-apps-menu-menu-button"]').click()
    await menuItem.click()
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await page
      .locator('.MuiDialog-container')
      .last()
      .click({ position: { x: 4, y: 4 } })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await page.locator('[data-testid="toolbar-apps-menu-menu-button"]').click()
    await menuItem.click()
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await page.locator('[data-testid="modal-launcher-close-button"]').click()
    await expect(dialog).not.toBeVisible()
  })

  // G-6: activateApp reached loadRemoteApp with no origin check, so a manifest
  // the *user* pointed at could name any URL and the host would fetch and
  // execute it. The two tests above still pass because host and app are both on
  // localhost; this one is the case that must now be refused.
  test('refuses an app whose origin is neither allow-listed nor localhost', async ({
    page,
  }) => {
    const attempted: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('blocked.invalid')) {
        attempted.push(request.url())
      }
    })

    await page.goto('/')
    await page.locator('[data-testid="toolbar-apps-menu-menu-button"]').click()
    await page.getByRole('menuitem', { name: 'Manage Apps...' }).click()
    await expect(
      page.locator('[data-testid="app-settings-dialog"]'),
    ).toBeVisible()

    await page.getByText('Manifest Source').click()
    await page.getByLabel('Custom manifest URL').fill(BLOCKED_MANIFEST_URL)
    await page.getByRole('button', { name: 'Apply' }).click()

    // The entry is catalogued — the refusal is about loading it as code, not
    // about listing it, so the user can still see what the manifest offered.
    const toggle = page.locator('[data-testid="app-toggle-blockedRemoteApp"]')
    await expect(toggle).toBeVisible({ timeout: 15_000 })

    await toggle.click()

    await expect(
      page.getByText(/not from an allowed origin/i).first(),
    ).toBeVisible({ timeout: 15_000 })

    // The real assertion. A refusal that still fetched the bundle would have
    // defeated the purpose, and an unresolvable host makes "it failed anyway"
    // indistinguishable from "it was blocked" without this.
    expect(attempted).toEqual([])
  })
})
