import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useRendererStore } from '../../../data/hooks/stores/RendererStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { createNetworkSummary } from '../../../models/NetworkSummaryModel/impl/networkSummaryImpl'
import { HcxMetaTag } from '../model/HcxMetaTag'
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
vi.mock('../../../data/hooks/stores/UiStateStore')
vi.mock('../../../data/hooks/stores/WorkspaceStore')

type Mock = import('vitest').Mock

const deleteRendererMock = vi.fn()
const enablePopupMock = vi.fn()
const setPanelStateMock = vi.fn()

const setupStores = (
  summary: any,
  enablePopup = false,
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
    delete: deleteRendererMock,
    renderers: {
      cyjs: { id: 'cyjs' },
      circlePacking: { id: 'circlePacking' },
    },
  }
  const summaryState = { summaries: { net1: summary } }

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
    setupStores(hcxSummary)

    renderHook(() => useHierarchyViewerManager())

    expect(deleteRendererMock).not.toHaveBeenCalled()
    expect(enablePopupMock).toHaveBeenCalledWith(true)
  })
})

// The right panel follows `enablePopup` only when it CHANGES: switching to a
// hierarchy opens the panel, switching away closes it. Mounting must not
// close it, or `?right=open` (and a restored open panel) is undone on every
// boot with a regular network.
describe('useHierarchyViewerManager right panel', () => {
  const regularSummary = createNetworkSummary({
    networkId: 'net1',
    name: 'Regular network',
    properties: [],
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

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
})
