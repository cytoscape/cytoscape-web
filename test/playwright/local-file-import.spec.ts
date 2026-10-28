import { Page } from '@playwright/test'
import path from 'path'

import {
  expect,
  getWorkspaceNetworkCount,
  gotoAndWaitReady,
  test,
} from './fixtures'

// #600 e2e gap: local CX2 file import.
// Drives Data ▸ Import ▸ Network from File... end to end with a fixture file
// and asserts the network lands in the workspace (via window.CyWebApi) and
// its name is shown in the UI.

const CX2_FIXTURE = path.resolve(
  __dirname,
  '../fixtures/cx2/valid/small-network.valid.cx2',
)
// 10 nodes and 15 edges.
const SIF_FIXTURE = path.resolve(__dirname, '../fixtures/sif/simple.valid.sif')
const CSV_FIXTURE = path.resolve(
  __dirname,
  '../fixtures/tables/edge-list.valid.csv',
)

// Node and edge counts of the only workspace network, via window.CyWebApi.
const getElementCounts = async (
  page: Page,
): Promise<{ nodes: number; edges: number }> =>
  page.evaluate(() => {
    const api = (window as any).CyWebApi
    const ids = api?.workspace.getNetworkIds()
    const networkId = ids?.success ? ids.data.networkIds[0] : undefined
    if (networkId === undefined) return { nodes: -1, edges: -1 }
    const nodes = api.element.getNodeIds(networkId)
    const edges = api.element.getEdgeIds(networkId)
    return {
      nodes: nodes.success ? nodes.data.nodeIds.length : -1,
      edges: edges.success ? edges.data.edgeIds.length : -1,
    }
  })

// Opens Data ▸ Import ▸ Network from File... and returns its file input.
// Activate the TieredMenu submenu with a click, then wait for the child item
// to be fully visible before clicking it (avoids racing the open animation).
const openNetworkFromFile = async (page: Page) => {
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
  return page.locator('[data-testid="file-upload-dropzone"] input[type="file"]')
}

const MB = 1024 * 1024

/**
 * A valid CX2 network over 5 MB with few elements: 200 nodes, each with a
 * 30 KB attribute, in a chain of 199 edges.
 */
const largeSmallNetwork = (): Buffer => {
  const note = 'x'.repeat(30_000)
  const nodes = Array.from({ length: 200 }, (_, id) => ({
    id,
    v: { name: `n${id}`, note },
  }))
  const edges = Array.from({ length: 199 }, (_, id) => ({
    id,
    s: id,
    t: id + 1,
  }))
  return Buffer.from(
    JSON.stringify([
      { CXVersion: '2.0', hasFragments: false },
      {
        metaData: [
          { name: 'attributeDeclarations', elementCount: 1 },
          { name: 'networkAttributes', elementCount: 1 },
          { name: 'nodes', elementCount: nodes.length },
          { name: 'edges', elementCount: edges.length },
        ],
      },
      {
        attributeDeclarations: [
          {
            networkAttributes: { name: { d: 'string' } },
            nodes: { name: { d: 'string' }, note: { d: 'string' } },
          },
        ],
      },
      { networkAttributes: [{ name: 'Large Small Network' }] },
      { nodes },
      { edges },
      { status: [{ error: '', success: true }] },
    ]),
  )
}

test.describe('Local Network File Import', () => {
  test('imports a CX2 file through the Data menu', async ({ page }) => {
    await gotoAndWaitReady(page)
    expect(await getWorkspaceNetworkCount(page)).toBe(0)

    // Provide the CX2 fixture to the dropzone's file input
    const fileInput = await openNetworkFromFile(page)
    await fileInput.setInputFiles(CX2_FIXTURE)

    // The network (20 nodes / 30 edges, named in its networkAttributes)
    // is imported into the workspace
    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 15000 })
      .toBe(1)
    await expect(page.getByText('Test Network 20 nodes').first()).toBeVisible({
      timeout: 15000,
    })
    // #830 regression: every aspect is read, not only those before the last.
    expect(await getElementCounts(page)).toEqual({ nodes: 20, edges: 30 })

    // #665 regression: the view itself must render. The import races the
    // debounced IndexedDB persist, and losing that race used to replace the
    // renderer with "Failed to load network data: Local network ... is not
    // found in cache" until a manual reload.
    await expect(
      page.locator('[data-testid="cyjs-renderer"] canvas').first(),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Failed to load network data')).toHaveCount(0)
  })

  test('imports a SIF file through the Data menu', async ({ page }) => {
    await gotoAndWaitReady(page)
    const fileInput = await openNetworkFromFile(page)
    await fileInput.setInputFiles(SIF_FIXTURE)

    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 15000 })
      .toBe(1)
    expect(await getElementCounts(page)).toEqual({ nodes: 10, edges: 15 })
  })

  test('opens a CSV file in Create Network from Table', async ({ page }) => {
    await gotoAndWaitReady(page)
    const fileInput = await openNetworkFromFile(page)
    await fileInput.setInputFiles(CSV_FIXTURE)

    await expect(
      page.locator(
        '[data-testid="create-network-from-table-name-input"] input',
      ),
    ).toHaveValue('edge-list.valid.csv', { timeout: 15000 })
  })

  test('imports a CX2 file over 5 MB that is within the network size limits', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)
    const buffer = largeSmallNetwork()
    expect(buffer.length).toBeGreaterThan(5 * MB)

    const fileInput = await openNetworkFromFile(page)
    await fileInput.setInputFiles({
      name: 'large-small-network.cx2',
      mimeType: 'application/json',
      buffer,
    })

    await expect
      .poll(() => getWorkspaceNetworkCount(page), { timeout: 30_000 })
      .toBe(1)
    await expect(page.getByText('Large Small Network').first()).toBeVisible({
      timeout: 15000,
    })
    expect(await getElementCounts(page)).toEqual({ nodes: 200, edges: 199 })
  })

  test('refuses a CX2 file whose metaData is over the network size limits, before reading the rest', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)
    // Counts far over any configured limit. Everything after the metaData is
    // not JSON, so a full read would end in "Failed to parse CX2 file".
    const head = JSON.stringify([
      { CXVersion: '2.0', hasFragments: false },
      {
        metaData: [
          { name: 'nodes', elementCount: 1e12 },
          { name: 'edges', elementCount: 1e12 },
        ],
      },
    ])
    const fileInput = await openNetworkFromFile(page)
    await fileInput.setInputFiles({
      name: 'huge-network.cx2',
      mimeType: 'application/json',
      buffer: Buffer.from(`${head.slice(0, -1)},{"nodes":[{"id":`),
    })

    await expect(
      page.getByText(/huge-network\.cx2 is too large to be loaded/).first(),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Failed to parse CX2 file')).toHaveCount(0)
    expect(await getWorkspaceNetworkCount(page)).toBe(0)
  })

  test('still refuses other network files over 5 MB', async ({ page }) => {
    await gotoAndWaitReady(page)
    const buffer = Buffer.from(`source,target\n${'a,b\n'.repeat(1_400_000)}`)
    expect(buffer.length).toBeGreaterThan(5 * MB)

    const fileInput = await openNetworkFromFile(page)
    await fileInput.setInputFiles({
      name: 'big-table.csv',
      mimeType: 'text/csv',
      buffer,
    })

    await expect(
      page.getByText(/exceeds the maximum size of 5MB/).first(),
    ).toBeVisible({ timeout: 15000 })
    expect(await getWorkspaceNetworkCount(page)).toBe(0)
  })

  test('says so when the browser cannot read the file', async ({ page }) => {
    await gotoAndWaitReady(page)
    // Every read fails, as it does for a file moved or deleted after it was
    // chosen, or one too large for the browser to hold as text.
    await page.evaluate(() => {
      FileReader.prototype.readAsText = function (this: FileReader) {
        setTimeout(() => this.dispatchEvent(new ProgressEvent('error')))
      }
    })

    const fileInput = await openNetworkFromFile(page)
    await fileInput.setInputFiles({
      name: 'unreadable.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('source,target\na,b\n'),
    })

    await expect(
      page.getByText(/unreadable\.csv could not be read/).first(),
    ).toBeVisible({ timeout: 15000 })
    expect(await getWorkspaceNetworkCount(page)).toBe(0)
  })
})
