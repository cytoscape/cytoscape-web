import * as React from 'react'

import Box from '@mui/material/Box'
import debounce from 'lodash.debounce'
import Cytoscape, {
  Core,
  EventObject,
  SingularElementArgument,
} from 'cytoscape'

import { IdType } from '../models/IdType'
import { useVisualStyleStore } from '../store/VisualStyleStore'
import { useTableStore } from '../store/TableStore'
import { useWorkspaceStore } from '../store/NetworkStore'
import { useViewModelStore } from '../store/ViewModelStore'
import VisualStyleFn from '../models/VisualStyleModel' // VisualPropertyValueType,
// import { cyJsVisualPropertyConverter } from '../models/VisualStyleModel/impl/cyJsVisualPropertyMap'

interface NetworkRendererProps {
  currentNetworkId: IdType
}

export default function NetworkRenderer(
  props: NetworkRendererProps,
): React.ReactElement {
  const { currentNetworkId } = props

  const networks = useWorkspaceStore((state) => state.networks)
  const visualStyles = useVisualStyleStore((state) => state.visualStyles)
  const tables = useTableStore((state) => state.tables)
  const viewModels = useViewModelStore((state) => state.viewModels)
  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const network = networks[currentNetworkId]
  const networkView = viewModels[currentNetworkId]
  const nodeViews = networkView?.nodeViews
  const edgeViews = networkView?.edgeViews
  const hoveredElement = networkView?.hoveredElement
  const vs = visualStyles[currentNetworkId]
  const table = tables[currentNetworkId]

  const [cy, setCy] = React.useState(null as any)
  const cyContainer = React.useRef(null)

  const loadAndRenderNetwork = (): void => {
    if (network == null || vs == null || table == null) {
      return
    }

    if (cy != null) {
      cy.startBatch()
      cy.remove('*')
      cy.removeAllListeners()
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
            currentNetworkId,
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
          exclusiveSelect(currentNetworkId, [])
        }
      })
      cy.endBatch()
      cy.fit()
    }
  }

  const applyStyleUpdate = (): void => {
    if (nodeViews == null || edgeViews == null || vs == null || table == null) {
      return
    }

    if (cy != null) {
      cy.startBatch()

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

      cy.endBatch()
    }
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

  // when the currentNetworkId changes, reset the cyjs element by
  // removing all elements and event listeners
  // this assumes we have a new network to render that was different from the current one
  React.useEffect(
    debounce(() => {
      loadAndRenderNetwork()
    }, 200),
    [currentNetworkId, network],
  )

  // when the visual style model, table model, or edge/node views change re-render cy.js style
  React.useEffect(
    debounce(() => {
      applyStyleUpdate()
    }, 200),
    [vs, table, edgeViews, nodeViews],
  )

  // when hovered element changes, apply hover style to that element
  React.useEffect(
    debounce(() => {
      applyHoverStyle()
    }, 200),
    [hoveredElement],
  )

  React.useEffect(() => {
    const cy: Core = Cytoscape({
      container: cyContainer.current,
      hideEdgesOnViewport: true,
    })
    cy.resize()
    setCy(cy)
    window.cy = cy
    loadAndRenderNetwork()
  }, [])

  return (
    <Box
      sx={{ width: '100%', height: '100%' }}
      id="cy-container"
      ref={cyContainer}
    >
      {/* {JSON.stringify({ id: n.id, nodes: n.nodes, edges: n.edges }, null, 2)} */}
    </Box>
  )
}
