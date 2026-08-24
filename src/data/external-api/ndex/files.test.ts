// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getNdexClient } from './client'
import {
  enrichShortcutsWithTargetSummaries,
  fetchFolderContents,
  getNetworkIdForFileItem,
  NdexFileItem,
  searchNdexFiles,
} from './files'
import { fetchNdexSummaries } from './networkSummary'

vi.mock('./client', () => ({
  getNdexClient: vi.fn(),
}))

vi.mock('./networkSummary', () => ({
  fetchNdexSummaries: vi.fn(),
}))

const TARGET_NETWORK_UUID = '8e3ef192-1d8d-11f1-94e8-005056ae3c32'
const SHORTCUT_UUID = 'c4f1f66b-7fac-11f1-be83-005056ae3c32'

// A raw NETWORK item as returned by the NDEx file search API.
const rawNetworkItem = {
  uuid: TARGET_NETWORK_UUID,
  type: 'NETWORK',
  name: 'galFiltered.sif',
  modificationTime: 1773262924310,
  owner: 'dftest123123',
  visibility: 'PRIVATE',
  edges: 359,
  attributes: { nodeCount: 330, cx2FileSize: 260452, subnetworkIds: [] },
}

// A raw SHORTCUT item pointing at the network above (target lives in attributes).
const rawShortcutItem = {
  uuid: SHORTCUT_UUID,
  type: 'SHORTCUT',
  name: 'galFiltered.sif - Shortcut',
  modificationTime: 1784051544049,
  owner: 'dftest123123',
  visibility: 'PRIVATE',
  edges: 359,
  attributes: {
    target_type: 'NETWORK',
    target_status: 'ACTIVE',
    target: TARGET_NETWORK_UUID,
  },
}

describe('mapFileListItem (via searchNdexFiles / fetchFolderContents)', () => {
  const searchFiles = vi.fn()
  const getFolderList = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getNdexClient as any).mockReturnValue({
      files: { searchFiles, getFolderList },
    })
  })

  it('sets targetId from attributes.target for a SHORTCUT and leaves it undefined for a plain NETWORK', async () => {
    searchFiles.mockResolvedValue({
      files: [rawNetworkItem, rawShortcutItem],
      numFound: 2,
    })

    const { files } = await searchNdexFiles('gal', 'PRIVATE')

    const network = files.find((f) => f.type === 'NETWORK')
    const shortcut = files.find((f) => f.type === 'SHORTCUT')

    expect(network?.targetId).toBeUndefined()
    expect(shortcut?.targetId).toBe(TARGET_NETWORK_UUID)
  })

  it('preserves targetId when browsing folder contents', async () => {
    getFolderList.mockResolvedValue([rawShortcutItem])

    const items = await fetchFolderContents('some-folder', 'token')

    expect(items[0].targetId).toBe(TARGET_NETWORK_UUID)
  })
})

describe('getNetworkIdForFileItem', () => {
  it('returns the target id for a shortcut', () => {
    const shortcut = {
      uuid: SHORTCUT_UUID,
      type: 'SHORTCUT',
      targetId: TARGET_NETWORK_UUID,
    } as NdexFileItem
    expect(getNetworkIdForFileItem(shortcut)).toBe(TARGET_NETWORK_UUID)
  })

  it('returns the own uuid for a plain network or folder', () => {
    const network = {
      uuid: TARGET_NETWORK_UUID,
      type: 'NETWORK',
    } as NdexFileItem
    expect(getNetworkIdForFileItem(network)).toBe(TARGET_NETWORK_UUID)
  })
})

describe('enrichShortcutsWithTargetSummaries', () => {
  const shortcutItem: NdexFileItem = {
    uuid: SHORTCUT_UUID,
    name: 'galFiltered.sif - Shortcut',
    type: 'SHORTCUT',
    modificationTime: 1784051544049,
    targetId: TARGET_NETWORK_UUID,
    attributes: { target_type: 'NETWORK', target: TARGET_NETWORK_UUID },
  }

  const networkItem: NdexFileItem = {
    uuid: TARGET_NETWORK_UUID,
    name: 'galFiltered.sif',
    type: 'NETWORK',
    modificationTime: 1773262924310,
    nodes: 330,
    nodeCount: 330,
    edges: 359,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('copies node/edge/size metrics from the target summary onto the shortcut', async () => {
    ;(fetchNdexSummaries as any).mockResolvedValue([
      {
        externalId: TARGET_NETWORK_UUID,
        nodeCount: 330,
        edgeCount: 359,
        cx2FileSize: 260452,
        subnetworkIds: [],
        visibility: 'PRIVATE',
      },
    ])

    const [network, shortcut] = await enrichShortcutsWithTargetSummaries([
      networkItem,
      shortcutItem,
    ])

    // Network item is untouched.
    expect(network).toBe(networkItem)

    // Shortcut inherits the target's metrics.
    expect(shortcut.nodeCount).toBe(330)
    expect(shortcut.nodes).toBe(330)
    expect(shortcut.edges).toBe(359)
    expect(shortcut.cx2FileSize).toBe(260452)
    expect(shortcut.targetId).toBe(TARGET_NETWORK_UUID)
  })

  it('does not fetch when there are no network shortcuts', async () => {
    const result = await enrichShortcutsWithTargetSummaries([networkItem])

    expect(fetchNdexSummaries).not.toHaveBeenCalled()
    expect(result).toEqual([networkItem])
  })

  it('requests each target uuid once', async () => {
    ;(fetchNdexSummaries as any).mockResolvedValue([])

    await enrichShortcutsWithTargetSummaries([
      shortcutItem,
      { ...shortcutItem, uuid: 'another-shortcut' },
    ])

    expect(fetchNdexSummaries).toHaveBeenCalledTimes(1)
    expect(fetchNdexSummaries).toHaveBeenCalledWith(
      [TARGET_NETWORK_UUID],
      undefined,
      undefined,
    )
  })

  it('returns the original items (with targetId intact) when the summary fetch fails', async () => {
    ;(fetchNdexSummaries as any).mockRejectedValue(new Error('network error'))

    const result = await enrichShortcutsWithTargetSummaries([shortcutItem])

    expect(result[0]).toBe(shortcutItem)
    expect(result[0].targetId).toBe(TARGET_NETWORK_UUID)
  })
})
