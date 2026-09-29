import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchNdexSummaries,
  TimeOutErrorIndicator,
  TimeOutErrorMessage,
} from '../../../data/external-api/ndex'
import {
  SaveNetworkToNDExFlow,
  useSaveNetworkToNDExFlow,
} from './useSaveNetworkToNDExFlow'

const mocks = vi.hoisted(() => {
  // A zustand-like hook: callable with a selector, plus getState().
  const store = <T extends object>(state: T) =>
    Object.assign((selector: (s: T) => unknown) => selector(state), {
      getState: () => state,
    })
  const hcx = {
    validationResults: {} as Record<
      string,
      { isValid: boolean; warnings: string[]; version: string }
    >,
  }
  const summaries: Record<
    string,
    { isNdex: boolean; modificationTime: number }
  > = {}
  return {
    store,
    hcx,
    summaries,
    addMessage: vi.fn(),
    getToken: vi.fn(),
    setNetworkModified: vi.fn(),
    saveNetworkOverwrite: vi.fn(),
    saveNetworkCopy: vi.fn(),
  }
})

vi.mock('../../../data/external-api/ndex', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchNdexSummaries: vi.fn(),
}))
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
  useNetworkSummaryStore: mocks.store({ summaries: mocks.summaries }),
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
    setNetworkModified: mocks.setNetworkModified,
  }),
}))
vi.mock('../../HierarchyViewer/store/HcxValidatorStore', () => ({
  useHcxValidatorStore: mocks.store(mocks.hcx),
}))
vi.mock('../../../data/hooks/useSaveCyNetworkToNDEx', () => ({
  useSaveCyNetworkToNDEx: () => mocks.saveNetworkOverwrite,
}))
vi.mock('../../../data/hooks/useSaveCyNetworkCopyToNDEx', () => ({
  useSaveCyNetworkCopyToNDEx: () => mocks.saveNetworkCopy,
}))

let flow: SaveNetworkToNDExFlow
const Harness = () => {
  flow = useSaveNetworkToNDExFlow()
  return <>{flow.dialogs}</>
}

const syncDialog = () => screen.queryByTestId('save-to-ndex-sync-dialog')
const hcxDialog = () => screen.queryByTestId('hcx-validation-save-dialog')
const ndexIsNewer = () =>
  vi
    .mocked(fetchNdexSummaries)
    .mockResolvedValue([{ modificationTime: 200 }] as any)

describe('useSaveNetworkToNDExFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getToken.mockResolvedValue('token')
    mocks.hcx.validationResults = {}
    mocks.summaries.n1 = { isNdex: true, modificationTime: 100 }
    mocks.saveNetworkOverwrite.mockResolvedValue(undefined)
    mocks.saveNetworkCopy.mockResolvedValue('copy-uuid')
    vi.mocked(fetchNdexSummaries).mockResolvedValue([
      { modificationTime: 100 },
    ] as any)
  })

  it('overwrites a network NDEx has no newer version of', async () => {
    render(<Harness />)

    act(() => flow.start())

    await waitFor(() =>
      expect(mocks.setNetworkModified).toHaveBeenCalledWith('n1', false),
    )
    expect(mocks.saveNetworkOverwrite.mock.calls[0].slice(0, 2)).toEqual([
      'token',
      'n1',
    ])
    expect(mocks.saveNetworkCopy).not.toHaveBeenCalled()
    expect(syncDialog()).toBeNull()
  })

  it('saves a local network as a new copy that replaces it', async () => {
    mocks.summaries.n1 = { isNdex: false, modificationTime: 100 }
    render(<Harness />)

    act(() => flow.start())

    await waitFor(() => expect(mocks.saveNetworkCopy).toHaveBeenCalledTimes(1))
    // The last argument deletes the original local network.
    expect(mocks.saveNetworkCopy.mock.calls[0].at(-1)).toBe(true)
    expect(fetchNdexSummaries).not.toHaveBeenCalled()
  })

  it('asks when NDEx holds a newer version; Cancel saves nothing', async () => {
    ndexIsNewer()
    render(<Harness />)

    act(() => flow.start())
    await waitFor(() => expect(syncDialog()).not.toBeNull())
    fireEvent.click(screen.getByTestId('save-to-ndex-cancel-button'))

    await waitFor(() => expect(syncDialog()).toBeNull())
    expect(mocks.saveNetworkOverwrite).not.toHaveBeenCalled()
    expect(mocks.saveNetworkCopy).not.toHaveBeenCalled()
  })

  it('overwrites from the out-of-sync dialog', async () => {
    ndexIsNewer()
    render(<Harness />)

    act(() => flow.start())
    await waitFor(() => expect(syncDialog()).not.toBeNull())
    fireEvent.click(screen.getByTestId('save-to-ndex-overwrite-button'))

    await waitFor(() => expect(syncDialog()).toBeNull())
    expect(mocks.saveNetworkOverwrite).toHaveBeenCalledTimes(1)
  })

  it('saves a copy, keeping the original, from the out-of-sync dialog', async () => {
    ndexIsNewer()
    render(<Harness />)

    act(() => flow.start())
    await waitFor(() => expect(syncDialog()).not.toBeNull())
    fireEvent.click(screen.getByTestId('save-to-ndex-copy-button'))

    await waitFor(() => expect(syncDialog()).toBeNull())
    expect(mocks.saveNetworkCopy.mock.calls[0].at(-1)).toBe(false)
    expect(mocks.saveNetworkOverwrite).not.toHaveBeenCalled()
  })

  it('asks first when the network is invalid HCX, and continues on submit', async () => {
    mocks.hcx.validationResults = {
      n1: { isValid: false, warnings: ['bad'], version: '0.1' },
    }
    render(<Harness />)

    act(() => flow.start())
    await waitFor(() => expect(hcxDialog()).not.toBeNull())
    expect(fetchNdexSummaries).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('hcx-validation-save-dialog-submit'))

    // The dialog must close on submit: it no longer unmounts with a menu row.
    await waitFor(() => expect(hcxDialog()).toBeNull())
    await waitFor(() =>
      expect(mocks.saveNetworkOverwrite).toHaveBeenCalledTimes(1),
    )
  })

  it('reports an NDEx timeout with the timeout message, not its indicator', async () => {
    vi.mocked(fetchNdexSummaries).mockRejectedValue(
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
    expect(mocks.saveNetworkOverwrite).not.toHaveBeenCalled()
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
    expect(mocks.saveNetworkOverwrite).not.toHaveBeenCalled()
  })

  it('closes the out-of-sync dialog before the copy runs, so it cannot run twice', async () => {
    ndexIsNewer()
    let finishSave: (uuid: string) => void = () => {}
    mocks.saveNetworkCopy.mockReturnValue(
      new Promise((resolve) => {
        finishSave = resolve
      }),
    )
    render(<Harness />)

    act(() => flow.start())
    await waitFor(() => expect(syncDialog()).not.toBeNull())
    fireEvent.click(screen.getByTestId('save-to-ndex-copy-button'))

    // Still saving, and the dialog (with both buttons) is already gone.
    await waitFor(() => expect(syncDialog()).toBeNull())
    expect(mocks.saveNetworkCopy).toHaveBeenCalledTimes(1)
    await act(async () => finishSave('copy-uuid'))
    expect(mocks.saveNetworkCopy).toHaveBeenCalledTimes(1)
  })

  it('reports an overwrite from the out-of-sync dialog that fails', async () => {
    ndexIsNewer()
    mocks.saveNetworkOverwrite.mockRejectedValue(new Error('NDEx said no'))
    render(<Harness />)

    act(() => flow.start())
    await waitFor(() => expect(syncDialog()).not.toBeNull())
    fireEvent.click(screen.getByTestId('save-to-ndex-overwrite-button'))

    await waitFor(() =>
      expect(mocks.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('NDEx said no'),
          severity: 'error',
        }),
      ),
    )
    await waitFor(() => expect(syncDialog()).toBeNull())
    expect(mocks.setNetworkModified).not.toHaveBeenCalled()
  })
})
