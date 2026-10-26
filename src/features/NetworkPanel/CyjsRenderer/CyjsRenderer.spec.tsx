import { act, render, waitFor } from '@testing-library/react'
import type { Core } from 'cytoscape'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkStore } from '@/data/hooks/stores/NetworkStore'
import { useTableStore } from '@/data/hooks/stores/TableStore'
import { useViewModelStore } from '@/data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '@/data/hooks/stores/VisualStyleStore'
import { IdType } from '@/models/IdType'
import NetworkFn, { Network } from '@/models/NetworkModel'
import { Column } from '@/models/TableModel'
import { createTable } from '@/models/TableModel/impl/inMemoryTable'
import { createViewModel } from '@/models/ViewModel/impl/viewModelImpl'
import VisualStyleFn, {
  MappingFunctionType,
  VisualPropertyName,
} from '@/models/VisualStyleModel'
import { CyjsRenderer } from './CyjsRenderer'

// #861: renderNetwork's "already on screen" check never matched, so every
// style or table change removed and re-added every element on top of the
// incremental update in onStyleModelUpdate. Each of those renders also closed
// onStyleModelUpdate's write-back for one second, so a change made inside that
// window reached the canvas but never ViewModelStore. Topology changes are now
// detected with NetworkStore.topologyVersions rather than element counts, which
// missed a replacement of as many elements as were removed.
//
// This mounts the real renderer. jsdom has no canvas, so every Cytoscape.js
// instance is created headless; the instance the renderer creates for its
// container is captured to inspect what it shows. Assertions compare plain
// values: a failing matcher would try to print a Cytoscape.js collection,
// which references the whole instance and exhausts the heap.

const created = vi.hoisted(() => ({ instances: [] as Core[] }))

vi.mock('cytoscape', async (importOriginal) => {
  // `export =` module: its namespace's `default` is the factory itself.
  const actual = await importOriginal<{
    default: (options: Record<string, unknown>) => Core
  }>()
  const real = actual.default
  const headless = (options: Record<string, unknown> = {}): Core => {
    const cy = real({
      ...options,
      container: undefined,
      headless: true,
      styleEnabled: true,
    })
    if (options.container !== undefined) {
      created.instances.push(cy)
    }
    return cy
  }
  Object.assign(headless, real)
  return { ...actual, default: headless }
})

// Canvas-backed extensions and the resize observer have nothing to work on in
// jsdom.
vi.mock('./registerCyExtensions', () => ({ registerCyExtensions: () => {} }))
vi.mock('./annotations/cyjsAnnotationRenderer', () => ({
  createAnnotationLayers: () => ({
    attach: () => {},
    setAnnotations: () => {},
    setBackgroundColor: () => {},
    redraw: () => {},
    dispose: () => {},
  }),
}))
vi.mock('./useCenterAnchoredResize', () => ({
  useCenterAnchoredResize: () => {},
  panReferenceSize: () => null,
  setPanReferenceSize: () => {},
}))
vi.mock('./useNodeGraphicsSync', () => ({
  useNodeGraphicsSync: () => undefined,
}))

vi.mock('@/data/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/db')>()
  return {
    ...actual,
    putNetworkToDb: vi.fn().mockResolvedValue(undefined),
    putTablesToDb: vi.fn().mockResolvedValue(undefined),
    putVisualStyleToDb: vi.fn().mockResolvedValue(undefined),
    putNetworkViewsToDb: vi.fn().mockResolvedValue(undefined),
    putViewSelectionToDb: vi.fn().mockResolvedValue(undefined),
  }
})

const NETWORK_ID: IdType = 'redraw-net'
const nodeColumns: Column[] = [{ name: 'name', type: 'string' }]
const edgeColumns: Column[] = [{ name: 'interaction', type: 'string' }]

/**
 * A network `n1 -e1-> n2` (by default) with its tables, style and view, added
 * to the stores the way a loaded network is.
 */
const seed = (
  networkId: IdType = NETWORK_ID,
  nodeIds: IdType[] = ['n1', 'n2'],
): Network => {
  const network = NetworkFn.createNetworkFromLists(
    networkId,
    nodeIds.map((id) => ({ id })),
    [{ id: 'e1', s: nodeIds[0], t: nodeIds[1] }],
  )
  const vs = VisualStyleFn.createVisualStyle()
  vs.nodeLabel.mapping = {
    type: MappingFunctionType.Passthrough,
    attribute: 'name',
    visualPropertyType: 'string',
    defaultValue: '',
  }
  act(() => {
    useTableStore
      .getState()
      .add(
        networkId,
        createTable(
          `${networkId}-nodes`,
          nodeColumns,
          new Map(nodeIds.map((id) => [id, { name: id }])),
        ),
        createTable(
          `${networkId}-edges`,
          edgeColumns,
          new Map([['e1', { interaction: 'pp' }]]),
        ),
      )
    useVisualStyleStore.getState().add(networkId, vs)
    useNetworkStore.getState().add(network)
    useViewModelStore.getState().add(networkId, createViewModel(network))
  })
  return network
}

/** Mounts the renderer and waits until it shows the seeded network. */
const mount = async (network: Network) => {
  const view = render(<CyjsRenderer network={network} />)
  await waitFor(() => {
    expect(created.instances.at(-1)?.nodes().length).toBe(2)
  })
  return { ...view, cy: created.instances.at(-1)! }
}

const storedNodeValue = (
  nodeId: IdType,
  vp: VisualPropertyName,
  networkId: IdType = NETWORK_ID,
): unknown =>
  useViewModelStore
    .getState()
    .getViewModel(networkId)
    ?.nodeViews[nodeId]?.values.get(vp)

const setDefault = (
  vp: VisualPropertyName,
  value: number,
  networkId: IdType = NETWORK_ID,
): void => {
  act(() => {
    useVisualStyleStore.getState().setDefault(networkId, vp, value)
  })
}

const setName = (nodeId: IdType, name: string): void => {
  act(() => {
    useTableStore.getState().setValue(NETWORK_ID, 'node', nodeId, 'name', name)
  })
}

describe('CyjsRenderer read-only mode', () => {
  beforeEach(() => {
    created.instances.length = 0
    useNetworkStore.setState({
      networks: new Map(),
      topologyVersions: new Map(),
    } as any)
    useTableStore.setState({ tables: {} } as any)
    useVisualStyleStore.setState({ visualStyles: {} } as any)
    useViewModelStore.setState({ viewModels: {} } as any)
  })

  it('disables graph editing while allowing pan and zoom', async () => {
    const network = seed()
    render(<CyjsRenderer network={network} readOnly />)

    await waitFor(() => {
      expect(created.instances.length).toBeGreaterThan(0)
    })

    const cy = created.instances.at(-1)!

    expect(cy.autoungrabify()).toBe(true)
    expect(cy.autounselectify()).toBe(true)
    expect(cy.boxSelectionEnabled()).toBe(false)
    expect(cy.userPanningEnabled()).toBe(true)
    expect(cy.userZoomingEnabled()).toBe(true)
  })
})

describe('CyjsRenderer style and table updates (regression: #861)', () => {
  beforeEach(() => {
    created.instances.length = 0
    useNetworkStore.setState({
      networks: new Map(),
      topologyVersions: new Map(),
    } as any)
    useTableStore.setState({ tables: {} } as any)
    useVisualStyleStore.setState({ visualStyles: {} } as any)
    useViewModelStore.setState({ viewModels: {} } as any)
  })

  it('updates the elements on screen instead of redrawing them', async () => {
    const { cy } = await mount(seed())
    const n1 = cy.getElementById('n1')[0]
    const e1 = cy.getElementById('e1')[0]

    setDefault(VisualPropertyName.NodeWidth, 40)
    setName('n1', 'renamed')

    // A full render removes every element and adds a new one in its place.
    expect(cy.getElementById('n1')[0] === n1).toBe(true)
    expect(cy.getElementById('e1')[0] === e1).toBe(true)
    expect(cy.getElementById('n1').data(VisualPropertyName.NodeWidth)).toBe(40)
    expect(cy.getElementById('n1').data(VisualPropertyName.NodeLabel)).toBe(
      'renamed',
    )
  })

  it('writes back every change, however quickly they follow each other', async () => {
    const { cy } = await mount(seed())

    // No waiting between changes: each used to land inside the one-second
    // window the previous render had opened.
    setDefault(VisualPropertyName.NodeWidth, 40)
    expect(storedNodeValue('n1', VisualPropertyName.NodeWidth)).toBe(40)

    setDefault(VisualPropertyName.NodeHeight, 70)
    expect(storedNodeValue('n1', VisualPropertyName.NodeHeight)).toBe(70)

    setName('n1', 'renamed')
    expect(storedNodeValue('n1', VisualPropertyName.NodeLabel)).toBe('renamed')
    expect(storedNodeValue('n1', VisualPropertyName.NodeWidth)).toBe(40)
    expect(cy.getElementById('n1').data(VisualPropertyName.NodeHeight)).toBe(70)
  })

  it('still draws nodes and edges added to the network', async () => {
    const { cy } = await mount(seed())

    act(() => {
      useNetworkStore
        .getState()
        .addNodesAndEdges(NETWORK_ID, ['n3'], [{ id: 'e2', s: 'n2', t: 'n3' }])
    })

    await waitFor(() => {
      expect(cy.nodes().length).toBe(3)
    })
    expect(cy.edges().length).toBe(2)
  })

  it('redraws a replacement of as many elements as were removed', async () => {
    const { cy } = await mount(seed())

    // One edge out, one in: every count is unchanged, which the count-based
    // guard and trigger could not see. e1 stayed on screen and e2 never
    // appeared.
    act(() => {
      useNetworkStore.getState().deleteEdges(NETWORK_ID, ['e1'])
      useNetworkStore.getState().addEdge(NETWORK_ID, 'e2', 'n2', 'n1')
      useViewModelStore.getState().deleteObjects(NETWORK_ID, ['e1'])
      useViewModelStore
        .getState()
        .addEdgeView(NETWORK_ID, { id: 'e2', values: new Map() })
    })

    await waitFor(() => {
      expect(cy.getElementById('e2').length).toBe(1)
    })
    expect(cy.getElementById('e1').length).toBe(0)
    expect(cy.getElementById('e2').source().id()).toBe('n2')
    expect(cy.edges().length).toBe(1)
  })

  it('redraws in full when handed another network', async () => {
    const { cy, rerender } = await mount(seed())
    const other = seed('other-net', ['m1', 'm2', 'm3'])

    rerender(<CyjsRenderer network={other} />)

    await waitFor(() => {
      expect(cy.nodes().length).toBe(3)
    })
    expect(cy.getElementById('n1').length).toBe(0)

    // Changes now go to the network on screen, not the one before it.
    setDefault(VisualPropertyName.NodeWidth, 55, 'other-net')
    expect(
      storedNodeValue('m1', VisualPropertyName.NodeWidth, 'other-net'),
    ).toBe(55)
    expect(cy.getElementById('m1').data(VisualPropertyName.NodeWidth)).toBe(55)
  })
})
