import type { Locator, Page, Route } from '@playwright/test'

import { expect, test } from './fixtures'

// Folder browsing in the Load-from-NDEx dialog (#817, #819). The NDEx API is
// route-mocked with the shapes the real server returns:
//
// - The folder listing omits `attributes` (a shortcut's target, target type
//   and status) and edge counts unless the request passes `format=compact`
//   (#817).
// - Even compact gives a plain network only its edge count, never its node
//   count (#819). Real counts come from the batch network-summary endpoint.
//
// Fake folder tree:
//
//   search "nci pid" → A
//   A ├─ B (folder)
//     ├─ shortcut → C (folder)
//     ├─ shortcut → T (network)
//     ├─ P (plain network)
//     ├─ shortcut → D (folder, DELETED)
//     └─ shortcut → X (network, IN_TRASH)
//   B └─ shortcut → C (folder)
//   C └─ NC (plain network)

const id = (n: number): string =>
  `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`

const A = id(1)
const B = id(2)
const C = id(3)
const D = id(4)
const SC_C = id(10) // in A, points at C
const SC_C2 = id(11) // in B, points at C
const NS = id(12) // network shortcut → T
const DF = id(13) // dead folder shortcut → D
const DN = id(14) // dead network shortcut → X
const T = id(20)
const P = id(21)
const X = id(22)
const NC = id(23)

const FOLDER_NAMES: Record<string, string> = {
  [A]: 'NCI PID v2.0',
  [B]: 'Subfolder B',
  [C]: 'Target folder C',
}

type Item = Record<string, unknown>

const base = (uuid: string, type: string, name: string): Item => ({
  uuid,
  type,
  name,
  modificationTime: 1779307158000,
  owner: 'nci-pid',
  visibility: 'PUBLIC',
})

const folder = (uuid: string): Item => ({
  ...base(uuid, 'FOLDER', FOLDER_NAMES[uuid]),
  attributes: { parent: null, creationTime: 1779307158000 },
})

const shortcut = (
  uuid: string,
  name: string,
  target: string,
  targetType: 'FOLDER' | 'NETWORK',
  targetStatus: 'ACTIVE' | 'IN_TRASH' | 'DELETED' = 'ACTIVE',
  edges?: number,
): Item => ({
  ...base(uuid, 'SHORTCUT', name),
  ...(edges === undefined ? {} : { edges }),
  attributes: {
    target_type: targetType,
    target_status: targetStatus,
    target,
  },
})

const network = (uuid: string, name: string, edges: number): Item => ({
  ...base(uuid, 'NETWORK', name),
  edges,
  attributes: { description: '' },
})

// Compact listings; the default (`update`) format is derived by stripping.
const COMPACT_LISTINGS: Record<string, Item[]> = {
  [A]: [
    folder(B),
    shortcut(SC_C, 'Shortcut to C', C, 'FOLDER'),
    shortcut(
      NS,
      'ErbB2ErbB3 signaling events (v2.0)',
      T,
      'NETWORK',
      'ACTIVE',
      340,
    ),
    network(P, 'Plain folder network', 25),
    shortcut(DF, 'Shortcut to deleted folder', D, 'FOLDER', 'DELETED'),
    shortcut(DN, 'Shortcut to trashed network', X, 'NETWORK', 'IN_TRASH'),
  ],
  [B]: [shortcut(SC_C2, 'Another shortcut to C', C, 'FOLDER')],
  [C]: [network(NC, 'Network inside C', 5)],
}

const toDefaultFormat = (item: Item): Item => {
  const { attributes: _attributes, edges: _edges, ...rest } = item
  return rest
}

const summary = (
  externalId: string,
  name: string,
  nodeCount: number,
  edgeCount: number,
): Item => ({
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

const SUMMARIES = [
  summary(T, 'ErbB2ErbB3 signaling events (v2.0)', 40, 340),
  summary(P, 'Plain folder network', 12, 25),
  summary(NC, 'Network inside C', 3, 5),
]

interface FakeNdex {
  /** Folder ids whose contents were listed, in request order. */
  listed: string[]
}

const mockNdex = async (page: Page): Promise<FakeNdex> => {
  const fake: FakeNdex = { listed: [] }

  await page.route(/ndexbio\.org/, async (route: Route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const listMatch = path.match(/\/files\/folders\/([^/]+)\/list$/)
    const folderMatch = path.match(/\/files\/folders\/([^/]+)$/)

    if (path.endsWith('/search/files')) {
      await route.fulfill({ json: { files: [folder(A)], numFound: 1 } })
    } else if (listMatch) {
      const folderId = listMatch[1]
      fake.listed.push(folderId)
      const items = COMPACT_LISTINGS[folderId]
      if (items === undefined) {
        await route.fulfill({ status: 404, json: { message: 'not found' } })
        return
      }
      const compact = url.searchParams.get('format') === 'compact'
      await route.fulfill({
        json: compact ? items : items.map(toDefaultFormat),
      })
    } else if (folderMatch) {
      const name = FOLDER_NAMES[folderMatch[1]]
      await route.fulfill(
        name === undefined
          ? { status: 404, json: { message: 'not found' } }
          : { json: { externalId: folderMatch[1], name, parent: null } },
      )
    } else if (path.endsWith('/batch/network/summary')) {
      const requested = new Set<string>(route.request().postDataJSON() ?? [])
      await route.fulfill({
        json: SUMMARIES.filter((s) => requested.has(s.externalId as string)),
      })
    } else {
      await route.fulfill({ json: { files: [], numFound: 0 } })
    }
  })

  return fake
}

const folderRow = (dialog: Locator, uuid: string): Locator =>
  dialog.getByTestId(`load-from-ndex-folder-row-${uuid}`)

const networkRow = (dialog: Locator, uuid: string): Locator =>
  dialog.getByTestId(`load-from-ndex-network-row-${uuid}`)

const breadcrumbs = (dialog: Locator): Locator =>
  dialog
    .getByTestId('load-from-ndex-breadcrumbs')
    .locator('li:not([aria-hidden])')

/** Opens the dialog on the "nci pid" search and drills into folder A. */
const openFolderA = async (page: Page): Promise<Locator> => {
  await page.goto('/')
  await page.getByTestId('network-search-input').fill('nci pid')
  await page.getByTestId('network-search-submit-button').click()

  const dialog = page.getByTestId('load-from-ndex-dialog')
  await expect(dialog).toBeVisible()
  await folderRow(dialog, A).click()
  await expect(folderRow(dialog, B)).toBeVisible()
  return dialog
}

test.describe('Load from NDEx: folders', () => {
  test('shortcut and plain network rows show real node and edge counts', async ({
    page,
  }) => {
    await mockNdex(page)
    const dialog = await openFolderA(page)

    // Cells: checkbox, name, owner, visibility, nodes, edges, modified.
    const expectCounts = async (
      uuid: string,
      nodes: string,
      edges: string,
    ): Promise<void> => {
      const cells = networkRow(dialog, uuid).getByRole('cell')
      await expect(cells.nth(4)).toHaveText(nodes)
      await expect(cells.nth(5)).toHaveText(edges)
    }

    // #817: the shortcut's counts come from its target network.
    await expectCounts(NS, '40', '340')
    // #819: the plain network's node count comes from its own summary.
    await expectCounts(P, '12', '25')
  })

  test('rows carry their own id and the id they open', async ({ page }) => {
    await mockNdex(page)
    await page.goto('/')
    await page.getByTestId('network-search-input').fill('nci pid')
    await page.getByTestId('network-search-submit-button').click()
    const dialog = page.getByTestId('load-from-ndex-dialog')

    // A plain folder opens itself.
    await expect(folderRow(dialog, A)).toHaveAttribute('data-target-id', A)

    await folderRow(dialog, A).click()

    // Shortcuts keep their own uuid in the test id and open their target.
    await expect(folderRow(dialog, SC_C)).toHaveAttribute('data-target-id', C)
    await expect(networkRow(dialog, NS)).toHaveAttribute('data-target-id', T)
    // A plain network opens itself.
    await expect(networkRow(dialog, P)).toHaveAttribute('data-target-id', P)
  })

  test('folder shortcuts are listed as folders, not as networks', async ({
    page,
  }) => {
    await mockNdex(page)
    const dialog = await openFolderA(page)

    // Without format=compact the target type is missing and a folder
    // shortcut falls into the Networks section with a checkbox.
    await expect(folderRow(dialog, SC_C)).toBeVisible()
    await expect(networkRow(dialog, SC_C)).toHaveCount(0)
    await expect(
      dialog.getByTestId(`load-from-ndex-network-checkbox-${SC_C}`),
    ).toHaveCount(0)
  })

  test('a folder shortcut opens the folder it points to', async ({ page }) => {
    const fake = await mockNdex(page)
    const dialog = await openFolderA(page)

    await folderRow(dialog, SC_C).click()

    await expect(networkRow(dialog, NC)).toBeVisible()
    expect(fake.listed).toEqual([A, C])
    await expect(breadcrumbs(dialog)).toHaveText([
      /Search: "nci pid"/,
      FOLDER_NAMES[A],
      FOLDER_NAMES[C],
    ])
  })

  test('breadcrumbs navigate back through nested folders', async ({ page }) => {
    const fake = await mockNdex(page)
    const dialog = await openFolderA(page)

    await folderRow(dialog, B).click()
    await folderRow(dialog, SC_C2).click()
    await expect(networkRow(dialog, NC)).toBeVisible()
    await expect(breadcrumbs(dialog)).toHaveText([
      /Search: "nci pid"/,
      FOLDER_NAMES[A],
      FOLDER_NAMES[B],
      FOLDER_NAMES[C],
    ])

    // Back to A: re-lists A by its id and trims the trail.
    await dialog.getByTestId('load-from-ndex-breadcrumb-1').click()
    await expect(folderRow(dialog, B)).toBeVisible()
    await expect(breadcrumbs(dialog)).toHaveText([
      /Search: "nci pid"/,
      FOLDER_NAMES[A],
    ])

    // Back to the search results: served from cache, no new listing.
    await dialog.getByTestId('load-from-ndex-breadcrumb-0').click()
    await expect(folderRow(dialog, A)).toBeVisible()
    await expect(breadcrumbs(dialog)).toHaveText([/Search: "nci pid"/])
    expect(fake.listed).toEqual([A, B, C, A])
  })

  test('shortcuts to a deleted or trashed target cannot be opened', async ({
    page,
  }) => {
    const fake = await mockNdex(page)
    const dialog = await openFolderA(page)

    // Dead folder shortcut: disabled, explains why, and does not navigate.
    const deadFolder = folderRow(dialog, DF)
    await expect(deadFolder).toHaveAttribute('aria-disabled', 'true')
    await deadFolder.hover()
    await expect(
      page.getByRole('tooltip', {
        name: 'The folder this shortcut points to no longer exists',
      }),
    ).toBeVisible()
    // aria-disabled makes Playwright refuse a plain click; force it to prove
    // the row ignores one.
    await deadFolder.click({ force: true })

    // Dead network shortcut: disabled, no selectable checkbox.
    const deadNetwork = networkRow(dialog, DN)
    await expect(deadNetwork).toHaveAttribute('aria-disabled', 'true')
    await expect(
      dialog.getByTestId(`load-from-ndex-network-checkbox-${DN}`),
    ).toHaveCount(0)
    await deadNetwork.hover()
    await expect(
      page.getByRole('tooltip', {
        name: 'The network this shortcut points to is in the trash',
      }),
    ).toBeVisible()

    // A later valid click is the only new listing; D was never requested.
    await folderRow(dialog, B).click()
    await expect(folderRow(dialog, SC_C2)).toBeVisible()
    expect(fake.listed).toEqual([A, B])
  })

  test('opening a network shortcut loads its target network', async ({
    page,
  }) => {
    await mockNdex(page)
    const dialog = await openFolderA(page)

    await dialog.getByTestId(`load-from-ndex-network-checkbox-${NS}`).click()

    const summaryRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/batch/network/summary') &&
        JSON.stringify(request.postDataJSON()) === JSON.stringify([T]),
    )
    await page.getByTestId('load-from-ndex-open-button').click()
    await summaryRequest
  })
})
