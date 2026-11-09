import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkSummaryStore } from '@/data/hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import type { NetworkSummary } from '@/models/NetworkSummaryModel'
import { runEmbedBoot, statusForSummaryError } from './runEmbedBoot'

const putNetworkSummaryToDb = vi.fn()
vi.mock('../../data/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../data/db')>()),
  putNetworkSummaryToDb: (...args: unknown[]) => putNetworkSummaryToDb(...args),
}))

const fetchNdexSummaries = vi.fn()
vi.mock('../../data/external-api/ndex', () => ({
  fetchNdexSummaries: (...args: unknown[]) => fetchNdexSummaries(...args),
}))

const NET = 'net-1'
const LIMITS = {
  maxEdgeCountThreshold: 100,
  maxNetworkElementsThreshold: 150,
  maxNetworkFileSize: 1_000_000,
}

const summaryOf = (nodeCount: number, edgeCount: number): NetworkSummary =>
  ({
    externalId: NET,
    name: 'MuSIC',
    nodeCount,
    edgeCount,
    cx2FileSize: 1000,
  }) as unknown as NetworkSummary

/** An NDEx client error, as `@js4cytoscape/ndex-client` throws it */
const ndexError = (statusCode: number): Error =>
  Object.assign(new Error(`HTTP ${statusCode}`), { statusCode })

describe('runEmbedBoot', () => {
  beforeEach(() => {
    fetchNdexSummaries.mockReset()
    putNetworkSummaryToDb.mockReset()
    useNetworkSummaryStore.setState({ summaries: {} } as any)
  })

  it('publishes a workspace that holds only the network', async () => {
    fetchNdexSummaries.mockResolvedValue([summaryOf(10, 20)])

    const status = await runEmbedBoot({ networkId: NET, limits: LIMITS })

    expect(status.kind).toBe('ready')
    const { workspace } = useWorkspaceStore.getState()
    expect(workspace.networkIds).toEqual([NET])
    expect(workspace.currentNetworkId).toBe(NET)
    expect(useNetworkSummaryStore.getState().summaries[NET]).toBeDefined()
    expect(putNetworkSummaryToDb).toHaveBeenCalledTimes(1)
  })

  it('sends the access key with the summary request', async () => {
    fetchNdexSummaries.mockResolvedValue([summaryOf(10, 20)])

    await runEmbedBoot({ networkId: NET, accessKey: 'k1', limits: LIMITS })

    expect(fetchNdexSummaries).toHaveBeenCalledWith(
      NET,
      undefined,
      undefined,
      'k1',
    )
  })

  it('refuses a network over the size limits before loading it', async () => {
    fetchNdexSummaries.mockResolvedValue([summaryOf(100, 200)])

    const status = await runEmbedBoot({ networkId: NET, limits: LIMITS })

    expect(status).toEqual({
      kind: 'too-large',
      name: 'MuSIC',
      elementCount: 300,
    })
    expect(putNetworkSummaryToDb).not.toHaveBeenCalled()
  })

  it('reports a network NDEx leaves out of its answer', async () => {
    fetchNdexSummaries.mockResolvedValue([])

    expect(await runEmbedBoot({ networkId: NET, limits: LIMITS })).toEqual({
      kind: 'not-found',
    })
    expect(
      await runEmbedBoot({ networkId: NET, accessKey: 'k1', limits: LIMITS }),
    ).toEqual({ kind: 'key-rejected' })
  })

  it('maps a failed request to a status', async () => {
    fetchNdexSummaries.mockRejectedValue(ndexError(500))

    expect(await runEmbedBoot({ networkId: NET, limits: LIMITS })).toEqual({
      kind: 'unreachable',
    })
  })
})

describe('statusForSummaryError', () => {
  it.each([
    [404, false, 'not-found'],
    [404, true, 'not-found'],
    [401, false, 'not-found'],
    [403, false, 'not-found'],
    [401, true, 'key-rejected'],
    [403, true, 'key-rejected'],
    [500, false, 'unreachable'],
  ] as const)('status %i with key %s is %s', (status, hasKey, kind) => {
    expect(statusForSummaryError(ndexError(status), hasKey).kind).toBe(kind)
  })

  it('treats an error with no status as unreachable', () => {
    expect(
      statusForSummaryError(new TypeError('Failed to fetch'), false),
    ).toEqual({ kind: 'unreachable' })
  })
})
