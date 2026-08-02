import { describe, expect, it, vi } from 'vitest'
import { hydrateFromCrossTabChange } from '@/data/sync/crossTabHydration'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { useUiStateStore } from '@/data/hooks/stores/UiStateStore'
import { useVisualStyleStore } from '@/data/hooks/stores/VisualStyleStore'

// Writes resolve rather than returning undefined: production code chains
// `.catch()` onto them, and a bare `vi.fn()` makes that a TypeError — a mock
// defect that reads as a production bug. Deliberately not derived from the real
// module via `importOriginal`: that loads Dexie, which costs more than the 1s
// per-test timeout allows.
vi.mock('@/data/db', () => ({
  getWorkspaceFromDb: vi.fn(),
  getUiStateFromDb: vi.fn(),
  getVisualStyleSetFromDb: vi.fn(),
  putUiStateToDb: vi.fn().mockResolvedValue(undefined),
  putWorkspaceToDb: vi.fn().mockResolvedValue(undefined),
  putVisualStyleSetToDb: vi.fn().mockResolvedValue(undefined),
  putUndoRedoStackToDb: vi.fn().mockResolvedValue(undefined),
}))

import {
  getWorkspaceFromDb,
  getUiStateFromDb,
  getVisualStyleSetFromDb,
} from '@/data/db'
import { Panel } from '@/models/UiModel/Panel'
import VisualStyleFn from '@/models/VisualStyleModel'

describe('@/data/sync/crossTabHydration', () => {
  it('preserves local currentNetworkId if still valid', async () => {
    useWorkspaceStore.setState({
      workspace: {
        ...useWorkspaceStore.getState().workspace,
        currentNetworkId: 'local-net',
        networkIds: ['local-net', 'remote-net'],
      },
    })

    vi.mocked(getWorkspaceFromDb).mockResolvedValueOnce({
      ...useWorkspaceStore.getState().workspace,
      currentNetworkId: 'remote-net', // The other tab switched to remote-net
      networkIds: ['local-net', 'remote-net'],
    } as any)

    await hydrateFromCrossTabChange([
      { type: 2, table: 'workspace', key: 'mock-ws' },
    ])

    // It should have ignored the remote-net switch and kept local-net
    expect(useWorkspaceStore.getState().workspace.currentNetworkId).toBe(
      'local-net',
    )
  })

  it('adopts remote currentNetworkId if local network was deleted', async () => {
    useWorkspaceStore.setState({
      workspace: {
        ...useWorkspaceStore.getState().workspace,
        currentNetworkId: 'deleted-net',
        networkIds: ['deleted-net', 'remote-net'],
      },
    })

    vi.mocked(getWorkspaceFromDb).mockResolvedValueOnce({
      ...useWorkspaceStore.getState().workspace,
      currentNetworkId: 'remote-net',
      networkIds: ['remote-net'], // deleted-net is gone
    } as any)

    await hydrateFromCrossTabChange([
      { type: 2, table: 'workspace', key: 'mock-ws' },
    ])

    // It should adopt the remote network since deleted-net is gone
    expect(useWorkspaceStore.getState().workspace.currentNetworkId).toBe(
      'remote-net',
    )
  })

  it('preserves local activeNetworkView and panels', async () => {
    // Setup local state
    useWorkspaceStore.setState({
      workspace: {
        ...useWorkspaceStore.getState().workspace,
        networkIds: ['local-net', 'remote-net'],
      },
    })
    const localUi = {
      ...useUiStateStore.getState().ui,
      activeNetworkView: 'local-net',
      panels: {
        [Panel.LEFT]: 'open',
        [Panel.RIGHT]: 'closed',
        [Panel.BOTTOM]: 'closed',
      },
      tableUi: { activeTabIndex: 1, columnUiState: {} },
      networkBrowserPanelUi: { activeTabIndex: 0 },
      networkViewUi: { activeTabIndex: 0 },
      enablePopup: false,
      showErrorDialog: true,
      errorMessage: 'Local Error',
    }
    useUiStateStore.getState().setUi(localUi as any)

    // Remote tab switched to remote-net and opened RIGHT panel and changed all tabs
    vi.mocked(getUiStateFromDb).mockResolvedValueOnce({
      ...localUi,
      activeNetworkView: 'remote-net',
      panels: {
        [Panel.LEFT]: 'open',
        [Panel.RIGHT]: 'open', // opened by remote
        [Panel.BOTTOM]: 'closed',
      },
      tableUi: {
        activeTabIndex: 2,
        columnUiState: { 'some-column': { width: 100 } },
      }, // table tab changed, column size changed
      networkBrowserPanelUi: { activeTabIndex: 1 },
      networkViewUi: { activeTabIndex: 1 },
      enablePopup: true,
      showErrorDialog: false,
      errorMessage: '',
    } as any)

    await hydrateFromCrossTabChange([
      { type: 2, table: 'uiState', key: 'mock-ws' },
    ])

    const updatedUi = useUiStateStore.getState().ui
    expect(updatedUi.activeNetworkView).toBe('local-net') // preserved
    expect(updatedUi.panels[Panel.RIGHT]).toBe('closed') // preserved
    expect(updatedUi.tableUi.activeTabIndex).toBe(1) // preserved
    expect(updatedUi.networkBrowserPanelUi.activeTabIndex).toBe(0) // preserved
    expect(updatedUi.networkViewUi.activeTabIndex).toBe(0) // preserved
    expect(updatedUi.enablePopup).toBe(false) // preserved
    expect(updatedUi.showErrorDialog).toBe(true) // preserved
    expect(updatedUi.errorMessage).toBe('Local Error') // preserved
    expect(updatedUi.tableUi.columnUiState).toEqual({
      'some-column': { width: 100 },
    }) // synced!
  })

  it('clears activeNetworkView when the local network was deleted', async () => {
    // Setup local state with a network that will be deleted
    useWorkspaceStore.setState({
      workspace: {
        ...useWorkspaceStore.getState().workspace,
        networkIds: ['remote-net'], // local-net was just deleted
      },
    })

    const localUi = {
      ...useUiStateStore.getState().ui,
      activeNetworkView: 'local-net', // this is now deleted
    }
    useUiStateStore.getState().setUi(localUi as any)

    // activeNetworkView is per-tab and no longer stored in the shared row, so
    // whatever another tab has active is irrelevant here.
    vi.mocked(getUiStateFromDb).mockResolvedValueOnce({
      ...localUi,
      activeNetworkView: 'remote-net',
    } as any)

    await hydrateFromCrossTabChange([
      { type: 2, table: 'uiState', key: 'mock-ws' },
    ])

    // Cleared rather than adopting the other tab's network: this tab resolves
    // its own next network from the URL / its sessionStorage backstop.
    expect(useUiStateStore.getState().ui.activeNetworkView).toBe('')
  })

  it('gracefully handles missing UI state fields in older databases', async () => {
    // Setup local state with full UI fields
    const localUi = {
      ...useUiStateStore.getState().ui,
      activeNetworkView: 'local-net',
      tableUi: { activeTabIndex: 1, columnUiState: {} },
      networkBrowserPanelUi: { activeTabIndex: 2 },
      networkViewUi: { activeTabIndex: 3 },
    }
    useUiStateStore.getState().setUi(localUi as any)

    // Simulate an older database schema that lacks the newer UI tabs entirely
    vi.mocked(getUiStateFromDb).mockResolvedValueOnce({
      ...localUi,
      // @ts-ignore (Simulating missing data)
      tableUi: undefined,
      // @ts-ignore
      networkBrowserPanelUi: undefined,
      // @ts-ignore
      networkViewUi: undefined,
    } as any)

    // Should not throw any errors when trying to merge
    await expect(
      hydrateFromCrossTabChange([
        { type: 2, table: 'uiState', key: 'mock-ws' },
      ]),
    ).resolves.not.toThrow()

    // Local tab indexes should be preserved
    const updatedUi = useUiStateStore.getState().ui
    expect(updatedUi.tableUi.activeTabIndex).toBe(1)
    expect(updatedUi.networkBrowserPanelUi.activeTabIndex).toBe(2)
    expect(updatedUi.networkViewUi.activeTabIndex).toBe(3)
  })

  it('hydrates the whole named-style set, not just the active style', async () => {
    // A peer renamed the active style and added a second one. Neither touches
    // the active style's CONTENT, so hydrating only the active style would
    // leave this tab's style picker showing the stale set.
    const active = VisualStyleFn.createVisualStyle()
    const other = VisualStyleFn.createVisualStyle()

    useVisualStyleStore.setState({
      visualStyles: { 'net-1': active },
      styleSets: {
        'net-1': {
          activeStyleId: 's1',
          styles: {
            s1: { id: 's1', name: 'Default', visualStyle: undefined },
          },
        },
      },
    } as any)

    vi.mocked(getVisualStyleSetFromDb).mockResolvedValueOnce({
      activeStyleId: 's1',
      styles: {
        s1: { id: 's1', name: 'Renamed by peer', visualStyle: active },
        s2: { id: 's2', name: 'Added by peer', visualStyle: other },
      },
    } as any)

    await hydrateFromCrossTabChange([
      { type: 2, table: 'cyVisualStyles', key: 'net-1' },
    ])

    const set = useVisualStyleStore.getState().styleSets['net-1']
    expect(set.activeStyleId).toBe('s1')
    expect(set.styles.s1.name).toBe('Renamed by peer')
    expect(set.styles.s2?.name).toBe('Added by peer')
  })

  it('ignores a visual style change whose row is gone', async () => {
    useVisualStyleStore.setState({
      visualStyles: { 'net-2': VisualStyleFn.createVisualStyle() },
      styleSets: {
        'net-2': {
          activeStyleId: 's1',
          styles: {
            s1: { id: 's1', name: 'Local', visualStyle: undefined },
          },
        },
      },
    } as any)

    vi.mocked(getVisualStyleSetFromDb).mockResolvedValueOnce(undefined as any)

    await hydrateFromCrossTabChange([
      { type: 2, table: 'cyVisualStyles', key: 'net-2' },
    ])

    // Nothing to apply — local state must survive untouched.
    expect(
      useVisualStyleStore.getState().styleSets['net-2'].styles.s1.name,
    ).toBe('Local')
  })
})
