import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useRendererStore } from '../../../data/hooks/stores/RendererStore'
import { useSidePanelStore } from '../../../data/hooks/stores/SidePanelStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { createNetworkSummary } from '../../../models/NetworkSummaryModel/impl/networkSummaryImpl'
import type { Table } from '../../../models/TableModel'
import { HcxMetaTag } from '../model/HcxMetaTag'
import { EDGE_INTERACTION_ATTR } from '../model/impl/circlePackingSupport'
import { BUILTIN_SUB_NETWORK_RESOURCE_ID } from '../../../models/UiModel/impl/panelTabs'
import { Panel } from '../../../models/UiModel/Panel'
import { PanelState } from '../../../models/UiModel/PanelState'
import { useHierarchyViewerManager } from './useHierarchyViewerManager'

vi.mock('../../../data/db', () => ({
  getAllNetworkKeys: vi.fn(async () => []),
  deleteNetworkFromDb: vi.fn(),
  deleteNetworkViewsFromDb: vi.fn(),
  deleteVisualStyleFromDb: vi.fn(),
  deleteTablesFromDb: vi.fn(),
}))

vi.mock('../../../data/hooks/stores/NetworkSummaryStore')
vi.mock('../../../data/hooks/stores/RendererStore')
vi.mock('../../../data/hooks/stores/TableStore')
vi.mock('../../../data/hooks/stores/UiStateStore')
vi.mock('../../../data/hooks/stores/WorkspaceStore')

type Mock = import('vitest').Mock

const addRendererMock = vi.fn()
const deleteRendererMock = vi.fn()
const enablePopupMock = vi.fn()
const setPanelStateMock = vi.fn()

const hcxSummary = createNetworkSummary({
  networkId: 'net1',
  name: 'MuSIC hierarchy',
  properties: [
    {
      predicateString: HcxMetaTag.interactionNetworkUUID,
      value: 'interaction-uuid',
      dataType: undefined as any,
      subNetworkId: null,
    },
  ],
})

const edgeTableWith = (interactions: string[]): Table =>
  ({
    columns: [{ name: EDGE_INTERACTION_ATTR, type: 'string' }],
    rows: new Map(
      interactions.map((interaction, i) => [
        `e${i}`,
        { [EDGE_INTERACTION_ATTR]: interaction },
      ]),
    ),
  }) as unknown as Table

const setupStores = (
  summary: any,
  enablePopup = false,
  {
    edgeTable,
    cellViewRegistered = true,
  }: { edgeTable?: Table; cellViewRegistered?: boolean } = {},
): { ui: { enablePopup: boolean } } => {
  // Stable references so the networkIds-diff effect doesn't re-fire and loop.
  const workspaceState = {
    workspace: { networkIds: ['net1'], currentNetworkId: 'net1' },
  }
  const uiStoreState = {
    ui: { activeNetworkView: '', enablePopup },
    setCustomNetworkTabName: vi.fn(),
    setActiveNetworkView: vi.fn(),
    setPanelState: setPanelStateMock,
    enablePopup: enablePopupMock,
  }
  const rendererState = {
    add: addRendererMock,
    delete: deleteRendererMock,
    renderers: {
      cyjs: { id: 'cyjs' },
      ...(cellViewRegistered ? { circlePacking: { id: 'circlePacking' } } : {}),
    },
  }
  const summaryState = { summaries: { net1: summary } }
  const tableState = {
    tables: edgeTable === undefined ? {} : { net1: { edgeTable } },
  }

  ;(useWorkspaceStore as unknown as Mock).mockImplementation((selector) =>
    selector(workspaceState),
  )
  ;(useUiStateStore as unknown as Mock).mockImplementation((selector) =>
    selector(uiStoreState),
  )
  ;(useRendererStore as unknown as Mock).mockImplementation((selector) =>
    selector(rendererState),
  )
  ;(useNetworkSummaryStore as unknown as Mock).mockImplementation((selector) =>
    selector(summaryState),
  )
  ;(useTableStore as unknown as Mock).mockImplementation((selector) =>
    selector(tableState),
  )
  return uiStoreState
}

describe('useHierarchyViewerManager (CW-466)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes the Cell View renderer when a non-hierarchy network is loaded', () => {
    // A regular network from NDEx can have an empty properties list.
    const regularSummary = createNetworkSummary({
      networkId: 'net1',
      name: 'Regular network',
      properties: [],
    })
    setupStores(regularSummary)

    renderHook(() => useHierarchyViewerManager())

    expect(deleteRendererMock).toHaveBeenCalledWith('circlePacking')
    expect(enablePopupMock).toHaveBeenCalledWith(false)
  })

  it('keeps the Cell View renderer for a hierarchy (HCX) network', () => {
    setupStores(hcxSummary)

    renderHook(() => useHierarchyViewerManager())

    expect(deleteRendererMock).not.toHaveBeenCalled()
    expect(enablePopupMock).toHaveBeenCalledWith(true)
  })
})

// Registered here and not by the Sub Network Viewer: an app tab selected in the
// right panel keeps that viewer unmounted, and the hierarchy came back without
// its Tree View and Cell View tabs (#946). A hierarchy whose edges are not all
// parent-child gets no Cell View (#630).
describe('useHierarchyViewerManager Cell View registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Nothing here may depend on the viewer's tab being the selected one.
    useSidePanelStore.setState({ selectedTabId: 'mcode::right-panel::results' })
  })

  it('registers the Cell View renderer for a hierarchy with one interaction type', () => {
    setupStores(hcxSummary, false, {
      edgeTable: edgeTableWith(['interacts', 'interacts']),
      cellViewRegistered: false,
    })

    renderHook(() => useHierarchyViewerManager())

    expect(addRendererMock).toHaveBeenCalledTimes(1)
    expect(addRendererMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'circlePacking', name: 'Cell View' }),
    )
    expect(deleteRendererMock).not.toHaveBeenCalled()
  })

  it('registers it again on returning from a regular network', () => {
    const edgeTable = edgeTableWith(['interacts'])
    setupStores(
      createNetworkSummary({
        networkId: 'net1',
        name: 'Regular network',
        properties: [],
      }),
      false,
      { edgeTable },
    )
    const { rerender } = renderHook(() => useHierarchyViewerManager())
    expect(deleteRendererMock).toHaveBeenCalledWith('circlePacking')

    setupStores(hcxSummary, false, { edgeTable, cellViewRegistered: false })
    rerender()

    expect(addRendererMock).toHaveBeenCalledTimes(1)
  })

  it('leaves a registered Cell View renderer alone', () => {
    setupStores(hcxSummary, false, {
      edgeTable: edgeTableWith(['interacts']),
    })

    renderHook(() => useHierarchyViewerManager())

    expect(addRendererMock).not.toHaveBeenCalled()
    expect(deleteRendererMock).not.toHaveBeenCalled()
  })

  it('does not register the Cell View renderer when the hierarchy mixes interaction types', () => {
    setupStores(hcxSummary, false, {
      edgeTable: edgeTableWith(['interacts', 'activates']),
      cellViewRegistered: false,
    })

    renderHook(() => useHierarchyViewerManager())

    expect(addRendererMock).not.toHaveBeenCalled()
    expect(deleteRendererMock).not.toHaveBeenCalled()
  })

  it('removes an already registered Cell View renderer for a mixed hierarchy', () => {
    setupStores(hcxSummary, false, {
      edgeTable: edgeTableWith(['interacts', 'activates']),
    })

    renderHook(() => useHierarchyViewerManager())

    expect(deleteRendererMock).toHaveBeenCalledWith('circlePacking')
    expect(addRendererMock).not.toHaveBeenCalled()
  })

  it('decides nothing while the tables are still loading', () => {
    setupStores(hcxSummary)

    renderHook(() => useHierarchyViewerManager())

    expect(addRendererMock).not.toHaveBeenCalled()
    expect(deleteRendererMock).not.toHaveBeenCalled()
  })

  it('registers the renderer once the tables arrive', () => {
    setupStores(hcxSummary, false, { cellViewRegistered: false })
    const { rerender } = renderHook(() => useHierarchyViewerManager())
    expect(addRendererMock).not.toHaveBeenCalled()

    setupStores(hcxSummary, false, {
      edgeTable: edgeTableWith(['interacts']),
      cellViewRegistered: false,
    })
    rerender()

    expect(addRendererMock).toHaveBeenCalledTimes(1)
  })
})

// The right panel follows `enablePopup` only when it CHANGES: switching to a
// hierarchy opens the panel, switching away closes it. Mounting must not
// close it, or `?right=open` (and a restored open panel) is undone on every
// boot with a regular network. Leaving a hierarchy closes it only when the
// Sub Network Viewer is the selected tab: an app tab the user chose is still
// there on the next network (#881).
describe('useHierarchyViewerManager right panel', () => {
  const regularSummary = createNetworkSummary({
    networkId: 'net1',
    name: 'Regular network',
    properties: [],
  })

  beforeEach(() => {
    vi.clearAllMocks()
    useSidePanelStore.setState({ selectedTabId: null })
  })

  /** Enter a hierarchy, then leave it. */
  const enterAndLeaveHierarchy = (): void => {
    const uiStoreState = setupStores(regularSummary)
    const { rerender } = renderHook(() => useHierarchyViewerManager())
    uiStoreState.ui = { ...uiStoreState.ui, enablePopup: true }
    rerender()
    uiStoreState.ui = { ...uiStoreState.ui, enablePopup: false }
    rerender()
  }

  it('leaves the right panel alone when it mounts', () => {
    setupStores(regularSummary)

    renderHook(() => useHierarchyViewerManager())

    expect(setPanelStateMock).not.toHaveBeenCalled()
  })

  it('opens the right panel when the popup is enabled, and closes it when disabled', () => {
    const uiStoreState = setupStores(regularSummary)
    const { rerender } = renderHook(() => useHierarchyViewerManager())

    uiStoreState.ui = { ...uiStoreState.ui, enablePopup: true }
    rerender()
    expect(setPanelStateMock).toHaveBeenLastCalledWith(
      Panel.RIGHT,
      PanelState.OPEN,
    )

    uiStoreState.ui = { ...uiStoreState.ui, enablePopup: false }
    rerender()
    expect(setPanelStateMock).toHaveBeenLastCalledWith(
      Panel.RIGHT,
      PanelState.CLOSED,
    )
    expect(setPanelStateMock).toHaveBeenCalledTimes(2)
  })

  it('closes the right panel on leaving a hierarchy with the Sub Network Viewer selected', () => {
    useSidePanelStore.setState({
      selectedTabId: BUILTIN_SUB_NETWORK_RESOURCE_ID,
    })

    enterAndLeaveHierarchy()

    expect(setPanelStateMock).toHaveBeenLastCalledWith(
      Panel.RIGHT,
      PanelState.CLOSED,
    )
  })

  it('keeps the right panel open on leaving a hierarchy with an app tab selected', () => {
    useSidePanelStore.setState({ selectedTabId: 'mcode::right-panel::results' })

    enterAndLeaveHierarchy()

    // Only the open on entering the hierarchy.
    expect(setPanelStateMock).toHaveBeenCalledTimes(1)
    expect(setPanelStateMock).toHaveBeenCalledWith(Panel.RIGHT, PanelState.OPEN)
  })
})
