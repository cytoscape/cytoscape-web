import fs from 'fs'
import path from 'path'
import type { Page } from '@playwright/test'

import { expect, gotoAndWaitReady, test } from './fixtures'

/**
 * A click on a workspace network row always opens that network.
 *
 * The row writes `currentNetworkId` and then navigates, and the URL is the only
 * network-load trigger. urlManager used to drop the navigation silently when it
 * came within 300 ms of the previous one, or when it matched the path it
 * remembered: the clicked row lit up, the canvas said "Loading network data...",
 * and then the highlight went back to the network the URL still named.
 *
 * NDEx is route-mocked, every sample serving the same fixture, so the timing
 * depends on the page alone.
 */

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
const [FIRST_ID, SECOND_ID, THIRD_ID] = SAMPLE_IDS

const CX2_FIXTURE = path.resolve(
  __dirname,
  `../fixtures/ndex/${FIRST_ID}.valid.cx2`,
)

const rowSelector = (id: string): string =>
  `[data-testid="workspace-network-${id}"]`

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
  const cx2 = fs.readFileSync(CX2_FIXTURE, 'utf8')
  await page.route(/ndexbio\.org/, (route) => {
    const request = route.request()
    const url = request.url()
    if (url.includes('batch/network/summary')) {
      const ids = (request.postDataJSON() ?? []) as string[]
      return route.fulfill({ json: ids.map(summaryFor) })
    }
    if (
      request.method() === 'GET' &&
      SAMPLE_IDS.some((sample) => url.includes(sample))
    ) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: cx2,
      })
    }
    return route.fulfill({ status: 404, body: '' })
  })
}

const currentNetworkId = async (page: Page): Promise<string> =>
  await page.evaluate(
    () =>
      (window as any).CyWebApi.workspace.getWorkspaceInfo().data
        .currentNetworkId,
  )

/** The URL, the current network and the canvas all agree on this network. */
const expectNetworkOpen = async (page: Page, id: string): Promise<void> => {
  await expect(page).toHaveURL(new RegExp(`/networks/${id}`))
  await expect(page.getByText(LOADING)).toHaveCount(0, { timeout: 15000 })
  await expect(
    page.locator('[data-testid="cyjs-renderer"] canvas').first(),
  ).toBeVisible({ timeout: 15000 })
  // The load of a network the URL moved off must not make it current again.
  await expect.poll(() => currentNetworkId(page)).toBe(id)
  await expect(page).toHaveURL(new RegExp(`/networks/${id}`))
}

test.describe('a click on a workspace network row opens that network', () => {
  test.beforeEach(async ({ page }) => {
    await mockNdexSamples(page)
    await gotoAndWaitReady(page)
  })

  test('the moment its row appears after Open Sample Networks', async ({
    page,
  }) => {
    // A person needs longer than this to react, so the page clicks for them,
    // inside the window the bug depends on.
    await page.evaluate((selector) => {
      const w = window as any
      const pushState = history.pushState.bind(history)
      history.pushState = (...args: Parameters<History['pushState']>) => {
        w.__firstNavigationAt ??= performance.now()
        pushState(...args)
      }
      new MutationObserver((_, observer) => {
        const row = document.querySelector<HTMLElement>(selector)
        if (row === null) {
          return
        }
        observer.disconnect()
        w.__rowClickedAt = performance.now()
        row.click()
      }).observe(document.body, { childList: true, subtree: true })
    }, rowSelector(SECOND_ID))

    await page.locator(OPEN_SAMPLES).click()

    await expectNetworkOpen(page, SECOND_ID)
    const gap = await page.evaluate(() => {
      const w = window as any
      return Math.abs(w.__rowClickedAt - w.__firstNavigationAt)
    })
    expect(gap).toBeLessThan(300)
  })

  test('when another row was clicked just before it', async ({ page }) => {
    await page.locator(OPEN_SAMPLES).click()
    await expectNetworkOpen(page, FIRST_ID)
    await page.waitForTimeout(400)

    await page.evaluate(
      ([second, third]) => {
        document.querySelector<HTMLElement>(second)?.click()
        document.querySelector<HTMLElement>(third)?.click()
      },
      [rowSelector(SECOND_ID), rowSelector(THIRD_ID)],
    )

    await expectNetworkOpen(page, THIRD_ID)
  })

  test('after Back returned from that same network', async ({ page }) => {
    await page.locator(OPEN_SAMPLES).click()
    await expectNetworkOpen(page, FIRST_ID)
    await page.waitForTimeout(400)
    await page.locator(rowSelector(SECOND_ID)).click()
    await expectNetworkOpen(page, SECOND_ID)

    await page.goBack()
    await expectNetworkOpen(page, FIRST_ID)
    await page.waitForTimeout(400)
    await page.locator(rowSelector(SECOND_ID)).click()

    await expectNetworkOpen(page, SECOND_ID)
    // The click added a history entry rather than overwriting the first network
    await page.goBack()
    await expectNetworkOpen(page, FIRST_ID)
  })

  test('a double click adds one history entry', async ({ page }) => {
    await page.locator(OPEN_SAMPLES).click()
    await expectNetworkOpen(page, FIRST_ID)
    await page.waitForTimeout(400)

    await page.locator(rowSelector(SECOND_ID)).dblclick()
    await expectNetworkOpen(page, SECOND_ID)

    await page.goBack()
    await expectNetworkOpen(page, FIRST_ID)
  })
})
