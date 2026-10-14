import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFilterStore } from '../../../data/hooks/stores/FilterStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useRendererStore } from '../../../data/hooks/stores/RendererStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { createNetworkSummary } from '../../../models/NetworkSummaryModel/impl/networkSummaryImpl'
import type { Table } from '../../../models/TableModel'
import { HcxMetaTag, SubsystemTag } from '../model/HcxMetaTag'
import { EDGE_INTERACTION_ATTR } from '../model/impl/circlePackingSupport'
import { useSubNetworkStore } from '../store/SubNetworkStore'
import { CP_RENDERER_ID, MainPanel } from './MainPanel'

const { PropertyPanelMock, FilterPanelMock } = vi.hoisted(() => ({
  PropertyPanelMock: vi.fn((_props: { networkId: string }) => null),
  FilterPanelMock: vi.fn((_props: { networkId: string }) => null),
}))

// Child panels are mocked to keep their heavy imports out. PropertyPanel and
// FilterPanel are spies so the tests can check whether and where they render.
// Allotment measures its panes with ResizeObserver, which jsdom lacks.
vi.mock('allotment', () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>
  return { Allotment: Object.assign(Pass, { Pane: Pass }) }
})
vi.mock('./SubNetworkPanel', () => ({ SubNetworkPanel: () => <div /> }))
vi.mock('./FilterPanel/FilterPanel', () => ({ default: FilterPanelMock }))
vi.mock('./PropertyPanel/PropertyPanel', () => ({
  PropertyPanel: PropertyPanelMock,
}))
vi.mock('./CirclePackingLayout/CirclePackingPanel', () => ({
  CirclePackingPanel: () => <div />,
}))

vi.mock('../../../data/hooks/stores/FilterStore')
vi.mock('../../../data/hooks/stores/NetworkSummaryStore')
vi.mock('../../../data/hooks/stores/RendererStore')
vi.mock('../../../data/hooks/stores/TableStore')
vi.mock('../../../data/hooks/stores/ViewModelStore')
vi.mock('../../../data/hooks/stores/VisualStyleStore')
vi.mock('../../../data/hooks/stores/WorkspaceStore')
vi.mock('../store/SubNetworkStore')

type Mock = import('vitest').Mock

const NETWORK_ID = 'net1'

const addRendererMock = vi.fn()
const deleteRendererMock = vi.fn()

const hcxSummary = createNetworkSummary({
  networkId: NETWORK_ID,
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

const emptyNodeTable = { columns: [], rows: new Map() } as unknown as Table

const setupStores = ({
  edgeTable,
  nodeTable = emptyNodeTable,
  cpRendererRegistered = false,
  selectedNodes,
  currentSubNetworkId = '',
  subNetworkSelectedNodes,
  filteredNetworkIds = [],
}: {
  edgeTable?: Table
  nodeTable?: Table
  cpRendererRegistered?: boolean
  selectedNodes?: string[]
  currentSubNetworkId?: string
  // Selection inside the shown subnetwork; defaults to the hierarchy's
  subNetworkSelectedNodes?: string[]
  // Networks that have a filter config
  filteredNetworkIds?: string[]
}): void => {
  // Every state object is built once here: the real stores hand out stable
  // references, and rebuilding them per selector call would change tableRecord's
  // identity on every render and re-fire the effect forever.
  const rendererState = {
    add: addRendererMock,
    delete: deleteRendererMock,
    renderers: {
      cyjs: { id: 'cyjs' },
      ...(cpRendererRegistered
        ? { [CP_RENDERER_ID]: { id: CP_RENDERER_ID } }
        : {}),
    },
  }
  const workspaceState = { workspace: { currentNetworkId: NETWORK_ID } }
  const summaryState = { summaries: { [NETWORK_ID]: hcxSummary } }
  const tableState = {
    tables:
      edgeTable === undefined ? {} : { [NETWORK_ID]: { nodeTable, edgeTable } },
  }
  const viewModel =
    selectedNodes === undefined
      ? undefined
      : { selectedNodes, selectedEdges: [] }
  const subNetworkViewModel =
    subNetworkSelectedNodes === undefined
      ? viewModel
      : { selectedNodes: subNetworkSelectedNodes, selectedEdges: [] }
  const viewModelState = {
    getViewModel: (id: string) =>
      id !== '' && id === currentSubNetworkId ? subNetworkViewModel : viewModel,
  }
  const filterState = {
    filterConfigs: Object.fromEntries(
      filteredNetworkIds.map((id) => [id, { name: id }]),
    ),
  }
  const visualStyleState = { visualStyles: {} }
  const subNetworkState = {
    setRootNetworkId: vi.fn(),
    setRootNetworkHost: vi.fn(),
    currentSubNetworkId,
  }

  ;(useWorkspaceStore as unknown as Mock).mockImplementation((selector) =>
    selector(workspaceState),
  )
  ;(useNetworkSummaryStore as unknown as Mock).mockImplementation((selector) =>
    selector(summaryState),
  )
  ;(useRendererStore as unknown as Mock).mockImplementation((selector) =>
    selector(rendererState),
  )
  ;(useTableStore as unknown as Mock).mockImplementation((selector) =>
    selector(tableState),
  )
  ;(useViewModelStore as unknown as Mock).mockImplementation((selector) =>
    selector(viewModelState),
  )
  ;(useFilterStore as unknown as Mock).mockImplementation((selector) =>
    selector(filterState),
  )
  ;(useVisualStyleStore as unknown as Mock).mockImplementation((selector) =>
    selector(visualStyleState),
  )
  ;(useSubNetworkStore as unknown as Mock).mockImplementation((selector) =>
    selector(subNetworkState),
  )
}

describe('MainPanel Cell View registration (issue #630)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers the Cell View renderer for a hierarchy with one interaction type', () => {
    setupStores({ edgeTable: edgeTableWith(['interacts', 'interacts']) })

    render(<MainPanel />)

    expect(addRendererMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: CP_RENDERER_ID }),
    )
    expect(deleteRendererMock).not.toHaveBeenCalled()
  })

  it('does not register the Cell View renderer when the hierarchy mixes interaction types', () => {
    setupStores({ edgeTable: edgeTableWith(['interacts', 'activates']) })

    render(<MainPanel />)

    expect(addRendererMock).not.toHaveBeenCalled()
  })

  it('removes an already registered Cell View renderer for a mixed hierarchy', () => {
    setupStores({
      edgeTable: edgeTableWith(['interacts', 'activates']),
      cpRendererRegistered: true,
    })

    render(<MainPanel />)

    expect(deleteRendererMock).toHaveBeenCalledWith(CP_RENDERER_ID)
    expect(addRendererMock).not.toHaveBeenCalled()
  })

  it('decides nothing while the tables are still loading', () => {
    setupStores({ edgeTable: undefined, cpRendererRegistered: true })

    render(<MainPanel />)

    expect(addRendererMock).not.toHaveBeenCalled()
    expect(deleteRendererMock).not.toHaveBeenCalled()
  })
})

describe('MainPanel property panel target', () => {
  const SUBSYSTEM_ID = '42'
  const SUBNETWORK_ID = `${NETWORK_ID}_${SUBSYSTEM_ID}`

  const hierarchyNodeTable = {
    columns: [],
    rows: new Map([
      [SUBSYSTEM_ID, { name: 'Subsystem 42', [SubsystemTag.members]: [1, 2] }],
    ]),
  } as unknown as Table

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('points the property panel at the shown subnetwork, not the hierarchy node', () => {
    setupStores({
      edgeTable: edgeTableWith(['interacts']),
      nodeTable: hierarchyNodeTable,
      selectedNodes: [SUBSYSTEM_ID],
      currentSubNetworkId: SUBNETWORK_ID,
    })

    render(<MainPanel />)

    expect(PropertyPanelMock).toHaveBeenCalled()
    const { networkId } = PropertyPanelMock.mock.lastCall![0]
    expect(networkId).toBe(SUBNETWORK_ID)
  })

  // While a newly selected subsystem loads, or after its fetch fails, the
  // store still names the previously shown subnetwork.
  it('shows no properties while the store still names a previous subnetwork', () => {
    setupStores({
      edgeTable: edgeTableWith(['interacts']),
      nodeTable: hierarchyNodeTable,
      selectedNodes: [SUBSYSTEM_ID],
      currentSubNetworkId: `${NETWORK_ID}_7`,
    })

    render(<MainPanel />)

    const { networkId } = PropertyPanelMock.mock.lastCall![0]
    expect(networkId).toBe('')
  })
})

// #766: the property/filter split exists only when the shown subnetwork has a
// filter; otherwise PropertyPanel (or its message) takes the whole width.
describe('MainPanel property/filter layout', () => {
  const SUBSYSTEM_ID = '42'
  const SUBNETWORK_ID = `${NETWORK_ID}_${SUBSYSTEM_ID}`

  const hierarchyNodeTable = {
    columns: [],
    rows: new Map([
      [SUBSYSTEM_ID, { name: 'Subsystem 42', [SubsystemTag.members]: [1, 2] }],
    ]),
  } as unknown as Table

  const setup = (
    subNetworkSelectedNodes: string[],
    filteredNetworkIds: string[],
    currentSubNetworkId = SUBNETWORK_ID,
  ): void =>
    setupStores({
      edgeTable: edgeTableWith(['interacts']),
      nodeTable: hierarchyNodeTable,
      selectedNodes: [SUBSYSTEM_ID],
      currentSubNetworkId,
      subNetworkSelectedNodes,
      filteredNetworkIds,
    })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the filter panel for the subnetwork when it has a filter', () => {
    setup(['n1'], [SUBNETWORK_ID])

    render(<MainPanel />)

    expect(PropertyPanelMock).toHaveBeenCalled()
    expect(FilterPanelMock).toHaveBeenCalled()
    expect(FilterPanelMock.mock.lastCall![0].networkId).toBe(SUBNETWORK_ID)
  })

  it('shows only the property panel when the subnetwork has no filter', () => {
    setup(['n1'], [])

    render(<MainPanel />)

    expect(PropertyPanelMock).toHaveBeenCalled()
    expect(FilterPanelMock).not.toHaveBeenCalled()
  })

  // The filter's checkboxes hide elements, so it must stay reachable whatever
  // the selection, or hidden elements could not be brought back.
  it.each([
    ['no node is', []],
    ['several nodes are', ['n1', 'n2']],
  ])('keeps the filter panel when %s selected', (_label, selected) => {
    setup(selected, [SUBNETWORK_ID])

    render(<MainPanel />)

    expect(PropertyPanelMock).toHaveBeenCalled()
    expect(FilterPanelMock).toHaveBeenCalled()
  })

  it('shows no filter panel while the store still names a previous subnetwork', () => {
    const previous = `${NETWORK_ID}_7`
    setup(['n1'], [previous], previous)

    render(<MainPanel />)

    expect(FilterPanelMock).not.toHaveBeenCalled()
  })
})
