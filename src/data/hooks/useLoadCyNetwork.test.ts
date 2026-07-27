import { afterEach, describe, expect, it, vi } from 'vitest'

import { getCyNetworkFromCx2 } from '../../models/CxModel/impl'
import { CyNetwork } from '../../models/CyNetworkModel'
import { getCyNetworkFromDb, getNetworkSummaryFromDb } from '../db'
import { fetchNdexNetwork } from '../external-api/ndex'
import { useCredentialStore } from './stores/CredentialStore'
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

const CACHED_NETWORK = { network: { id: 'net-1' } } as unknown as CyNetwork

describe('useLoadCyNetwork', () => {
  const originalGetToken = useCredentialStore.getState().getToken

  afterEach(() => {
    useCredentialStore.setState({ getToken: originalGetToken })
    vi.clearAllMocks()
  })

  it('returns a cached network without waiting for a token', async () => {
    const getTokenSpy = vi.fn(
      // Never resolves: awaiting it would hang the test, proving cached
      // network content doesn't wait for the SSO check.
      () => new Promise<string>(() => undefined),
    )
    useCredentialStore.setState({ getToken: getTokenSpy })
    vi.mocked(getCyNetworkFromDb).mockResolvedValue(CACHED_NETWORK)

    const load = useLoadCyNetwork()
    const result = await load('net-1')

    expect(result).toBe(CACHED_NETWORK)
    expect(getTokenSpy).not.toHaveBeenCalled()
    expect(fetchNdexNetwork).not.toHaveBeenCalled()
  })

  it('lazily resolves the token from CredentialStore on a cache miss', async () => {
    const getTokenSpy = vi.fn().mockResolvedValue('lazy-token')
    useCredentialStore.setState({ getToken: getTokenSpy })
    vi.mocked(getCyNetworkFromDb).mockRejectedValue(new Error('cache miss'))
    vi.mocked(getNetworkSummaryFromDb).mockResolvedValue(undefined)
    vi.mocked(fetchNdexNetwork).mockResolvedValue({} as any)
    vi.mocked(getCyNetworkFromCx2).mockReturnValue(CACHED_NETWORK)

    const load = useLoadCyNetwork()
    const result = await load('net-1')

    expect(getTokenSpy).toHaveBeenCalledTimes(1)
    expect(fetchNdexNetwork).toHaveBeenCalledWith('net-1', 'lazy-token')
    expect(result).toBe(CACHED_NETWORK)
  })

  it('prefers an explicitly-passed access token over the store token', async () => {
    const getTokenSpy = vi.fn().mockResolvedValue('store-token')
    useCredentialStore.setState({ getToken: getTokenSpy })
    vi.mocked(getCyNetworkFromDb).mockRejectedValue(new Error('cache miss'))
    vi.mocked(getNetworkSummaryFromDb).mockResolvedValue(undefined)
    vi.mocked(fetchNdexNetwork).mockResolvedValue({} as any)
    vi.mocked(getCyNetworkFromCx2).mockReturnValue(CACHED_NETWORK)

    const load = useLoadCyNetwork()
    await load('net-1', 'explicit-token')

    expect(getTokenSpy).not.toHaveBeenCalled()
    expect(fetchNdexNetwork).toHaveBeenCalledWith('net-1', 'explicit-token')
  })
})
