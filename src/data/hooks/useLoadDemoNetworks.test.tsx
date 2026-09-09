import { act, renderHook } from '@testing-library/react'
import { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppConfigContext, defaultAppConfig } from '../../AppConfigContext'
import { NetworkSummary } from '../../models'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'
import { useLoadDemoNetworks } from './useLoadDemoNetworks'

// Mock the database module so store persistence does not hit IndexedDB
vi.mock('../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db')>()
  const mocked: Record<string, any> = { ...actual }
  for (const key of Object.keys(actual)) {
    if (
      key.startsWith('put') ||
      key.startsWith('delete') ||
      key.startsWith('clear')
    ) {
      mocked[key] = vi.fn().mockResolvedValue(undefined)
    }
  }
  return mocked
})

const { navigateToNetwork, fetchNdexSummaries } = vi.hoisted(() => ({
  navigateToNetwork: vi.fn(),
  fetchNdexSummaries: vi.fn(),
}))

vi.mock('./navigation/useUrlNavigation', () => ({
  useUrlNavigation: () => ({ navigateToNetwork }),
}))

vi.mock('../external-api/ndex', () => ({
  fetchNdexSummaries,
}))

vi.mock('./stores/CredentialStore', () => ({
  useCredentialStore: (selector: (state: any) => unknown) =>
    selector({ getToken: async () => 'token' }),
}))

const IDS = ['sample-1', 'sample-2']

const summaryFor = (id: string): NetworkSummary =>
  ({ externalId: id, name: `Network ${id}` }) as NetworkSummary

const wrapper = ({ children }: { children: ReactNode }) => (
  <AppConfigContext.Provider value={{ ...defaultAppConfig, testNetworks: IDS }}>
    {children}
  </AppConfigContext.Provider>
)

describe('useLoadDemoNetworks', () => {
  beforeEach(() => {
    navigateToNetwork.mockReset()
    fetchNdexSummaries.mockReset()
    useNetworkSummaryStore.setState({ summaries: {} } as any)
    useWorkspaceStore.setState({
      workspace: {
        ...useWorkspaceStore.getState().workspace,
        id: 'ws-1',
        currentNetworkId: '',
        networkIds: [],
      },
    })
  })

  it('adds the sample networks, selects the first and navigates to it', async () => {
    fetchNdexSummaries.mockResolvedValue(IDS.map(summaryFor))
    const { result } = renderHook(() => useLoadDemoNetworks(), { wrapper })

    expect(result.current.status).toBe('idle')

    let ok = false
    await act(async () => {
      ok = await result.current.loadDemoNetworks()
    })

    expect(ok).toBe(true)
    expect(result.current.status).toBe('idle')
    expect(result.current.errorMessage).toBeNull()
    expect(fetchNdexSummaries).toHaveBeenCalledWith(IDS, 'token')

    const { workspace } = useWorkspaceStore.getState()
    expect(workspace.networkIds).toEqual(IDS)
    expect(workspace.currentNetworkId).toBe('sample-1')
    expect(
      Object.keys(useNetworkSummaryStore.getState().summaries).sort(),
    ).toEqual([...IDS].sort())
    expect(navigateToNetwork).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'ws-1', networkId: 'sample-1' }),
    )
  })

  it('reports a failure without touching the workspace', async () => {
    fetchNdexSummaries.mockRejectedValue(new Error('NDEx unreachable'))
    const { result } = renderHook(() => useLoadDemoNetworks(), { wrapper })

    let ok = true
    await act(async () => {
      ok = await result.current.loadDemoNetworks()
    })

    expect(ok).toBe(false)
    expect(result.current.status).toBe('error')
    expect(result.current.errorMessage).toBe('NDEx unreachable')
    expect(useWorkspaceStore.getState().workspace.networkIds).toEqual([])
    expect(navigateToNetwork).not.toHaveBeenCalled()
  })

  it('clears the error once a retry succeeds', async () => {
    fetchNdexSummaries.mockRejectedValueOnce(new Error('NDEx unreachable'))
    fetchNdexSummaries.mockResolvedValueOnce(IDS.map(summaryFor))
    const { result } = renderHook(() => useLoadDemoNetworks(), { wrapper })

    await act(async () => {
      await result.current.loadDemoNetworks()
    })
    expect(result.current.status).toBe('error')

    await act(async () => {
      await result.current.loadDemoNetworks()
    })
    expect(result.current.status).toBe('idle')
    expect(result.current.errorMessage).toBeNull()
  })

  it('fails cleanly when no sample networks are configured', async () => {
    const emptyWrapper = ({ children }: { children: ReactNode }) => (
      <AppConfigContext.Provider
        value={{ ...defaultAppConfig, testNetworks: [] }}
      >
        {children}
      </AppConfigContext.Provider>
    )
    const { result } = renderHook(() => useLoadDemoNetworks(), {
      wrapper: emptyWrapper,
    })

    await act(async () => {
      await result.current.loadDemoNetworks()
    })

    expect(result.current.status).toBe('error')
    expect(fetchNdexSummaries).not.toHaveBeenCalled()
    expect(navigateToNetwork).not.toHaveBeenCalled()
  })
})
