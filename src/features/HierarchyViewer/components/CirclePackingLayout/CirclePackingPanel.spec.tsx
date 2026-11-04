import { act, render } from '@testing-library/react'
import * as d3Hierarchy from 'd3-hierarchy'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkStore } from '../../../../data/hooks/stores/NetworkStore'
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
import { CirclePackingView } from '../../model/CirclePackingView'
import { HcxMetaTag } from '../../model/HcxMetaTag'
import { useSubNetworkStore } from '../../store/SubNetworkStore'
import { CirclePackingType, createTreeLayout } from './CirclePackingLayout'
import { CirclePackingPanel } from './CirclePackingPanel'
import { D3TreeNode } from './D3TreeNode'

// The layout builder is the boundary under test: it receives the interaction
// network the protein names are looked up in. By default it never resolves, so
// nothing past the build (d3 packing and drawing) runs in jsdom.
vi.mock('./CirclePackingLayout', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./CirclePackingLayout')>()
  return {
    ...actual,
    createTreeLayout: vi.fn(() => new Promise(() => {})),
  }
})

// Style application has its own tests and needs a complete visual style
vi.mock(
  '../../../../models/VisualStyleModel/impl/visualStyleFnImpl',
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    applyVisualStyle: vi.fn(
      ({ networkView }: { networkView: NetworkView }) => networkView,
    ),
  }),
)

const NETWORK_ID = 'hierarchy-1'
const OTHER_NETWORK_ID = 'hierarchy-2'
const INTERACTION_UUID = 'interaction-uuid'

const network = { id: NETWORK_ID } as unknown as Network
const otherNetwork = { id: OTHER_NETWORK_ID } as unknown as Network
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

const hcxSummary = (
  host?: string,
  uuid: string = INTERACTION_UUID,
  networkId: string = NETWORK_ID,
): NetworkSummary =>
  createNetworkSummary({
    networkId,
    name: 'MuSIC',
    properties: [
      {
        predicateString: HcxMetaTag.interactionNetworkUUID,
        value: uuid,
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

const INITIAL_SIZE = { w: 400, h: 300 }

const panel = (target: Network = network, visible = false) => (
  <CirclePackingPanel
    rendererId="circlePacking"
    network={target}
    initialSize={INITIAL_SIZE}
    visible={visible}
  />
)

const renderPanel = () => render(panel())

/**
 * A hierarchy named after `rootId`: one subsystem with one protein ring,
 * whose id and name are `leaf`.
 */
const hierarchyOf = (rootId: string): d3Hierarchy.HierarchyNode<D3TreeNode> =>
  d3Hierarchy
    .stratify<D3TreeNode>()([
      {
        id: rootId,
        parentId: '',
        name: rootId,
        size: 1,
        members: ['leaf'],
      },
      {
        id: `${rootId}-leaf`,
        originalId: 'leaf',
        parentId: rootId,
        name: 'leaf',
        size: 1,
        members: [],
        isMember: true,
      },
    ] as unknown as D3TreeNode[])
    .sum(() => 1)

/** Hand out builds the test settles by hand, in call order */
const deferBuilds = () => {
  const builds: {
    resolve: (root: d3Hierarchy.HierarchyNode<D3TreeNode>) => void
    reject: (error: Error) => void
  }[] = []
  vi.mocked(createTreeLayout).mockImplementation(
    () =>
      new Promise((resolve, reject) => {
        builds.push({ resolve, reject })
      }),
  )
  return builds
}

const registeredHierarchyRootId = (networkId: string): string | undefined => {
  const view = useViewModelStore
    .getState()
    .viewModels[networkId]?.find((v) => v.type === CirclePackingType) as
    | CirclePackingView
    | undefined
  return (view?.hierarchy as d3Hierarchy.HierarchyNode<D3TreeNode> | undefined)
    ?.data.id
}

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
    useNetworkStore.setState({
      networks: new Map([
        [NETWORK_ID, network],
        [OTHER_NETWORK_ID, otherNetwork],
      ]),
    } as any)
  })

  afterEach(() => {
    // Back to the default build that never settles
    vi.mocked(createTreeLayout).mockImplementation(
      () => new Promise(() => {}) as any,
    )
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

  it('rebuilds when the interaction network of a loaded summary changes', () => {
    useNetworkSummaryStore.setState({
      summaries: { [NETWORK_ID]: hcxSummary() },
    } as any)
    renderPanel()
    vi.mocked(createTreeLayout).mockClear()

    act(() => {
      useNetworkSummaryStore.setState({
        summaries: { [NETWORK_ID]: hcxSummary(undefined, 'another-uuid') },
      } as any)
    })
    expect(createTreeLayout).toHaveBeenCalledTimes(1)
    expect(vi.mocked(createTreeLayout).mock.calls[0][0]).toMatchObject({
      interactionNetworkId: 'another-uuid',
    })

    vi.mocked(createTreeLayout).mockClear()
    act(() => {
      useNetworkSummaryStore.setState({
        summaries: {
          [NETWORK_ID]: hcxSummary('https://other.ndex.org', 'another-uuid'),
        },
      } as any)
    })
    expect(createTreeLayout).toHaveBeenCalledTimes(1)
    expect(vi.mocked(createTreeLayout).mock.calls[0][0]).toMatchObject({
      interactionNetworkHostUrl: 'https://other.ndex.org',
    })
  })

  it('does not rebuild when the summary changes but its interaction network does not', () => {
    useNetworkSummaryStore.setState({
      summaries: { [NETWORK_ID]: hcxSummary() },
    } as any)
    renderPanel()
    vi.mocked(createTreeLayout).mockClear()

    act(() => {
      useNetworkSummaryStore.setState({
        summaries: { [NETWORK_ID]: { ...hcxSummary(), isModified: true } },
      } as any)
    })

    expect(createTreeLayout).not.toHaveBeenCalled()
  })

  it('builds when the primary view arrives after mount', () => {
    useViewModelStore.setState({ viewModels: {} } as any)
    useNetworkSummaryStore.setState({
      summaries: { [NETWORK_ID]: hcxSummary() },
    } as any)

    renderPanel()
    expect(createTreeLayout).not.toHaveBeenCalled()

    act(() => {
      useViewModelStore.setState({
        viewModels: { [NETWORK_ID]: [primaryView] },
      } as any)
    })

    expect(createTreeLayout).toHaveBeenCalledTimes(1)
  })

  // NetworkTabs reuses the panel when switching directly between hierarchies
  it('builds the next hierarchy when both share an interaction network', () => {
    useTableStore.setState({
      tables: {
        [NETWORK_ID]: { nodeTable, edgeTable },
        [OTHER_NETWORK_ID]: { nodeTable, edgeTable },
      },
    } as any)
    useVisualStyleStore.setState({
      visualStyles: {
        [NETWORK_ID]: visualStyle,
        [OTHER_NETWORK_ID]: visualStyle,
      },
    } as any)
    useViewModelStore.setState({
      viewModels: {
        [NETWORK_ID]: [primaryView],
        [OTHER_NETWORK_ID]: [{ ...primaryView, id: OTHER_NETWORK_ID }],
      },
    } as any)
    useNetworkSummaryStore.setState({
      summaries: {
        [NETWORK_ID]: hcxSummary(),
        [OTHER_NETWORK_ID]: hcxSummary(undefined, undefined, OTHER_NETWORK_ID),
      },
    } as any)

    const { rerender } = render(panel())
    vi.mocked(createTreeLayout).mockClear()

    rerender(panel(otherNetwork))

    expect(createTreeLayout).toHaveBeenCalledTimes(1)
    expect(vi.mocked(createTreeLayout).mock.calls[0][0]).toMatchObject({
      network: otherNetwork,
      interactionNetworkId: INTERACTION_UUID,
    })
  })

  describe('when a build finishes late', () => {
    beforeEach(() => {
      useNetworkSummaryStore.setState({
        summaries: { [NETWORK_ID]: hcxSummary() },
      } as any)
    })

    const startTwoBuilds = () => {
      const builds = deferBuilds()
      const rendered = renderPanel()
      act(() => {
        useNetworkSummaryStore.setState({
          summaries: { [NETWORK_ID]: hcxSummary(undefined, 'another-uuid') },
        } as any)
      })
      expect(builds).toHaveLength(2)
      return { builds, ...rendered }
    }

    it('keeps the view model of the newer build', async () => {
      const { builds } = startTwoBuilds()

      await act(async () => {
        builds[1].resolve(hierarchyOf('newer'))
      })
      await act(async () => {
        builds[0].resolve(hierarchyOf('older'))
      })

      expect(registeredHierarchyRootId(NETWORK_ID)).toBe('newer')
    })

    it('ignores the failure of a superseded build', async () => {
      const { builds, queryByTestId } = startTwoBuilds()

      await act(async () => {
        builds[1].resolve(hierarchyOf('newer'))
      })
      await act(async () => {
        builds[0].reject(new Error('older build failed'))
      })

      expect(queryByTestId('circle-packing-unavailable')).toBeNull()
      expect(registeredHierarchyRootId(NETWORK_ID)).toBe('newer')
    })

    it('does not recreate the view of a network deleted meanwhile', async () => {
      const builds = deferBuilds()
      renderPanel()

      act(() => {
        useNetworkStore.setState({ networks: new Map() } as any)
        useViewModelStore.setState({ viewModels: {} } as any)
      })
      await act(async () => {
        builds[0].resolve(hierarchyOf('late'))
      })

      expect(
        useViewModelStore.getState().viewModels[NETWORK_ID],
      ).toBeUndefined()
    })
  })

  describe('initial expansion to the selected leaves', () => {
    const exclusiveSelect = vi.fn()

    beforeEach(() => {
      vi.useFakeTimers()
      exclusiveSelect.mockClear()
      useViewModelStore.setState({ exclusiveSelect } as any)
      useNetworkSummaryStore.setState({
        summaries: { [NETWORK_ID]: hcxSummary() },
      } as any)
    })

    afterEach(() => {
      act(() => {
        useSubNetworkStore.setState({ selectedHierarchyNodeNames: [] } as any)
      })
      vi.clearAllTimers()
      vi.useRealTimers()
    })

    it('waits for a view model that is still building', async () => {
      const builds = deferBuilds()
      render(panel(network, true))

      act(() => {
        useSubNetworkStore.setState({
          selectedHierarchyNodeNames: ['leaf'],
        } as any)
      })
      expect(exclusiveSelect).not.toHaveBeenCalled()

      await act(async () => {
        builds[0].resolve(hierarchyOf('root'))
      })

      expect(exclusiveSelect).toHaveBeenCalledTimes(1)
      expect(exclusiveSelect).toHaveBeenCalledWith(NETWORK_ID, ['root'], [])
    })

    it('forgets the wait when the selection is cleared first', async () => {
      const builds = deferBuilds()
      render(panel(network, true))

      act(() => {
        useSubNetworkStore.setState({
          selectedHierarchyNodeNames: ['leaf'],
        } as any)
      })
      act(() => {
        useSubNetworkStore.setState({ selectedHierarchyNodeNames: [] } as any)
      })
      await act(async () => {
        builds[0].resolve(hierarchyOf('root'))
      })
      expect(exclusiveSelect).not.toHaveBeenCalled()

      // A stale wait would have used up the one expansion by now
      act(() => {
        useSubNetworkStore.setState({
          selectedHierarchyNodeNames: ['leaf'],
        } as any)
      })
      expect(exclusiveSelect).toHaveBeenCalledTimes(1)
    })
  })
})
