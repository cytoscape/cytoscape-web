import path from 'path'

import {
  expect,
  getWorkspaceNetworkCount,
  gotoAndWaitReady,
  test,
} from './fixtures'
import type { Page } from '@playwright/test'

// Issue #630: a HCX hierarchy can contain edges that are not parent-child
// relationships. The circle packing builder cannot interpret those, so:
//  - a hierarchy with several edge interaction types gets no Cell View tab
//  - any other hierarchy the builder cannot resolve shows a message instead of
//    the blank panel it used to leave behind
const MIXED_INTERACTION_HCX = path.resolve(
  __dirname,
  '../fixtures/hcx/valid/with-interaction-uuid.valid.cx2',
)

const UNIFORM_INTERACTION_CYCLIC_HCX = path.resolve(
  __dirname,
  '../fixtures/hcx/invalid/not-dag-single-interaction.invalid.cx2',
)

const importNetworkFile = async (
  page: Page,
  fixture: string,
  networkName: string,
): Promise<void> => {
  await gotoAndWaitReady(page)
  expect(await getWorkspaceNetworkCount(page)).toBe(0)

  await page.locator('[data-testid="toolbar-data-menu-menu-button"]').click()
  await page.getByRole('menuitem', { name: 'Import' }).click()
  const fromFileItem = page.getByRole('menuitem', {
    name: 'Network from File...',
  })
  await expect(fromFileItem).toBeVisible()
  await fromFileItem.click()
  await expect(
    page.locator('[data-testid="file-upload-dropzone"]'),
  ).toBeVisible()

  await page
    .locator('[data-testid="file-upload-dropzone"] input[type="file"]')
    .setInputFiles(fixture)

  await expect
    .poll(() => getWorkspaceNetworkCount(page), { timeout: 15000 })
    .toBe(1)
  await expect(page.getByText(networkName).first()).toBeVisible({
    timeout: 15000,
  })
}

test.describe('Cell View availability for hierarchies (#630)', () => {
  test('a hierarchy with mixed edge interaction types gets no Cell View tab', async ({
    page,
  }) => {
    await importNetworkFile(
      page,
      MIXED_INTERACTION_HCX,
      'Test Network 50 nodes',
    )

    // The network is recognised as a hierarchy: the Sub Network Viewer is open
    // and waiting for a subsystem selection.
    await expect(page.getByText('Please select a subsystem')).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText('Failed to load network data')).toHaveCount(0)

    // ...yet the Cell View renderer is never registered, so there is no tab for
    // it and no blank circle packing panel.
    await expect(page.getByRole('tab', { name: 'Cell View' })).toHaveCount(0)
    await expect(
      page.locator('[data-testid="circle-packing-svg"]'),
    ).toHaveCount(0)
  })

  test('a hierarchy that cannot be resolved to a tree explains itself instead of rendering blank', async ({
    page,
  }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await importNetworkFile(
      page,
      UNIFORM_INTERACTION_CYCLIC_HCX,
      'Test Network 20 nodes',
    )

    // Every edge shares one interaction type, so the heuristic keeps Cell View.
    const cellViewTab = page.getByRole('tab', { name: 'Cell View' })
    await expect(cellViewTab).toBeVisible({ timeout: 15000 })
    await cellViewTab.click()

    // The network is cyclic, so no single root exists: the panel says so rather
    // than leaving an empty SVG behind.
    await expect(
      page.locator('[data-testid="circle-packing-unavailable"]'),
    ).toBeVisible({ timeout: 15000 })
    await expect(
      page.locator('[data-testid="circle-packing-svg"]'),
    ).toHaveCount(0)

    expect(pageErrors).toEqual([])
  })
})
