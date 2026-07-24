import { describe, expect, it, vi } from 'vitest'
import { hydrateFromCrossTabChange } from './crossTabHydration'
import { useWorkspaceStore } from '../data/hooks/stores/WorkspaceStore'
import { useUiStateStore } from '../data/hooks/stores/UiStateStore'

vi.mock('../data/db', () => ({
  getWorkspaceFromDb: vi.fn(),
  getUiStateFromDb: vi.fn(),
  putUiStateToDb: vi.fn(),
  putWorkspaceToDb: vi.fn(),
}))

import { getWorkspaceFromDb, getUiStateFromDb } from '../data/db'
import { Panel } from '../models/UiModel/Panel'

describe('crossTabHydration', () => {
  it('preserves local currentNetworkId if still valid', async () => {
    useWorkspaceStore.setState({
      workspace: {
        ...useWorkspaceStore.getState().workspace,
        currentNetworkId: 'local-net',
        networkIds: ['local-net', 'remote-net']
      }
    })

    vi.mocked(getWorkspaceFromDb).mockResolvedValueOnce({
      ...useWorkspaceStore.getState().workspace,
      currentNetworkId: 'remote-net', // The other tab switched to remote-net
      networkIds: ['local-net', 'remote-net']
    } as any)

    await hydrateFromCrossTabChange([{ type: 2, table: 'workspace', key: 'mock-ws' }])
    
    // It should have ignored the remote-net switch and kept local-net
    expect(useWorkspaceStore.getState().workspace.currentNetworkId).toBe('local-net')
  })

  it('adopts remote currentNetworkId if local network was deleted', async () => {
    useWorkspaceStore.setState({
      workspace: {
        ...useWorkspaceStore.getState().workspace,
        currentNetworkId: 'deleted-net',
        networkIds: ['deleted-net', 'remote-net']
      }
    })

    vi.mocked(getWorkspaceFromDb).mockResolvedValueOnce({
      ...useWorkspaceStore.getState().workspace,
      currentNetworkId: 'remote-net',
      networkIds: ['remote-net'] // deleted-net is gone
    } as any)

    await hydrateFromCrossTabChange([{ type: 2, table: 'workspace', key: 'mock-ws' }])
    
    // It should adopt the remote network since deleted-net is gone
    expect(useWorkspaceStore.getState().workspace.currentNetworkId).toBe('remote-net')
  })

  it('preserves local activeNetworkView and panels', async () => {
    // Setup local state
    useWorkspaceStore.setState({
      workspace: {
        ...useWorkspaceStore.getState().workspace,
        networkIds: ['local-net', 'remote-net']
      }
    })
    const localUi = {
      ...useUiStateStore.getState().ui,
      activeNetworkView: 'local-net',
      panels: {
        [Panel.LEFT]: 'open',
        [Panel.RIGHT]: 'closed',
        [Panel.BOTTOM]: 'closed'
      },
      tableUi: { activeTabIndex: 1, columnUiState: {} },
      networkBrowserPanelUi: { activeTabIndex: 0 },
      networkViewUi: { activeTabIndex: 0 },
      enablePopup: false,
      showErrorDialog: true,
      errorMessage: 'Local Error'
    }
    useUiStateStore.getState().setUi(localUi as any)

    // Remote tab switched to remote-net and opened RIGHT panel and changed all tabs
    vi.mocked(getUiStateFromDb).mockResolvedValueOnce({
      ...localUi,
      activeNetworkView: 'remote-net',
      panels: {
        [Panel.LEFT]: 'open',
        [Panel.RIGHT]: 'open', // opened by remote
        [Panel.BOTTOM]: 'closed'
      },
      tableUi: { activeTabIndex: 2, columnUiState: { 'some-column': { width: 100 } } }, // table tab changed, column size changed
      networkBrowserPanelUi: { activeTabIndex: 1 },
      networkViewUi: { activeTabIndex: 1 },
      enablePopup: true,
      showErrorDialog: false,
      errorMessage: ''
    } as any)

    await hydrateFromCrossTabChange([{ type: 2, table: 'uiState', key: 'mock-ws' }])

    const updatedUi = useUiStateStore.getState().ui
    expect(updatedUi.activeNetworkView).toBe('local-net') // preserved
    expect(updatedUi.panels[Panel.RIGHT]).toBe('closed') // preserved
    expect(updatedUi.tableUi.activeTabIndex).toBe(1) // preserved
    expect(updatedUi.networkBrowserPanelUi.activeTabIndex).toBe(0) // preserved
    expect(updatedUi.networkViewUi.activeTabIndex).toBe(0) // preserved
    expect(updatedUi.enablePopup).toBe(false) // preserved
    expect(updatedUi.showErrorDialog).toBe(true) // preserved
    expect(updatedUi.errorMessage).toBe('Local Error') // preserved
    expect(updatedUi.tableUi.columnUiState).toEqual({ 'some-column': { width: 100 } }) // synced!
  })
})
