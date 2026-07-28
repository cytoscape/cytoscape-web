import fs from 'fs'

import { expect, gotoAndSeedNetwork, test } from './fixtures'

// #600 e2e gap: network export/download.
// Downloads the current network as a CX2 file through Data ▸ Export and
// asserts the file is valid CX2 (JSON aspect array with the seeded elements).

test.describe('Network Download', () => {
  test('downloads the current network as a CX2 file', async ({ page }) => {
    await gotoAndSeedNetwork(page)

    // Open Data ▸ Export ▸ Download Network File (.cx2)
    await page.locator('[data-testid="toolbar-data-menu-menu-button"]').click()
    await page.getByRole('menuitem', { name: 'Export' }).click()
    const downloadPromise = page.waitForEvent('download')
    await page
      .getByRole('menuitem', { name: 'Download Network File (.cx2)' })
      .click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.cx2$/)

    // The downloaded file is a CX2 aspect array containing the seeded
    // two-node network
    const filePath = await download.path()
    const cx2 = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    expect(Array.isArray(cx2)).toBe(true)

    const aspectNames = cx2.flatMap((aspect: object) => Object.keys(aspect))
    expect(aspectNames).toContain('CXVersion')
    expect(aspectNames).toContain('nodes')
    expect(aspectNames).toContain('edges')

    const nodesAspect = cx2.find(
      (aspect: Record<string, unknown>) => aspect.nodes !== undefined,
    )
    expect(nodesAspect.nodes).toHaveLength(2)
  })
})
