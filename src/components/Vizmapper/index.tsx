import * as React from 'react'
import { Box, Typography, Tabs, Tab } from '@mui/material'

import { IdType } from '../../models/IdType'
import VisualStyleFn, {
  VisualProperty,
  VisualPropertyValueType,
  VisualStyle,
} from '../../models/VisualStyleModel'

import { useVisualStyleStore } from '../../store/VisualStyleStore'

import { MappingForm } from './Forms/MappingForm'
import { BypassForm } from './Forms/BypassForm'
import { DefaultValueForm } from './Forms/DefaultValueForm'

function VisualPropertyView(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const { visualProperty, currentNetworkId } = props

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        p: 0.5,
        pb: 1,
      }}
    >
      <DefaultValueForm
        sx={{ mr: 1 }}
        visualProperty={visualProperty}
        currentNetworkId={currentNetworkId}
      />
      <MappingForm
        sx={{ mr: 1 }}
        currentNetworkId={currentNetworkId}
        visualProperty={visualProperty}
      />
      <BypassForm
        sx={{ mr: 1 }}
        currentNetworkId={currentNetworkId}
        visualProperty={visualProperty}
      />
      <Typography variant="body2" sx={{ ml: 1 }}>
        {visualProperty.displayName}
      </Typography>
    </Box>
  )
}

export default function VizmapperView(props: {
  currentNetworkId: IdType
}): React.ReactElement {
  const [currentTabIndex, setCurrentTabIndex] = React.useState(0)
  const visualStyles: Record<IdType, VisualStyle> = useVisualStyleStore(
    (state) => state.visualStyles,
  )

  const visualStyle = visualStyles[props.currentNetworkId]

  if (visualStyle == null) {
    return <div></div>
  }

  const nodeVps = VisualStyleFn.nodeVisualProperties(visualStyle).map((vp) => {
    return (
      <VisualPropertyView
        key={vp.name}
        currentNetworkId={props.currentNetworkId}
        visualProperty={vp}
      />
    )
  })
  const edgeVps = VisualStyleFn.edgeVisualProperties(visualStyle).map((vp) => {
    return (
      <VisualPropertyView
        key={vp.name}
        currentNetworkId={props.currentNetworkId}
        visualProperty={vp}
      />
    )
  })

  const networkVps = VisualStyleFn.networkVisualProperties(visualStyle).map(
    (vp) => {
      return (
        <VisualPropertyView
          key={vp.name}
          currentNetworkId={props.currentNetworkId}
          visualProperty={vp}
        />
      )
    },
  )

  return (
    <Box
      sx={{
        borderBottom: 1,
        overflow: 'scroll',
        height: '100%',
        width: '100%',
      }}
    >
      <Tabs
        value={currentTabIndex}
        TabIndicatorProps={{ sx: { backgroundColor: 'white' } }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          fontSize: 10,
          pb: 0.5,
          backgroundColor: '#2F80ED',
          '& button.Mui-selected': { color: 'white' },
          '& button': {
            minHeight: 30,
            height: 30,
            width: 30,
          },
          height: 38,
          minHeight: 30,
        }}
        onChange={(e, nextTab) => setCurrentTabIndex(nextTab)}
      >
        <Tab label={<Typography variant="caption">Nodes</Typography>} />
        <Tab label={<Typography variant="caption">Edges</Typography>} />
        <Tab label={<Typography variant="caption">Network</Typography>} />
      </Tabs>
      <Box sx={{ display: 'flex', p: 1, ml: 1 }}>
        <Box sx={{ width: 40, textAlign: 'center', mr: 1 }}>Def.</Box>
        <Box sx={{ width: 40, textAlign: 'center', mr: 1 }}>Map.</Box>
        <Box sx={{ width: 40, textAlign: 'center' }}>Byp.</Box>
      </Box>
      <div hidden={currentTabIndex !== 0}>
        {currentTabIndex === 0 && <Box sx={{ ml: 1, mb: 1 }}>{nodeVps}</Box>}
      </div>
      <div hidden={currentTabIndex !== 1}>
        {currentTabIndex === 1 && <Box sx={{ ml: 1, mb: 1 }}>{edgeVps}</Box>}
      </div>
      <div hidden={currentTabIndex !== 2}>
        {currentTabIndex === 2 && <Box sx={{ ml: 1, mb: 1 }}>{networkVps}</Box>}
      </div>
    </Box>
  )
}
