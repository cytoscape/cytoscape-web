import { test, expect } from '@playwright/test'
import { PLAYWRIGHT_TEST_URL } from './test-config'

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

const waitForWorkspaceToLoad = async () => await delay(5000)

test.beforeEach(async ({ page }) => {
  await page.goto(PLAYWRIGHT_TEST_URL)
  // workspace needs to be initialized, wait for it before performing actions
  await waitForWorkspaceToLoad()
})

// const loadTestNetwork = async (page: any) => {}

test('load 1 network', async ({ page }) => {
  await page.getByRole('button', { name: 'Data' }).click()
  await page
    .getByRole('menuitem', { name: 'Open network(s) from NDEx...' })
    .click()
  await page.getByLabel('Search NDEx').click()
  await page
    .getByLabel('Search NDEx')
    .fill('7ec1b6e7-fa77-11ed-b7d0-0242c246b7fb')

  await page
    .getByRole('dialog', { name: 'NDEx - Network Browser' })
    .locator('div')
    .filter({
      hasText:
        'SEARCH NDExMy NetworksSearch NDExNetworkOwnerNodesEdgesLast modified7ec1b6e7-fa7',
    })
    .getByRole('button')
    .click()
  await delay(3000)
  await page.locator('td').first().click()
  await page.getByRole('button', { name: 'Open 1 Network(s)' }).click()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect
    .soft(
      page.locator(
        '.split-view-view > .split-view > .split-view-container > div > div > div:nth-child(2) > div > div > div',
      ),
    )
    .toBeAttached()
})
