// @vitest-environment node
import {
  NDExAuthError,
  NDExNetworkError,
  NDExNotFoundError,
} from '@js4cytoscape/ndex-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchNdexSummaries } from '@/data/external-api/ndex/networkSummary'
import { NetworkSummary } from '@/models/NetworkSummaryModel'

import { EMBED_MAX_ELEMENTS, loadEmbedNetwork } from './loadEmbedNetwork'
import { fetchCx2, NdexRequestError } from './ndexRequests'

vi.mock('./ndexRequests', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./ndexRequests')>()),
  fetchCx2: vi.fn(),
}))
vi.mock('@/data/external-api/ndex/networkSummary', () => ({
  fetchNdexSummaries: vi.fn(),
}))

const summaryWith = (nodeCount: number, edgeCount: number): NetworkSummary =>
  ({ name: 'n', nodeCount, edgeCount }) as NetworkSummary

describe('loadEmbedNetwork', () => {
  beforeEach(() => {
    vi.mocked(fetchCx2).mockReset()
    vi.mocked(fetchCx2).mockReturnValue(new Promise(() => undefined))
    vi.mocked(fetchNdexSummaries).mockReset()
  })

  const cx2Signal = (): AbortSignal =>
    vi.mocked(fetchCx2).mock.calls[0][1]!.signal!

  it('returns not-found when NDEx has no summary', async () => {
    vi.mocked(fetchNdexSummaries).mockResolvedValue([])
    expect(await loadEmbedNetwork('x')).toEqual({ kind: 'not-found' })
    expect(cx2Signal().aborted).toBe(true)
  })

  it('returns not-found when the CX2 request answers 403', async () => {
    vi.mocked(fetchNdexSummaries).mockResolvedValue([summaryWith(1, 0)])
    vi.mocked(fetchCx2).mockRejectedValue(new NdexRequestError(403, 'no'))
    expect(await loadEmbedNetwork('x')).toEqual({ kind: 'not-found' })
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

  it('requests the CX2 with the summary, and aborts it above the cap', async () => {
    const summary = summaryWith(EMBED_MAX_ELEMENTS, 1)
    vi.mocked(fetchNdexSummaries).mockResolvedValue([summary])
    expect(await loadEmbedNetwork('x')).toEqual({ kind: 'too-large', summary })
    expect(fetchCx2).toHaveBeenCalledWith('x', expect.anything())
    expect(cx2Signal().aborted).toBe(true)
  })

  it('returns invalid for CX2 that fails validation', async () => {
    vi.mocked(fetchNdexSummaries).mockResolvedValue([summaryWith(1, 0)])
    vi.mocked(fetchCx2).mockResolvedValue([] as any)
    expect(await loadEmbedNetwork('x')).toMatchObject({ kind: 'invalid' })
  })
})
