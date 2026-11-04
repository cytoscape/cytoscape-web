// @vitest-environment node
import {
  NDExAuthError,
  NDExNetworkError,
  NDExNotFoundError,
} from '@js4cytoscape/ndex-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchNdexNetwork } from '@/data/external-api/ndex/network'
import { fetchNdexSummaries } from '@/data/external-api/ndex/networkSummary'
import { NetworkSummary } from '@/models/NetworkSummaryModel'

import { EMBED_MAX_ELEMENTS, loadEmbedNetwork } from './loadEmbedNetwork'

vi.mock('@/data/external-api/ndex/network', () => ({
  fetchNdexNetwork: vi.fn(),
}))
vi.mock('@/data/external-api/ndex/networkSummary', () => ({
  fetchNdexSummaries: vi.fn(),
}))

const summaryWith = (nodeCount: number, edgeCount: number): NetworkSummary =>
  ({ name: 'n', nodeCount, edgeCount }) as NetworkSummary

describe('loadEmbedNetwork', () => {
  beforeEach(() => {
    vi.mocked(fetchNdexNetwork).mockReset()
    vi.mocked(fetchNdexSummaries).mockReset()
  })

  it('returns not-found when NDEx has no summary', async () => {
    vi.mocked(fetchNdexSummaries).mockResolvedValue([])
    expect(await loadEmbedNetwork('x')).toEqual({ kind: 'not-found' })
    expect(fetchNdexNetwork).not.toHaveBeenCalled()
  })

  it('returns not-found for a 404 or a private network', async () => {
    vi.mocked(fetchNdexSummaries).mockRejectedValueOnce(new NDExNotFoundError())
    expect(await loadEmbedNetwork('x')).toEqual({ kind: 'not-found' })
    vi.mocked(fetchNdexSummaries).mockRejectedValueOnce(new NDExAuthError())
    expect(await loadEmbedNetwork('x')).toEqual({ kind: 'not-found' })
  })

  it('returns unreachable when the request fails', async () => {
    vi.mocked(fetchNdexSummaries).mockRejectedValue(
      new NDExNetworkError('Network Error'),
    )
    expect(await loadEmbedNetwork('x')).toMatchObject({ kind: 'unreachable' })
  })

  it('skips the CX2 download above the element cap', async () => {
    const summary = summaryWith(EMBED_MAX_ELEMENTS, 1)
    vi.mocked(fetchNdexSummaries).mockResolvedValue([summary])
    expect(await loadEmbedNetwork('x')).toEqual({ kind: 'too-large', summary })
    expect(fetchNdexNetwork).not.toHaveBeenCalled()
  })

  it('returns invalid for CX2 that fails validation', async () => {
    vi.mocked(fetchNdexSummaries).mockResolvedValue([summaryWith(1, 0)])
    vi.mocked(fetchNdexNetwork).mockResolvedValue([] as any)
    expect(await loadEmbedNetwork('x')).toMatchObject({ kind: 'invalid' })
  })
})
