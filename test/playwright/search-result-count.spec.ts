import type { Page } from '@playwright/test'

import { expect, gotoAndWaitReady, test } from './fixtures'

// The node/edge search reports what it selected inside the search field
// (#923): a count next to the query, and the full sentence in a tooltip below
// the field and in a live region. Unit tests
// (src/features/ToolBar/Search/SearchBox.test.tsx) cover the wording,
// including the hierarchy views; this covers the field in the real app bar.
// The search runs on a network the App API created, which has no active view
// until a workspace load sets one.

type ApiWindow = { CyWebApi?: any }

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
})
