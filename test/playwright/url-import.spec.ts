import fs from 'fs'
import path from 'path'

import {
  expect,
  getWorkspaceNetworkCount,
  gotoAndWaitReady,
  test,
} from './fixtures'

// #600 e2e gap: boot-time network import from a URL (?import= search param).
// This exercises the initializeAppShell orchestration that unit tests
// deliberately leave alone: fetch the CX2, register the network, and strip
// the search params from the URL afterwards. The remote fetch is intercepted
// and served from a local fixture, so the test is deterministic and offline.

const CX2_FIXTURE = path.resolve(
  __dirname,
  '../fixtures/cx2/valid/small-network.valid.cx2',
)
const IMPORT_URL = 'https://fixtures.invalid/e2e-import-fixture.cx2'

test.describe('URL Network Import', () => {
  test('imports a network from a ?import= URL at boot and cleans the URL', async ({
    page,
  }) => {
    const cx2 = fs.readFileSync(CX2_FIXTURE, 'utf8')
    // fetchUrlCx issues a HEAD fast-fail check and then the GET; fulfill both.
    await page.route(IMPORT_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
          'content-length': String(Buffer.byteLength(cx2)),
        },
        body: route.request().method() === 'HEAD' ? undefined : cx2,
      }),
    )

    await gotoAndWaitReady(
      page,
      `/?import=${encodeURIComponent(IMPORT_URL)}`,
    )

    // The imported network is in the workspace and visible in the UI
    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 15000 })
      .toBe(1)
    await expect(page.getByText('Test Network 20 nodes').first()).toBeVisible({
      timeout: 15000,
    })

    // URL-as-state: search params are consumed and removed after boot
    await expect
      .poll(() => page.url(), { timeout: 15000 })
      .not.toContain('import=')
  })
})
