import { act, cleanup, render } from '@testing-library/react'
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
import { CpDefaults } from './CirclePackingUtils'
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

// Tests that only count selections replace this action in the store
const realExclusiveSelect = useViewModelStore.getState().exclusiveSelect

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

const seedStores = (): void => {
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
}

describe('CirclePackingPanel name lookup source (#933)', () => {
  beforeEach(seedStores)

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

    it('waits for the view model when the selection is there before mount', async () => {
      const builds = deferBuilds()
      useSubNetworkStore.setState({
        selectedHierarchyNodeNames: ['leaf'],
      } as any)

      render(panel(network, true))
      expect(exclusiveSelect).not.toHaveBeenCalled()

      await act(async () => {
        builds[0].resolve(hierarchyOf('root'))
      })

      expect(exclusiveSelect).toHaveBeenCalledTimes(1)
      expect(exclusiveSelect).toHaveBeenCalledWith(NETWORK_ID, ['root'], [])
    })

    it('keeps waiting while hidden, and expands once shown again', async () => {
      const builds = deferBuilds()
      const { rerender } = render(panel(network, true))

      act(() => {
        useSubNetworkStore.setState({
          selectedHierarchyNodeNames: ['leaf'],
        } as any)
      })
      rerender(panel(network, false))
      await act(async () => {
        builds[0].resolve(hierarchyOf('root'))
      })
      expect(exclusiveSelect).not.toHaveBeenCalled()

      rerender(panel(network, true))

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

// The labels are drawn over the rings, and only the rings have a click handler.
// A label that catches the pointer swallows the click: the ring's handler never
// runs and the background handler ignores it. jsdom cannot hit-test, so this
// pins the property; hierarchy-cell-view.spec.ts clicks a label for real.
describe('CirclePackingPanel ring labels (#931)', () => {
  beforeEach(() => {
    seedStores()
    useNetworkSummaryStore.setState({
      summaries: { [NETWORK_ID]: hcxSummary() },
    } as any)
  })

  afterEach(() => {
    vi.mocked(createTreeLayout).mockImplementation(
      () => new Promise(() => {}) as any,
    )
  })

  const pointerEventsOf = (container: Element, selector: string): string[] => {
    const elements = [...container.querySelectorAll(selector)]
    expect(elements.length).toBeGreaterThan(0)
    return [...new Set(elements.map((e) => getComputedStyle(e).pointerEvents))]
  }

  const drawn = async () => {
    const builds = deferBuilds()
    const rendered = render(panel())
    await act(async () => {
      builds[0].resolve(hierarchyOf('root'))
    })
    return { builds, ...rendered }
  }

  /** A new visual style rebuilds the layout over the existing drawing */
  const rebuild = async (
    builds: ReturnType<typeof deferBuilds>,
  ): Promise<void> => {
    act(() => {
      useVisualStyleStore.setState({
        visualStyles: { [NETWORK_ID]: { ...visualStyle } },
      } as any)
    })
    expect(builds).toHaveLength(2)
    await act(async () => {
      builds[1].resolve(hierarchyOf('root'))
    })
  }

  it('lets the pointer through the labels to the rings', async () => {
    const { container } = await drawn()

    expect(pointerEventsOf(container, 'text, tspan')).toEqual(['none'])
    expect(pointerEventsOf(container, 'circle')).not.toContain('none')
  })

  it('still does after a rebuild over the same drawing', async () => {
    const { builds, container } = await drawn()

    await rebuild(builds)

    expect(pointerEventsOf(container, 'text, tspan')).toEqual(['none'])
  })

  it('still does when a rebuild has to recreate the label group', async () => {
    const { builds, container } = await drawn()
    container
      .querySelector('.circle-packing-wrapper > g:nth-child(2)')
      ?.remove()
    expect(container.querySelector('text')).toBeNull()

    await rebuild(builds)

    expect(pointerEventsOf(container, 'text, tspan')).toEqual(['none'])
  })
})

// A protein ring's `originalId` is its member id (366 in MuSIC), while the Sub
// Network Viewer names proteins. Selecting by id lost the border as soon as the
// viewer's names came back, so rings are selected by name everywhere.
describe('CirclePackingPanel protein ring selection (#931)', () => {
  const RED = CpDefaults.leafBorderColor
  const ORANGE = CpDefaults.selectedBorderColor
  const GREY = CpDefaults.borderColor

  // DR1 is a member of two subsystems. A subsystem is named DR1 as well.
  const ring = (
    id: string,
    parentId: string,
    member: number,
    name: string,
  ) => ({
    id,
    originalId: member,
    parentId,
    name,
    size: 1,
    members: [],
    isMember: true,
  })
  const subsystem = (id: string, parentId: string, name: string) => ({
    id,
    parentId,
    name,
    size: 1,
    members: [],
  })
  const sharedProtein = () =>
    d3Hierarchy
      .stratify<D3TreeNode>()([
        subsystem('root', '', 'Cell'),
        subsystem('A', 'root', 'Nucleoplasm'),
        ring('A-366', 'A', 366, 'DR1'),
        ring('A-367', 'A', 367, 'TAF11'),
        subsystem('B', 'root', 'Cytoplasm'),
        ring('B-366', 'B', 366, 'DR1'),
        subsystem('C', 'root', 'DR1'),
        ring('C-368', 'C', 368, 'MYC'),
      ] as unknown as D3TreeNode[])
      .sum(() => 1)

  const circleOf = (container: Element, id: string): SVGCircleElement => {
    const circle = [...container.querySelectorAll('circle')].find(
      (element) =>
        (element as unknown as { __data__: { data: D3TreeNode } }).__data__.data
          .id === id,
    )
    if (circle === undefined) throw new Error(`No ring ${id}`)
    return circle
  }

  const strokes = (container: Element): Record<string, string | null> =>
    Object.fromEntries(
      ['A', 'A-366', 'A-367', 'B', 'B-366', 'C', 'C-368'].map((id) => [
        id,
        circleOf(container, id).getAttribute('stroke'),
      ]),
    )

  const click = (container: Element, id: string): void => {
    act(() => {
      circleOf(container, id).dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
    })
  }

  const echo = (names: string[]): void => {
    act(() => {
      useSubNetworkStore.getState().setSelectedHierarchyNodes(names)
    })
  }

  const drawn = async (): Promise<Element> => {
    const builds = deferBuilds()
    const { container } = render(panel())
    await act(async () => {
      builds[0].resolve(sharedProtein())
    })
    return container
  }

  beforeEach(() => {
    seedStores()
    useViewModelStore.setState({ exclusiveSelect: realExclusiveSelect } as any)
    useNetworkSummaryStore.setState({
      summaries: { [NETWORK_ID]: hcxSummary() },
    } as any)
    useSubNetworkStore.setState({
      selectedNodes: [],
      selectedHierarchyNodeNames: [],
    } as any)
  })

  afterEach(() => {
    cleanup()
    vi.mocked(createTreeLayout).mockImplementation(
      () => new Promise(() => {}) as any,
    )
  })

  it('outlines every ring of the clicked protein, and its parent', async () => {
    const container = await drawn()

    click(container, 'A-366')

    expect(strokes(container)).toEqual({
      A: ORANGE,
      'A-366': RED,
      'A-367': GREY,
      B: GREY,
      'B-366': RED,
      C: GREY,
      'C-368': GREY,
    })
  })

  it('names the protein for the Sub Network Viewer', async () => {
    const container = await drawn()

    click(container, 'A-366')

    expect(useSubNetworkStore.getState().selectedNodes).toEqual(['DR1'])
  })

  it('keeps the outline when the viewer names the same protein', async () => {
    const container = await drawn()
    click(container, 'A-366')

    echo(['DR1'])

    expect(strokes(container)['A-366']).toBe(RED)
    expect(strokes(container)['B-366']).toBe(RED)
  })

  it('outlines a protein selected in the viewer, by name', async () => {
    const container = await drawn()

    echo(['TAF11'])

    expect(strokes(container)['A-367']).toBe(RED)
    expect(strokes(container)['A-366']).toBe(GREY)
  })

  it('clears the outline when the viewer selection is cleared', async () => {
    const container = await drawn()
    click(container, 'A-366')
    echo(['DR1'])

    echo([])

    expect(strokes(container)['A-366']).toBe(GREY)
  })

  it('does not take a subsystem for a protein of the same name', async () => {
    const container = await drawn()

    echo(['DR1'])

    expect(strokes(container).C).toBe(GREY)
  })

  it('clears the outline when a subsystem ring is clicked', async () => {
    const container = await drawn()
    click(container, 'A-366')

    click(container, 'B')

    expect(strokes(container)['A-366']).toBe(GREY)
    expect(strokes(container).B).toBe(ORANGE)
  })
})

// NetworkTabs reports the size of the box the renderers live in, and that box
// can be 0 x 0 or mid-layout when the panel mounts after a reload. The first
// layout has to wait for the real size. Later sizes must not touch a drawn
// layout: a pane being resized is useCenterAnchoredZoom's business.
describe('CirclePackingPanel box size (#935)', () => {
  const sized = (size: { w: number; h: number }, visible = false) => (
    <CirclePackingPanel
      rendererId="circlePacking"
      network={network}
      initialSize={size}
      visible={visible}
    />
  )

  const packedSize = (): { w: number; h: number } | undefined => {
    const view = useViewModelStore
      .getState()
      .viewModels[NETWORK_ID]?.find((v) => v.type === CirclePackingType) as
      | CirclePackingView
      | undefined
    const root = view?.hierarchy as
      | d3Hierarchy.HierarchyCircularNode<D3TreeNode>
      | undefined
    return root === undefined ? undefined : { w: root.x * 2, h: root.y * 2 }
  }

  beforeEach(() => {
    seedStores()
    useNetworkSummaryStore.setState({
      summaries: { [NETWORK_ID]: hcxSummary() },
    } as any)
  })

  afterEach(() => {
    vi.mocked(createTreeLayout).mockImplementation(
      () => new Promise(() => {}) as any,
    )
  })

  it('waits for a box that is 0 x 0 at mount, then builds at its size', async () => {
    const builds = deferBuilds()
    const { rerender } = render(sized({ w: 0, h: 0 }))
    expect(createTreeLayout).not.toHaveBeenCalled()

    rerender(sized({ w: 422, h: 699 }))

    expect(createTreeLayout).toHaveBeenCalledTimes(1)
    await act(async () => {
      builds[0].resolve(hierarchyOf('root'))
    })
    expect(packedSize()).toEqual({ w: 422, h: 699 })
  })

  // Allotment keeps a pane at its 30 px minimum until it has laid the panes
  // out. A layout packed into that stays 30 px wide for good.
  it('does not build for a pane that is still being laid out', async () => {
    const builds = deferBuilds()
    const { rerender } = render(sized({ w: 30, h: 658 }))
    expect(createTreeLayout).not.toHaveBeenCalled()

    rerender(sized({ w: 422, h: 699 }))

    expect(createTreeLayout).toHaveBeenCalledTimes(1)
    await act(async () => {
      builds[0].resolve(hierarchyOf('root'))
    })
    expect(packedSize()).toEqual({ w: 422, h: 699 })
  })

  it('uses the latest size when the first build has to wait for more', async () => {
    const builds = deferBuilds()
    useNetworkSummaryStore.setState({ summaries: {} } as any)
    const { rerender } = render(sized({ w: 422, h: 699 }))
    rerender(sized({ w: 500, h: 699 }))

    act(() => {
      useNetworkSummaryStore.setState({
        summaries: { [NETWORK_ID]: hcxSummary() },
      } as any)
    })

    expect(builds).toHaveLength(1)
    await act(async () => {
      builds[0].resolve(hierarchyOf('root'))
    })
    expect(packedSize()).toEqual({ w: 500, h: 699 })
  })

  it('does not rebuild when the box is resized afterwards', async () => {
    const builds = deferBuilds()
    const { rerender } = render(sized({ w: 422, h: 699 }))
    await act(async () => {
      builds[0].resolve(hierarchyOf('root'))
    })

    rerender(sized({ w: 500, h: 600 }))

    expect(createTreeLayout).toHaveBeenCalledTimes(1)
    expect(packedSize()).toEqual({ w: 422, h: 699 })
  })

  describe('fitting', () => {
    const getBBox = vi.fn(() => ({ x: 0, y: 0, width: 100, height: 100 }))

    beforeEach(() => {
      getBBox.mockClear()
      // jsdom does no layout: give the SVG a box and the drawing a bounding box
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
        width: 422,
        height: 699,
      } as DOMRect)
      ;(SVGElement.prototype as any).getBBox = getBBox
      // d3 zoom's default extent reads these SVG lengths, which jsdom lacks
      for (const [name, value] of [
        ['width', 422],
        ['height', 699],
      ] as const) {
        Object.defineProperty(SVGSVGElement.prototype, name, {
          configurable: true,
          value: { baseVal: { value } },
        })
      }
    })

    afterEach(() => {
      vi.restoreAllMocks()
      delete (SVGElement.prototype as any).getBBox
      delete (SVGSVGElement.prototype as any).width
      delete (SVGSVGElement.prototype as any).height
    })

    const drawn = async () => {
      const builds = deferBuilds()
      const rendered = render(sized({ w: 422, h: 699 }, true))
      await act(async () => {
        builds[0].resolve(hierarchyOf('root'))
      })
      expect(getBBox).toHaveBeenCalled()
      getBBox.mockClear()
      return rendered
    }

    // A fit on every size would throw away the user's zoom and pan each time a
    // pane moves.
    it('does not fit again when the box is resized afterwards', async () => {
      const { rerender } = await drawn()

      rerender(sized({ w: 500, h: 600 }, true))

      expect(getBBox).not.toHaveBeenCalled()
    })

    it('fits again when the box comes back from being laid out', async () => {
      const { rerender } = await drawn()

      rerender(sized({ w: 30, h: 658 }, true))
      expect(getBBox).not.toHaveBeenCalled()
      rerender(sized({ w: 422, h: 699 }, true))

      expect(getBBox).toHaveBeenCalled()
    })
  })
})
