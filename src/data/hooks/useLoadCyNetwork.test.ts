import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getCyNetworkFromCx2 } from '../../models/CxModel/impl'
import { getCyNetworkFromDb, getNetworkSummaryFromDb } from '../db'
import { fetchNdexNetwork } from '../external-api/ndex'
import { useLoadCyNetwork } from './useLoadCyNetwork'

vi.mock('../db', () => ({
  getCyNetworkFromDb: vi.fn(),
  getNetworkSummaryFromDb: vi.fn(),
}))

vi.mock('../external-api/ndex', () => ({
  fetchNdexNetwork: vi.fn(),
}))

vi.mock('../../models/CxModel/impl', () => ({
  getCyNetworkFromCx2: vi.fn(),
}))

const NET_ID = 'net-1'
const cachedNetwork = { network: { id: NET_ID } } as any
const convertedNetwork = { network: { id: `${NET_ID}-from-cx2` } } as any

const loadCyNetwork = () =>
  renderHook(() => useLoadCyNetwork()).result.current

describe('useLoadCyNetwork', () => {
  beforeEach(() => {
    vi.mocked(getCyNetworkFromDb).mockReset()
    vi.mocked(getNetworkSummaryFromDb).mockReset()
    vi.mocked(fetchNdexNetwork).mockReset()
    vi.mocked(getCyNetworkFromCx2).mockReset()
  })

  it('returns the cached network without touching NDEx', async () => {
    vi.mocked(getCyNetworkFromDb).mockResolvedValue(cachedNetwork)

    const result = await loadCyNetwork()(NET_ID)

    expect(result).toBe(cachedNetwork)
    expect(fetchNdexNetwork).not.toHaveBeenCalled()
  })

  it('on cache miss, fetches from NDEx and converts the validated CX2', async () => {
    vi.mocked(getCyNetworkFromDb).mockRejectedValue(new Error('cache miss'))
    vi.mocked(getNetworkSummaryFromDb).mockResolvedValue({
      isNdex: true,
    } as any)
    const cx2 = [{ status: [] }] as any
    vi.mocked(fetchNdexNetwork).mockResolvedValue(cx2)
    vi.mocked(getCyNetworkFromCx2).mockReturnValue(convertedNetwork)

    const result = await loadCyNetwork()(NET_ID, 'token-123')

    expect(fetchNdexNetwork).toHaveBeenCalledWith(NET_ID, 'token-123')
    expect(getCyNetworkFromCx2).toHaveBeenCalledWith(NET_ID, cx2)
    expect(result).toBe(convertedNetwork)
  })

  it('also tries NDEx when no summary exists (unknown origin)', async () => {
    vi.mocked(getCyNetworkFromDb).mockRejectedValue(new Error('cache miss'))
    vi.mocked(getNetworkSummaryFromDb).mockResolvedValue(undefined as any)
    vi.mocked(fetchNdexNetwork).mockResolvedValue([] as any)
    vi.mocked(getCyNetworkFromCx2).mockReturnValue(convertedNetwork)

    await expect(loadCyNetwork()(NET_ID)).resolves.toBe(convertedNetwork)
  })

  // A local-only network missing from cache is unrecoverable data loss —
  // it must NOT fall through to NDEx (which cannot have it).
  it('throws for a local-only network missing from cache instead of asking NDEx', async () => {
    vi.mocked(getCyNetworkFromDb).mockRejectedValue(new Error('cache miss'))
    vi.mocked(getNetworkSummaryFromDb).mockResolvedValue({
      isNdex: false,
      name: 'My Local Network',
    } as any)

    await expect(loadCyNetwork()(NET_ID)).rejects.toThrow(
      /Local network "My Local Network".*cannot be retrieved from NDEx/,
    )
    expect(fetchNdexNetwork).not.toHaveBeenCalled()
  })

  it('propagates NDEx fetch failures', async () => {
    vi.mocked(getCyNetworkFromDb).mockRejectedValue(new Error('cache miss'))
    vi.mocked(getNetworkSummaryFromDb).mockResolvedValue({
      isNdex: true,
    } as any)
    vi.mocked(fetchNdexNetwork).mockRejectedValue(new Error('404 Not Found'))

    await expect(loadCyNetwork()(NET_ID)).rejects.toThrow('404 Not Found')
  })
})
