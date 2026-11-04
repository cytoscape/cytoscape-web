import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkSummaryStore } from '../../../../data/hooks/stores/NetworkSummaryStore'
import { useTableStore } from '../../../../data/hooks/stores/TableStore'
import { useViewModelStore } from '../../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../../data/hooks/stores/VisualStyleStore'
import { Network } from '../../../../models/NetworkModel'
import { createNetworkSummary } from '../../../../models/NetworkSummaryModel/impl/networkSummaryImpl'
import { NetworkSummary } from '../../../../models/NetworkSummaryModel'
import { Table } from '../../../../models/TableModel'
import { NetworkView } from '../../../../models/ViewModel'
import { VisualStyle } from '../../../../models/VisualStyleModel'
import { HcxMetaTag } from '../../model/HcxMetaTag'
import { createTreeLayout } from './CirclePackingLayout'
import { CirclePackingPanel } from './CirclePackingPanel'

// The layout builder is the boundary under test: it receives the interaction
// network the protein names are looked up in. It never resolves, so nothing
// past the build (d3 packing and drawing) runs in jsdom.
vi.mock('./CirclePackingLayout', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./CirclePackingLayout')>()
  return {
    ...actual,
    createTreeLayout: vi.fn(() => new Promise(() => {})),
  }
})

const NETWORK_ID = 'hierarchy-1'
const INTERACTION_UUID = 'interaction-uuid'

const network = { id: NETWORK_ID } as unknown as Network
const nodeTable = { columns: [], rows: new Map() } as unknown as Table
const edgeTable = { columns: [], rows: new Map() } as unknown as Table
const visualStyle = {} as unknown as VisualStyle
const primaryView = {
  id: NETWORK_ID,
  type: 'nodeLink',
  viewId: `${NETWORK_ID}-nodeLink-1`,
  nodeViews: {},
  edgeViews: {},
  selectedNodes: [],
  selectedEdges: [],
} as unknown as NetworkView

const hcxSummary = (host?: string): NetworkSummary =>
  createNetworkSummary({
    networkId: NETWORK_ID,
    name: 'MuSIC',
    properties: [
      {
        predicateString: HcxMetaTag.interactionNetworkUUID,
        value: INTERACTION_UUID,
        dataType: undefined as any,
        subNetworkId: null,
      },
      ...(host === undefined
        ? []
        : [
            {
              predicateString: HcxMetaTag.interactionNetworkHost,
              value: host,
              dataType: undefined as any,
              subNetworkId: null,
            },
          ]),
    ],
  })

const renderPanel = () =>
  render(
    <CirclePackingPanel
      rendererId="circlePacking"
      network={network}
      initialSize={{ w: 400, h: 300 }}
      visible={false}
    />,
  )

describe('CirclePackingPanel name lookup source (#933)', () => {
  beforeEach(() => {
    vi.mocked(createTreeLayout).mockClear()
    useTableStore.setState({
      tables: { [NETWORK_ID]: { nodeTable, edgeTable } },
    } as any)
    useVisualStyleStore.setState({
      visualStyles: { [NETWORK_ID]: visualStyle },
    } as any)
    useViewModelStore.setState({
      viewModels: { [NETWORK_ID]: [primaryView] },
    } as any)
    useNetworkSummaryStore.setState({ summaries: {} } as any)
  })

  // On a reload the hidden Cell View mounts and builds during startup. It used
  // to take the interaction network from a shared store that MainPanel filled
  // in only after reading the HCX metadata, so the startup build looked names
  // up in network '' and the rings kept their numeric member ids.
  it('waits for the network summary, then looks names up in its interaction network', () => {
    renderPanel()
    expect(createTreeLayout).not.toHaveBeenCalled()

    act(() => {
      useNetworkSummaryStore.setState({
        summaries: { [NETWORK_ID]: hcxSummary() },
      } as any)
    })

    expect(createTreeLayout).toHaveBeenCalledTimes(1)
    expect(vi.mocked(createTreeLayout).mock.calls[0][0]).toMatchObject({
      interactionNetworkId: INTERACTION_UUID,
    })
  })

  it('builds at once when the summary is already loaded', () => {
    useNetworkSummaryStore.setState({
      summaries: { [NETWORK_ID]: hcxSummary('https://other.ndex.org') },
    } as any)

    renderPanel()

    expect(createTreeLayout).toHaveBeenCalledTimes(1)
    expect(vi.mocked(createTreeLayout).mock.calls[0][0]).toMatchObject({
      interactionNetworkId: INTERACTION_UUID,
      interactionNetworkHostUrl: 'https://other.ndex.org',
    })
  })
})
