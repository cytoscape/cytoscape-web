import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useLayoutStore } from '@/data/hooks/stores/LayoutStore'
import { useNetworkStore } from '@/data/hooks/stores/NetworkStore'
import { useRendererFunctionStore } from '@/data/hooks/stores/RendererFunctionStore'
import { useRendererStore } from '@/data/hooks/stores/RendererStore'
import { useTableStore } from '@/data/hooks/stores/TableStore'
import { useUiStateStore } from '@/data/hooks/stores/UiStateStore'
import { useUndoStore } from '@/data/hooks/stores/UndoStore'
import { useViewModelStore } from '@/data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '@/data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { IdType } from '@/models/IdType'
import NetworkFn, { Network } from '@/models/NetworkModel'
import { UndoCommandType } from '@/models/StoreModel/UndoStoreModel'
import { ValueTypeName } from '@/models/TableModel/ValueTypeName'
import VisualStyleFn, { VisualPropertyName } from '@/models/VisualStyleModel'
import { createStyleSet } from '@/models/VisualStyleModel/impl/visualStyleSetImpl'
import { CyjsRenderer } from './CyjsRenderer'
import { ensureCyExtensions } from './__testUtils__/renderCyjs'

vi.mock('@/data/db', () => ({
  putNetworkToDb: vi.fn().mockResolvedValue(undefined),
  putTablesToDb: vi.fn().mockResolvedValue(undefined),
  putVisualStyleToDb: vi.fn().mockResolvedValue(undefined),
  putVisualStyleSetToDb: vi.fn().mockResolvedValue(undefined),
  deleteNetworkFromDb: vi.fn().mockResolvedValue(undefined),
  clearNetworksFromDb: vi.fn().mockResolvedValue(undefined),
  deleteTablesFromDb: vi.fn().mockResolvedValue(undefined),
  clearTablesFromDb: vi.fn().mockResolvedValue(undefined),
  deleteVisualStyleFromDb: vi.fn().mockResolvedValue(undefined),
  clearVisualStyleFromDb: vi.fn().mockResolvedValue(undefined),
  putUndoRedoStackToDb: vi.fn().mockResolvedValue(undefined),
  putViewModelToDb: vi.fn().mockResolvedValue(undefined),
  deleteViewModelFromDb: vi.fn().mockResolvedValue(undefined),
  putNetworkViewsToDb: vi.fn().mockResolvedValue(undefined),
  deleteNetworkViewsFromDb: vi.fn().mockResolvedValue(undefined),
  clearNetworkViewsFromDb: vi.fn().mockResolvedValue(undefined),
  putViewSelectionToDb: vi.fn().mockResolvedValue(undefined),
  putUiStateToDb: vi.fn().mockResolvedValue(undefined),
}))

const NETWORK_ID: IdType = 'test-network-1'

const emptyTable = (id: IdType) => ({
  id,
  columns: [{ name: 'name', type: ValueTypeName.String }],
  rows: new Map(),
})

const createTestNetwork = (id: IdType = NETWORK_ID): Network =>
  NetworkFn.createNetworkFromLists(
    id,
    [{ id: 'n1' }, { id: 'n2' }],
    [{ id: 'e1', s: 'n1', t: 'n2' }],
  )

const getCyFromContainer = (container: HTMLElement) => {
  const cyDom = container.querySelector('#cy-container') as any
  return cyDom?._cyreg?.cy
}

const seedAllStores = (id: IdType = NETWORK_ID, network?: Network) => {
  const net = network ?? createTestNetwork(id)
  useNetworkStore.setState({
    networks: new Map([[id, net]]),
    topologyVersions: new Map(),
  } as any)

  useTableStore.setState({
    tables: {
      [id]: {
        nodeTable: emptyTable(`${id}-nodes`) as any,
        edgeTable: emptyTable(`${id}-edges`) as any,
      },
    },
  } as any)

  const vs = VisualStyleFn.createVisualStyle()
  useVisualStyleStore.setState({
    visualStyles: { [id]: vs },
    styleSets: {},
  } as any)

  useViewModelStore.setState({
    viewModels: {
      [id]: [
        {
          id,
          nodeViews: {
            n1: { id: 'n1', x: 0, y: 0, values: new Map() },
            n2: { id: 'n2', x: 100, y: 100, values: new Map() },
          },
          edgeViews: {
            e1: { id: 'e1', values: new Map() },
          },
          selectedNodes: [],
          selectedEdges: [],
        },
      ],
    },
  } as any)

  useWorkspaceStore.setState({
    workspace: {
      currentNetworkId: id,
    },
  } as any)

  useUiStateStore.setState({
    ui: {
      activeNetworkView: id,
      visualStyleOptions: {},
    },
  } as any)

  useRendererStore.setState({
    viewports: {},
  } as any)

  useRendererFunctionStore.setState({
    rendererFunctions: new Map(),
    rendererFunctionsByNetworkId: new Map(),
  } as any)

  useUndoStore.setState({
    undoRedoStacks: {},
  } as any)

  useLayoutStore.setState({
    isRunning: false,
  } as any)
}

describe('CyjsRenderer (Component Integration)', () => {
  beforeEach(() => {
    ensureCyExtensions()
    seedAllStores()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('renders base Cytoscape canvases and registers renderer functions', () => {
    const { container } = render(
      <CyjsRenderer network={createTestNetwork()} hasTab={false} />,
    )

    const cy = getCyFromContainer(container)
    expect(cy).toBeDefined()
    expect(cy.nodes().length).toBe(2)
    expect(cy.edges().length).toBe(1)

    // Base Cytoscape canvases + 2 annotation canvases = 5
    expect(container.querySelectorAll('canvas').length).toBe(5)

    const fitFn = useRendererFunctionStore
      .getState()
      .getFunction('cyjs', 'fit', NETWORK_ID)
    expect(fitFn).toBeDefined()
  })

  it('cleans up renderer functions and Cytoscape instance on unmount (Defect F)', () => {
    const { unmount } = render(
      <CyjsRenderer network={createTestNetwork()} hasTab={false} />,
    )

    expect(
      useRendererFunctionStore
        .getState()
        .getFunction('cyjs', 'fit', NETWORK_ID),
    ).toBeDefined()

    unmount()

    expect(
      useRendererFunctionStore
        .getState()
        .getFunction('cyjs', 'fit', NETWORK_ID),
    ).toBeUndefined()
  })

  it('debounces boxend selection events properly (Defect A)', () => {
    vi.useFakeTimers()
    const exclusiveSelectSpy = vi.spyOn(
      useViewModelStore.getState(),
      'exclusiveSelect',
    )

    const { container } = render(
      <CyjsRenderer network={createTestNetwork()} hasTab={false} />,
    )

    const cy = getCyFromContainer(container)
    expect(cy).toBeDefined()

    // Select node in Cytoscape and emit first boxend
    cy.$('#n1').select()
    cy.emit('boxend')

    // Advance 50ms (before 100ms debounce expires)
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(exclusiveSelectSpy).not.toHaveBeenCalled()

    // Emit second boxend at t=50ms (resets/extends the 100ms debounce window to t=150ms)
    cy.emit('boxend')

    // Advance another 60ms (t=110ms total, 60ms since second emit)
    act(() => {
      vi.advanceTimersByTime(60)
    })
    // With 100ms debounce extending the window, it has not fired yet
    expect(exclusiveSelectSpy).not.toHaveBeenCalled()

    // Advance another 50ms past the second debounce window (t=160ms total, 110ms since second emit)
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(exclusiveSelectSpy).toHaveBeenCalledTimes(1)
  })

  it('applies visual style updates immediately without mount timer drops (Defect C)', () => {
    vi.useFakeTimers()
    const { container } = render(
      <CyjsRenderer network={createTestNetwork()} hasTab={false} />,
    )

    const cy = getCyFromContainer(container)
    expect(cy).toBeDefined()

    // Initial node color before mutation
    expect(cy.$('#n1').data('nodeBackgroundColor')).not.toBe('#ff00ff')

    // Mutate visual style immediately (at t=0ms, without advancing fake timers)
    act(() => {
      useVisualStyleStore
        .getState()
        .setDefault(
          NETWORK_ID,
          VisualPropertyName.NodeBackgroundColor,
          '#ff00ff',
        )
    })

    // Assert style is updated immediately without requiring 1000ms timer expiration
    expect(cy.$('#n1').data('nodeBackgroundColor')).toBe('#ff00ff')
  })

  it('renders updated elements when nodes are swapped (Defect D)', () => {
    const initialNetwork = createTestNetwork()
    const { container, rerender } = render(
      <CyjsRenderer network={initialNetwork} hasTab={false} />,
    )

    const cy = getCyFromContainer(container)
    expect(cy.$('#n1').length).toBe(1)
    expect(cy.$('#n2').length).toBe(1)
    expect(cy.$('#n3').length).toBe(0)

    // Swap n1 with n3 in the network prop (same element count: 2 nodes)
    const swappedNetwork: Network = {
      id: NETWORK_ID,
      nodes: [{ id: 'n2' }, { id: 'n3' }],
      edges: [],
    }

    act(() => {
      useNetworkStore.setState({
        networks: new Map([[NETWORK_ID, swappedNetwork]]),
      } as any)
    })

    rerender(<CyjsRenderer network={swappedNetwork} hasTab={false} />)

    expect(cy.$('#n3').length).toBe(1)
    expect(cy.$('#n1').length).toBe(0)
  })

  it('retains background tap listener in edge creation mode after re-render (Defect E)', () => {
    const { container, rerender } = render(
      <CyjsRenderer network={createTestNetwork()} hasTab={false} />,
    )

    const cy = getCyFromContainer(container)
    expect(cy).toBeDefined()

    // Right-click node n1 to trigger context menu
    act(() => {
      cy.$('#n1').emit('cxttap', {
        originalEvent: {
          clientX: 100,
          clientY: 100,
          preventDefault: () => {},
        },
      })
    })

    // Click "Create Edge" in the context menu
    const createEdgeMenuItem = screen.getByText(/Create Edge from this Node/i)
    act(() => {
      createEdgeMenuItem.click()
    })

    // Edge creation mode banner should now be visible
    expect(screen.getByText(/Edge Creation Mode/i)).toBeDefined()

    // Force component re-render
    rerender(<CyjsRenderer network={createTestNetwork()} hasTab={false} />)

    // Tap canvas background
    act(() => {
      cy.emit('tap', { target: cy, originalEvent: {} })
    })

    // Edge creation mode banner should be dismissed
    expect(screen.queryByText(/Edge Creation Mode/i)).toBeNull()
  })

  it('preserves multi-style sets without reset on render (Defect G)', () => {
    const vs1 = VisualStyleFn.createVisualStyle()
    const vs2 = VisualStyleFn.createVisualStyle()
    const styleSet = createStyleSet(vs1)
    styleSet.styles['style-2'] = {
      id: 'style-2',
      name: 'Second Style',
      visualStyle: vs2,
    }

    useVisualStyleStore.setState({
      visualStyles: { [NETWORK_ID]: vs1 },
      styleSets: { [NETWORK_ID]: styleSet },
    } as any)

    render(<CyjsRenderer network={createTestNetwork()} hasTab={false} />)

    // Style set in store must remain intact with 2 styles
    const storedSet = useVisualStyleStore.getState().styleSets[NETWORK_ID]
    expect(storedSet).toBeDefined()
    expect(Object.keys(storedSet.styles).length).toBe(2)
  })

  it('prioritizes saved viewport from RendererStore over default fit', () => {
    useRendererStore.getState().setViewport('cyjs', NETWORK_ID, {
      zoom: 3.14,
      pan: { x: 123, y: 456 },
    })

    const { container } = render(
      <CyjsRenderer network={createTestNetwork()} hasTab={false} />,
    )

    const cy = getCyFromContainer(container)
    expect(cy.zoom()).toBe(3.14)
    expect(cy.pan()).toEqual({ x: 123, y: 456 })
  })

  it('gates layout progress spinner on active network ID', () => {
    useLayoutStore.setState({ isRunning: true })

    // When network is active
    useUiStateStore.setState({
      ui: { activeNetworkView: NETWORK_ID, visualStyleOptions: {} },
    } as any)
    const { container: activeContainer, unmount } = render(
      <CyjsRenderer network={createTestNetwork(NETWORK_ID)} hasTab={false} />,
    )
    expect(
      activeContainer.querySelector('.MuiCircularProgress-root'),
    ).not.toBeNull()
    unmount()

    // When network is not active
    useUiStateStore.setState({
      ui: { activeNetworkView: 'other-network', visualStyleOptions: {} },
    } as any)
    const { container: inactiveContainer } = render(
      <CyjsRenderer network={createTestNetwork(NETWORK_ID)} hasTab={false} />,
    )
    expect(
      inactiveContainer.querySelector('.MuiCircularProgress-root'),
    ).toBeNull()
  })

  it('safely skips render when table or visual style is missing (Store Hydration Guard)', () => {
    useTableStore.setState({ tables: {} } as any)
    useVisualStyleStore.setState({ visualStyles: {} } as any)

    expect(() => {
      render(<CyjsRenderer network={createTestNetwork()} hasTab={false} />)
    }).not.toThrow()
  })

  it('synchronizes selection between Cytoscape and ViewModelStore', () => {
    const { container } = render(
      <CyjsRenderer network={createTestNetwork()} hasTab={false} />,
    )

    const cy = getCyFromContainer(container)

    // Store update -> Cytoscape selection
    act(() => {
      useViewModelStore.getState().exclusiveSelect(NETWORK_ID, ['n1'], [])
    })

    expect(cy.$('#n1').selected()).toBe(true)
    expect(cy.$('#n2').selected()).toBe(false)
  })

  it('tracks node movement on dragfree and registers undo command', () => {
    const { container } = render(
      <CyjsRenderer network={createTestNetwork()} hasTab={false} />,
    )

    const cy = getCyFromContainer(container)
    const n1 = cy.$('#n1')

    // Simulate grab and dragfree
    act(() => {
      n1.emit('grab')
      n1.position({ x: 50, y: 75 })
      n1.emit('dragfree')
    })

    const updatedViewModel = useViewModelStore
      .getState()
      .getViewModel(NETWORK_ID)
    expect(updatedViewModel?.nodeViews['n1'].x).toBe(50)
    expect(updatedViewModel?.nodeViews['n1'].y).toBe(75)

    const undoStack =
      useUndoStore.getState().undoRedoStacks[NETWORK_ID]?.undoStack
    expect(undoStack).toBeDefined()
    expect(undoStack?.length).toBeGreaterThan(0)
    expect(undoStack?.[undoStack.length - 1]?.undoCommand).toBe(
      UndoCommandType.MOVE_NODES,
    )
  })

  it('triggers cy.fit when node positions move off-screen (Viewport Recovery)', () => {
    // Set a saved viewport
    useRendererStore.getState().setViewport('cyjs', NETWORK_ID, {
      zoom: 1,
      pan: { x: 0, y: 0 },
    })

    const { container } = render(
      <CyjsRenderer network={createTestNetwork()} hasTab={false} />,
    )

    const cy = getCyFromContainer(container)
    const fitSpy = vi.spyOn(cy, 'fit')

    // Move all nodes far off-screen
    act(() => {
      useViewModelStore.setState({
        viewModels: {
          [NETWORK_ID]: [
            {
              id: NETWORK_ID,
              nodeViews: {
                n1: { id: 'n1', x: 50000, y: 50000, values: new Map() },
                n2: { id: 'n2', x: 50100, y: 50100, values: new Map() },
              },
              edgeViews: {
                e1: { id: 'e1', values: new Map() },
              },
              selectedNodes: [],
              selectedEdges: [],
            },
          ],
        },
      } as any)
    })

    expect(fitSpy).toHaveBeenCalled()
  })

  it('re-creates single active instance on StrictMode remount without leaking canvases', () => {
    const { container, unmount } = render(
      <CyjsRenderer network={createTestNetwork()} hasTab={false} />,
    )

    expect(container.querySelectorAll('canvas').length).toBe(5)
    unmount()

    const { container: container2 } = render(
      <CyjsRenderer network={createTestNetwork()} hasTab={false} />,
    )

    expect(container2.querySelectorAll('canvas').length).toBe(5)
  })

  it('cancels pending debounces on unmount to prevent state corruption (Item 3)', () => {
    vi.useFakeTimers()
    const exclusiveSelectSpy = vi.spyOn(
      useViewModelStore.getState(),
      'exclusiveSelect',
    )
    const setViewportSpy = vi.spyOn(useRendererStore.getState(), 'setViewport')

    const { container, unmount } = render(
      <CyjsRenderer network={createTestNetwork()} hasTab={false} />,
    )

    const cy = getCyFromContainer(container)
    expect(cy).toBeDefined()

    // Clear initial mount-time calls before testing unmount debounce cancellation
    exclusiveSelectSpy.mockClear()
    setViewportSpy.mockClear()

    // Emit boxend and viewport events
    cy.$('#n1').select()
    cy.emit('boxend')
    cy.emit('viewport')

    // Unmount before 100ms / 300ms debounce timers expire
    unmount()

    // Advance timers past all debounce windows
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Debounced actions must be cancelled and not fire post-unmount
    expect(exclusiveSelectSpy).not.toHaveBeenCalled()
    expect(setViewportSpy).not.toHaveBeenCalled()
  })

  it('uses fresh createEdge hook reference when nodes are added post-mount (Item 1)', () => {
    const initialNetwork = createTestNetwork()
    const { container, rerender } = render(
      <CyjsRenderer network={initialNetwork} hasTab={false} />,
    )

    const cy = getCyFromContainer(container)
    expect(cy).toBeDefined()

    // Add node n3 to stores post-mount
    const updatedNetwork: Network = NetworkFn.createNetworkFromLists(
      NETWORK_ID,
      [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
      [{ id: 'e1', s: 'n1', t: 'n2' }],
    )

    act(() => {
      useNetworkStore.setState({
        networks: new Map([[NETWORK_ID, updatedNetwork]]),
        topologyVersions: new Map(),
      } as any)

      const currentTable = useTableStore.getState().tables[NETWORK_ID]
      currentTable.nodeTable.rows.set('n3', { id: 'n3' })
      useTableStore.setState({
        tables: { [NETWORK_ID]: currentTable },
      } as any)

      const currentVm = useViewModelStore.getState().getViewModel(NETWORK_ID)
      if (currentVm) {
        currentVm.nodeViews['n3'] = {
          id: 'n3',
          x: 100,
          y: 100,
          values: new Map(),
        }
        useViewModelStore.setState({
          viewModels: { [NETWORK_ID]: [currentVm] },
        } as any)
      }
    })

    act(() => {
      rerender(<CyjsRenderer network={updatedNetwork} hasTab={false} />)
    })

    expect(cy.$('#n3').length).toBe(1)

    // Context menu on n1 -> Create Edge
    act(() => {
      cy.$('#n1').emit('cxttap', {
        originalEvent: { clientX: 50, clientY: 50, preventDefault: () => {} },
      })
    })

    const createEdgeMenuItem = screen.getByText(/Create Edge from this Node/i)
    act(() => {
      fireEvent.click(createEdgeMenuItem)
    })

    expect(screen.getByText(/Edge Creation Mode/i)).toBeDefined()

    // Tap on newly added node n3
    act(() => {
      cy.emit('tap', [{ targetNode: cy.getElementById('n3') }])
    })

    // Verify new edge was created successfully in the network store
    const networkInStore = useNetworkStore.getState().networks.get(NETWORK_ID)
    const newEdge = networkInStore?.edges.find(
      (e) => (e.s === 'n1' && e.t === 'n3') || (e.s === 'n3' && e.t === 'n1'),
    )
    expect(newEdge).toBeDefined()
  })
})
