import * as React from 'react'
import Box from '@mui/material/Box'
import Cytoscape, { Core } from 'cytoscape'
import { IdType } from '../models/IdType'
import { useVisualStyleStore } from '../store/VisualStyleStore'
import { useTableStore } from '../store/TableStore'
import { useNetworkStore } from '../store/NetworkStore'
import { useViewModelStore } from '../store/ViewModelStore'
import VisualStyleFn from '../models/VisualStyleModel' // VisualPropertyValueType,
// import { cyJsVisualPropertyConverter } from '../models/VisualStyleModel/impl/cyJsVisualPropertyMap'

interface NetworkRendererProps {
  currentNetworkId: IdType
}

export default function NetworkRenderer(
  props: NetworkRendererProps,
): React.ReactElement {
  const networks = useNetworkStore((state) => state.networks)
  const visualStyles = useVisualStyleStore((state) => state.visualStyles)
  const tables = useTableStore((state) => state.tables)
  const viewModels = useViewModelStore((state) => state.viewModels)
  const network = networks[props.currentNetworkId]
  const networkView = viewModels[props.currentNetworkId]
  const vs = visualStyles[props.currentNetworkId]
  const table = tables[props.currentNetworkId]

  const [cy, setCy] = React.useState(null as any)
  const cyContainer = React.useRef(null)

  const renderCyJs = (): void => {
    const styleSheetRender = (): void => {
      const { defaultStyle, cyNodes, cyEdges, nodeBypasses, edgeBypasses } =
        VisualStyleFn.createCyJsStyleSheetView(
          vs,
          network,
          table.nodeTable,
          table.edgeTable,
          networkView,
        )
      cy.style(defaultStyle)
      cy.add(cyNodes)
      cy.add(cyEdges)

      // apply bypasses
      Object.entries(nodeBypasses).forEach(([nodeId, bypass]) => {
        cy.getElementById(nodeId).style(bypass)
      })

      Object.entries(edgeBypasses).forEach(([edgeId, bypass]) => {
        cy.getElementById(edgeId).style(bypass)
      })
    }

    if (network == null || vs == null || table == null) {
      return
    }

    if (cy != null) {
      cy.startBatch()
      cy.remove('*')
      styleSheetRender()
      cy.endBatch()
      cy.fit()
    }
  }

  React.useEffect(() => {
    renderCyJs()
  })

  // React.useEffect(() => {
  //   renderCyJs()
  // }, [props.currentNetworkId, vs, table])

  React.useEffect(() => {
    const cy: Core = Cytoscape({
      container: cyContainer.current,
      hideEdgesOnViewport: true,
    })
    cy.resize()
    setCy(cy)
    window.cy = cy
    renderCyJs()
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
