import { act, renderHook } from '@testing-library/react'
import type Keycloak from 'keycloak-js'
import { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { KeycloakContext } from '@/boot/keycloak'
import { useSaveCurrentNetworkToNDEx } from './useSaveCurrentNetworkToNDEx'

const mocks = vi.hoisted(() => {
  // A zustand-like hook: callable with a selector, plus getState().
  const store = <T extends object>(state: T) =>
    Object.assign((selector: (s: T) => unknown) => selector(state), {
      getState: () => state,
    })
  return {
    store,
    summaries: {} as Record<
      string,
      { isNdex: boolean; modificationTime: number }
    >,
    addMessage: vi.fn(),
    saveNetworkOverwrite: vi.fn(),
    saveNetworkCopy: vi.fn(),
    trackEvent: vi.fn(),
  }
})

vi.mock('@/data/analytics/trackEvent', () => ({
  trackEvent: mocks.trackEvent,
}))
vi.mock('../external-api/ndex', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchNdexSummaries: vi.fn().mockResolvedValue([{ modificationTime: 100 }]),
  hasNdexEditPermission: vi.fn().mockResolvedValue(true),
}))
vi.mock('./stores/CredentialStore', () => ({
  useCredentialStore: mocks.store({ getToken: async () => 'token' }),
}))
vi.mock('./stores/MessageStore', () => ({
  useMessageStore: mocks.store({ addMessage: mocks.addMessage }),
}))
vi.mock('./stores/NetworkStore', () => ({
  useNetworkStore: mocks.store({ networks: new Map([['n1', { id: 'n1' }]]) }),
}))
vi.mock('./stores/NetworkSummaryStore', () => ({
  useNetworkSummaryStore: mocks.store({ summaries: mocks.summaries }),
}))
vi.mock('./stores/OpaqueAspectStore', () => ({
  useOpaqueAspectStore: mocks.store({ opaqueAspects: {} }),
}))
vi.mock('./stores/TableStore', () => ({
  useTableStore: mocks.store({
    tables: { n1: { nodeTable: 'nodes', edgeTable: 'edges' } },
  }),
}))
vi.mock('./stores/UiStateStore', () => ({
  useUiStateStore: mocks.store({ ui: { visualStyleOptions: {} } }),
}))
vi.mock('./stores/ViewModelStore', () => ({
  useViewModelStore: mocks.store({ getViewModel: () => ({ id: 'view' }) }),
}))
vi.mock('./stores/VisualStyleStore', () => ({
  useVisualStyleStore: mocks.store({ visualStyles: { n1: {} } }),
}))
vi.mock('./stores/WorkspaceStore', () => ({
  useWorkspaceStore: mocks.store({
    workspace: { currentNetworkId: 'n1' },
    setNetworkModified: vi.fn(),
  }),
}))
vi.mock('./useSaveCyNetworkToNDEx', () => ({
  useSaveCyNetworkToNDEx: () => mocks.saveNetworkOverwrite,
}))
vi.mock('./useSaveCyNetworkCopyToNDEx', () => ({
  useSaveCyNetworkCopyToNDEx: () => mocks.saveNetworkCopy,
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <KeycloakContext.Provider value={{ authenticated: true } as Keycloak}>
    {children}
  </KeycloakContext.Provider>
)

const save = async (): Promise<void> => {
  const { result } = renderHook(() => useSaveCurrentNetworkToNDEx(), {
    wrapper,
  })
  await act(() => result.current())
}

// The workspace row's save button bypasses the Data menu flows (#884).
describe('useSaveCurrentNetworkToNDEx analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.saveNetworkOverwrite.mockResolvedValue(undefined)
    mocks.saveNetworkCopy.mockResolvedValue('new-uuid')
  })

  it('counts an overwrite of an NDEx network', async () => {
    mocks.summaries.n1 = { isNdex: true, modificationTime: 100 }

    await save()

    expect(mocks.saveNetworkOverwrite).toHaveBeenCalledTimes(1)
    expect(mocks.trackEvent).toHaveBeenCalledTimes(1)
    expect(mocks.trackEvent).toHaveBeenCalledWith('ndex_save', {
      mode: 'overwrite',
    })
  })

  it('counts a local network saved to NDEx as a first upload', async () => {
    mocks.summaries.n1 = { isNdex: false, modificationTime: 100 }

    await save()

    expect(mocks.saveNetworkCopy).toHaveBeenCalledTimes(1)
    expect(mocks.trackEvent).toHaveBeenCalledTimes(1)
    expect(mocks.trackEvent).toHaveBeenCalledWith('ndex_save', {
      mode: 'first_upload',
    })
  })

  it('counts nothing when the save fails', async () => {
    mocks.summaries.n1 = { isNdex: true, modificationTime: 100 }
    mocks.saveNetworkOverwrite.mockRejectedValue(new Error('offline'))

    await save()

    expect(mocks.trackEvent).not.toHaveBeenCalled()
  })
})
