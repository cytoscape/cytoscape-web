import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NetworkSummary } from '../../models/NetworkSummaryModel'
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

const summaryFor = (id: string): NetworkSummary =>
  ({ externalId: id, name: `network-${id}` }) as NetworkSummary

describe('useLoadNetworkSummaries', () => {
  const originalGetToken = useCredentialStore.getState().getToken

  beforeEach(() => {
    vi.mocked(putNetworkSummaryToDb).mockResolvedValue(undefined)
  })

  afterEach(() => {
    useCredentialStore.setState({ getToken: originalGetToken })
    vi.clearAllMocks()
  })

  it('resolves fully-cached summaries without waiting for a token', async () => {
    const getTokenSpy = vi.fn(
      // A token that never resolves: if the loader awaited it, the test
      // would time out — proving cached reads don't wait for the SSO check.
      () => new Promise<string>(() => undefined),
    )
    useCredentialStore.setState({ getToken: getTokenSpy })
    vi.mocked(getNetworkSummariesFromDb).mockResolvedValue([
      summaryFor('a'),
      summaryFor('b'),
    ])

    const load = useLoadNetworkSummaries()
    const result = await load(['a', 'b'])

    expect(Object.keys(result)).toEqual(['a', 'b'])
    expect(getTokenSpy).not.toHaveBeenCalled()
    expect(fetchNdexSummaries).not.toHaveBeenCalled()
  })

  it('lazily resolves the token from CredentialStore on a cache miss', async () => {
    const getTokenSpy = vi.fn().mockResolvedValue('lazy-token')
    useCredentialStore.setState({ getToken: getTokenSpy })
    vi.mocked(getNetworkSummariesFromDb).mockResolvedValue([])
    vi.mocked(fetchNdexSummaries).mockResolvedValue([summaryFor('a')])

    const load = useLoadNetworkSummaries()
    const result = await load(['a'])

    expect(getTokenSpy).toHaveBeenCalledTimes(1)
    expect(fetchNdexSummaries).toHaveBeenCalledWith(['a'], 'lazy-token')
    expect(result.a).toEqual(summaryFor('a'))
  })

  it('prefers an explicitly-passed access token over the store token', async () => {
    const getTokenSpy = vi.fn().mockResolvedValue('store-token')
    useCredentialStore.setState({ getToken: getTokenSpy })
    vi.mocked(getNetworkSummariesFromDb).mockResolvedValue([])
    vi.mocked(fetchNdexSummaries).mockResolvedValue([summaryFor('a')])

    const load = useLoadNetworkSummaries()
    await load(['a'], 'explicit-token')

    expect(getTokenSpy).not.toHaveBeenCalled()
    expect(fetchNdexSummaries).toHaveBeenCalledWith(['a'], 'explicit-token')
  })
})
