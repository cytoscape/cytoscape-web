import Box from '@mui/material/Box'
import debounce from 'lodash.debounce'
import Cytoscape, {
  Core,
  EventObject,
  SingularElementArgument,
} from 'cytoscape'

import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useTableStore } from '../../../store/TableStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { VisualStyle } from '../../../models/VisualStyleModel'
import { Network } from '../../../models/NetworkModel'
import { ReactElement, useEffect, useRef, useState } from 'react'
import { NetworkView, NodeView } from '../../../models/ViewModel'
import { IdType } from '../../../models/IdType'
import { VisualStyleFnImpl as Vsf } from '../../../models/VisualStyleModel/impl/VisualStyleFnImpl'
import { NetworkViewSources } from '../../../models/VisualStyleModel/VisualStyleFn'
import { applyViewModel, createCyjsDataMapper } from './cyjs-util'
import { addObjects } from './cyjs-factory'
interface NetworkRendererProps {
  network: Network
  setIsBusy: (isBusy: boolean) => void
  isBusy: boolean
}

/**
 *
 * @param param0
 * @returns
 */
export const CyjsRenderer = ({
  network,
  setIsBusy,
  isBusy,
}: NetworkRendererProps): ReactElement => {
  const { id } = network

  // Optimization to avoid re-rendering for the same network data
  const [lastNetworkId, setLastNetworkId] = useState<IdType>('')

  const setViewModel = useViewModelStore((state) => state.setViewModel)
  const setVisualStyle = useVisualStyleStore((state) => state.set)
  const visualStyles = useVisualStyleStore((state) => state.visualStyles)

  const tables = useTableStore((state) => state.tables)
  const viewModels = useViewModelStore((state) => state.viewModels)

  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const setNodePosition: (
    networkId: IdType,
    nodeId: IdType,
    position: [number, number],
  ) => void = useViewModelStore((state) => state.setNodePosition)

  const [cyStyle, setCyStyle] = useState<any[]>([])

  const networkView: NetworkView = viewModels[id]
  const nodeViews: Record<IdType, NodeView> = networkView?.nodeViews
  const edgeViews = networkView?.edgeViews
  const hoveredElement = networkView?.hoveredElement

  const vs: VisualStyle = visualStyles[id]
  const table = tables[id]

  // TODO: use types from 3rd party library?
  const [cy, setCy] = useState<any>(null)
  const cyContainer = useRef(null)

  // Avoid duplicate initialization of Cyjs
  const isInitialized = useRef(false)
  const isRendered = useRef(false)

  const renderNetwork = async (): Promise<void> => {
    cy.unmount()
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
    const updatedNetworkView: NetworkView = Vsf.applyVisualStyle(data)

    const t1 = performance.now()
    const { nodeViews, edgeViews } = updatedNetworkView
    addObjects(cy, Object.values(nodeViews), network.edges, edgeViews)

    console.log('#Time to add nodes and edges: ', performance.now() - t1)

    // Generate a new Cytoscape.js styles based on given visual style
    const newStyle = createCyjsDataMapper(vs)
    setCyStyle(newStyle)

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

    // cy.style(newStyle)
    cy.endBatch()

    cy.mount(cyContainer.current)
    cy.style(newStyle)

    cy.fit()
  }

  const applyStyleUpdate = async (): Promise<void> => {
    if (cyStyle.length === 0) {
      return
    }

    // cy.removeAllListeners()
    cy.startBatch()

    const data: NetworkViewSources = {
      network,
      networkView,
      nodeTable: table.nodeTable,
      edgeTable: table.edgeTable,
      visualStyle: vs,
    }
    const updatedNetworkView: NetworkView = Vsf.applyVisualStyle(data)
    // Apply style from view model
    applyViewModel(cy, updatedNetworkView)

    // Select elements based on network view state
    const { selectedNodes, selectedEdges } = updatedNetworkView
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

    cy.endBatch()
    if (cyStyle.length > 0) {
      cy.style(cyStyle)
    }

    // Store the key-value pair in the local IndexedDB
    setViewModel(id, updatedNetworkView)
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
    applyStyleUpdate()
      .then(() => {
        console.log('* style updated')
        isRendered.current = true
        setIsBusy(false)
        setVisualStyle(id, vs)
      })
      .catch((error) => {
        console.warn(error)
      })
  }, [vs])

  useEffect(() => {
    if (cy === null || vs == null || table == null) {
      return
    }
    applyStyleUpdate()
      .then(() => {
        console.log('* style updated')
        isRendered.current = true
        setIsBusy(false)
      })
      .catch((error) => {
        console.warn(error)
      })
    // }
  }, [table])

  // when hovered element changes, apply hover style to that element
  useEffect(() => {
    if (hoveredElement === null || hoveredElement === undefined) {
      return
    }
    applyHoverStyle()
  }, [hoveredElement])

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
      })
      setCy(cy)
      console.info('* CyJS Renderer initialized:', cy)
    }

    return () => {
      if (cy != null) {
        cy.destroy()
      }
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
