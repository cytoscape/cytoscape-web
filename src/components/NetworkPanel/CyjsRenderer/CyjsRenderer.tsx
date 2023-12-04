import Box from '@mui/material/Box'
import debounce from 'lodash.debounce'
import Cytoscape, {
  Core,
  EdgeSingular,
  EventObject,
  NodeSingular,
  SingularElementArgument,
} from 'cytoscape'

import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useTableStore } from '../../../store/TableStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import VisualStyleFn, { VisualStyle } from '../../../models/VisualStyleModel'
import { Network } from '../../../models/NetworkModel'
import { ReactElement, useEffect, useMemo, useRef, useState } from 'react'
import { NetworkView } from '../../../models/ViewModel'
import { IdType } from '../../../models/IdType'
import { NetworkViewSources } from '../../../models/VisualStyleModel/VisualStyleFn'
import { applyViewModel, createCyjsDataMapper } from './cyjs-util'
import { addObjects } from './cyjs-factory'
import { useLayoutStore } from '../../../store/LayoutStore'
import { useRendererFunctionStore } from '../../../store/RendererFunctionStore'
import { CircularProgress, Typography } from '@mui/material'
import { useUiStateStore } from '../../../store/UiStateStore'
interface NetworkRendererProps {
  network: Network
}


/**
 *
 * @returns
 */
const CyjsRenderer = ({ network }: NetworkRendererProps): ReactElement => {
  const [hoveredElement, setHoveredElement] = useState<IdType | undefined>(
    undefined,
  )
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

  const tables = useTableStore((state) => state.tables)
  const viewModels = useViewModelStore((state) => state.viewModels)

  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)

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

  const networkView: NetworkView = viewModels[id]
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

  const [cy, setCy] = useState<any>(null)
  const cyContainer = useRef(null)

  const setRendererFunction = useRendererFunctionStore(
    (state) => state.setFunction,
  )

  // Avoid duplicate initialization of Cyjs
  const isInitialized = useRef(false)

  // Used to avoid unnecessary style updates during initialization
  const isViewCreated = useRef(false)

  const renderNetwork = useMemo(
    () => (): void => {
      if (renderedId === id || cy === null) {
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
      const updatedNetworkView: NetworkView =
        VisualStyleFn.applyVisualStyle(data)

      const { nodeViews, edgeViews } = updatedNetworkView
      addObjects(cy, Object.values(nodeViews), network.edges, edgeViews)

      // Generate a new Cytoscape.js styles based on given visual style
      const newStyle = createCyjsDataMapper(vs)
      setCyStyle(newStyle)

      // Restore selection state in Cyjs instance
      const { selectedNodes, selectedEdges } = networkView
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
        'boxselect select',
        debounce((event: EventObject) => {
          console.log('Selection event: ', event.target)
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

      // single selection listener
      cy.on('tap', (e: EventObject) => {

        // Check for background click

        // This is necessary to access the latest value from closure
        const activeId: string = activeNetworkIdRef.current
        
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
          exclusiveSelect(id, [], [])
        }
        cy.autounselectify(false)
      })

      // Moving nodes
      cy.on('dragfree', 'node', (e: EventObject): void => {
        // Enable flag to avoid unnecessary fit
        setNodesMoved(true)

        const targetNode = e.target
        const nodeId: IdType = targetNode.data('id')
        const position = targetNode.position()
        setNodePosition(id, nodeId, [position.x, position.y])
      })

      cy.on('mouseover', 'node, edge', (e: EventObject): void => {
        const targetNode = e.target
        setHoveredElement(targetNode.data('id'))
      })
      cy.on('mouseout', 'node, edge', (e: EventObject): void => {
        setHoveredElement(undefined)
      })

      cy.endBatch()

      cy.style(newStyle)

      cy.fit()

      setVisualStyle(id, vs)
      setTimeout(() => {
        isViewCreated.current = true
      }, 1000)
    },
    [network, cy, activeNetworkId],
  )

  const applyStyleUpdate = (): void => {
    if (cyStyle.length === 0) {
      return
    }

    const t1 = performance.now()
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
    applyViewModel(cy, updatedNetworkView)

    cy.endBatch()
    if (cyStyle.length > 0) {
      cy.style(cyStyle)
    }

    // Store the key-value pair in the local IndexedDB
    setViewModel(id, updatedNetworkView)
    console.log('#Time to  apply style: ', performance.now() - t1)
  }

  const applyHoverUpdate = (): void => {
    if (cy === null) {
      return
    }
    if (hoveredElement !== undefined) {
      cy.elements().removeClass('hover')
      const ele = cy.getElementById(hoveredElement)
      if (ele !== undefined) {
        ele.addClass('hover')
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
    [vs, table],
  )

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
  }, [vs, table])

  // Apply layout when node positions are changed
  useEffect(() => {
    if (viewModels[id] === undefined || cy === null) {
      return
    }

    // This means nodes are moved by hand. Does not need to apply fit
    if (nodesMoved) {
      setNodesMoved(false)
      return
    }

    // Update position
    const curView = viewModels[id]
    const nodeViews = curView.nodeViews
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
    if (viewModels[id] === undefined || cy === null) {
      return
    }

    // Edge deletion
    const curView = viewModels[id]
    const edgeViews = curView.edgeViews
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
      return
    }

    if (selectedNodes.length === 0) {
      cy.nodes().unselect()
    } else {
      cy.nodes()
        .filter((ele: SingularElementArgument) => {
          return selectedNodes.includes(ele.data('id'))
        })
        .select()
    }
    if (selectedEdges.length === 0) {
      cy.edges().unselect()
    } else {
      cy.edges()
        .filter((ele: SingularElementArgument) => {
          return selectedEdges.includes(ele.data('id'))
        })
        .select()
    }
  }, [networkView?.selectedNodes, networkView?.selectedEdges])

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
        wheelSensitivity: 0.1,
      })
      setCy(cy)
      // Now add event handlers. This is necessary only once.
      // addEventHandlers(cy)
      const fitFunction = (): void => {
        if (cy !== null) {
          cy.fit()
        }
      }
      setRendererFunction('cyjs', 'fit', fitFunction)
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
            top: '1em',
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
          backgroundColor: bgColor,
        }}
        id="cy-container"
        ref={cyContainer}
      />
    </>
  )
}

export { CyjsRenderer }
