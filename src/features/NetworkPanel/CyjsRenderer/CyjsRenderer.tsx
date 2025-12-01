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
import debounce from 'lodash.debounce'
import {
  ReactElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { AppConfigContext } from '../../../AppConfigContext'
import { useLayoutStore } from '../../../data/hooks/stores/LayoutStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useRendererFunctionStore } from '../../../data/hooks/stores/RendererFunctionStore'
import { useRendererStore } from '../../../data/hooks/stores/RendererStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useUndoStack } from '../../../data/hooks/useUndoStack'
import { CX_ANNOTATIONS_KEY } from '../../../models/CxModel/impl/extractor'
import { DisplayMode } from '../../../models/FilterModel/DisplayMode'
import { IdType } from '../../../models/IdType'
import { Network } from '../../../models/NetworkModel'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { NetworkView, NodeView } from '../../../models/ViewModel'
import VisualStyleFn, { VisualStyle } from '../../../models/VisualStyleModel'
import { NetworkViewSources } from '../../../models/VisualStyleModel/VisualStyleFn'
import {
  Orientation,
  PaperSize,
} from '../../ToolBar/DataMenu/ExportNetworkToImage/PdfExportForm'
import { CxToCyCanvas } from './annotations/cyjsAnnotationRenderer'
import { addCyElements } from './cyjsFactoryUtil'
import { applyViewModel, createCyjsDataMapper } from './cyjsRenderUtil'
import { registerCyExtensions } from './registerCyExtensions'

registerCyExtensions()
import { logUi } from '../../../debug'

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
  displayMode = DisplayMode.SELECT,
  hasTab = false,
}: NetworkRendererProps): ReactElement => {
  if (network === undefined) {
    return <></>
  }
  const { id } = network

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

  // Canvas layer state for annotation layers, to clear previous network layers before rendering the next network
  const [annotationLayers, setAnnotationLayers] = useState<any[]>([])

  // Cytoscape instance and container ref
  const [cy, setCy] = useState<any>(null)
  const cyContainer = useRef(null)

  // Avoid duplicate initialization of Cyjs
  const isInitialized = useRef(false)

  // Used to avoid unnecessary style updates during initialization
  const isViewCreated = useRef(false)

  // Cytoscape style and rendered network id
  const [cyStyle, setCyStyle] = useState<any[]>([])
  const [renderedId, setRenderedId] = useState<string>('')

  // Avoid unnecessary re-rendering / fit
  const [nodesMoved, setNodesMoved] = useState<boolean>(false)

  // Reference to viewport change handler for temporary removal during undo/redo
  const viewportChangeHandlerRef = useRef<any>(null)

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

  // Visual style store actions and selectors
  const setVisualStyle = useVisualStyleStore((state) => state.add)
  const visualStyles = useVisualStyleStore((state) => state.visualStyles)

  // Visual editor properties from UI state
  const visualEditorProperties = useUiStateStore(
    (state) => state.ui.visualStyleOptions[id]?.visualEditorProperties,
  )

  // Table and summary stores
  const tables = useTableStore((state) => state.tables)
  const summaries = useNetworkSummaryStore((state) => state.summaries)

  // Renderer function and viewport state
  const setRendererFunction = useRendererFunctionStore(
    (state) => state.setFunction,
  )
  const setViewport = useRendererStore((state) => state.setViewport)
  const getViewport = useRendererStore((state) => state.getViewport)

  // Undo/redo stack for post-edit actions
  const { postEdit } = useUndoStack()

  // Debug flag from app config context
  const { debug } = useContext(AppConfigContext)

  // Layout running state from layout store
  let isRunning: boolean = useLayoutStore((state) => state.isRunning)
  if (activeNetworkId !== id) {
    isRunning = false
  }

  const networkView: NetworkView | undefined = getViewModel(id)
  const vs: VisualStyle = visualStyles[id]

  // Background color state
  const [bgColor, setBgColor] = useState<string>('#FFFFFF')
  useEffect(() => {
    if (vs?.networkBackgroundColor !== undefined) {
      setBgColor(vs.networkBackgroundColor.defaultValue as string)
    } else {
      setBgColor('#FFFFFF')
    }
  }, [vs, isRunning])

  const table = tables[id]
  const summary = summaries[id]

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
    // Early exit if Cytoscape instance is not ready or the network/view has not changed
    if (
      cy === null ||
      (renderedId === id &&
        cy.nodes().length === networkView?.nodeViews.length &&
        cy.edges().length === networkView?.edgeViews.length)
    ) {
      return
    }

    // Mark the view as not yet created to avoid unnecessary style updates during initialization
    isViewCreated.current = false

    // Remove all event listeners and elements from the Cytoscape instance
    cy.removeAllListeners()
    cy.startBatch()
    cy.remove('*')

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

    // Add nodes and edges to Cytoscape.js
    addCyElements(
      cy,
      Object.values(nodeViews),
      network.edges,
      edgeViews,
      visualEditorProperties,
    )

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

    // --- Event Listeners ---

    // Box selection: handle selection after box selection ends (debounced)
    cy.on(
      'boxend',
      debounce((event: EventObject) => {
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
        exclusiveSelect(id, selectedNodes, selectedEdges)
      }),
      100,
    )

    // Single selection: handle tap events for background, nodes, and edges
    cy.on('tap', (e: EventObject) => {
      // Get the currently active network ID from the ref
      const activeId: string = activeNetworkIdRef.current

      // Determine if shift or meta key is pressed for multi-selection
      const shiftOrMetaKeyPressed =
        e.originalEvent.shiftKey || e.originalEvent.metaKey

      // If the active network is not the current one, prevent selection
      if (
        activeId !== undefined &&
        activeId !== '' &&
        id !== '' &&
        id !== activeId
      ) {
        if (cy.autounselectify() === false) {
          cy.autounselectify(true)
        }
        return
      }

      // Handle background click
      if (e.target === cy) {
        if (shiftOrMetaKeyPressed === false) {
          // Deselect all if no modifier key is pressed
          exclusiveSelect(id, [], [])
        }
      } else if (e.target.isNode() || e.target.isEdge()) {
        // Handle node or edge click
        if (shiftOrMetaKeyPressed) {
          toggleSelected(id, [e.target.data('id')])
        } else {
          const selectedNodes: IdType[] = []
          const selectedEdges: IdType[] = []
          if (e.target.isNode()) {
            selectedNodes.push(e.target.data('id'))
          } else {
            selectedEdges.push(e.target.data('id'))
          }
          exclusiveSelect(id, selectedNodes, selectedEdges)
        }
      }
      // Always re-enable selection after tap
      cy.autounselectify(false)
    })

    // --- Node Dragging ---

    // Record the node's position when dragging starts
    cy.on('grab', 'node', (e: EventObject): void => {
      const targetNode = e.target

      // Only proceed if the target is a node
      if (!targetNode.isNode()) return

      const nodeId: IdType = targetNode.data('id')
      const position = targetNode.position()
      const nodeView: NodeView | undefined = networkView?.nodeViews[nodeId]
      if (nodeView !== undefined) {
        dragStartPosition.current.set(nodeId, { ...position })
      }
    })

    // Handle node position update and undo/redo when dragging ends
    cy.on('dragfree', 'node', (e: EventObject): void => {
      // Set flag to avoid unnecessary fit
      setNodesMoved(true)

      // Get the Cytoscape.js node object and its ID
      const targetNode: NodeSingular = e.target as NodeSingular
      const nodeId: IdType = targetNode.data('id')

      // Get the new position from Cytoscape.js
      const position: Position = targetNode.position()

      // Get the original position recorded at drag start
      const startPos: { x: number; y: number } | undefined =
        dragStartPosition.current.get(nodeId)

      // Determine the undo position (original position)
      let undoPosition: [number, number]
      if (startPos !== undefined) {
        undoPosition = [startPos.x, startPos.y]
      } else {
        logUi.warn(
          `[${CyjsRenderer.name}]:[cy.on('dragfree', 'node')]: The start position of the node ${nodeId} is undefined. This should not happen.`,
        )
        // Fallback to the current position in the view model
        const nodeView: NodeView | undefined = networkView?.nodeViews[nodeId]
        if (nodeView !== undefined) {
          undoPosition = [nodeView.x, nodeView.y]
        } else {
          // Fallback to (0, 0) if the node view is also undefined
          undoPosition = [0, 0]
        }
      }

      // Remove the cached original position
      dragStartPosition.current.delete(nodeId)

      // Update the view model with the new position
      setNodePosition(id, nodeId, [position.x, position.y])

      // Record the undo action for node movement
      postEdit(
        UndoCommandType.MOVE_NODES,
        `Move Nodes`,
        [id, nodeId, undoPosition],
        [id, nodeId, [position.x, position.y]],
      )
    })

    // --- Hover Effects ---

    // Set hovered element on mouseover
    cy.on('mouseover', 'node, edge', (e: EventObject): void => {
      const targetNode = e.target
      setHoveredElement(targetNode.data('id'))
    })
    // Remove hover class and clear hovered element on mouseout
    cy.on('mouseout', 'node, edge', (e: EventObject): void => {
      const target = e.target
      target.removeClass('hover')
      setHoveredElement(undefined)
    })

    // --- Viewport Change Tracking ---

    /**
     * Handles viewport (zoom/pan) changes and updates the application state.
     * Debounced to avoid excessive updates.
     */
    const viewportChangeHandler = debounce((): void => {
      const zoom = cy.zoom()
      const pan = cy.pan()
      const newViewport = {
        zoom,
        pan: { x: pan.x, y: pan.y },
      }

      // Update viewport in the renderer store
      setViewport('cyjs', id, newViewport)
    }, 300)

    // Store the handler in a ref for later use
    viewportChangeHandlerRef.current = viewportChangeHandler
    cy.on('viewport', viewportChangeHandler)

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

    // Clear all annotation layers before rendering new ones
    annotationLayers.forEach((layer) => {
      const ctx = layer?.getCanvas()?.getContext('2d')
      if (ctx !== undefined) {
        layer.clear(ctx)
      }
    })

    // Set up annotation rendering utilities
    const annotationRenderer = new CxToCyCanvas()

    // Render annotations if present, otherwise clear annotation layers
    if (annotations.length > 0) {
      const result = annotationRenderer.drawAnnotationsFromNiceCX(
        cy,
        niceCXForCyAnnotationRendering,
      )
      annotationRenderer.drawBackground(cy, bgColor)

      setAnnotationLayers([result.topLayer, result.bottomLayer])
    } else {
      setAnnotationLayers([])
    }

    // --- Finalize Rendering ---

    // End Cytoscape.js batch operation
    cy.endBatch()

    // Apply the computed style to Cytoscape.js
    cy.style(newStyle)

    // Restore saved viewport if available, otherwise fit the network if forceFit is true
    const savedViewport = getViewport('cyjs', id)
    if (savedViewport) {
      cy.zoom(savedViewport.zoom)
      cy.pan(savedViewport.pan)
    } else if (forceFit) {
      cy.fit()
    }

    // Update the visual style in the application state
    setVisualStyle(id, vs)

    // Mark the view as created after a short delay to allow for rendering
    setTimeout(() => {
      isViewCreated.current = true
    }, 1000)
  }

  /**
   * Effect: Render the new network when the `network` prop changes.
   * e.g. when the users click another network in the workspace, the new network is loaded and this effect is triggered.
   */
  useEffect(
    function onLoadNewNetwork() {
      if (id === '' || cy === null) return
      isViewCreated.current = false
      renderNetwork()
      setRenderedId(id)
    },
    [network],
  )

  /**
   * Effect: Triggers a redraw of the Cytoscape network when the nodes or edges are added to the network.
   *
   * This effect monitors the counts of nodes and edges in both the Cytoscape instance and the application model.
   * If the model contains more nodes or edges than the current Cytoscape view (i.e., new elements have been added),
   * it invokes a redraw of the network (without fitting the view). The effect only runs if the view has already been created.
   */
  useEffect(
    function onNetworkElementsAdded() {
      if (id === '' || cy === null) {
        return
      }
      // Only redraw when the set of nodes or edges changes (e.g., elements are added)
      const cyNodeCount: number = cy.nodes().length
      const cyEdgeCount: number = cy.edges().length
      const modelNodeCount: number = network.nodes.length
      const modelEdgeCount: number = network.edges.length

      if (!isViewCreated.current) {
        return
      }

      // Redraw only when new nodes or edges are added to the model
      if (modelNodeCount > cyNodeCount || modelEdgeCount > cyEdgeCount) {
        renderNetwork(false)
      }
    },
    [network.nodes.length, network.edges.length],
  )

  /**
   * Effect: Updates the Cytoscape.js rendered style and view model when relevant application state changes.
   *
   * This effect is triggered whenever the visual style (`vs`), table data (`table`), or
   * visual editor properties (`visualEditorProperties`) change. It applies the computed
   * visual style to the Cytoscape.js instance, updates the node and edge styles,
   * and persists the updated view model.
   */
  useEffect(
    function onStyleModelUpdate() {
      if (
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

      // Store the key-value pair in the local IndexedDB
      setViewModel(id, updatedNetworkView)
    },
    [vs, table, visualEditorProperties],
  )

  /**
   * Effect: Synchronizes Cytoscape node elements with the application's nodeViews.
   * Updates node positions
   * Removes Cytoscape.js nodes not present in the view model
   * e.g. when a user deletes nodes from the network, the Cytoscape nodes are removed.
   * and fits the network if appropriate.
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
        // Only fit if no saved viewport exists, otherwise preserve the current viewport
        const savedViewport = getViewport('cyjs', id)
        if (!savedViewport) {
          cy.fit()
        }
      }
    },
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
    [networkView?.edgeViews],
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
    [hoveredElement, lastHoveredElement],
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

      if (debug) {
        window.debug.cy = cy
      }
      setCy(cy)
      renderNetwork()
    }

    return () => {
      if (cy != null) {
        cy.destroy()
      }
    }
  }, [])

  /**
   * Re-render network when Cytoscape instance changes.
   */
  useEffect(
    function onCyJsRendererChange() {
      if (cy !== null) {
        renderNetwork()
      }
    },
    [cy],
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
    },
    [cy, id],
  )

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
          zIndex: 0,
        }}
        id="cy-container"
        ref={cyContainer}
      />
    </>
  )
}

export { CyjsRenderer }
