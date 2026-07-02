import { test as base, expect, type Page } from '@playwright/test'

// Base-path URL helpers live in ./support/appUrl so playwright.config.ts and the
// tests share one derivation. Imported for local use below and re-exported for
// existing `from './fixtures'` imports.
import { appPath, BASE_PATH } from './support/appUrl'
export { appPath, BASE_PATH }

/**
 * Make the app boot with NO external servers — for hermetic (default-lane)
 * tests. On startup the app calls NDEx (Keycloak silent SSO + 3rd-party-cookie
 * check + workspace summaries), Google Analytics, and probes a local Cytoscape
 * Desktop. This stubs those so `keycloak.init()` resolves as "not logged in"
 * and the app shell renders, while blocking any other non-localhost request so
 * the test can't accidentally depend on an external server.
 *
 * Call at the very start of a test, or use `offlineTest` which applies it
 * automatically.
 */
export async function installOfflineAppRoutes(page: Page): Promise<void> {
  // Block all non-localhost traffic. Registered first so the specific stubs
  // below take precedence (Playwright uses the last matching route).
  await page.route('**/*', (route) => {
    const url = route.request().url()
    if (
      url.includes('localhost:5500') ||
      url.startsWith('data:') ||
      url.startsWith('blob:')
    ) {
      return route.continue()
    }
    return route.abort()
  })

  // Keycloak silent check-sso → redirect to the local silent-check-sso.html with
  // `login_required`, so keycloak.init() resolves with authenticated=false.
  await page.route(/openid-connect\/auth/, (route) => {
    const u = new URL(route.request().url())
    const redirectUri =
      u.searchParams.get('redirect_uri') ?? appPath('silent-check-sso.html')
    const state = u.searchParams.get('state') ?? ''
    return route.fulfill({
      status: 302,
      headers: {
        location: `${redirectUri}#error=login_required&state=${state}`,
      },
      body: '',
    })
  })

  // Keycloak 3rd-party-cookie check iframe → post the message keycloak waits for.
  await page.route(/openid-connect\/3p-cookies/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body><script>parent.postMessage("unsupported","*")</script></body></html>',
    }),
  )

  // NDEx workspace summaries → empty (no networks to hydrate).
  await page.route(/\/v2\/batch\/network\/summary/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    }),
  )
}

/**
 * Plain test/expect — used by acceptance (live-NDEx) specs that must reach the
 * real server.
 */
export const test = base

/**
 * A `test` that auto-installs the offline routes before each test, for hermetic
 * default-lane specs. Import as:
 *   `import { offlineTest as test } from './fixtures'`
 */
export const offlineTest = base.extend<{ offlineApp: void }>({
  offlineApp: [
    async ({ page }, use) => {
      await installOfflineAppRoutes(page)
      await use()
    },
    { auto: true },
  ],
})

export { expect }
