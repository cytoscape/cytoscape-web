import fs from 'fs'
import path from 'path'
import type { Page } from '@playwright/test'

import { expect, test } from './fixtures'

/**
 * #871: `/embed/<uuid>` shows one NDEx network, read-only, for an iframe
 * (EMBED_MODE_SPECIFICATION.md). NDEx is route-mocked: the network is
 * unlisted, readable only with its share-link key.
 */

const NETWORK_ID = 'e2e00871-0000-4000-8000-000000000871'
const ACCESS_KEY = 'e2e-embed-key'
const NAME = 'Embedded network'

const CX2_FIXTURE = path.resolve(
  __dirname,
  '../fixtures/ndex/06f859c1-8051-11ef-b4e1-005056ae6f73.valid.cx2',
)

const summaryOf = (nodeCount: number, edgeCount: number) => ({
  externalId: NETWORK_ID,
  name: NAME,
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
  cx2FileSize: 1000,
  nodeCount,
  edgeCount,
})

/**
 * Answers as production NDEx does for an unlisted network: without the key the
 * summary endpoint leaves it out and the CX2 endpoint returns 401. Records
 * every request the page makes.
 */
const mockUnlistedNetwork = async (
  page: Page,
  summary = summaryOf(3, 2),
): Promise<string[]> => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.route(/ndexbio\.org/, async (route) => {
    const url = route.request().url()
    const hasKey = new URL(url).searchParams.get('accesskey') === ACCESS_KEY
    if (url.includes('batch/network/summary')) {
      return route.fulfill({ json: hasKey ? [summary] : [] })
    }
    if (!hasKey) {
      return route.fulfill({ status: 401, json: { message: 'Unauthorized' } })
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

const embedUrl = (query: string): string => `/embed/${NETWORK_ID}${query}`

test.describe('Embed', () => {
  test('shows an unlisted network with its access key', async ({ page }) => {
    const requests = await mockUnlistedNetwork(page)

    await page.goto(embedUrl(`?accesskey=${ACCESS_KEY}`))

    await expect(page.getByTestId('embed-network-name')).toHaveText(NAME, {
      timeout: 15000,
    })
    await expect(page.locator('canvas:visible').first()).toBeVisible()
    // The CX2 request carries the key too
    expect(
      requests.some(
        (url) =>
          url.includes(`networks/${NETWORK_ID}`) &&
          url.includes(`accesskey=${ACCESS_KEY}`),
      ),
    ).toBe(true)
    // It stays on its own route
    expect(new URL(page.url()).pathname).toBe(`/embed/${NETWORK_ID}`)
  })

  test('keeps out of the visitor workspace and off third parties', async ({
    page,
  }) => {
    const requests = await mockUnlistedNetwork(page)

    await page.goto(embedUrl(`?accesskey=${ACCESS_KEY}`))
    await expect(page.getByTestId('embed-network-name')).toHaveText(NAME, {
      timeout: 15000,
    })

    // The database is in memory: nothing in the browser's IndexedDB
    const databases = await page.evaluate(async () =>
      (await indexedDB.databases()).map((db) => db.name),
    )
    expect(databases).toEqual([])
    // Only the app itself and NDEx: no Cytoscape Desktop probe on
    // 127.0.0.1:1234, no analytics, no SSO
    const hosts = new Set(requests.map((url) => new URL(url).host))
    hosts.delete(new URL(page.url()).host)
    expect([...hosts].filter((host) => !host.endsWith('ndexbio.org'))).toEqual(
      [],
    )
    await expect(page.getByTestId('cookie-consent')).toHaveCount(0)
  })

  test('offers no editing', async ({ page }) => {
    await mockUnlistedNetwork(page)
    await page.goto(embedUrl(`?accesskey=${ACCESS_KEY}`))
    await expect(page.getByTestId('embed-network-name')).toHaveText(NAME, {
      timeout: 15000,
    })

    await expect(page.getByTestId('toolbar')).toHaveCount(0)
    // The floating toolbar keeps Fit only
    await expect(
      page.getByTestId('floating-toolbar').locator('button'),
    ).toHaveCount(1)

    const canvas = page.locator('canvas:visible').first()
    const box = await canvas.boundingBox()
    if (box === null) throw new Error('canvas has no box')
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
      button: 'right',
    })
    await expect(page.getByRole('menu')).toHaveCount(0)
  })

  test('links to the editor with the selection and the key', async ({
    page,
  }) => {
    await mockUnlistedNetwork(page)
    await page.goto(embedUrl(`?accesskey=${ACCESS_KEY}`))

    const href = await page.getByTestId('embed-link-out').getAttribute('href')
    const url = new URL(href ?? '')
    expect(url.pathname).toBe(`/0/networks/${NETWORK_ID}`)
    expect(url.searchParams.get('accesskey')).toBe(ACCESS_KEY)
    await expect(page.getByTestId('embed-link-out')).toHaveAttribute(
      'target',
      '_blank',
    )
  })

  test('says a network it cannot read was not found', async ({ page }) => {
    await mockUnlistedNetwork(page)

    await page.goto(embedUrl(''))

    await expect(page.getByTestId('embed-message-title')).toHaveText(
      'Network not found',
      { timeout: 15000 },
    )
  })

  test('says a rejected key is no longer valid', async ({ page }) => {
    await mockUnlistedNetwork(page)

    await page.goto(embedUrl('?accesskey=wrong'))

    await expect(page.getByTestId('embed-message-title')).toHaveText(
      'Network not available',
      { timeout: 15000 },
    )
  })

  test('refuses a network over the size limits before downloading it', async ({
    page,
  }) => {
    const requests = await mockUnlistedNetwork(page, summaryOf(30000, 40000))

    await page.goto(embedUrl(`?accesskey=${ACCESS_KEY}`))

    await expect(page.getByTestId('embed-message-title')).toHaveText(
      `${NAME} is too large to show here`,
      { timeout: 15000 },
    )
    await expect(page.getByTestId('embed-message-link-out')).toBeVisible()
    expect(
      requests.filter((url) => url.includes(`networks/${NETWORK_ID}?`)),
    ).toEqual([])
  })

  test('explains its URL at /embed/', async ({ page }) => {
    await page.goto('/embed/')

    await expect(page.getByTestId('embed-help')).toBeVisible({
      timeout: 15000,
    })
    await expect(
      page.getByText('selectedSubnetworkNodes').first(),
    ).toBeVisible()
  })
})
