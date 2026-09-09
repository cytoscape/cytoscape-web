import fs from 'fs'
import path from 'path'
import type { Page } from '@playwright/test'

import {
  expect,
  getWorkspaceNetworkCount,
  gotoAndSeedNetwork,
  gotoAndWaitReady,
  test,
} from './fixtures'

/**
 * #651 — the empty workspace shows a call to action instead of a dead end.
 *
 * The shared fixture seeds `cyweb.onboarding` as "seen", so these tests are
 * independent of the first-run welcome dialog — the state-driven panel must
 * show on a plain empty workspace regardless of first-run status.
 *
 * "Open Sample Networks" is a live NDEx round trip. It is route-mocked here
 * (summaries plus the CX2 of the first sample, served from the NDEx fixture
 * with the same UUID as config.json's first `testNetworks` entry) so the
 * success path is deterministic and offline; a second test aborts the same
 * requests to exercise the failure state.
 */

const PANEL = '[data-testid="empty-workspace-panel"]'
const OPEN_SAMPLES = '[data-testid="empty-workspace-open-samples"]'

/**
 * First `testNetworks` entry in src/assets/config.json — read at module load
 * so a config change cannot silently desync the fixture this spec serves.
 */
const FIRST_SAMPLE_ID: string = (
  JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '../../src/assets/config.json'),
      'utf8',
    ),
  ) as { testNetworks: string[] }
).testNetworks[0]
const CX2_FIXTURE = path.resolve(
  __dirname,
  `../fixtures/ndex/${FIRST_SAMPLE_ID}.valid.cx2`,
)

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

/**
 * Answer every NDEx call the sample load makes: the batch summary POST with
 * one summary per requested UUID, and the CX2 GET of the first sample with
 * the fixture. Anything else is 404 so an unexpected dependency fails loudly.
 */
const mockNdexSampleLoad = async (page: Page): Promise<void> => {
  const cx2 = fs.readFileSync(CX2_FIXTURE, 'utf8')
  await page.route(/ndexbio\.org/, (route) => {
    const request = route.request()
    const url = request.url()
    if (url.includes('batch/network/summary')) {
      const ids = (request.postDataJSON() ?? []) as string[]
      return route.fulfill({ json: ids.map(summaryFor) })
    }
    if (request.method() === 'GET' && url.includes(FIRST_SAMPLE_ID)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: cx2,
      })
    }
    return route.fulfill({ status: 404, body: '' })
  })
}

test.describe('empty workspace call to action (#651)', () => {
  test('replaces the dead end with actions and a description', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)

    const panel = page.locator(PANEL)
    await expect(panel).toBeVisible()
    await expect(panel.getByText('Welcome to Cytoscape Web')).toBeVisible()
    await expect(page.locator(OPEN_SAMPLES)).toBeEnabled()
    await expect(
      page.locator('[data-testid="empty-workspace-import-file"]'),
    ).toBeEnabled()
    await expect(
      page.locator('[data-testid="empty-workspace-load-ndex"]'),
    ).toBeEnabled()
    await expect(
      page.locator('[data-testid="empty-workspace-take-tour"]'),
    ).toBeEnabled()
    await expect(page.getByText('No network selected')).toHaveCount(0)
  })

  test('Open Sample Networks puts a network on the canvas', async ({
    page,
  }) => {
    await mockNdexSampleLoad(page)
    await gotoAndWaitReady(page)

    await page.locator(OPEN_SAMPLES).click()

    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 15000 })
      .toBeGreaterThan(0)
    await expect(page.locator(PANEL)).toBeHidden({ timeout: 15000 })
    await expect(
      page.locator('[data-testid="cyjs-renderer"] canvas').first(),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Failed to load network data')).toHaveCount(0)
  })

  test('an unreachable NDEx is reported inline with Retry, other paths stay open', async ({
    page,
  }) => {
    await page.route(/ndexbio\.org/, (route) => route.abort('failed'))
    await gotoAndWaitReady(page)

    await page.locator(OPEN_SAMPLES).click()

    const alert = page.locator('[data-testid="empty-workspace-error"]')
    await expect(alert).toBeVisible({ timeout: 15000 })
    await expect(
      page.locator('[data-testid="empty-workspace-retry"]'),
    ).toBeEnabled()
    await expect(page.locator(OPEN_SAMPLES)).toBeEnabled()
    await expect(
      page.locator('[data-testid="empty-workspace-import-file"]'),
    ).toBeEnabled()
    expect(await getWorkspaceNetworkCount(page)).toBe(0)

    // Retry goes back through the same path once NDEx answers again.
    await page.unroute(/ndexbio\.org/)
    await mockNdexSampleLoad(page)
    await page.locator('[data-testid="empty-workspace-retry"]').click()
    await expect(alert).toBeHidden({ timeout: 15000 })
    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 15000 })
      .toBeGreaterThan(0)
  })

  test('Import from file opens the upload dialog', async ({ page }) => {
    await gotoAndWaitReady(page)

    await page.locator('[data-testid="empty-workspace-import-file"]').click()

    const modal = page.locator('[data-testid="file-upload-modal"]')
    await expect(modal).toBeVisible()
    await expect(
      page.locator('[data-testid="file-upload-dropzone"]'),
    ).toBeVisible()
    await modal.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(modal).toBeHidden()
  })

  test('Load from NDEx opens the NDEx browser in browse mode', async ({
    page,
  }) => {
    await page.route(/ndexbio\.org/, (route) =>
      route.fulfill({ json: { files: [], numFound: 0 } }),
    )
    await gotoAndWaitReady(page)

    await page.locator('[data-testid="empty-workspace-load-ndex"]').click()

    const dialog = page.locator('[data-testid="load-from-ndex-dialog"]')
    await expect(dialog).toBeVisible()
    // Browse mode: no query was carried in from the click.
    await expect(
      page.getByTestId('load-from-ndex-search-input').locator('input'),
    ).toHaveValue('')
    await page.getByTestId('load-from-ndex-cancel-button').click()
    await expect(dialog).toBeHidden()
  })

  test('Take a tour starts the guided tour and hides the actions', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)

    await page.locator('[data-testid="empty-workspace-take-tour"]').click()

    await expect(page.locator('[data-testid="tour-step-toolbar"]')).toBeVisible(
      { timeout: 10000 },
    )
    // Mid-tour the panel keeps its heading but offers no competing actions.
    await expect(page.locator(PANEL)).toBeVisible()
    await expect(page.locator(OPEN_SAMPLES)).toHaveCount(0)
  })

  test('returns after Data → Remove All Networks', async ({ page }) => {
    await gotoAndSeedNetwork(page)
    await expect(page.locator(PANEL)).toHaveCount(0)

    await page.locator('[data-testid="toolbar-data-menu-menu-button"]').click()
    await page.getByRole('menuitem', { name: 'Remove All Networks' }).click()
    await page.locator('[data-testid="confirmation-dialog-confirm"]').click()

    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 15000 })
      .toBe(0)
    await expect(page.locator(PANEL)).toBeVisible({ timeout: 15000 })
  })
})
