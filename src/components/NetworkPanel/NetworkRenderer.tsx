import Box from '@mui/material/Box'
import debounce from 'lodash.debounce'
import Cytoscape, {
  Core,
  EventObject,
  SingularElementArgument,
} from 'cytoscape'

import { useVisualStyleStore } from '../../store/VisualStyleStore'
import { useTableStore } from '../../store/TableStore'
import { useViewModelStore } from '../../store/ViewModelStore'
import VisualStyleFn from '../../models/VisualStyleModel'
import { Network } from '../../models/NetworkModel'
import { ReactElement, useEffect, useRef, useState } from 'react'
import { NetworkView, NodeView } from '../../models/ViewModel'
import { IdType } from '../../models/IdType'
interface NetworkRendererProps {
  network: Network
  setIsBusy: (isBusy: boolean) => void
  isBusy: boolean
}

export const NetworkRenderer = ({
  network,
  setIsBusy,
  isBusy,
}: NetworkRendererProps): ReactElement => {
  const { id } = network

  // Optimaization to avoid re-rendering for the same network data
  const [lastNetworkId, setLastNetworkId] = useState<IdType>('')

  const visualStyles = useVisualStyleStore((state) => state.visualStyles)
  const tables = useTableStore((state) => state.tables)
  const viewModels = useViewModelStore((state) => state.viewModels)

  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const setNodePosition: (
    networkId: IdType,
    nodeId: IdType,
    position: [number, number],
  ) => void = useViewModelStore((state) => state.setNodePosition)

  const networkView: NetworkView = viewModels[id]
  const nodeViews: Record<IdType, NodeView> = networkView?.nodeViews
  const edgeViews = networkView?.edgeViews
  const hoveredElement = networkView?.hoveredElement

  const vs = visualStyles[id]
  const table = tables[id]

  // TODO: use types from 3rd party library?
  const [cy, setCy] = useState<any>(null)
  const cyContainer = useRef(null)

  // Avoid duplicate initialization of Cyjs
  const isInitialized = useRef(false)
  const isRendered = useRef(false)

  const renderNetwork = async (): Promise<void> => {
    cy.removeAllListeners()
    cy.startBatch()
    cy.remove('*')
    const { cyNodes, cyEdges } = VisualStyleFn.createCyJsStyleSheetView(
      vs,
      network,
      table.nodeTable,
      table.edgeTable,
      networkView,
    )
    cy.add(cyNodes)
    cy.add(cyEdges)

    // Box selection listener
    cy.on(
      'boxselect select',
      debounce((e: EventObject) => {
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
      // check for background click
      // on background click deselect all
      if (e.target === cy) {
        exclusiveSelect(id, [], [])
      }
    })

    // Moving nodes
    cy.on('dragfree', 'node', (e: EventObject): void => {
      const targetNode = e.target
      const nodeId: IdType = targetNode.data('id')
      const position = targetNode.position()
      setNodePosition(id, nodeId, [position.x, position.y])
    })

    cy.fit()
    cy.endBatch()
  }

  const applyStyleUpdate = async (): Promise<void> => {
    // cy.removeAllListeners()
    cy.startBatch()

    const t1 = performance.now()

    // remove previous bypasses
    // e.g. if a node has a bypass and then the bypass was removed, we need to reset the style
    // cy.nodes().removeStyle()
    // cy.edges().removeStyle()
    const { defaultStyle, nodeBypasses, edgeBypasses } =
      VisualStyleFn.createCyJsStyleSheetView(
        vs,
        network,
        table.nodeTable,
        table.edgeTable,
        networkView,
      )
    console.log('Style Apply', performance.now() - t1)

    // apply bypasses
    Object.entries(nodeBypasses).forEach(([nodeId, bypass]) => {
      cy.getElementById(nodeId).style(bypass)
    })

    Object.entries(edgeBypasses).forEach(([edgeId, bypass]) => {
      cy.getElementById(edgeId).style(bypass)
    })

    // Select elements based on network view state
    const { selectedNodes, selectedEdges } = networkView
    cy.nodes().filter((ele: SingularElementArgument) => {
      return selectedNodes.includes(ele.data('id'))
    }).select()
    cy.edges().filter((ele: SingularElementArgument) => {
      return selectedEdges.includes(ele.data('id'))
    }).select()

    const t2 = performance.now()
    console.log('CYJS applyStyleUpdate', t2 - t1)
    cy.endBatch()
    
    cy.style(defaultStyle)
  }

  const applyHoverStyle = (): void => {
    if (cy != null) {
      cy.nodes().removeClass('hovered')
      cy.edges().removeClass('hovered')

      if (hoveredElement != null) {
        cy.getElementById(hoveredElement).addClass('hovered')
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
    if (lastNetworkId !== id) {
      setLastNetworkId(id)
      renderNetwork()
        .then(() => {
          console.log('* network rendered')
        })
        .catch((error) => {
          console.warn(error)
        })
    }
  }, [network])

  // when the visual style model, table model, or edge/node views change re-render cy.js style
  useEffect(() => {
    if (
      cy === null ||
      nodeViews == null ||
      edgeViews == null ||
      vs == null ||
      table == null
    ) {
      return
    }
    if (lastNetworkId !== id) {
      setLastNetworkId(id)
      applyStyleUpdate()
        .then(() => {
          console.log('* style updated')
          isRendered.current = true
          setIsBusy(false)
        })
        .catch((error) => {
          console.warn(error)
        })
    }
  }, [vs, table, edgeViews, nodeViews])

  // when hovered element changes, apply hover style to that element
  useEffect(() => {
    if (hoveredElement === null || hoveredElement === undefined) {
      return
    }
    applyHoverStyle()
  }, [hoveredElement])

  /**
   * Initilizes the Cytoscape.js instance
   */
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true
      // This should be executed only once.
      const cy: Core = Cytoscape({
        container: cyContainer.current,
        hideEdgesOnViewport: true,
      })
      setCy(cy)
      console.info('* CyJS Renderer initialized:', cy)
    }
  }, [])

  useEffect(() => {
    if (cy != null) {
      console.log(
        'Cy instance available. Calling first network',
        cy,
        cy.elements().length,
      )
      renderNetwork()
        .then(() => {
          applyStyleUpdate()
            .then(() => {
              setIsBusy(false)
            })
            .catch((err) => {
              console.warn(err)
            })
        })
        .catch((err) => {
          console.warn(err)
        })
    }
  }, [cy])

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
      }}
      id="cy-container"
      ref={cyContainer}
    />
  )
}
