import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NetworkSummary } from '../../models/NetworkSummaryModel'
import { getNetworkSummariesFromDb, putNetworkSummaryToDb } from '../db'
import { fetchNdexSummaries } from '../external-api/ndex'
import { useCredentialStore } from './stores/CredentialStore'
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

const STORE_TOKEN = 'store-token'

describe('useLoadNetworkSummaries', () => {
  const originalGetToken = useCredentialStore.getState().getToken

  beforeEach(() => {
    vi.mocked(getNetworkSummariesFromDb).mockReset().mockResolvedValue([])
    vi.mocked(putNetworkSummaryToDb).mockReset().mockResolvedValue(undefined)
    vi.mocked(fetchNdexSummaries).mockReset().mockResolvedValue([])
    // Deterministic default; the token-resolution suite overrides per test.
    useCredentialStore.setState({
      getToken: vi.fn().mockResolvedValue(STORE_TOKEN),
    })
  })

  afterEach(() => {
    useCredentialStore.setState({ getToken: originalGetToken })
    vi.clearAllMocks()
  })

  describe('cache and NDEx fallback', () => {
    it('serves fully cached requests without fetching anything from NDEx', async () => {
      vi.mocked(getNetworkSummariesFromDb).mockResolvedValue([
        summary('a'),
        summary('b'),
      ])

      const result = await loadSummaries()(['a', 'b'])

      expect(Object.keys(result).sort()).toEqual(['a', 'b'])
      // Not "called with an empty list": the loader skips the request entirely
      // when nothing is missing, which is also what keeps it off the auth gate.
      expect(fetchNdexSummaries).not.toHaveBeenCalled()
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
      expect(fetchNdexSummaries).toHaveBeenLastCalledWith(['a'], STORE_TOKEN)
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

  // CredentialStore's auth gate blocks getToken until the boot SSO check
  // settles. The loader must only reach that gate when it genuinely has to
  // fetch — that is what lets a returning user's cached workspace paint
  // without waiting for SSO.
  describe('token resolution', () => {
    it('resolves fully-cached summaries without waiting for a token', async () => {
      const getTokenSpy = vi.fn(
        // A token that never resolves: if the loader awaited it, the test
        // would time out — proving cached reads don't wait for the SSO check.
        () => new Promise<string>(() => undefined),
      )
      useCredentialStore.setState({ getToken: getTokenSpy })
      vi.mocked(getNetworkSummariesFromDb).mockResolvedValue([
        summary('a'),
        summary('b'),
      ])

      const result = await loadSummaries()(['a', 'b'])

      expect(Object.keys(result).sort()).toEqual(['a', 'b'])
      expect(getTokenSpy).not.toHaveBeenCalled()
      expect(fetchNdexSummaries).not.toHaveBeenCalled()
    })

    it('lazily resolves the token from CredentialStore on a cache miss', async () => {
      const getTokenSpy = vi.fn().mockResolvedValue('lazy-token')
      useCredentialStore.setState({ getToken: getTokenSpy })
      vi.mocked(getNetworkSummariesFromDb).mockResolvedValue([])
      vi.mocked(fetchNdexSummaries).mockResolvedValue([summary('a')])

      const result = await loadSummaries()(['a'])

      expect(getTokenSpy).toHaveBeenCalledTimes(1)
      expect(fetchNdexSummaries).toHaveBeenCalledWith(['a'], 'lazy-token')
      expect(result.a).toEqual(summary('a'))
    })

    it('prefers an explicitly-passed access token over the store token', async () => {
      const getTokenSpy = vi.fn().mockResolvedValue(STORE_TOKEN)
      useCredentialStore.setState({ getToken: getTokenSpy })
      vi.mocked(getNetworkSummariesFromDb).mockResolvedValue([])
      vi.mocked(fetchNdexSummaries).mockResolvedValue([summary('a')])

      await loadSummaries()(['a'], 'explicit-token')

      expect(getTokenSpy).not.toHaveBeenCalled()
      expect(fetchNdexSummaries).toHaveBeenCalledWith(['a'], 'explicit-token')
    })
  })
})
