import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  TimeOutErrorIndicator,
  TimeOutErrorMessage,
} from '../../../data/external-api/ndex'
import {
  SaveNetworkCopyToNDExFlow,
  useSaveNetworkCopyToNDExFlow,
} from './useSaveNetworkCopyToNDExFlow'

const mocks = vi.hoisted(() => {
  // A zustand-like hook: callable with a selector, plus getState().
  const store = <T extends object>(state: T) =>
    Object.assign((selector: (s: T) => unknown) => selector(state), {
      getState: () => state,
    })
  const state = {
    validationResults: {} as Record<
      string,
      { isValid: boolean; warnings: string[]; version: string }
    >,
  }
  return {
    store,
    state,
    addMessage: vi.fn(),
    getToken: vi.fn(),
    addSummary: vi.fn(),
    addNetworkIds: vi.fn(),
    setCurrentNetworkId: vi.fn(),
    navigateToNetwork: vi.fn(),
    saveNetworkCopy: vi.fn(),
    loadNetworkSummaries: vi.fn(),
  }
})

vi.mock('../../../data/hooks/stores/CredentialStore', () => ({
  useCredentialStore: mocks.store({ getToken: mocks.getToken }),
}))
vi.mock('../../../data/hooks/stores/MessageStore', () => ({
  useMessageStore: mocks.store({ addMessage: mocks.addMessage }),
}))
vi.mock('../../../data/hooks/stores/NetworkStore', () => ({
  useNetworkStore: mocks.store({ networks: new Map([['n1', { id: 'n1' }]]) }),
}))
vi.mock('../../../data/hooks/stores/NetworkSummaryStore', () => ({
  useNetworkSummaryStore: mocks.store({
    summaries: { n1: { name: 'N1' } },
    add: mocks.addSummary,
  }),
}))
vi.mock('../../../data/hooks/stores/OpaqueAspectStore', () => ({
  useOpaqueAspectStore: mocks.store({ opaqueAspects: {} }),
}))
vi.mock('../../../data/hooks/stores/TableStore', () => ({
  useTableStore: mocks.store({
    tables: { n1: { nodeTable: 'nodes', edgeTable: 'edges' } },
  }),
}))
vi.mock('../../../data/hooks/stores/UiStateStore', () => ({
  useUiStateStore: mocks.store({ ui: { visualStyleOptions: {} } }),
}))
vi.mock('../../../data/hooks/stores/ViewModelStore', () => ({
  useViewModelStore: mocks.store({ getViewModel: () => undefined }),
}))
vi.mock('../../../data/hooks/stores/VisualStyleStore', () => ({
  useVisualStyleStore: mocks.store({ visualStyles: {} }),
}))
vi.mock('../../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: mocks.store({
    workspace: { id: 'w1', currentNetworkId: 'n1' },
    addNetworkIds: mocks.addNetworkIds,
    setCurrentNetworkId: mocks.setCurrentNetworkId,
  }),
}))
vi.mock('../../HierarchyViewer/store/HcxValidatorStore', () => ({
  useHcxValidatorStore: mocks.store(mocks.state),
}))
vi.mock('../../../data/hooks/navigation/useUrlNavigation', () => ({
  useUrlNavigation: () => ({ navigateToNetwork: mocks.navigateToNetwork }),
}))
vi.mock('../../../data/hooks/useSaveCyNetworkCopyToNDEx', () => ({
  useSaveCyNetworkCopyToNDEx: () => mocks.saveNetworkCopy,
}))
vi.mock('../../../data/hooks/useLoadNetworkSummaries', () => ({
  useLoadNetworkSummaries: () => mocks.loadNetworkSummaries,
}))

let flow: SaveNetworkCopyToNDExFlow
const Harness = () => {
  flow = useSaveNetworkCopyToNDExFlow()
  return <>{flow.dialogs}</>
}

const hcxDialog = () => screen.queryByTestId('hcx-validation-save-dialog')

describe('useSaveNetworkCopyToNDExFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getToken.mockResolvedValue('token')
    mocks.state.validationResults = {}
    mocks.saveNetworkCopy.mockResolvedValue('copy-uuid')
    mocks.loadNetworkSummaries.mockResolvedValue({
      'copy-uuid': { name: 'Copy' },
    })
  })

  it('saves a copy of the current network and opens it', async () => {
    render(<Harness />)

    act(() => flow.start())

    await waitFor(() =>
      expect(mocks.setCurrentNetworkId).toHaveBeenCalledWith('copy-uuid'),
    )
    // The last argument keeps the original network.
    expect(mocks.saveNetworkCopy.mock.calls[0][0]).toBe('token')
    expect(mocks.saveNetworkCopy.mock.calls[0].at(-1)).toBe(false)
    expect(mocks.addNetworkIds).toHaveBeenCalledWith('copy-uuid')
    expect(mocks.navigateToNetwork).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'w1', networkId: 'copy-uuid' }),
    )
    expect(mocks.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' }),
    )
    expect(hcxDialog()).toBeNull()
  })

  it('asks first when the network is invalid HCX, and saves on submit', async () => {
    mocks.state.validationResults = {
      n1: { isValid: false, warnings: ['bad'], version: '0.1' },
    }
    render(<Harness />)

    act(() => flow.start())
    await waitFor(() => expect(hcxDialog()).not.toBeNull())
    expect(mocks.saveNetworkCopy).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('hcx-validation-save-dialog-submit'))

    // The dialog must close on submit: it no longer unmounts with a menu row.
    await waitFor(() => expect(hcxDialog()).toBeNull())
    await waitFor(() => expect(mocks.saveNetworkCopy).toHaveBeenCalledTimes(1))
  })

  it('saves nothing when the HCX warning is cancelled', async () => {
    mocks.state.validationResults = {
      n1: { isValid: false, warnings: ['bad'], version: '0.1' },
    }
    render(<Harness />)

    act(() => flow.start())
    await waitFor(() => expect(hcxDialog()).not.toBeNull())
    fireEvent.click(screen.getByTestId('hcx-validation-save-dialog-cancel'))

    await waitFor(() => expect(hcxDialog()).toBeNull())
    expect(mocks.saveNetworkCopy).not.toHaveBeenCalled()
  })

  it('reports an NDEx timeout with the timeout message', async () => {
    mocks.saveNetworkCopy.mockRejectedValue(
      new Error(`request failed: ${TimeOutErrorIndicator}`),
    )
    render(<Harness />)

    act(() => flow.start())

    await waitFor(() =>
      expect(mocks.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: TimeOutErrorMessage,
          severity: 'error',
        }),
      ),
    )
    expect(mocks.setCurrentNetworkId).not.toHaveBeenCalled()
  })

  it('reports a failed token refresh instead of dropping it', async () => {
    mocks.getToken.mockRejectedValue(new Error('refresh failed'))
    render(<Harness />)

    act(() => flow.start())

    await waitFor(() =>
      expect(mocks.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('refresh failed'),
          severity: 'error',
        }),
      ),
    )
    expect(mocks.saveNetworkCopy).not.toHaveBeenCalled()
  })
})
