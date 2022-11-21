import * as React from 'react'
import Box from '@mui/material/Box'
import { Typography } from '@mui/material'
import { IdType } from '../models/IdType'
import VisualStyleFn, {
  VisualProperty,
  VisualPropertyValueType,
  VisualStyle,
} from '../models/VisualStyleModel'
import { useVisualStyleStore } from '../store/VisualStyleStore'

// interface VizmmaperView {}

function VisualPropertyView(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const { visualProperty } = props
  const setDefault = useVisualStyleStore((state) => state.setDefault)

  return (
    <Box
      sx={{
        p: 1,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}
      onClick={() =>
        setDefault(props.currentNetworkId, 'nodeShape', 'rectangle')
      }
    >
      <Box>{visualProperty.name}</Box>
      <Box>{visualProperty.default}</Box>
    </Box>
  )
}

export default function VizmapperView(props: {
  currentNetworkId: IdType
}): React.ReactElement {
  const visualStyles: Record<IdType, VisualStyle> = useVisualStyleStore(
    (state) => state.visualStyles,
  )

  const visualStyle = visualStyles[props.currentNetworkId]

  if (visualStyle == null) {
    return <div></div>
  }

  const nodeVps = VisualStyleFn.nodeVisualProperties(visualStyle).map(
    (vpName) => {
      const vp = visualStyle[vpName]
      return (
        <VisualPropertyView
          key={vpName}
          currentNetworkId={props.currentNetworkId}
          visualProperty={vp}
        />
      )
    },
  )
  const edgeVps = VisualStyleFn.edgeVisualProperties(visualStyle).map(
    (vpName) => {
      const vp = visualStyle[vpName]
      return (
        <VisualPropertyView
          key={vpName}
          currentNetworkId={props.currentNetworkId}
          visualProperty={vp}
        />
      )
    },
  )

  const networkVps = VisualStyleFn.networkVisualProperties(visualStyle).map(
    (vpName) => {
      const vp = visualStyle[vpName]
      return (
        <VisualPropertyView
          key={vpName}
          currentNetworkId={props.currentNetworkId}
          visualProperty={vp}
        />
      )
    },
  )

  return (
    <Box sx={{ overflow: 'scroll', height: '100%', width: '100%' }}>
      <Typography variant="h6" sx={{ p: 1 }}>
        Node Visual Properties
      </Typography>
      {nodeVps}
      <Typography variant="h6" sx={{ p: 1 }}>
        Edge Visual Properties
      </Typography>
      {edgeVps}
      <Typography variant="h6" sx={{ p: 1 }}>
        Network Visual Properties
      </Typography>
      {networkVps}
    </Box>
  )
}
