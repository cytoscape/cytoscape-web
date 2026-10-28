import fs from 'fs'
import path from 'path'
import type { Page } from '@playwright/test'

import {
  expect,
  getWorkspaceNetworkCount,
  gotoAndWaitReady,
  test,
} from './fixtures'

/**
 * #807: an NDEx share link (`?accesskey=<key>`) opens a private network
 * without a login. Boot reads the key, resolves the summary with it, and the
 * editor fetches the CX2 with it after ROUTE has stripped it from the URL.
 *
 * NDEx is route-mocked as a private network, matching production NDEx's
 * responses to a request without the key.
 */

const NETWORK_ID = 'e2e00807-0000-4000-8000-000000000807'
const ACCESS_KEY = 'e2e-share-link-key'
const LOADING = 'Loading network data...'

const CX2_FIXTURE = path.resolve(
  __dirname,
  '../fixtures/ndex/06f859c1-8051-11ef-b4e1-005056ae6f73.valid.cx2',
)

const PRIVATE_SUMMARY = {
  externalId: NETWORK_ID,
  name: 'Shared private network',
  description: '',
  version: '',
  properties: [],
  hasLayout: true,
  visibility: 'PRIVATE',
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
}

/**
 * Records every NDEx request URL. Without the key, answers as production NDEx
 * does for a private network: the batch summary endpoint omits it (200, `[]`),
 * and the CX2 endpoint returns 401.
 */
const mockPrivateNetwork = async (page: Page): Promise<string[]> => {
  const requests: string[] = []
  await page.route(/ndexbio\.org/, async (route) => {
    const url = route.request().url()
    requests.push(url)
    const hasKey = new URL(url).searchParams.get('accesskey') === ACCESS_KEY
    if (url.includes('batch/network/summary')) {
      return route.fulfill({ json: hasKey ? [PRIVATE_SUMMARY] : [] })
    }
    if (!hasKey) {
      return route.fulfill({
        status: 401,
        json: {
          errorCode: 'NDEx_Unauthorized_Operation_Exception',
          message: `Unauthorized access to network ${NETWORK_ID}`,
        },
      })
    }
    if (url.includes(`networks/${NETWORK_ID}`)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: fs.readFileSync(CX2_FIXTURE, 'utf8'),
      })
    }
    return route.fulfill({ status: 404, body: '' })
  })
  return requests
}

test.describe('NDEx share link', () => {
  test('opens a private network from a ?accesskey= deep link', async ({
    page,
  }) => {
    const requests = await mockPrivateNetwork(page)

    await gotoAndWaitReady(
      page,
      `/0/networks/${NETWORK_ID}?accesskey=${ACCESS_KEY}`,
    )

    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 15000 })
      .toBe(1)
    // The CX2 fetch runs after the URL is cleaned, so it needs the key too.
    await expect
      .poll(
        () =>
          requests.some(
            (url) =>
              url.includes(`networks/${NETWORK_ID}`) &&
              url.includes(`accesskey=${ACCESS_KEY}`),
          ),
        { timeout: 15000 },
      )
      .toBe(true)
    await expect(page.getByText(LOADING)).toHaveCount(0, { timeout: 15000 })
    await expect(page.getByText('Shared private network').first()).toBeVisible()

    // The key leaves the address bar with every other consumed param.
    await expect
      .poll(() => page.url(), { timeout: 15000 })
      .not.toContain('accesskey')
  })

  test('does not add the network when the key is wrong', async ({ page }) => {
    await mockPrivateNetwork(page)

    await gotoAndWaitReady(page, `/0/networks/${NETWORK_ID}?accesskey=wrong`)

    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 15000 })
      .toBe(0)
  })
})
