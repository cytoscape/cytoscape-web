import { CircularProgress, Typography } from '@mui/material'
import Box from '@mui/material/Box'
import Cytoscape, {
  Core,
  EdgeSingular,
  EventObject,
  NodeSingular,
  Position,
  SingularElementArgument,
} from 'cytoscape'
import debounce from 'lodash/debounce'
import { ReactElement, useEffect, useRef, useState } from 'react'

import { useLayoutStore } from '../../../data/hooks/stores/LayoutStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useRendererFunctionStore } from '../../../data/hooks/stores/RendererFunctionStore'
import { useRendererStore } from '../../../data/hooks/stores/RendererStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useCreateEdge } from '../../../data/hooks/useCreateEdge'
import { useCreateNode } from '../../../data/hooks/useCreateNode'
import { useUndoStack } from '../../../data/hooks/useUndoStack'
import { logUi, registerDebugTool } from '../../../debug'
import { isHCX } from '../../../features/HierarchyViewer/utils/hierarchyUtil'
import { CX_ANNOTATIONS_KEY } from '../../../models/CxModel/impl/extractor'
import { DisplayMode } from '../../../models/FilterModel/DisplayMode'
import { IdType } from '../../../models/IdType'
import { Network } from '../../../models/NetworkModel'
import type { ResolvedNodeGraphics } from '../../../models/StoreModel/NodeGraphicsStoreModel'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { NetworkView, NodeView } from '../../../models/ViewModel'
import VisualStyleFn, { VisualStyle } from '../../../models/VisualStyleModel'
import { NetworkViewSources } from '../../../models/VisualStyleModel/VisualStyleFn'
// Type-only: a value import here would pull PdfExportForm (and the whole
// export-form graph) past the ExportImage lazy boundary into this chunk.
import type {
  Orientation,
  PaperSize,
} from '../../ToolBar/DataMenu/ExportNetworkToImage/PdfExportForm'
import { createAnnotationLayers } from './annotations/cyjsAnnotationRenderer'
import { addCyElements } from './cyjsFactoryUtil'
import { applyViewModel, createCyjsDataMapper } from './cyjsRenderUtil'
import {
  EDGE_CREATION_MODE_OFF,
  EdgeCreationModeState,
  isEdgeCreationTarget,
  resolveEdgeCreationTap,
} from './edgeCreationMode'
import { ContextMenuState, NetworkContextMenu } from './NetworkContextMenu'
import { applyNodeGraphics, resetNodeGraphics } from './nodeGraphicsApply'
import { registerCyExtensions } from './registerCyExtensions'
import { useNodeGraphicsSync } from './useNodeGraphicsSync'
import { isGraphVisible } from './viewportRecovery'

registerCyExtensions()

interface NetworkRendererProps {
  network?: Network

  /**
   * How to display the selections.
   *
   * If "select", then the selected objects will be highlighted.
   * If "show_hide", then the selected objects will be shown and
   * the others will be hidden.
   */
  displayMode?: DisplayMode

  hasTab?: boolean
}

/**
 *
 * @returns
 */
const CyjsRenderer = ({
  network,
  hasTab = false,
}: NetworkRendererProps): ReactElement => {
  const id = network?.id as IdType

  // ============================================================================
  //                            CyjsRenderer Local State
  // ============================================================================

  // Stores the drag start position of the node when the user starts dragging
  const dragStartPosition = useRef<Map<IdType, { x: number; y: number }>>(
    new Map(),
  )

  // Hover state
  const [hoveredElement, setHoveredElement] = useState<IdType | undefined>(
    undefined,
  )
  const [lastHoveredElement, setLastHoveredElement] = useState<
    IdType | undefined
  >(undefined)

  // Annotation canvases. They belong to the Cytoscape instance, not to a single
  // render: `cyCanvas()` appends a new canvas on every call, so creating them
  // per render left a frozen copy behind each time (issue #675).
  const annotationLayersRef = useRef<any>(null)

  // Cytoscape instance and container ref
  const [cy, setCy] = useState<any>(null)
  const cyContainer = useRef(null)

  // Avoid duplicate initialization of Cyjs
  const isInitialized = useRef(false)

  // Holds the instance created by the mount effect: the `cy` state variable
  // is still null in that effect's closure, so cleanup must destroy via this
  // ref instead.
  const cyInstance = useRef<Core | null>(null)

  // Used to avoid unnecessary style updates during initialization
  const isViewCreated = useRef(false)

  // Cytoscape style
  const [cyStyle, setCyStyle] = useState<any[]>([])

  // Avoid unnecessary re-rendering / fit
  const [nodesMoved, setNodesMoved] = useState<boolean>(false)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    anchorPosition: null,
    networkPosition: null,
    clickedNodeId: null,
    clickedEdgeId: null,
    networkId: id,
  })

  // Edge creation mode state
  const [edgeCreationMode, setEdgeCreationMode] =
    useState<EdgeCreationModeState>(EDGE_CREATION_MODE_OFF)

  // When cxttap fires, the MUI Menu opens and its backdrop renders before the
  // browser's contextmenu event fires. The contextmenu event then targets the
  // MUI backdrop (not cy-container), so a contains() check would miss it.
  // Solution: set this flag in the cxttap handler; the document listener uses
  // it to suppress the very next contextmenu event, then clears the flag.
  const suppressNextContextMenu = useRef(false)

  // Suppress the browser's native context menu after a Cytoscape right-click.
  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (suppressNextContextMenu.current) {
        suppressNextContextMenu.current = false
        e.preventDefault()
      }
    }
    document.addEventListener('contextmenu', handler, true)
    return () => document.removeEventListener('contextmenu', handler, true)
  }, [])

  // Close context menu when left-clicking outside of it.
  // MUI's backdrop click does not work here because Cytoscape's mousedown
  // handler calls e.preventDefault() on the canvas, which prevents the
  // browser click event from reaching the MUI Modal backdrop.
  // We use a document mousedown listener instead.
  useEffect(() => {
    if (!contextMenu.open) return
    const handleMouseDown = (e: MouseEvent): void => {
      if (e.button !== 0) return // left-click only; right-click reopens the menu
      const target = e.target as Element | null
      if (target !== null && target.closest('[role="menu"]') !== null) return
      setContextMenu((prev) => ({ ...prev, open: false }))
    }
    document.addEventListener('mousedown', handleMouseDown, true)
    return () =>
      document.removeEventListener('mousedown', handleMouseDown, true)
  }, [contextMenu.open])

  // Reset edge creation mode when switching networks
  useEffect(() => {
    setEdgeCreationMode(EDGE_CREATION_MODE_OFF)
  }, [id])
  // Ref to track edge creation mode for event handlers
  const edgeCreationModeRef = useRef(edgeCreationMode)
  edgeCreationModeRef.current = edgeCreationMode
  useEffect(() => {
    logUi.info('[CyjsRenderer] edgeCreationMode state changed', {
      active: edgeCreationMode.active,
      sourceNodeId: edgeCreationMode.sourceNodeId,
    })

    // Leaving the mode does not move the pointer, so the node under it keeps
    // its target highlight until an unrelated mouseout: clear it here instead.
    if (!edgeCreationMode.active && cy !== null) {
      cy.nodes().removeClass('edge-creation-target')
    }

    // Apply cursor style to Cytoscape container when edge creation mode changes
    if (cy !== null && cyContainer.current) {
      const container = cy.container()
      if (container) {
        if (edgeCreationMode.active) {
          logUi.info(
            '[CyjsRenderer] Applying crosshair cursor to Cytoscape container',
          )
          container.style.cursor = 'crosshair'
        } else {
          logUi.info(
            '[CyjsRenderer] Removing crosshair cursor from Cytoscape container',
          )
          container.style.cursor = 'default'
        }
      }
    }
  }, [edgeCreationMode, cy])

  // Creation hooks
  const { createNode } = useCreateNode()
  const { createEdge } = useCreateEdge()
  const createEdgeRef = useRef(createEdge)
  createEdgeRef.current = createEdge

  // ============================================================================
  //                            Application Store State
  // ============================================================================
  // This section contains all state selectors and actions for accessing and
  // updating application-wide models and view state from various stores.
  // These include network view models, visual styles, tables, summaries,
  // selection state, viewport state, undo/redo, and debug flags.
  // ============================================================================

  // Active network view id from UI state
  const activeNetworkId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )
  // Ref to keep track of the current active network id
  const activeNetworkIdRef = useRef(activeNetworkId)
  useEffect(() => {
    activeNetworkIdRef.current = activeNetworkId
  }, [activeNetworkId])

  // View model store actions and selectors
  const setViewModel = useViewModelStore((state) => state.add)
  const getViewModel: (id: IdType) => NetworkView | undefined =
    useViewModelStore((state) => state.getViewModel)
  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const toggleSelected = useViewModelStore((state) => state.toggleSelected)
  const setNodePosition: (
    networkId: IdType,
    nodeId: IdType,
    position: [number, number],
  ) => void = useViewModelStore((state) => state.setNodePosition)

  // Visual style store selectors
  const visualStyles = useVisualStyleStore((state) => state.visualStyles)

  // Visual editor properties from UI state
  const visualEditorProperties = useUiStateStore(
    (state) => state.ui?.visualStyleOptions?.[id]?.visualEditorProperties,
  )

  // Table and summary stores
  const tables = useTableStore((state) => state.tables)
  const summaries = useNetworkSummaryStore((state) => state.summaries)

  // Renderer function and viewport state
  const setRendererFunction = useRendererFunctionStore(
    (state) => state.setFunction,
  )
  const deleteFunctionsForNetwork = useRendererFunctionStore(
    (state) => state.deleteFunctionsForNetwork,
  )
  const setViewport = useRendererStore((state) => state.setViewport)
  const getViewport = useRendererStore((state) => state.getViewport)

  // Undo/redo stack for post-edit actions
  const { postEdit } = useUndoStack()
  const postEditRef = useRef(postEdit)
  postEditRef.current = postEdit

  // Layout running state from layout store
  let isRunning: boolean = useLayoutStore((state) => state.isRunning)
  if (activeNetworkId !== id) {
    isRunning = false
  }

  const networkView: NetworkView | undefined = getViewModel(id)
  const vs: VisualStyle = visualStyles[id]

  const idRef = useRef<IdType>(id)
  idRef.current = id
  const networkViewRef = useRef<NetworkView | undefined>(networkView)
  networkViewRef.current = networkView

  const table = tables[id]
  const summary = summaries[id]

  // App-supplied per-node images. Applied as Cytoscape.js element style
  // bypasses, never as element data — see nodeGraphicsApply.ts for why, and for
  // why they cannot reach CX2.
  const nodeGraphics = useNodeGraphicsSync(id)
  const nodeGraphicsRef = useRef<
    Record<IdType, ResolvedNodeGraphics> | undefined
  >(nodeGraphics)
  nodeGraphicsRef.current = nodeGraphics

  /**
   * Renders the Cytoscape.js network visualization based on the current network data, view, and visual style.
   *
   * This function is responsible for:
   *   - Clearing and re-initializing the Cytoscape.js instance with the latest network and style data.
   *   - Applying the current visual style to the network.
   *   - Adding nodes and edges to the Cytoscape.js instance.
   *   - Restoring or fitting the viewport as appropriate.
   *   - Setting up all relevant event listeners for user interaction, including:
   *       - Box selection
   *       - Single selection (tap)
   *       - Node dragging (grab/dragfree)
   *       - Mouseover/mouseout for hover effects
   *       - Viewport changes (zoom/pan)
   *   - Rendering network annotations if present.
   *   - Managing selection state and hover state.
   *   - Ensuring undo/redo support for node movement.
   *
   * @param {boolean} [forceFit=true] - If true, fits the network to the viewport if no saved viewport is found.
   *                                    If false, only restores the saved viewport or leaves the view unchanged.
   *
   * The function is idempotent: if the network and view have not changed, it will return early and do nothing.
   */
  const renderNetwork = (forceFit: boolean = true): void => {
    // Early exit if Cytoscape instance is not ready or network data is absent
    if (network === undefined || cy === null) {
      return
    }

    // The node/edge tables and the visual style are dereferenced unconditionally
    // below. A network can be present without them: `cyNetworks`, `cyTables` and
    // `cyVisualStyles` are separate IndexedDB rows, so cross-tab hydration can
    // deliver them in different batches, and a delete can remove them while this
    // renderer is still mounted. NetworkPanel already waits for the tables before
    // mounting; this is the backstop for the other mount paths (NetworkTabs) and
    // for data disappearing mid-session.
    if (table === undefined || vs === undefined) {
      logUi.info(
        `[${CyjsRenderer.name}]: Skipping render of ${id} — table or visual style not loaded yet`,
      )
      return
    }

    cy.startBatch()
    cy.remove('*')

    // The elements holding the node-graphics bypasses are gone, so the overlay
    // must be re-applied in full below rather than diffed against a stale copy.
    resetNodeGraphics(cy)

    // Prepare the data sources for visual style application
    const data: NetworkViewSources = {
      network,
      networkView,
      nodeTable: table.nodeTable,
      edgeTable: table.edgeTable,
      visualStyle: vs,
    }

    // Apply the visual style to the network view model
    const updatedNetworkView: NetworkView = VisualStyleFn.applyVisualStyle(data)
    const { nodeViews, edgeViews } = updatedNetworkView

    // Add nodes and edges to Cytoscape.js (with raw data)
    addCyElements(cy, Object.values(nodeViews), network.edges, edgeViews)

    // Apply transformations and visual editor property overrides via view model
    applyViewModel(cy, updatedNetworkView, visualEditorProperties)

    // Generate and set the Cytoscape.js style
    const newStyle = createCyjsDataMapper(vs)
    setCyStyle(newStyle)

    // Restore selection state for nodes and edges
    const selectedNodes = networkView?.selectedNodes ?? []
    const selectedEdges = networkView?.selectedEdges ?? []

    cy.nodes()
      .filter((ele: SingularElementArgument) => {
        return selectedNodes.includes(ele.data('id'))
      })
      .select()
    cy.edges()
      .filter((ele: SingularElementArgument) => {
        return selectedEdges.includes(ele.data('id'))
      })
      .select()

    // --- Annotation Rendering ---

    // Extract CX annotations from the network summary
    const annotations = (summary?.properties ?? []).filter(
      (p) => p.predicateString === CX_ANNOTATIONS_KEY,
    )

    // Prepare CX format for annotation rendering
    const niceCXForCyAnnotationRendering = {
      networkAttributes: {
        elements: annotations.map((a) => {
          return {
            n: CX_ANNOTATIONS_KEY,
            v: !Array.isArray(a.value) ? [a.value] : a.value,
          }
        }),
      },
    }

    // Swap the annotation data on the canvases created with the Cytoscape instance
    const annotationLayers = annotationLayersRef.current
    if (annotationLayers !== null) {
      annotationLayers.setAnnotations(niceCXForCyAnnotationRendering)
      annotationLayers.attach()
      annotationLayers.redraw()
    }

    // --- Finalize Rendering ---

    // End Cytoscape.js batch operation
    cy.endBatch()

    // Apply the computed style to Cytoscape.js
    cy.style(newStyle)

    // Must follow cy.style(): node.width()/height() feed the SVG size wrapper
    // and only report correct values once the new stylesheet is installed.
    applyNodeGraphics(cy, nodeGraphicsRef.current)

    // Restore saved viewport if available, otherwise fit the network if forceFit is true
    const savedViewport = getViewport('cyjs', id)
    if (savedViewport) {
      cy.zoom(savedViewport.zoom)
      cy.pan(savedViewport.pan)
    } else if (forceFit) {
      cy.fit()
    }

    // Mark the view as created
    isViewCreated.current = true
  }

  /**
   * Effect: Render the new network when the `network` prop changes.
   * e.g. when the users click another network in the workspace, the new network is loaded and this effect is triggered.
   */
  useEffect(
    function onLoadNewNetwork() {
      if (id === '' || cy === null) return
      renderNetwork()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on network prop; the [cy] effect covers instance creation
    [network],
  )

  /**
   * Effect: Triggers a redraw of the Cytoscape network when nodes or edges change in the network.
   */
  useEffect(
    function onNetworkElementsAdded() {
      if (network === undefined || id === '' || cy === null) {
        return
      }
      if (!isViewCreated.current) {
        return
      }

      const cyNodeIds = new Set(
        cy.nodes().map((n: SingularElementArgument) => n.data('id')),
      )
      const cyEdgeIds = new Set(
        cy.edges().map((e: SingularElementArgument) => e.data('id')),
      )

      const nodesChanged =
        network.nodes.length !== cyNodeIds.size ||
        network.nodes.some((n) => !cyNodeIds.has(n.id))
      const edgesChanged =
        network.edges.length !== cyEdgeIds.size ||
        network.edges.some((e) => !cyEdgeIds.has(e.id))

      if (nodesChanged || edgesChanged) {
        renderNetwork(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- element identity and counts trigger redraw
    [network?.nodes, network?.edges],
  )

  /**
   * Effect: Updates the Cytoscape.js rendered style and view model when relevant application state changes.
   *
   * This effect is triggered whenever the visual style (`vs`), table data (`table`), or
   * visual editor properties (`visualEditorProperties`) change. It applies the computed
   * visual style to the Cytoscape.js instance, updates the node and edge styles,
   * and persists the updated view model.
   *
   * Note: `networkView` must NOT be a dependency — this effect writes it via
   * setViewModel with a new object each run, so adding it would loop forever.
   */
  useEffect(
    function onStyleModelUpdate() {
      if (
        network === undefined ||
        cy === null ||
        table === undefined ||
        vs === undefined ||
        !isViewCreated.current ||
        cyStyle.length === 0
      ) {
        return
      }
      cy.startBatch()

      const data: NetworkViewSources = {
        network,
        networkView,
        nodeTable: table.nodeTable,
        edgeTable: table.edgeTable,
        visualStyle: vs,
      }
      const updatedNetworkView: NetworkView =
        VisualStyleFn.applyVisualStyle(data)
      // Apply style from view model
      applyViewModel(cy, updatedNetworkView, visualEditorProperties)

      cy.endBatch()
      if (cyStyle.length > 0) {
        cy.style(cyStyle)
      }

      // Reapplying the stylesheet does not clear element bypasses, but it does
      // reset node sizes, so re-run the apply to resize any SVG images.
      applyNodeGraphics(cy, nodeGraphicsRef.current)

      // Store the key-value pair in the local IndexedDB
      setViewModel(id, updatedNetworkView)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- style/table triggers only; networkView is written here (loop)
    [vs, table, visualEditorProperties],
  )

  /**
   * Effect: Paints app-supplied node images as they arrive.
   *
   * `useNodeGraphicsSync` runs render hooks in chunks across animation frames,
   * so most images land after the render that triggered them. The two apply
   * calls inside renderNetwork and onStyleModelUpdate only catch images that
   * already existed; this effect catches the rest.
   *
   * Cheap to run: applyNodeGraphics diffs against the last applied overlay and
   * returns immediately when nothing changed.
   */
  useEffect(
    function onNodeGraphicsChange() {
      if (cy === null) return
      applyNodeGraphics(cy, nodeGraphics)
    },
    [nodeGraphics, cy],
  )

  /**
   * Effect: Synchronizes Cytoscape node elements with the application's nodeViews.
   * Updates node positions
   * Removes Cytoscape.js nodes not present in the view model
   * e.g. when a user deletes nodes from the network, the Cytoscape nodes are removed.
   * and fits the network if appropriate.
   *
   * Note: `nodesMoved` is a consume-once flag reset by this effect and must
   * NOT be a dependency — re-firing on its reset would run the position sync
   * and potential cy.fit() that the flag exists to suppress after a drag.
   */
  useEffect(
    function onNodePositionAndNodeDeletion() {
      const viewModel = getViewModel(id)
      if (viewModel === undefined || cy === null) {
        return
      }

      // If nodes were moved manually, skip auto-fit and reset flag
      if (nodesMoved) {
        setNodesMoved(false)
        return
      }

      // Update node positions and remove nodes not in the view model
      const { nodeViews } = viewModel
      const viewCount = Object.keys(nodeViews).length
      const cyNodeCount = cy.nodes().length
      cy.nodes().forEach((cyNode: NodeSingular) => {
        const cyNodeId = cyNode.data('id')
        if (nodeViews[cyNodeId] === undefined) {
          cy.remove(cyNode)
        } else {
          cyNode.position({
            x: nodeViews[cyNodeId].x,
            y: nodeViews[cyNodeId].y,
          })
        }
      })
      if (viewCount === cyNodeCount) {
        // Only fit if no saved viewport exists, otherwise preserve the current
        // viewport — unless the new positions have moved the graph completely
        // out of frame, which is the one case where holding the camera still
        // leaves the user staring at blank canvas.
        const savedViewport = getViewport('cyjs', id)
        if (!savedViewport || !isGraphVisible(cy)) {
          cy.fit()
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on nodeViews; nodesMoved is a consume-once flag
    [networkView?.nodeViews],
  )

  /**
   * Effect: Synchronizes Cytoscape edge elements with the application's edgeViews.
   * Removes Cytoscape.js edges not present in the current view model.
   * e.g. when a user deletes edges from the network, the Cytoscape edges are removed.
   */
  useEffect(
    function onEdgeDeletion() {
      const viewModel = getViewModel(id)
      if (viewModel === undefined || cy === null) {
        return
      }

      const { edgeViews } = viewModel
      // Remove edges not present in the view model
      cy.edges().forEach((cyEdge: EdgeSingular) => {
        const cyEdgeId = cyEdge.data('id')
        if (edgeViews[cyEdgeId] === undefined) {
          cy.remove(cyEdge)
        }
      })
    },
    [networkView?.edgeViews, cy, id, getViewModel],
  )

  /**
   * Effect: Applies or removes the 'hover' class on Cytoscape elements
   * when the hovered element changes. Ensures only the currently hovered
   * element is visually highlighted, and the previous one is un-highlighted.
   */
  useEffect(
    function onHover() {
      if (cy === null) {
        return
      }

      if (hoveredElement !== undefined) {
        // Remove hover class from the previously hovered element, if any
        if (lastHoveredElement !== undefined) {
          const lastEle = cy.getElementById(lastHoveredElement)
          if (lastEle !== undefined) {
            lastEle.removeClass('hover')
          }
        }
        // Add hover class to the newly hovered element
        const ele = cy.getElementById(hoveredElement)
        if (ele !== undefined) {
          ele.addClass('hover')
          setLastHoveredElement(hoveredElement)
        }
      }
    },
    [hoveredElement, lastHoveredElement, cy],
  )

  /**
   * Synchronize Cytoscape.js selection state with application-level selection state.
   * Ensures that the visual selection in Cytoscape matches the selection in the view model.
   * e.g. when a user changes the selected nodes or edges from the network, the Cytoscape nodes and edges are updated.
   */
  useEffect(
    function onElementSelection() {
      if (cy === null || networkView === undefined || networkView === null) {
        return
      }

      const { selectedNodes, selectedEdges } = networkView

      // Helper functions
      const getCurrentSelection = () => {
        const currentEdgesToCompare: string[] = cy
          .edges(':selected')
          .map((ele: any) => ele.data('id'))

        return {
          nodes: cy.nodes(':selected').map((ele: any) => ele.data('id')),
          edges: currentEdgesToCompare,
        }
      }

      const hasSelectionChanged = (current: {
        nodes: string[]
        edges: string[]
      }) => {
        // Check if selection actually changed to avoid unnecessary updates
        const nodesChanged =
          selectedNodes.length !== current.nodes.length ||
          !selectedNodes.every((id) => current.nodes.includes(id))
        const edgesChanged =
          selectedEdges.length !== current.edges.length ||
          !selectedEdges.every((id) => current.edges.includes(id))
        return nodesChanged || edgesChanged
      }

      const clearAllSelection = () => {
        cy.elements().unselect()
        cy.elements().show()
      }

      const updateNodeSelection = () => {
        if (selectedNodes.length === 0) {
          cy.nodes().unselect()
        } else {
          cy.nodes().show().unselect()
          cy.nodes()
            .filter((ele: SingularElementArgument) =>
              selectedNodes.includes(ele.data('id')),
            )
            .select()
        }
      }

      const updateEdgeSelection = () => {
        if (selectedEdges.length === 0) {
          cy.edges().unselect()
        } else {
          cy.edges().show()
          cy.edges()
            .filter((ele: SingularElementArgument) =>
              selectedEdges.includes(ele.data('id')),
            )
            .select()
        }
      }

      // Check if selection actually changed to avoid unnecessary updates
      const currentSelection = getCurrentSelection()
      if (!hasSelectionChanged(currentSelection)) {
        return
      }

      // Handle clear selection case
      if (selectedNodes.length === 0 && selectedEdges.length === 0) {
        clearAllSelection()
        return
      }

      // Update selections
      updateNodeSelection()
      updateEdgeSelection()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selection fields are the intended granularity; whole networkView would resync on every view mutation
    [networkView?.selectedNodes, networkView?.selectedEdges],
  )

  /**
   * Initialize Cytoscape.js instance on mount and clean up on unmount.
   */
  useEffect(function initializeCyjsRenderer() {
    if (!isInitialized.current) {
      isInitialized.current = true
      const cy: Core = Cytoscape({
        container: cyContainer.current,
        hideEdgesOnViewport: true,
        boxSelectionEnabled: true,
      })
      cyInstance.current = cy

      // One annotation canvas set per instance, reused by every render.
      annotationLayersRef.current = createAnnotationLayers(cy)

      const unregisterDebugTool = registerDebugTool('cy', cy)
      setCy(cy)

      return () => {
        unregisterDebugTool()
        annotationLayersRef.current?.dispose()
        annotationLayersRef.current = null
        cyInstance.current?.destroy()
        cyInstance.current = null
        isInitialized.current = false
      }
    }

    return () => {
      // Reset the guard so a StrictMode remount recreates the instance.
      annotationLayersRef.current?.dispose()
      annotationLayersRef.current = null
      cyInstance.current?.destroy()
      cyInstance.current = null
      isInitialized.current = false
    }
  }, [])

  /**
   * Register persistent canvas interaction event listeners on Cytoscape instance.
   */
  useEffect(
    function setupCyEventListeners() {
      if (cy === null) return

      // Box selection
      const boxEndHandler = debounce(() => {
        const currentId = idRef.current
        const selectedNodes: IdType[] = []
        const selectedEdges: IdType[] = []
        cy.elements()
          .filter((e: SingularElementArgument) => e.selected())
          .forEach((ele: SingularElementArgument) => {
            const eleId: string = ele.data('id')
            if (ele.isNode()) {
              selectedNodes.push(eleId)
            } else {
              selectedEdges.push(eleId)
            }
          })
        exclusiveSelect(currentId, selectedNodes, selectedEdges)
      }, 100)
      cy.on('boxend', boxEndHandler)

      // General tap (selection & edge creation)
      const generalTapHandler = (e: EventObject, extraParams?: any): void => {
        const activeId: string = activeNetworkIdRef.current
        const currentId = idRef.current
        const currentMode = edgeCreationModeRef.current
        const extraObj = Array.isArray(extraParams)
          ? extraParams[0]
          : extraParams
        const targetNode =
          extraObj?.targetNode ??
          extraObj?.target ??
          (e as any)?.targetNode ??
          e.target
        const targetIsNode =
          typeof targetNode?.isNode === 'function' && targetNode.isNode()
        const targetIsEdge =
          typeof targetNode?.isEdge === 'function' && targetNode.isEdge()

        if (currentMode.active) {
          if (targetNode === cy) {
            setEdgeCreationMode(EDGE_CREATION_MODE_OFF)
            return
          }
          if (targetIsNode) {
            e.stopPropagation?.()
            e.stopImmediatePropagation?.()
            const endpoints = resolveEdgeCreationTap(
              currentMode,
              targetNode.data('id'),
            )
            if (endpoints !== null) {
              const { sourceNodeId, targetNodeId } = endpoints
              setEdgeCreationMode(EDGE_CREATION_MODE_OFF)
              createEdgeRef.current(currentId, sourceNodeId, targetNodeId, {
                attributes: {},
              })
            }
            return
          }
        }

        const shiftOrMetaKeyPressed =
          e.originalEvent?.shiftKey || e.originalEvent?.metaKey

        if (
          activeId !== undefined &&
          activeId !== '' &&
          currentId !== '' &&
          currentId !== activeId
        ) {
          if (cy.autounselectify() === false) {
            cy.autounselectify(true)
          }
          return
        }

        if (e.target === cy) {
          if (shiftOrMetaKeyPressed === false) {
            exclusiveSelect(currentId, [], [])
          }
        } else if (targetIsNode || targetIsEdge) {
          if (shiftOrMetaKeyPressed) {
            toggleSelected(currentId, [e.target.data('id')])
          } else {
            const selectedNodes: IdType[] = []
            const selectedEdges: IdType[] = []
            if (targetIsNode) {
              selectedNodes.push(e.target.data('id'))
            } else if (targetIsEdge) {
              selectedEdges.push(e.target.data('id'))
            }
            exclusiveSelect(currentId, selectedNodes, selectedEdges)
          }
        }
        cy.autounselectify(false)
      }
      cy.on('tap', generalTapHandler)

      // Right-click context menu
      const cxtTapHandler = (e: EventObject): void => {
        const currentId = idRef.current
        const activeId: string = activeNetworkIdRef.current

        const targetIsNode =
          typeof e.target.isNode === 'function' && e.target.isNode()
        const targetIsEdge =
          typeof e.target.isEdge === 'function' && e.target.isEdge()

        logUi.info('[CyjsRenderer] cxttap event fired', {
          target: e.target,
          isNode: targetIsNode,
          isEdge: targetIsEdge,
          isCore: e.target === cy,
        })

        e.originalEvent?.preventDefault()

        if (
          activeId !== undefined &&
          activeId !== '' &&
          currentId !== '' &&
          currentId !== activeId
        ) {
          return
        }

        const containerElement = cy.container()
        if (!containerElement) return

        const clientX = e.originalEvent?.clientX ?? 0
        const clientY = e.originalEvent?.clientY ?? 0

        let networkPosition: [number, number] = [0, 0]
        const eventPos = (e as any).position
        if (
          eventPos &&
          typeof eventPos.x === 'number' &&
          !isNaN(eventPos.x) &&
          typeof eventPos.y === 'number' &&
          !isNaN(eventPos.y)
        ) {
          networkPosition = [eventPos.x, eventPos.y]
        } else {
          const rect = containerElement.getBoundingClientRect()
          const xInContainer = clientX - rect.left
          const yInContainer = clientY - rect.top
          const pos = cy
            .renderer()
            .projectIntoViewport(xInContainer, yInContainer)
          networkPosition = [
            typeof pos.x === 'number' && !isNaN(pos.x) ? pos.x : 0,
            typeof pos.y === 'number' && !isNaN(pos.y) ? pos.y : 0,
          ]
        }

        let clickedNodeId: IdType | null = null
        let clickedEdgeId: IdType | null = null

        if (targetIsNode) {
          clickedNodeId = e.target.data('id')
        } else if (targetIsEdge) {
          clickedEdgeId = e.target.data('id')
        }

        suppressNextContextMenu.current = true
        setContextMenu({
          open: true,
          anchorPosition: { top: clientY, left: clientX },
          networkPosition: clickedNodeId === null ? networkPosition : null,
          clickedNodeId,
          clickedEdgeId,
          networkId: currentId,
        })
      }
      cy.on('cxttap', cxtTapHandler)

      // Grab
      const grabHandler = (e: EventObject): void => {
        const targetNode = e.target
        if (typeof targetNode.isNode !== 'function' || !targetNode.isNode())
          return

        const nodeId: IdType = targetNode.data('id')
        const position = targetNode.position()
        const nodeView: NodeView | undefined =
          networkViewRef.current?.nodeViews[nodeId]
        if (nodeView !== undefined) {
          dragStartPosition.current.set(nodeId, { ...position })
        }
      }
      cy.on('grab', 'node', grabHandler)

      // Dragfree
      const dragfreeHandler = (e: EventObject): void => {
        const currentId = idRef.current
        setNodesMoved(true)

        const targetNode: NodeSingular = e.target as NodeSingular
        const nodeId: IdType = targetNode.data('id')
        const position: Position = targetNode.position()

        const startPos: { x: number; y: number } | undefined =
          dragStartPosition.current.get(nodeId)

        let undoPosition: [number, number]
        if (startPos !== undefined) {
          undoPosition = [startPos.x, startPos.y]
        } else {
          const nodeView: NodeView | undefined =
            networkViewRef.current?.nodeViews[nodeId]
          if (nodeView !== undefined) {
            undoPosition = [nodeView.x, nodeView.y]
          } else {
            undoPosition = [0, 0]
          }
        }

        dragStartPosition.current.delete(nodeId)
        setNodePosition(currentId, nodeId, [position.x, position.y])
        postEditRef.current(
          UndoCommandType.MOVE_NODES,
          `Move Nodes`,
          [currentId, nodeId, undoPosition],
          [currentId, nodeId, [position.x, position.y]],
        )
      }
      cy.on('dragfree', 'node', dragfreeHandler)

      // Mouseover / Mouseout
      const mouseOverHandler = (e: EventObject): void => {
        const targetNode = e.target
        setHoveredElement(targetNode.data('id'))

        const currentMode = edgeCreationModeRef.current
        const targetIsNode =
          typeof targetNode.isNode === 'function' && targetNode.isNode()
        if (
          isEdgeCreationTarget(
            currentMode,
            targetIsNode ? targetNode.data('id') : null,
          )
        ) {
          targetNode.addClass('edge-creation-target')
        }
      }
      const mouseOutHandler = (e: EventObject): void => {
        const target = e.target
        target.removeClass('hover')
        target.removeClass('edge-creation-target')
        setHoveredElement(undefined)
      }
      cy.on('mouseover', 'node, edge', mouseOverHandler)
      cy.on('mouseout', 'node, edge', mouseOutHandler)

      // Viewport tracking
      const viewportChangeHandler = debounce((): void => {
        const zoom = cy.zoom()
        const pan = cy.pan()
        const newViewport = {
          zoom,
          pan: { x: pan.x, y: pan.y },
        }
        setViewport('cyjs', idRef.current, newViewport)
      }, 300)
      cy.on('viewport', viewportChangeHandler)

      return () => {
        boxEndHandler.cancel()
        viewportChangeHandler.cancel()
        cy.off('boxend', boxEndHandler)
        cy.off('tap', generalTapHandler)
        cy.off('cxttap', cxtTapHandler)
        cy.off('grab', 'node', grabHandler)
        cy.off('dragfree', 'node', dragfreeHandler)
        cy.off('mouseover', 'node, edge', mouseOverHandler)
        cy.off('mouseout', 'node, edge', mouseOutHandler)
        cy.off('viewport', viewportChangeHandler)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- store actions and refs are stable, listeners re-bind only when cy changes
    [cy],
  )

  /**
   * Re-render network when Cytoscape instance changes.
   *
   * Effect-event pattern: the ref always points at the latest renderNetwork
   * closure, so the effect below fires only when `cy` changes (its intended
   * trigger) while still calling an up-to-date renderNetwork.
   */
  const renderNetworkRef = useRef(renderNetwork)
  useEffect(() => {
    renderNetworkRef.current = renderNetwork
  })

  useEffect(
    function onCyJsRendererChange() {
      if (cy !== null) {
        renderNetworkRef.current()
      }
    },
    [cy],
  )

  /**
   * Effect: render once the table and visual style arrive.
   *
   * `renderNetwork` bails when either is missing (they are separate IndexedDB
   * rows, so cross-tab hydration can deliver them after the network). Without
   * this, nothing would re-trigger the render and the canvas would stay blank —
   * none of the other render triggers watch these two.
   */
  useEffect(
    function onNetworkDataCompleted() {
      if (cy === null || table === undefined || vs === undefined) {
        return
      }
      renderNetworkRef.current()
    },
    [cy, table, vs],
  )

  /**
   * Registers renderer functions for the current Cytoscape.js instance and network id.
   *
   * This effect runs every time the Cytoscape instance (`cy`) or the network id (`id`) changes.
   * It exposes a set of renderer functions (fit, exportPng, exportPdf, exportSvg, width, height)
   * to a global renderer function registry, allowing other components to invoke these functions
   * for the currently active network view.
   *
   * By registering these functions with the current network id, other parts of the application
   * can trigger actions such as fitting the network to the viewport, exporting images, or
   * querying the rendered dimensions, even if they do not have direct access to the Cytoscape instance.
   */
  useEffect(
    function registerCyJsRendererFunctions() {
      const fitFunction = (): void => {
        if (cy !== null) {
          // Use double requestAnimationFrame pattern to ensure DOM updates are complete.
          // This is a common pattern to ensure that the fit happens after the layout
          // has been applied and the DOM has been updated with the new positions.
          // The first requestAnimationFrame ensures that the layout changes are applied,
          // and the second one ensures that the DOM has been updated before the
          // fit function call.
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              cy.fit()
            })
          })
        }
      }

      const exportPngFunction = (
        fullBg: boolean,
        customWidth: number,
        customHeight: number,
        transparentBg: boolean,
      ): string => {
        if (cy !== null) {
          const opt: any = {
            full: fullBg,
            maxWidth: customWidth,
            maxHeight: customHeight,
          }

          if (!transparentBg) {
            opt.bg = 'white'
          }

          const result = cy.png(opt)
          return result
        } else {
          return ''
        }
      }

      const exportPdfFunction = async (
        fullBg: boolean,
        paperSize: PaperSize,
        orientation: Orientation,
        margin: number,
        customWidth?: number,
        customHeight?: number,
      ): Promise<Blob> => {
        if (cy !== null) {
          // Dynamically import and register export extensions only when needed
          const { registerExportExtensions } = await import(
            '../../ToolBar/DataMenu/ExportNetworkToImage/registerCyImageExportExtensions'
          )
          registerExportExtensions()

          const result = cy.pdf({
            paperSize,
            orientation,
            full: fullBg,
            margin,
            width: customWidth,
            height: customHeight,
            debug: false,
          })

          return result
        } else {
          return Promise.resolve(new Blob())
        }
      }

      const exportSvgFunction = async (fullBg: boolean): Promise<Blob> => {
        if (cy !== null) {
          // Dynamically import and register export extensions only when needed
          const { registerExportExtensions } = await import(
            '../../ToolBar/DataMenu/ExportNetworkToImage/registerCyImageExportExtensions'
          )
          registerExportExtensions()

          const result = cy.svg({
            scale: 1,
            full: fullBg,
            background: 'white',
          })

          const svgBlob = new Blob([result], { type: 'image/svg+xml' })

          return svgBlob
        } else {
          return new Blob()
        }
      }

      const widthFunction = (): number => {
        if (cy !== null) {
          return cy.width()
        } else {
          return 0
        }
      }

      const heightFunction = (): number => {
        if (cy !== null) {
          return cy.height()
        } else {
          return 0
        }
      }

      // Register all renderer functions for the current network id
      setRendererFunction('cyjs', 'fit', fitFunction, id)
      setRendererFunction('cyjs', 'exportPng', exportPngFunction, id)
      setRendererFunction('cyjs', 'exportPdf', exportPdfFunction, id)
      setRendererFunction('cyjs', 'exportSvg', exportSvgFunction, id)
      setRendererFunction('cyjs', 'width', widthFunction, id)
      setRendererFunction('cyjs', 'height', heightFunction, id)

      return () => {
        deleteFunctionsForNetwork(id)
      }
    },
    [cy, id, setRendererFunction, deleteFunctionsForNetwork],
  )

  // Context menu handlers
  const handleContextMenuClose = (): void => {
    logUi.info('[CyjsRenderer] handleContextMenuClose called')
    setContextMenu({
      open: false,
      anchorPosition: null,
      networkPosition: null,
      clickedNodeId: null,
      clickedEdgeId: null,
      networkId: id,
    })
  }

  const handleCreateNodeFromContext = (position: [number, number]): void => {
    logUi.info('[CyjsRenderer] handleCreateNodeFromContext called', {
      position,
    })
    // Create node directly with default empty attributes
    createNode(id, position, { attributes: {} })
  }

  const handleCreateEdgeFromNode = (sourceNodeId: IdType): void => {
    logUi.info('[CyjsRenderer] handleCreateEdgeFromNode called', {
      sourceNodeId,
    })
    // Enter edge creation mode
    logUi.info(
      '[CyjsRenderer] handleCreateEdgeFromNode: Setting edge creation mode to active',
    )
    setEdgeCreationMode({ active: true, sourceNodeId })
    logUi.info(
      '[CyjsRenderer] handleCreateEdgeFromNode: Edge creation mode set, cursor should change to crosshair',
    )

    // Immediately apply cursor to container if available
    if (cy !== null) {
      const container = cy.container()
      if (container) {
        logUi.info(
          '[CyjsRenderer] handleCreateEdgeFromNode: Applying crosshair cursor immediately',
        )
        container.style.cursor = 'crosshair'
      }
    }

    // Log instructions for user
    logUi.info(
      '[CyjsRenderer] Edge creation mode activated! Click on another node to create an edge.',
    )
  }

  // Handle ESC key to cancel edge creation mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && edgeCreationMode.active) {
        setEdgeCreationMode(EDGE_CREATION_MODE_OFF)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [edgeCreationMode.active])

  // Handle background click to cancel edge creation mode
  useEffect(() => {
    if (!cy || !edgeCreationMode.active) return

    const handleBackgroundClick = (e: EventObject): void => {
      if (e.target === cy) {
        setEdgeCreationMode(EDGE_CREATION_MODE_OFF)
      }
    }

    cy.on('tap', handleBackgroundClick)
    return () => {
      cy.off('tap', handleBackgroundClick)
    }
  }, [cy, edgeCreationMode.active])

  if (network === undefined) {
    return <></>
  }

  return (
    <>
      {isRunning ? (
        <Box
          sx={{
            display: 'flex',
            position: 'absolute',
            alignItems: 'center',
            top: hasTab ? '4em' : '1em',
            left: '1em',
            zIndex: 2000,
          }}
        >
          <CircularProgress size={40} />
          <Typography variant="h6" sx={{ marginLeft: '1em' }}>
            Applying layout...
          </Typography>
        </Box>
      ) : null}
      <Box
        data-testid="cyjs-renderer"
        sx={{
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0)',
          overflow: 'hidden',
          zIndex: 0,
          // Cursor is applied directly to Cytoscape container via useEffect
          cursor: edgeCreationMode.active ? 'crosshair' : 'default',
        }}
        id="cy-container"
        ref={cyContainer}
      />
      {edgeCreationMode.active && (
        <Box
          sx={{
            position: 'absolute',
            top: '1em',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '0.5em 1em',
            overflow: 'hidden',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          Edge creation mode: Click on a node to create an edge (ESC to cancel)
        </Box>
      )}
      <NetworkContextMenu
        contextMenu={contextMenu}
        networkView={networkView}
        onClose={handleContextMenuClose}
        onCreateNode={handleCreateNodeFromContext}
        onCreateEdgeFromNode={handleCreateEdgeFromNode}
        isHierarchy={summary ? isHCX(summary) : false}
      />
    </>
  )
}

export { CyjsRenderer }
