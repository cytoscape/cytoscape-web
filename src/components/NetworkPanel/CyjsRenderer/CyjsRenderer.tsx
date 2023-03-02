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
import VisualStyleFn, { VisualStyle } from '../../../models/VisualStyleModel'
import { Network } from '../../../models/NetworkModel'
import {
  ReactElement,
  // useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { NetworkView } from '../../../models/ViewModel'
import { IdType } from '../../../models/IdType'
import { NetworkViewSources } from '../../../models/VisualStyleModel/VisualStyleFn'
import { applyViewModel, createCyjsDataMapper } from './cyjs-util'
import { addObjects } from './cyjs-factory'
interface NetworkRendererProps {
  network: Network
}

/**
 *
 * @param param0
 * @returns
 */
const CyjsRenderer = ({ network }: NetworkRendererProps): ReactElement => {
  const { id } = network

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
  const [renderedId, setRenderedId] = useState<string>('')

  const networkView: NetworkView = viewModels[id]
  const hoveredElement = networkView?.hoveredElement

  const vs: VisualStyle = visualStyles[id]
  const table = tables[id]

  const [cy, setCy] = useState<any>(null)
  const cyContainer = useRef(null)

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

      cy.endBatch()

      cy.style(newStyle)
      // cy.mount(cyContainer.current)

      cy.fit()
      setVisualStyle(id, vs)
      setTimeout(() => {
        isViewCreated.current = true
      }, 1000)
    },
    [network, cy],
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

    // FIXME: selection is not working now and the following section should be fixed
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
    console.log('#Time to  apply style: ', performance.now() - t1)
  }

  // TODO: fix this function for the new apply mechanism
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
      console.info('Cyjs renderer is ready.')
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
      console.info('First network rendered.')
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

export { CyjsRenderer }
