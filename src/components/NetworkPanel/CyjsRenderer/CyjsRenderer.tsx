import Box from '@mui/material/Box'
import debounce from 'lodash.debounce'
import Cytoscape, {
  Core,
  EdgeSingular,
  EventObject,
  NodeSingular,
  Position,
  SingularElementArgument,
} from 'cytoscape'
// @ts-expect-error-next-line
import { CxToCyCanvas } from '@js4cytoscape/cyannotation-cx2js'
// @ts-expect-error-next-line
import { CyNetworkUtils, CxToJs } from '@js4cytoscape/cx2js'

import { registerCyExtensions } from './register-cy-extensions'

import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useTableStore } from '../../../store/TableStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import VisualStyleFn, { VisualStyle } from '../../../models/VisualStyleModel'
import { Network } from '../../../models/NetworkModel'
import { ReactElement, useEffect, useMemo, useRef, useState } from 'react'
import { NetworkView, NodeView } from '../../../models/ViewModel'
import { IdType } from '../../../models/IdType'
import { NetworkViewSources } from '../../../models/VisualStyleModel/VisualStyleFn'
import { applyViewModel, createCyjsDataMapper } from './cyjs-util'
import { addObjects } from './cyjs-factory'
import { useLayoutStore } from '../../../store/LayoutStore'
import { useRendererFunctionStore } from '../../../store/RendererFunctionStore'
import { useRendererStore } from '../../../store/RendererStore'
import { CircularProgress, Typography } from '@mui/material'
import { useUiStateStore } from '../../../store/UiStateStore'
import { DisplayMode } from '../../../models/FilterModel/DisplayMode'
import {
  Orientation,
  PaperSize,
} from '../../ToolBar/DataMenu/ExportNetworkToImage/PdfExportForm'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'

import { CX_ANNOTATIONS_KEY } from '../../../models/CxModel/cx2-util'

import { useUndoStack } from '../../../task/UndoStack'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'

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
  displayMode = DisplayMode.SELECT,
  hasTab = false,
}: NetworkRendererProps): ReactElement => {
  // For Undo functionality
  const { postEdit } = useUndoStack()

  // This is used to store the drag start position of the node
  // when the user starts dragging the node
  const dragStartPosition = useRef<Map<IdType, { x: number; y: number }>>(
    new Map(),
  )

  const [hoveredElement, setHoveredElement] = useState<IdType | undefined>(
    undefined,
  )

  const [lastHoveredElement, setLastHoveredElement] = useState<
    IdType | undefined
  >(undefined)

  // const [annotationRenderer, setAnnotationRenderer] = useState<any>(() => {
  //   const cxNetworkUtils = new CyNetworkUtils()
  //   const cyService = new CxToJs(cxNetworkUtils)
  //   return new CxToCyCanvas(cyService)
  // })

  // Canvas layer state that we need to keep track of so that we can clear the previous network layers if any
  // before rendering the next network.
  const [annotationLayers, setAnnotationLayers] = useState<any[]>([])

  // Store sub-selection state. If show-hide mode is selected, then
  // the selected node will be highlighted and the others will be shown, too.
  const [subSelectedEdges, setSubSelectedEdges] = useState<IdType[]>([])

  // Store the selection type (click or filter)
  const [clickSelection, setClickSelection] = useState<boolean>(false)

  if (network === undefined) {
    return <></>
  }

  const { id } = network
  const activeNetworkId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )
  const activeNetworkIdRef = useRef(activeNetworkId)

  useEffect(() => {
    activeNetworkIdRef.current = activeNetworkId
  }, [activeNetworkId])

  let isRunning: boolean = useLayoutStore((state) => state.isRunning)

  const setViewModel = useViewModelStore((state) => state.add)
  const setVisualStyle = useVisualStyleStore((state) => state.add)
  const visualStyles = useVisualStyleStore((state) => state.visualStyles)
  const visualEditorProperties = useUiStateStore(
    (state) => state.ui.visualStyleOptions[id]?.visualEditorProperties,
  )
  const tables = useTableStore((state) => state.tables)
  const summaries = useNetworkSummaryStore((state) => state.summaries)
  const getViewModel: (id: IdType) => NetworkView | undefined =
    useViewModelStore((state) => state.getViewModel)

  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const toggleSelected = useViewModelStore((state) => state.toggleSelected)

  const setNodePosition: (
    networkId: IdType,
    nodeId: IdType,
    position: [number, number],
  ) => void = useViewModelStore((state) => state.setNodePosition)

  if (activeNetworkId !== id) {
    isRunning = false
  }

  const [cyStyle, setCyStyle] = useState<any[]>([])
  const [renderedId, setRenderedId] = useState<string>('')

  // TO avoid unnecessary re-rendering / fit
  const [nodesMoved, setNodesMoved] = useState<boolean>(false)

  const networkView: NetworkView | undefined = getViewModel(id)
  const vs: VisualStyle = visualStyles[id]

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

  const [cy, setCy] = useState<any>(null)
  const cyContainer = useRef(null)

  const setRendererFunction = useRendererFunctionStore(
    (state) => state.setFunction,
  )

  const setViewport = useRendererStore((state) => state.setViewport)
  const getViewport = useRendererStore((state) => state.getViewport)

  // Avoid duplicate initialization of Cyjs
  const isInitialized = useRef(false)

  // Used to avoid unnecessary style updates during initialization
  const isViewCreated = useRef(false)

  const selectionHandler = (event: EventObject) => {
    // Do nothing if selection mode is not "select"
    if (displayMode === DisplayMode.SHOW_HIDE) {
      return
    }

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
  }

  const renderNetwork = (forceFit: boolean = true): void => {
    if (
      cy === null ||
      (renderedId === id &&
        cy.nodes().length === networkView?.nodeViews.length &&
        cy.edges().length === networkView?.edgeViews.length)
    ) {
      return
    }

    isViewCreated.current = false
    // cy.unmount()
    cy.removeAllListeners()
    cy.startBatch()
    cy.remove('*')

    const data: NetworkViewSources = {
      network,
      networkView,
      nodeTable: table.nodeTable,
      edgeTable: table.edgeTable,
      visualStyle: vs,
    }

    const updatedNetworkView: NetworkView = VisualStyleFn.applyVisualStyle(data)

    const { nodeViews, edgeViews } = updatedNetworkView
    addObjects(
      cy,
      Object.values(nodeViews),
      network.edges,
      edgeViews,
      visualEditorProperties,
    )

    const newStyle = createCyjsDataMapper(vs)

    setCyStyle(newStyle)

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

    // Box selection listener
    cy.on(
      'boxend',
      debounce((event: EventObject) => {
        selectionHandler(event)
      }),
      100,
    )

    // single selection listener
    cy.on('tap', (e: EventObject) => {
      // Check for background click
      // This is necessary to access the latest value from closure
      const activeId: string = activeNetworkIdRef.current

      const shiftOrMetaKeyPressed =
        e.originalEvent.shiftKey || e.originalEvent.metaKey

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

      if (e.target === cy) {
        // Background click
        if (
          displayMode === DisplayMode.SELECT &&
          shiftOrMetaKeyPressed === false
        ) {
          exclusiveSelect(id, [], [])
          // setSubSelectedEdges([])
        } else {
          // do nothing. Keep the selection as-is
        }
      } else if (e.target.isNode() || e.target.isEdge()) {
        if (displayMode === DisplayMode.SHOW_HIDE) {
          // Select nodes only
          if (e.target.isNode()) {
            const selectedNodes: IdType[] = []
            selectedNodes.push(e.target.data('id'))
            // Keep edges as-is
            exclusiveSelect(id, selectedNodes, selectedEdges)
          } else {
            // Edge is clicked. Simply select it and handle sub-selection in
            const newSelection = e.target.data('id')
            exclusiveSelect(id, selectedNodes, [newSelection])
            setClickSelection(true)
          }
        } else {
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
      }
      cy.autounselectify(false)
    })

    // Moving nodes

    // This captures the drag start position of the node
    // when the user starts dragging the node
    cy.on('grab', 'node', (e: EventObject): void => {
      const targetNode = e.target

      // Check if the target is a node
      if (!targetNode.isNode()) return

      const nodeId: IdType = targetNode.data('id')
      const position = targetNode.position()
      const nodeView: NodeView | undefined = networkView?.nodeViews[nodeId]
      if (nodeView !== undefined) {
        dragStartPosition.current.set(nodeId, { ...position })
      }
    })

    cy.on('dragfree', 'node', (e: EventObject): void => {
      // Enable flag to avoid unnecessary fit
      setNodesMoved(true)

      // This is the Cytoscape.js node object
      const targetNode: NodeSingular = e.target as NodeSingular
      const nodeId: IdType = targetNode.data('id')

      // The position of the node from the Cytoscape.js instance
      const position: Position = targetNode.position()

      // The position of the node recorded when the user started dragging
      const startPos: { x: number; y: number } | undefined =
        dragStartPosition.current.get(nodeId)

      // Record the position as the original position

      let undoPosition: [number, number]
      if (startPos !== undefined) {
        undoPosition = [startPos.x, startPos.y]
      } else {
        console.warn(
          `The start position of the node ${nodeId} is undefined. This should not happen.`,
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

      // Clear the original position cache of the node when dragging ends
      dragStartPosition.current.delete(nodeId)

      // Update the view model with the new position
      setNodePosition(id, nodeId, [position.x, position.y])

      // Record the undo action
      postEdit(
        UndoCommandType.MOVE_NODES,
        `Move Nodes`,
        [id, nodeId, undoPosition],
        [id, nodeId, [position.x, position.y]],
      )
    })

    cy.on('mouseover', 'node, edge', (e: EventObject): void => {
      const targetNode = e.target
      setHoveredElement(targetNode.data('id'))
    })
    cy.on('mouseout', 'node, edge', (e: EventObject): void => {
      const target = e.target
      target.removeClass('hover')
      setHoveredElement(undefined)
    })

    // Track viewport changes (zoom and pan) - debounced to avoid excessive calls
    cy.on(
      'viewport',
      debounce((): void => {
        const zoom = cy.zoom()
        const pan = cy.pan()
        setViewport('cyjs', id, {
          zoom,
          pan: { x: pan.x, y: pan.y },
        })
      }, 300),
    )

    const annotations = (summary?.properties ?? []).filter(
      (p) => p.predicateString === CX_ANNOTATIONS_KEY,
    )

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

    annotationLayers.forEach((layer) => {
      const ctx = layer?.getCanvas()?.getContext('2d')
      if (ctx !== undefined) {
        layer.clear(ctx)
      }
    })

    const cxNetworkUtils = new CyNetworkUtils()
    const cyService = new CxToJs(cxNetworkUtils)
    const annotationRenderer = new CxToCyCanvas(cyService)

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

    cy.endBatch()

    cy.style(newStyle)

    if (forceFit) {
      // Try to restore saved viewport first
      const savedViewport = getViewport('cyjs', id)
      if (savedViewport) {
        cy.zoom(savedViewport.zoom)
        cy.pan(savedViewport.pan)
      } else {
        // If no saved viewport, fit the network
        cy.fit()
      }
    }

    setVisualStyle(id, vs)
    setTimeout(() => {
      isViewCreated.current = true
    }, 1000)
  }

  const applyStyleUpdate = (): void => {
    if (cyStyle.length === 0) {
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
    const updatedNetworkView: NetworkView = VisualStyleFn.applyVisualStyle(data)
    // Apply style from view model
    applyViewModel(cy, updatedNetworkView, visualEditorProperties)

    cy.endBatch()
    if (cyStyle.length > 0) {
      cy.style(cyStyle)
    }

    // Store the key-value pair in the local IndexedDB
    setViewModel(id, updatedNetworkView)
  }

  const applyHoverUpdate = (): void => {
    if (cy === null) {
      return
    }

    if (hoveredElement !== undefined) {
      // First, remove existing hovered effect by removing the class
      if (lastHoveredElement !== undefined) {
        // Remove hover class from the last hovered element
        const lastEle = cy.getElementById(lastHoveredElement)
        if (lastEle !== undefined) {
          lastEle.removeClass('hover')
        }
      }
      // Now select the new hovered element and apply hover class
      const ele = cy.getElementById(hoveredElement)
      if (ele !== undefined) {
        ele.addClass('hover')
        // And then update the last hovered element
        setLastHoveredElement(hoveredElement)
      }
    }
  }

  // when the id changes, reset the cyjs element by
  // removing all elements and event listeners
  // this assumes we have a new network to render that was different from the current one
  useEffect(() => {
    if (id === '' || cy === null) {
      return
    }
    isViewCreated.current = false
    renderNetwork()
    setRenderedId(id)
  }, [network])

  const applyUpdates = useMemo(
    () => (): void => {
      applyStyleUpdate()
    },
    [vs, table, visualEditorProperties],
  )

  useEffect(() => {
    if (id === '' || cy === null) {
      return
    }
    // This is only for redrawing the network
    // when the network structure is updated
    const cyNodeCount: number = cy.nodes().length
    const cyEdgeCount: number = cy.edges().length
    const modelNodeCount: number = network.nodes.length
    const modelEdgeCount: number = network.edges.length

    if (!isViewCreated.current) {
      return
    }

    // Render only when adding new nodes or edges (and avoid fitting)
    if (modelNodeCount > cyNodeCount || modelEdgeCount > cyEdgeCount) {
      renderNetwork(false)
    }
  }, [network.nodes.length, network.edges.length])

  // when the visual style model, table model, or edge/node views change re-render cy.js style
  useEffect(() => {
    if (
      cy === null ||
      table === undefined ||
      vs === undefined ||
      !isViewCreated.current
    ) {
      return
    }

    applyUpdates()
  }, [vs, table, visualEditorProperties])

  // Apply layout when node positions are changed
  useEffect(() => {
    const viewModel = getViewModel(id)
    if (viewModel === undefined || cy === null) {
      return
    }

    // This means nodes are moved by hand. Does not need to apply fit
    if (nodesMoved) {
      setNodesMoved(false)
      return
    }

    // Update position
    const { nodeViews } = viewModel
    const viewCount = Object.keys(nodeViews).length
    const cyNodeCount = cy.nodes().length
    cy.nodes().forEach((cyNode: NodeSingular) => {
      const cyNodeId = cyNode.data('id')
      if (nodeViews[cyNodeId] === undefined) {
        // Need to delete this node
        cy.remove(cyNode)
      } else {
        cyNode.position({
          x: nodeViews[cyNodeId].x,
          y: nodeViews[cyNodeId].y,
        })
      }
    })
    if (viewCount === cyNodeCount) {
      cy.fit()
    }
  }, [networkView?.nodeViews])

  useEffect(() => {
    const viewModel = getViewModel(id)
    if (viewModel === undefined || cy === null) {
      return
    }

    // Edge deletion
    const { edgeViews } = viewModel
    cy.edges().forEach((cyEdge: EdgeSingular) => {
      const cyEdgeId = cyEdge.data('id')
      if (edgeViews[cyEdgeId] === undefined) {
        // Need to delete this node
        cy.remove(cyEdge)
      }
    })
  }, [networkView?.edgeViews])

  // when hovered element changes, apply hover style to that element
  useEffect(() => {
    applyHoverUpdate()
  }, [hoveredElement])

  useEffect(() => {
    if (cy === null || networkView === undefined || networkView === null) {
      return
    }

    const { selectedNodes, selectedEdges } = networkView

    // Clear selection
    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      cy.elements().unselect()
      if (displayMode === DisplayMode.SELECT) {
        cy.elements().show()
      } else {
        cy.nodes().show()
        cy.edges().hide()
      }
      return
    }

    if (selectedNodes.length === 0) {
      cy.nodes().unselect()
      if (displayMode === DisplayMode.SHOW_HIDE) {
        cy.nodes().show()
      }
    } else {
      cy.nodes().show()
      cy.nodes()
        .unselect()
        .filter((ele: SingularElementArgument) => {
          return selectedNodes.includes(ele.data('id'))
        })
        .select()
    }

    // Handle edge selection
    if (selectedEdges.length === 0) {
      // No edge is selected.
      cy.edges().unselect()
      // cy.edges().show()
    } else {
      // At least one edge is selected.
      if (displayMode === DisplayMode.SHOW_HIDE) {
        // TODO: design a better way to show / hide edges, including multiple selection
        cy.edges().hide()
      } else {
        cy.edges().show()
      }

      if (displayMode === DisplayMode.SHOW_HIDE) {
        const targetEdgeIds = clickSelection ? subSelectedEdges : selectedEdges
        const newSelectedEdges = cy
          .edges()
          .filter((ele: SingularElementArgument) => {
            return targetEdgeIds.includes(ele.data('id'))
          })
        newSelectedEdges.show()
        if (clickSelection) {
          setClickSelection(false)
        } else {
          // Keep these selected edges in the sub-selection state for later use
          setSubSelectedEdges(selectedEdges)
        }
      } else {
        const newSelectedEdges = cy
          .edges()
          .filter((ele: SingularElementArgument) => {
            return selectedEdges.includes(ele.data('id'))
          })
        newSelectedEdges.select()
      }
    }
  }, [networkView?.selectedNodes, networkView?.selectedEdges])

  useEffect(() => {
    if (cy === null) {
      return
    }
    if (displayMode === DisplayMode.SHOW_HIDE) {
      // Disable box selection for show/hide mode
      cy.boxSelectionEnabled(false)
    } else {
      cy.boxSelectionEnabled(true)
    }
  }, [displayMode])

  /**
   * Initializes the Cytoscape.js instance
   */
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true
      // This should be executed only once.
      const cy: Core = Cytoscape({
        container: cyContainer.current,
        hideEdgesOnViewport: true,
        // wheelSensitivity: 0.1,
        boxSelectionEnabled: displayMode === DisplayMode.SELECT ? true : false,
      })
      setCy(cy)
      // Now add event handlers. This is necessary only once.
      // addEventHandlers(cy)
      const fitFunction = (): void => {
        if (cy !== null) {
          cy.fit()
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

      const exportPdfFunction = (
        fullBg: boolean,
        paperSize: PaperSize,
        orientation: Orientation,
        margin: number,
        customWidth?: number,
        customHeight?: number,
      ): Promise<Blob> => {
        if (cy !== null) {
          // @ts-expect-error-next-line
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

      const exportSvgFunction = (fullBg: boolean): Blob => {
        if (cy !== null) {
          // @ts-expect-error-next-line
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
      setRendererFunction('cyjs', 'fit', fitFunction, id)
      setRendererFunction('cyjs', 'exportPng', exportPngFunction, id)
      setRendererFunction('cyjs', 'exportPdf', exportPdfFunction, id)
      setRendererFunction('cyjs', 'exportSvg', exportSvgFunction, id)
      setRendererFunction('cyjs', 'width', widthFunction, id)
      setRendererFunction('cyjs', 'height', heightFunction, id)
    }

    return () => {
      if (cy != null) {
        cy.destroy()
      }
    }
  }, [])

  useEffect(() => {
    if (cy !== null) {
      renderNetwork()
    }
  }, [cy])

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
