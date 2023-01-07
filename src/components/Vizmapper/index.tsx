import * as React from 'react'
import { Box, Typography, Tabs, Tab } from '@mui/material'
import { styled } from '@mui/material/styles'

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

const VisualPropertyViewBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  marginRight: theme.spacing(1),
  height: 50,
  width: 50,
  border: '1px solid gray',
  borderRadius: '20%',
  '&:hover': {
    cursor: 'pointer',
    border: '3px solid gray',
  },
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))

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
        p: 1,
      }}
    >
      <VisualPropertyViewBox>
        <DefaultValueForm
          visualProperty={visualProperty}
          currentNetworkId={currentNetworkId}
        />
      </VisualPropertyViewBox>
      <VisualPropertyViewBox>
        <MappingForm
          currentNetworkId={currentNetworkId}
          visualProperty={visualProperty}
        />
      </VisualPropertyViewBox>
      <VisualPropertyViewBox>
        <BypassForm
          currentNetworkId={currentNetworkId}
          visualProperty={visualProperty}
        />
      </VisualPropertyViewBox>
      <Box sx={{ ml: 1 }}>{visualProperty.displayName}</Box>
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
      <Box sx={{ display: 'flex', p: 1 }}>
        <Box sx={{ width: 50, textAlign: 'center', mr: 1 }}>Def.</Box>
        <Box sx={{ width: 50, textAlign: 'center', mr: 1 }}>Map.</Box>
        <Box sx={{ width: 50, textAlign: 'center' }}>Byp.</Box>
      </Box>
      <div hidden={currentTabIndex !== 0}>
        {currentTabIndex === 0 && <Box>{nodeVps}</Box>}
      </div>
      <div hidden={currentTabIndex !== 1}>
        {currentTabIndex === 1 && <Box>{edgeVps}</Box>}
      </div>
      <div hidden={currentTabIndex !== 2}>
        {currentTabIndex === 2 && <Box>{networkVps}</Box>}
      </div>
    </Box>
  )
}
