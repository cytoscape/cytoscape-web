import * as React from 'react'
import { Box, Typography, Tabs, Tab, Divider, Tooltip } from '@mui/material'

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
import { EmptyVisualPropertyViewBox } from './Forms/VisualPropertyViewBox'
import { VisualPropertyGroup } from '../../models/VisualStyleModel/VisualPropertyGroup'

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
        p: 0.25,
      }}
    >
      <DefaultValueForm
        sx={{ mr: 1 }}
        visualProperty={visualProperty}
        currentNetworkId={currentNetworkId}
      />
      {visualProperty.group === VisualPropertyGroup.Network ? (
        <>
          <Tooltip title={'Mapping not available for network properties'}>
            <EmptyVisualPropertyViewBox sx={{ mr: 1, cursor: 'not-allowed' }} />
          </Tooltip>
          <Tooltip title={'Bypasses not available for network properties'}>
            <EmptyVisualPropertyViewBox sx={{ mr: 1, cursor: 'not-allowed' }} />
          </Tooltip>
        </>
      ) : (
        <>
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
        </>
      )}

      <Typography variant="body2" sx={{ ml: 1 }}>
        {visualProperty.displayName}
      </Typography>
    </Box>
  )
}

export default function VizmapperView(props: {
  networkId: IdType
  height: number
}): React.ReactElement {
  const [currentTabIndex, setCurrentTabIndex] = React.useState(0)
  const visualStyles: Record<IdType, VisualStyle> = useVisualStyleStore(
    (state) => state.visualStyles,
  )

  const visualStyle = visualStyles[props.networkId]

  if (visualStyle == null) {
    return <div></div>
  }

  const nodeVps = VisualStyleFn.nodeVisualProperties(visualStyle).map((vp) => {
    return (
      <VisualPropertyView
        key={vp.name}
        currentNetworkId={props.networkId}
        visualProperty={vp}
      />
    )
  })
  const edgeVps = VisualStyleFn.edgeVisualProperties(visualStyle).map((vp) => {
    return (
      <VisualPropertyView
        key={vp.name}
        currentNetworkId={props.networkId}
        visualProperty={vp}
      />
    )
  })

  const networkVps = VisualStyleFn.networkVisualProperties(visualStyle).map(
    (vp) => {
      return (
        <VisualPropertyView
          key={vp.name}
          currentNetworkId={props.networkId}
          visualProperty={vp}
        />
      )
    },
  )

  return (
    <Box
      sx={{
        borderBottom: 1,
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
      <Box sx={{ display: 'flex', p: 0.5, ml: 1 }}>
        <Box sx={{ width: 24, textAlign: 'center', mr: 1.5, fontSize: 12 }}>
          Def.
        </Box>
        <Box sx={{ width: 24, textAlign: 'center', mr: 1.5, fontSize: 12 }}>
          Map.
        </Box>
        <Box sx={{ width: 24, textAlign: 'center', fontSize: 12 }}>Byp.</Box>
      </Box>
      <Divider />
      <div hidden={currentTabIndex !== 0}>
        {currentTabIndex === 0 && (
          <Box
            sx={{
              ml: 1,
              mb: 1,
              pt: 1,
              overflow: 'scroll',
              height: props.height - 135, // we want to only scroll the vp list instead of the whole allotment
              // height has to be computed based on allotment size to allow overflow scroll
              // height is passed as a prop but this could be pulled from a uiState store instead in the future
            }}
          >
            {nodeVps}
          </Box>
        )}
      </div>
      <div hidden={currentTabIndex !== 1}>
        {currentTabIndex === 1 && (
          <Box
            sx={{
              ml: 1,
              mb: 1,
              pt: 1,
              overflow: 'scroll',
              height: props.height - 135,
            }}
          >
            {edgeVps}
          </Box>
        )}
      </div>
      <div hidden={currentTabIndex !== 2}>
        {currentTabIndex === 2 && (
          <Box
            sx={{
              ml: 1,
              mb: 1,
              pt: 1,
              overflow: 'scroll',
              height: props.height - 135,
            }}
          >
            {networkVps}
          </Box>
        )}
      </div>
    </Box>
  )
}
