import fs from 'fs'
import path from 'path'
import type { Page } from '@playwright/test'

import { expect, gotoAndWaitReady, test } from './fixtures'

/**
 * The URL is the only thing that loads a network: WorkspaceEditor's swap
 * effect is keyed on the route's networkId, and nothing writes
 * currentNetworkId back into the URL. The App API deletes networks from core
 * code that has no router, so a delete through window.CyWebApi used to leave
 * the deleted network's id in the address bar:
 *
 * - deleteAllNetworks, then Open Sample Networks, navigated to the unchanged
 *   path, the load never ran, and the canvas said "Loading network data..."
 *   forever (the menu variant of this is #790).
 * - deleteCurrentNetwork repaired currentNetworkId to the next network, but
 *   the URL still named the deleted one, so the next network — only a summary
 *   until it is first shown — was never loaded.
 *
 * NDEx is route-mocked: summaries for every sample, and the CX2 of any sample
 * that has a fixture under test/fixtures/ndex/.
 */

const PANEL = '[data-testid="empty-workspace-panel"]'
const OPEN_SAMPLES = '[data-testid="empty-workspace-open-samples"]'
const LOADING = 'Loading network data...'

const SAMPLE_IDS: string[] = (
  JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '../../src/assets/config.json'),
      'utf8',
    ),
  ) as { testNetworks: string[] }
).testNetworks
const [FIRST_SAMPLE_ID, SECOND_SAMPLE_ID] = SAMPLE_IDS

const FIXTURE_DIR = path.resolve(__dirname, '../fixtures/ndex')

const fixtureFor = (id: string): string | undefined => {
  const file = fs
    .readdirSync(FIXTURE_DIR)
    .find((name) => name.startsWith(`${id}.`) && name.endsWith('.valid.cx2'))
  return file === undefined ? undefined : path.join(FIXTURE_DIR, file)
}

const summaryFor = (externalId: string) => ({
  externalId,
  name: `Sample ${externalId.slice(0, 8)}`,
  description: '',
  version: '',
  properties: [],
  hasLayout: true,
  visibility: 'PUBLIC',
  ownerUUID: 'owner',
  owner: 'owner',
  isReadOnly: false,
  isValid: true,
  completed: true,
  isDeleted: false,
  creationTime: '2024-01-01T00:00:00.000Z',
  modificationTime: '2024-01-01T00:00:00.000Z',
  nodeCount: 3,
  edgeCount: 2,
})

const mockNdexSamples = async (page: Page): Promise<void> => {
  await page.route(/ndexbio\.org/, (route) => {
    const request = route.request()
    const url = request.url()
    if (url.includes('batch/network/summary')) {
      const ids = (request.postDataJSON() ?? []) as string[]
      return route.fulfill({ json: ids.map(summaryFor) })
    }
    const id = SAMPLE_IDS.find((sample) => url.includes(sample))
    const fixture = id === undefined ? undefined : fixtureFor(id)
    if (request.method() === 'GET' && fixture !== undefined) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: fs.readFileSync(fixture, 'utf8'),
      })
    }
    return route.fulfill({ status: 404, body: '' })
  })
}

interface ApiWindow {
  CyWebApi: any
}

const callApi = async (
  page: Page,
  domain: string,
  fn: string,
  ...args: unknown[]
): Promise<{ success: boolean; data?: any }> =>
  await page.evaluate(
    ([d, f, a]) =>
      (window as unknown as ApiWindow).CyWebApi[d as string][f as string](
        ...(a as unknown[]),
      ),
    [domain, fn, args] as const,
  )

const currentNetworkId = async (page: Page): Promise<string> =>
  (await callApi(page, 'workspace', 'getWorkspaceInfo')).data.currentNetworkId

const openSamples = async (page: Page): Promise<void> => {
  await page.locator(OPEN_SAMPLES).click()
  await expect(page).toHaveURL(new RegExp(`/networks/${FIRST_SAMPLE_ID}`))
  await expect(
    page.locator('[data-testid="cyjs-renderer"] canvas').first(),
  ).toBeVisible({ timeout: 15000 })
}

test.describe('App API deletes move the URL off the deleted network', () => {
  test('deleteAllNetworks, then Open Sample Networks, loads the sample', async ({
    page,
  }) => {
    await mockNdexSamples(page)
    await gotoAndWaitReady(page)
    await openSamples(page)

    // urlManager drops a navigation within 300 ms of the previous one
    // (urlManager.test.ts); keep the fix's own navigation out of that window
    // so the test measures the fix, not the throttle.
    await page.waitForTimeout(400)
    expect((await callApi(page, 'network', 'deleteAllNetworks')).success).toBe(
      true,
    )
    await expect(page.locator(PANEL)).toBeVisible({ timeout: 15000 })

    await page.waitForTimeout(400)
    await page.locator(OPEN_SAMPLES).click()
    await expect(page.getByText(LOADING)).toHaveCount(0, { timeout: 15000 })
    await expect(
      page.locator('[data-testid="cyjs-renderer"] canvas').first(),
    ).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(new RegExp(`/networks/${FIRST_SAMPLE_ID}`))
  })

  test('deleteCurrentNetwork loads the network that becomes current', async ({
    page,
  }) => {
    await mockNdexSamples(page)
    await gotoAndWaitReady(page)
    await openSamples(page)

    await page.waitForTimeout(400)
    expect(
      (await callApi(page, 'network', 'deleteCurrentNetwork')).success,
    ).toBe(true)
    // The orchestrator repairs the pointer to the first remaining network: the
    // second sample, which is still only a summary.
    expect(await currentNetworkId(page)).toBe(SECOND_SAMPLE_ID)

    await expect(page.getByText(LOADING)).toHaveCount(0, { timeout: 15000 })
    await expect(
      page.locator('[data-testid="cyjs-renderer"] canvas').first(),
    ).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(new RegExp(`/networks/${SECOND_SAMPLE_ID}`))
  })
})
