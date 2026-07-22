import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NetworkSummary } from '../../models/NetworkSummaryModel'
import { getNetworkSummariesFromDb, putNetworkSummaryToDb } from '../db'
import { fetchNdexSummaries } from '../external-api/ndex'
import { useLoadNetworkSummaries } from './useLoadNetworkSummaries'

vi.mock('../db', () => ({
  getNetworkSummariesFromDb: vi.fn(),
  putNetworkSummaryToDb: vi.fn(),
}))

vi.mock('../external-api/ndex', () => ({
  fetchNdexSummaries: vi.fn(),
}))

const summary = (externalId: string): NetworkSummary =>
  ({ externalId, name: `Network ${externalId}` }) as NetworkSummary

const loadSummaries = () =>
  renderHook(() => useLoadNetworkSummaries()).result.current

describe('useLoadNetworkSummaries', () => {
  beforeEach(() => {
    vi.mocked(getNetworkSummariesFromDb).mockReset().mockResolvedValue([])
    vi.mocked(putNetworkSummaryToDb).mockReset().mockResolvedValue(undefined)
    vi.mocked(fetchNdexSummaries).mockReset().mockResolvedValue([])
  })

  it('serves fully cached requests without fetching anything from NDEx', async () => {
    vi.mocked(getNetworkSummariesFromDb).mockResolvedValue([
      summary('a'),
      summary('b'),
    ])

    const result = await loadSummaries()(['a', 'b'])

    expect(Object.keys(result).sort()).toEqual(['a', 'b'])
    expect(fetchNdexSummaries).toHaveBeenCalledWith([], undefined)
    expect(putNetworkSummaryToDb).not.toHaveBeenCalled()
  })

  it('fetches only the non-cached IDs from NDEx and saves them to the cache', async () => {
    // Dexie bulkGet returns undefined holes for missing keys
    vi.mocked(getNetworkSummariesFromDb).mockResolvedValue([
      summary('a'),
      undefined as any,
    ])
    vi.mocked(fetchNdexSummaries).mockResolvedValue([summary('b')])

    const result = await loadSummaries()(['a', 'b'], 'token-1')

    expect(fetchNdexSummaries).toHaveBeenCalledWith(['b'], 'token-1')
    expect(putNetworkSummaryToDb).toHaveBeenCalledWith(summary('b'))
    expect(Object.keys(result).sort()).toEqual(['a', 'b'])
  })

  it('accepts a single ID and de-duplicates repeated IDs', async () => {
    vi.mocked(fetchNdexSummaries).mockResolvedValue([summary('a')])

    const single = await loadSummaries()('a')
    expect(single.a).toEqual(summary('a'))

    await loadSummaries()(['a', 'a', 'a'])
    expect(fetchNdexSummaries).toHaveBeenLastCalledWith(['a'], undefined)
  })

  it('omits IDs that neither the cache nor NDEx could resolve', async () => {
    vi.mocked(getNetworkSummariesFromDb).mockResolvedValue([undefined as any])
    vi.mocked(fetchNdexSummaries).mockResolvedValue([undefined as any])

    const result = await loadSummaries()(['ghost'])

    expect(result).toEqual({})
    expect(putNetworkSummaryToDb).not.toHaveBeenCalled()
  })

  it('propagates NDEx failures', async () => {
    vi.mocked(getNetworkSummariesFromDb).mockResolvedValue([undefined as any])
    vi.mocked(fetchNdexSummaries).mockRejectedValue(new Error('NDEx is down'))

    await expect(loadSummaries()(['a'])).rejects.toThrow('NDEx is down')
  })
})
