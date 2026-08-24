import { expect, test } from './fixtures'

// Tier 3.1 of the federation/public-API hardening plan: prove that the REAL
// Vite bundle + real init.tsx actually publish `window.CyWebApi` and fire the
// `cywebapi:ready` event. The unit-level cywebapi-ready.test.ts only checks a
// hand-built mock object, so it is blind to a bundler regression — this is not.

// The public domain namespaces assembled in src/app-api/core/index.ts.
const EXPECTED_API_KEYS = [
  'element',
  'network',
  'selection',
  'viewport',
  'table',
  'visualStyle',
  'layout',
  'export',
  'workspace',
  'contextMenu',
  'nodeGraphics',
]

test.describe('window.CyWebApi public surface', () => {
  test('fires cywebapi:ready and exposes all domain APIs', async ({ page }) => {
    // Start listening for the one-shot ready event BEFORE navigation so we
    // never miss it (it fires once, after stores + event bus init).
    await page.addInitScript(() => {
      ;(window as unknown as { __cywebReady?: boolean }).__cywebReady = false
      window.addEventListener('cywebapi:ready', () => {
        ;(window as unknown as { __cywebReady?: boolean }).__cywebReady = true
      })
    })

    await page.goto('/')

    // Wait for the ready signal (covers both "fired after we listened" and
    // "already fired" via the flag).
    await page.waitForFunction(
      () => (window as unknown as { __cywebReady?: boolean }).__cywebReady,
      undefined,
      { timeout: 30_000 },
    )

    // window.CyWebApi is defined with exactly the expected domain keys.
    const apiKeys = await page.evaluate(() => {
      const api = (window as unknown as { CyWebApi?: Record<string, unknown> })
        .CyWebApi
      return api ? Object.keys(api) : null
    })
    expect(apiKeys).not.toBeNull()
    for (const key of EXPECTED_API_KEYS) {
      expect(apiKeys).toContain(key)
    }

    // A read-only call returns a well-formed ApiResult (boolean `success`).
    // getNetworkIds has no side effects and no network dependency.
    const result = await page.evaluate(() => {
      const api = (
        window as unknown as {
          CyWebApi?: { workspace: { getNetworkIds: () => unknown } }
        }
      ).CyWebApi
      return api?.workspace.getNetworkIds()
    })
    expect(result).toHaveProperty('success')
    expect(typeof (result as { success: unknown }).success).toBe('boolean')
  })
})
