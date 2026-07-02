import { appPath, expect, offlineTest as test } from './fixtures'

/**
 * Hermetic basic-UI smoke test (default lane).
 *
 * Uses `offlineTest`, which auto-stubs the app's startup calls to NDEx /
 * Keycloak / analytics (see fixtures.ts), so this needs NO external server —
 * only the local dev server serving the app. It verifies the shell boots and
 * the toolbar is interactive. It is intentionally NOT tagged `@ndex`, so it runs
 * in the default lane.
 */
test('app boots and the toolbar is interactive (no external servers)', async ({
  page,
}) => {
  await page.goto(appPath('/'))

  // The shell rendered (not the init-error fallback).
  await expect(page.locator('[data-testid="toolbar"]')).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.locator('[data-testid="init-error-message"]')).toHaveCount(0)

  // The toolbar has menus, and a menu opens on click (pure UI, no network).
  const firstMenuButton = page.locator('[data-testid$="-menu-button"]').first()
  await expect(firstMenuButton).toBeVisible()
  await firstMenuButton.click()
  // The button reflects the open state (implementation-agnostic signal), and the
  // dropdown's menu items render.
  await expect(firstMenuButton).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('.p-menuitem').first()).toBeVisible()
})
