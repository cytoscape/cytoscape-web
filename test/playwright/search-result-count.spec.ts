import path from 'path'

import type { Page } from '@playwright/test'

import {
  expect,
  getWorkspaceNetworkCount,
  gotoAndWaitReady,
  test,
} from './fixtures'

// The node/edge search reports what it selected inside the search field
// (#923): a count next to the query, and the full sentence in a tooltip below
// the field and in a live region. Unit tests
// (src/features/ToolBar/Search/SearchBox.test.tsx) cover the wording,
// including the Sub Network Viewer's view; this covers the field in the real
// app bar, on a network the App API created (which has no active view until a
// workspace load sets one) and on a hierarchy's main view.

type ApiWindow = { CyWebApi?: any }

// 50 subsystems, 25 of them with `type` "gene"
const HCX = path.resolve(
  __dirname,
  '../fixtures/hcx/valid/with-interaction-uuid.valid.cx2',
)

const seedNetwork = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const api = (window as unknown as ApiWindow).CyWebApi
    api.network.createNetworkFromEdgeList({
      name: 'Search count network',
      edgeList: [
        ['alpha', 'beta'],
        ['beta', 'gamma'],
        ['gamma', 'delta'],
      ],
      addToWorkspace: true,
    })
  })
}

const search = async (page: Page, query: string): Promise<void> => {
  const input = page.locator('[data-testid="search-box-input"] input')
  await input.fill(query)
  await input.press('Enter')
}

const count = (page: Page) => page.getByTestId('search-result-count')

// The count's tooltip. The examples tooltip it holds closed can still be in
// the DOM while it animates out (WebKit), so a bare role match finds both.
const countTooltip = (page: Page) =>
  page.getByRole('tooltip').filter({ hasText: 'selected' })

test.describe('Search on a table with a column named id (#949)', () => {
  test('selects the matching rows', async ({ page }) => {
    await gotoAndWaitReady(page)

    const networkId = await page.evaluate(async () => {
      const api = (window as unknown as ApiWindow).CyWebApi
      const node = (id: number, v: Record<string, string>) => ({
        id,
        x: id * 50,
        y: 0,
        v,
      })
      const result = await api.network.createNetworkFromCx2({
        cxData: [
          { CXVersion: '2.0', hasFragments: false },
          {
            metaData: [
              { elementCount: 1, name: 'attributeDeclarations' },
              { elementCount: 1, name: 'networkAttributes' },
              { elementCount: 3, name: 'nodes' },
              { elementCount: 1, name: 'edges' },
            ],
          },
          {
            attributeDeclarations: [
              { nodes: { id: { d: 'string' }, label: { d: 'string' } } },
            ],
          },
          { networkAttributes: [{ name: 'Search id column network' }] },
          {
            nodes: [
              node(0, { id: 'https://example.org/1', label: 'other' }),
              node(1, { id: 'https://example.org/2', label: 'FRYL' }),
              node(2, { label: 'complex(FRYL)' }),
            ],
          },
          { edges: [{ id: 0, s: 0, t: 1, v: {} }] },
          { status: [{ error: '', success: true }] },
        ],
        addToWorkspace: true,
        navigate: true,
      })
      return result.data.networkId as string
    })

    await page.getByTestId('search-settings-button').click()
    await page.getByRole('radio', { name: 'Contains' }).click()
    await page
      .getByTestId('search-settings-popover')
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    await expect(page.getByTestId('search-settings-popover')).toHaveCount(0)

    // The search index is built in an effect once the tables have landed
    await expect(async () => {
      await search(page, 'fryl')
      await expect(count(page)).toHaveText('2 nodes', { timeout: 500 })
    }).toPass()

    const selected = await page.evaluate(
      (id) =>
        (window as unknown as ApiWindow).CyWebApi.selection.getSelection(id),
      networkId,
    )
    expect(selected.data.selectedNodes.toSorted()).toEqual(['1', '2'])
  })
})

test.describe('Search result count (#923)', () => {
  test('shows the count in the field, replaces it, and removes it on edit', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)
    await seedNetwork(page)
    const searchBox = page.locator('[data-testid="search-box-input"]')
    const heightBefore = (await searchBox.boundingBox())?.height

    await search(page, 'alpha beta')
    await expect(count(page)).toHaveText('2 nodes')
    await expect(page.getByTestId('search-result-announcement')).toHaveText(
      '2 nodes selected.',
    )
    // The count sits inside the field without making it taller
    expect((await searchBox.boundingBox())?.height).toBe(heightBefore)

    await count(page).hover()
    await expect(countTooltip(page)).toHaveText('2 nodes selected.')

    // No match: shown in the field, and no Snackbar is queued
    await search(page, 'nonsense')
    await expect(count(page)).toHaveText('No matches')
    await expect(page.getByTestId('snackbar-message-list')).toHaveCount(0)

    // A narrow window drops the nouns
    await search(page, 'alpha')
    await expect(count(page)).toHaveText('1 node')
    await page.setViewportSize({ width: 1000, height: 720 })
    await expect(count(page)).toHaveText('1')

    // Editing the query removes the count
    await page.locator('[data-testid="search-box-input"] input').press('End')
    await page.keyboard.type('x')
    await expect(count(page)).toHaveCount(0)
  })

  test('names the main network view of a hierarchy', async ({ page }) => {
    // Selecting subsystems makes the Sub Network Viewer fetch the first one's
    // interaction network from NDEx; hold that request open.
    await page.route('**/*ndexbio.org/**', () => {})

    await gotoAndWaitReady(page)
    expect(await getWorkspaceNetworkCount(page)).toBe(0)
    await page.locator('[data-testid="toolbar-data-menu-menu-button"]').click()
    await page.getByRole('menuitem', { name: 'Import' }).click()
    await page.getByRole('menuitem', { name: 'Network from File...' }).click()
    await page
      .locator('[data-testid="file-upload-dropzone"] input[type="file"]')
      .setInputFiles(HCX)
    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 15000 })
      .toBe(1)
    // Recognised as a hierarchy: the Sub Network Viewer waits for a subsystem
    await expect(page.getByText('Please select a subsystem')).toBeVisible({
      timeout: 15000,
    })

    await search(page, 'gene')
    await expect(count(page)).toHaveText('25 nodes')
    await expect(page.getByTestId('search-result-announcement')).toHaveText(
      '25 nodes selected in the main network view.',
    )
    await count(page).hover()
    await expect(countTooltip(page)).toHaveText(
      '25 nodes selected in the main network view.',
    )
  })
})
