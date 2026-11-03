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
    await expect(page.getByRole('tooltip')).toHaveText('2 nodes selected.')

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
    await expect(page.getByRole('tooltip')).toHaveText(
      '25 nodes selected in the main network view.',
    )
  })
})
