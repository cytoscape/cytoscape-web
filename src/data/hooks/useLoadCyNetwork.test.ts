import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCyNetworkFromCx2 } from '../../models/CxModel/impl'
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

const NET_ID = 'net-1'
const cachedNetwork = { network: { id: NET_ID } } as any
const convertedNetwork = { network: { id: `${NET_ID}-from-cx2` } } as any

const loadCyNetwork = () => renderHook(() => useLoadCyNetwork()).result.current

describe('useLoadCyNetwork', () => {
  const originalGetToken = useCredentialStore.getState().getToken

  beforeEach(() => {
    vi.mocked(getCyNetworkFromDb).mockReset()
    vi.mocked(getNetworkSummaryFromDb).mockReset()
    vi.mocked(fetchNdexNetwork).mockReset()
    vi.mocked(getCyNetworkFromCx2).mockReset()
  })

  afterEach(() => {
    useCredentialStore.setState({ getToken: originalGetToken })
    vi.clearAllMocks()
  })

  describe('cache and NDEx fallback', () => {
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

  // CredentialStore's auth gate blocks getToken until the boot SSO check
  // settles, so these assert the loader only reaches that gate when it
  // genuinely has to fetch — which is why a returning user's cached workspace
  // paints without waiting for SSO.
  describe('token resolution', () => {
    it('returns a cached network without waiting for a token', async () => {
      const getTokenSpy = vi.fn(
        // Never resolves: awaiting it would hang the test, proving cached
        // network content doesn't wait for the SSO check.
        () => new Promise<string>(() => undefined),
      )
      useCredentialStore.setState({ getToken: getTokenSpy })
      vi.mocked(getCyNetworkFromDb).mockResolvedValue(cachedNetwork)

      const result = await loadCyNetwork()(NET_ID)

      expect(result).toBe(cachedNetwork)
      expect(getTokenSpy).not.toHaveBeenCalled()
      expect(fetchNdexNetwork).not.toHaveBeenCalled()
    })

    it('lazily resolves the token from CredentialStore on a cache miss', async () => {
      const getTokenSpy = vi.fn().mockResolvedValue('lazy-token')
      useCredentialStore.setState({ getToken: getTokenSpy })
      vi.mocked(getCyNetworkFromDb).mockRejectedValue(new Error('cache miss'))
      vi.mocked(getNetworkSummaryFromDb).mockResolvedValue(undefined as any)
      vi.mocked(fetchNdexNetwork).mockResolvedValue([] as any)
      vi.mocked(getCyNetworkFromCx2).mockReturnValue(convertedNetwork)

      const result = await loadCyNetwork()(NET_ID)

      expect(getTokenSpy).toHaveBeenCalledTimes(1)
      expect(fetchNdexNetwork).toHaveBeenCalledWith(NET_ID, 'lazy-token')
      expect(result).toBe(convertedNetwork)
    })

    it('prefers an explicitly-passed access token over the store token', async () => {
      const getTokenSpy = vi.fn().mockResolvedValue('store-token')
      useCredentialStore.setState({ getToken: getTokenSpy })
      vi.mocked(getCyNetworkFromDb).mockRejectedValue(new Error('cache miss'))
      vi.mocked(getNetworkSummaryFromDb).mockResolvedValue(undefined as any)
      vi.mocked(fetchNdexNetwork).mockResolvedValue([] as any)
      vi.mocked(getCyNetworkFromCx2).mockReturnValue(convertedNetwork)

      await loadCyNetwork()(NET_ID, 'explicit-token')

      expect(getTokenSpy).not.toHaveBeenCalled()
      expect(fetchNdexNetwork).toHaveBeenCalledWith(NET_ID, 'explicit-token')
    })
  })
})
