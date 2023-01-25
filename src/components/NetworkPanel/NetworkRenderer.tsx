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
import { NetworkView } from '../../models/ViewModel'
import { IdType } from '../../models/IdType'
interface NetworkRendererProps {
  network: Network
}

export const NetworkRenderer = ({
  network,
}: NetworkRendererProps): ReactElement => {
  const { id } = network

  // Optimaization to avoid re-rendering for the same network data
  const [lastNetworkId, setLastNetworkId] = useState<IdType>('')
  // const [busy, setBusy] = useState<boolean>(false)

  const visualStyles = useVisualStyleStore((state) => state.visualStyles)
  const tables = useTableStore((state) => state.tables)
  const viewModels = useViewModelStore((state) => state.viewModels)

  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)

  const networkView: NetworkView = viewModels[id]
  const nodeViews = networkView?.nodeViews
  const edgeViews = networkView?.edgeViews
  const hoveredElement = networkView?.hoveredElement

  const vs = visualStyles[id]
  const table = tables[id]

  // TODO: use types from 3rd party library?
  const [cy, setCy] = useState<any>(null)
  const cyContainer = useRef(null)

  // Avoid duplicate initialization of Cyjs
  const isInitialized = useRef(false)

  const renderNetwork = (): void => {
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
    cy.on(
      'boxselect select',
      debounce((e: EventObject) => {
        exclusiveSelect(
          id,
          cy
            .elements()
            .filter((e: SingularElementArgument) => e.selected())
            .map((ele: SingularElementArgument) => ele.data('id')),
        )
      }),
      100,
    )
    cy.on('tap', (e: EventObject) => {
      // check for background click
      // on background click deselect all
      if (e.target === cy) {
        exclusiveSelect(id, [])
      }
    })
    cy.fit()
    cy.endBatch()
  }

  const applyStyleUpdate = async (): Promise<void> => {
    cy.removeAllListeners()
    cy.startBatch()

    const t1 = performance.now()

    // remove previous bypasses
    // e.g. if a node has a bypass and then the bypass was removed, we need to reset the style
    cy.nodes().removeStyle()
    cy.edges().removeStyle()
    const { defaultStyle, nodeBypasses, edgeBypasses } =
      VisualStyleFn.createCyJsStyleSheetView(
        vs,
        network,
        table.nodeTable,
        table.edgeTable,
        networkView,
      )
    cy.style(defaultStyle)
    console.log('Style Apply', performance.now() - t1)

    // apply bypasses
    Object.entries(nodeBypasses).forEach(([nodeId, bypass]) => {
      cy.getElementById(nodeId).style(bypass)
    })

    Object.entries(edgeBypasses).forEach(([edgeId, bypass]) => {
      cy.getElementById(edgeId).style(bypass)
    })

    Object.values(nodeViews).forEach((nv) => {
      const ele = cy.getElementById(nv.id)
      if (nv.selected ?? false) {
        ele.select()
      } else {
        ele.unselect()
      }
    })
    Object.values(edgeViews).forEach((ev) => {
      const ele = cy.getElementById(ev.id)
      if (ev.selected ?? false) {
        ele.select()
      } else {
        ele.unselect()
      }
    })

    const t2 = performance.now()
    console.log('CYJS applyStyleUpdate', t2 - t1)
    cy.endBatch()
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
    if (id === '' || cy === null || vs === undefined || table === undefined) {
      return
    }
    if (lastNetworkId !== id) {
      setLastNetworkId(id)
      renderNetwork()
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
        })
        .catch((error) => {
          console.warn(error)
        })
    }
  }, [vs, table, edgeViews, nodeViews])

  // when hovered element changes, apply hover style to that element
  useEffect(
    debounce(() => {
      applyHoverStyle()
    }, 200),
    [hoveredElement],
  )

  /**
   * Initilizes the Cytoscape.js instance
   */
  useEffect(() => {
    if (!isInitialized.current) {
      // This should be executed only once.
      isInitialized.current = true
      const cy: Core = Cytoscape({
        container: cyContainer.current,
        hideEdgesOnViewport: true,
      })
      setCy(cy)
      console.info('* CyJS Renderer initialized:', cy)
    }
  }, [])

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
      id="cy-container"
      ref={cyContainer}
    />
  )
}
