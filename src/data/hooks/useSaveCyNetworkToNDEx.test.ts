import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  Network,
  NetworkSummary,
  NetworkView,
  Table,
  VisualStyle,
} from '../../models'
import { exportCyNetworkToCx2 } from '../../models/CxModel/impl'
import {
  fetchNdexSummaries,
  getNetworkValidationStatus,
  updateNdexNetwork,
} from '../external-api/ndex'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useSaveCyNetworkToNDEx } from './useSaveCyNetworkToNDEx'

// Store persistence must not hit IndexedDB
vi.mock('../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db')>()
  const mocked: Record<string, any> = { ...actual }
  for (const key of Object.keys(actual)) {
    if (key.startsWith('put') || key.startsWith('delete')) {
      mocked[key] = vi.fn().mockResolvedValue(undefined)
    }
  }
  return mocked
})

vi.mock('../external-api/ndex', () => ({
  fetchNdexSummaries: vi.fn(),
  getNetworkValidationStatus: vi.fn(),
  updateNdexNetwork: vi.fn(),
}))

vi.mock('../../models/CxModel/impl', () => ({
  exportCyNetworkToCx2: vi.fn(),
}))

const NET_ID = 'net-1'
const TOKEN = 'token-1'

const network = { id: NET_ID, nodes: [], edges: [] } as unknown as Network
const visualStyle = {} as VisualStyle
const summary = { externalId: NET_ID, name: 'Net' } as NetworkSummary
const nodeTable = { rows: new Map() } as unknown as Table
const edgeTable = { rows: new Map() } as unknown as Table
const viewModel = { id: NET_ID } as unknown as NetworkView
const exportedCx = [{ status: [] }]

// renderHook must run outside act(); the returned save function is then
// awaited inside act() because it updates the summary store.
const save = async (view: NetworkView | undefined): Promise<void> => {
  const saveFn = renderHook(() => useSaveCyNetworkToNDEx()).result.current
  await act(() =>
    saveFn(
      TOKEN,
      NET_ID,
      network,
      visualStyle,
      summary,
      nodeTable,
      edgeTable,
      view,
    ),
  )
}

describe('useSaveCyNetworkToNDEx', () => {
  beforeEach(() => {
    vi.mocked(updateNdexNetwork).mockReset().mockResolvedValue(undefined)
    vi.mocked(getNetworkValidationStatus).mockReset().mockResolvedValue(true)
    vi.mocked(fetchNdexSummaries).mockReset().mockResolvedValue([])
    vi.mocked(exportCyNetworkToCx2)
      .mockReset()
      .mockReturnValue(exportedCx as any)
    act(() => {
      useNetworkSummaryStore.getState().deleteAll()
      useNetworkSummaryStore.getState().add(NET_ID, summary)
    })
  })

  it('rejects when no view model is available, before contacting NDEx', async () => {
    await expect(save(undefined)).rejects.toThrow(
      'Could not find the current network view model.',
    )
    expect(updateNdexNetwork).not.toHaveBeenCalled()
  })

  it('exports the network as CX2 and pushes it to NDEx', async () => {
    await save(viewModel)

    expect(exportCyNetworkToCx2).toHaveBeenCalledWith(
      expect.objectContaining({
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [viewModel],
      }),
      summary,
    )
    expect(updateNdexNetwork).toHaveBeenCalledWith(NET_ID, exportedCx, TOKEN)
  })

  it('rejects when NDEx marks the uploaded network invalid', async () => {
    vi.mocked(getNetworkValidationStatus).mockResolvedValue(false)

    await expect(save(viewModel)).rejects.toThrow(
      'The network is rejected by NDEx',
    )
  })

  it('syncs the modification time from NDEx into the summary store', async () => {
    const modificationTime = new Date('2026-07-22T00:00:00Z')
    vi.mocked(fetchNdexSummaries).mockResolvedValue([
      { externalId: NET_ID, modificationTime } as unknown as NetworkSummary,
    ])

    await save(viewModel)

    expect(
      useNetworkSummaryStore.getState().summaries[NET_ID].modificationTime,
    ).toEqual(modificationTime)
  })

  it('leaves the summary untouched when NDEx returns no updated summary', async () => {
    const before = useNetworkSummaryStore.getState().summaries[NET_ID]

    await save(viewModel)

    expect(useNetworkSummaryStore.getState().summaries[NET_ID]).toEqual(before)
  })
})
