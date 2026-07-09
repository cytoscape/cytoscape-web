import { expect, offlineTest as test } from './fixtures'

test.describe('Cookie Consent', () => {
  test.beforeEach(async ({ context, page, browserName }) => {
    // Clear only the consent cookie so the banner appears without disrupting Keycloak session
    await context.clearCookies({ name: 'cytoscapeWebCookieConsent' })

    // WebKit's ITP blocks cross-origin cookies in iframes, so the silent-SSO iframe
    // times out and keycloak-js fires its silentCheckSsoFallback — a top-level page
    // redirect that races against the banner visibility check. Intercept the auth request
    // so the iframe gets an immediate login_required response and navigates back to
    // silent-check-sso.html (same origin) where it can postMessage to the parent.
    // Chromium and Firefox handle the iframe path natively so they don't need this.
    if (browserName === 'webkit') {
      await page.route('**/protocol/openid-connect/auth**', async (route) => {
        const url = new URL(route.request().url())
        const redirectUri = url.searchParams.get('redirect_uri') ?? '/'
        const state = url.searchParams.get('state') ?? ''
        const targetUrl = `${redirectUri}#error=login_required&state=${state}`
        await route.fulfill({
          contentType: 'text/html',
          body: `<html><head><script>window.location.replace(${JSON.stringify(targetUrl)})</script></head></html>`,
        })
      })
    }
  })

  test('consent banner is visible on fresh load', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="cookie-consent"]')).toBeVisible({
      timeout: 10000,
    })
  })

  test('accepting consent removes the banner', async ({ page }) => {
    await page.goto('/')
    const banner = page.locator('[data-testid="cookie-consent"]')
    await expect(banner).toBeVisible({ timeout: 10000 })

    await page.locator('[data-testid="cookie-consent"] button:has-text("Accept")').click()

    await expect(banner).not.toBeVisible()
  })

  test('consent preference persists across reload', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.locator('[data-testid="cookie-consent"]'),
    ).toBeVisible({ timeout: 10000 })

    await page.locator('[data-testid="cookie-consent"] button:has-text("Accept")').click()
    await expect(page.locator('[data-testid="cookie-consent"]')).not.toBeVisible()

    await page.reload()
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({
      timeout: 15000,
    })
    // Banner must not reappear after acceptance
    await expect(page.locator('[data-testid="cookie-consent"]')).not.toBeVisible()
  })
})
