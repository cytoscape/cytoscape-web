import type { Route } from '@playwright/test'

import { expect, test } from './fixtures'

// Node and edge counts for rows inside an NDEx folder in the Load-from-NDEx
// dialog (#817, #819). The NDEx API is route-mocked with the shapes the real
// server returns:
//
// - The folder listing omits `attributes` (so a shortcut's target and edge
//   count) unless the request passes `format=compact` (#817).
// - Even compact gives a plain network only its edge count, never its node
//   count (#819).
//
// Both rows only show real counts once the dialog fills them in from the
// batch network-summary endpoint.

const FOLDER_ID = '7bc65b82-2a2f-11ed-ac45-0ac135e8bacf'
const SHORTCUT_ID = '62b18db2-5486-11f1-98b5-005056ae3c32'
const SHORTCUT_TARGET_ID = 'ff4b43c6-45d0-11ed-b7d0-0ac135e8bacf'
const PLAIN_NETWORK_ID = '0a1b2c3d-0000-11f1-98b5-005056ae3c32'

const folderItem = {
  uuid: FOLDER_ID,
  type: 'FOLDER',
  name: 'NCI PID v2.0',
  modificationTime: 1779307155268,
  attributes: { parent: null, creationTime: 1779307155268 },
  owner: 'nci-pid',
  visibility: 'PUBLIC',
}

const shortcutBase = {
  uuid: SHORTCUT_ID,
  type: 'SHORTCUT',
  name: 'ErbB2ErbB3 signaling events (v2.0)',
  modificationTime: 1779307158335,
  owner: 'nci-pid',
  visibility: 'PUBLIC',
}

const plainNetworkBase = {
  uuid: PLAIN_NETWORK_ID,
  type: 'NETWORK',
  name: 'Plain folder network',
  modificationTime: 1779307158000,
  owner: 'nci-pid',
  visibility: 'PUBLIC',
}

// Default (`update`) format: no attributes, no counts.
const defaultListing = [shortcutBase, plainNetworkBase]

// `compact` format: shortcut target and edge counts, never a node count.
const compactListing = [
  {
    ...shortcutBase,
    edges: 340,
    attributes: {
      target_type: 'NETWORK',
      target_status: 'ACTIVE',
      target: SHORTCUT_TARGET_ID,
    },
  },
  {
    ...plainNetworkBase,
    edges: 25,
    attributes: { description: '' },
  },
]

const summary = (
  externalId: string,
  name: string,
  nodeCount: number,
  edgeCount: number,
) => ({
  externalId,
  name,
  nodeCount,
  edgeCount,
  cx2FileSize: 10_000,
  subnetworkIds: [],
  visibility: 'PUBLIC',
  owner: 'nci-pid',
  properties: [],
  creationTime: 1779307158000,
  modificationTime: 1779307158000,
})

const summaries = [
  summary(SHORTCUT_TARGET_ID, shortcutBase.name, 40, 340),
  summary(PLAIN_NETWORK_ID, plainNetworkBase.name, 12, 25),
]

const handleNdex = async (route: Route): Promise<void> => {
  const url = new URL(route.request().url())
  const path = url.pathname

  if (path.endsWith('/search/files')) {
    await route.fulfill({ json: { files: [folderItem], numFound: 1 } })
  } else if (path.endsWith(`/files/folders/${FOLDER_ID}/list`)) {
    const compact = url.searchParams.get('format') === 'compact'
    await route.fulfill({ json: compact ? compactListing : defaultListing })
  } else if (path.endsWith(`/files/folders/${FOLDER_ID}`)) {
    await route.fulfill({
      json: { externalId: FOLDER_ID, name: folderItem.name, parent: null },
    })
  } else if (path.endsWith('/batch/network/summary')) {
    const requested = new Set<string>(route.request().postDataJSON() ?? [])
    await route.fulfill({
      json: summaries.filter((s) => requested.has(s.externalId)),
    })
  } else {
    await route.fulfill({ json: { files: [], numFound: 0 } })
  }
}

test.describe('Load from NDEx: folder row counts', () => {
  test('shortcut and plain network rows show real node and edge counts', async ({
    page,
  }) => {
    await page.route(/ndexbio\.org/, handleNdex)

    await page.goto('/')

    const input = page.getByTestId('network-search-input')
    await input.fill('nci pid')
    await page.getByTestId('network-search-submit-button').click()

    const dialog = page.getByTestId('load-from-ndex-dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByRole('row', { name: /NCI PID v2\.0/ }).click()

    // Cells: checkbox, name, owner, visibility, nodes, edges, modified.
    const expectCounts = async (
      name: RegExp,
      nodes: string,
      edges: string,
    ): Promise<void> => {
      const cells = dialog.getByRole('row', { name }).getByRole('cell')
      await expect(cells.nth(4)).toHaveText(nodes)
      await expect(cells.nth(5)).toHaveText(edges)
    }

    // #817: the shortcut's counts come from its target network.
    await expectCounts(/ErbB2ErbB3 signaling events/, '40', '340')
    // #819: the plain network's node count comes from its own summary.
    await expectCounts(/Plain folder network/, '12', '25')

    await page.getByTestId('load-from-ndex-cancel-button').click()
    await expect(dialog).not.toBeVisible()
  })
})
