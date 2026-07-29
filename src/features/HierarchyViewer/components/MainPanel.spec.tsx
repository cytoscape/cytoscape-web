import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useRendererStore } from '../../../data/hooks/stores/RendererStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { createNetworkSummary } from '../../../models/NetworkSummaryModel/impl/networkSummaryImpl'
import type { Table } from '../../../models/TableModel'
import { HcxMetaTag } from '../model/HcxMetaTag'
import { EDGE_INTERACTION_ATTR } from '../model/impl/circlePackingSupport'
import { useSubNetworkStore } from '../store/SubNetworkStore'
import { CP_RENDERER_ID, MainPanel } from './MainPanel'

// Child panels are irrelevant here: MainPanel returns a MessagePanel while no
// subsystem is selected. They are mocked only to keep their heavy imports out.
vi.mock('./SubNetworkPanel', () => ({ SubNetworkPanel: () => <div /> }))
vi.mock('./FilterPanel/FilterPanel', () => ({ default: () => <div /> }))
vi.mock('./PropertyPanel/PropertyPanel', () => ({
  PropertyPanel: () => <div />,
}))
vi.mock('./CirclePackingLayout/CirclePackingPanel', () => ({
  CirclePackingPanel: () => <div />,
}))

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

const nodeTable = { columns: [], rows: new Map() } as unknown as Table

const setupStores = ({
  edgeTable,
  cpRendererRegistered = false,
}: {
  edgeTable?: Table
  cpRendererRegistered?: boolean
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
  const viewModelState = { getViewModel: () => undefined }
  const visualStyleState = { visualStyles: {} }
  const subNetworkState = {
    setRootNetworkId: vi.fn(),
    setRootNetworkHost: vi.fn(),
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
