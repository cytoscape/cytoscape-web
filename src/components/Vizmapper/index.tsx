import * as React from 'react'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'
import { IdType } from '../../models/IdType'
import VisualStyleFn, {
  EdgeVisualPropertyName,
  NodeVisualPropertyName,
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
import { useUiStateStore } from '../../store/UiStateStore'
import { getDefaultVisualStyle } from '../../models/VisualStyleModel/impl/DefaultVisualStyle'
import { useState } from 'react'
import {
  getCustomGraphicNodeVps,
  getFirstValidCustomGraphicVp,
  getNonCustomGraphicVps,
  getSizePropertyForCustomGraphic,
} from '../../models/VisualStyleModel/impl/CustomGraphicsImpl'

function VisualPropertyView(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const { visualProperty, currentNetworkId } = props
  const vpName = visualProperty.name
  const edgeLineColorName = getDefaultVisualStyle()['edgeLineColor'].displayName
  const heightName = getDefaultVisualStyle()['nodeHeight'].displayName

  const nodeSizeLocked = useUiStateStore(
    (state) =>
      state.ui.visualStyleOptions[currentNetworkId]?.visualEditorProperties
        ?.nodeSizeLocked,
  )
  const arrowColorMatchesEdge = useUiStateStore(
    (state) =>
      state.ui.visualStyleOptions[currentNetworkId]?.visualEditorProperties
        ?.arrowColorMatchesEdge,
  )

  const widthDisabled =
    nodeSizeLocked && NodeVisualPropertyName.NodeWidth === vpName
  const arrowColorDisabled =
    arrowColorMatchesEdge &&
    (EdgeVisualPropertyName.EdgeSourceArrowColor === vpName ||
      EdgeVisualPropertyName.EdgeTargetArrowColor === vpName)
  const disabled = widthDisabled || arrowColorDisabled

  let tooltip: string | undefined
  if (widthDisabled)
    tooltip = `Node width and height are locked. Use the \'${heightName}\' property to adjust the node size, or uncheck \“Lock node width and height\” in \'${heightName}\' to enable editing of the Width.`
  if (arrowColorDisabled)
    tooltip = `Edge color to arrows is enabled. Use the \'${edgeLineColorName}\' property to adjust the arrow color, or uncheck \“Edge color to arrows\” in \'${edgeLineColorName}\' to enable editing of the arrow color.`

  const hasWarning = vpName.includes('nodeImageChart')

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 0.25,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {disabled ? (
          <EmptyVisualPropertyViewBox
            sx={{ ml: 0.5, mr: 2.1, cursor: 'not-allowed' }}
          />
        ) : (
          <DefaultValueForm
            sx={{ ml: 0.5, mr: 2.1 }}
            visualProperty={visualProperty}
            currentNetworkId={currentNetworkId}
          />
        )}
        {visualProperty.group === VisualPropertyGroup.Network || disabled ? (
          <>
            <Tooltip
              placement="top"
              arrow={true}
              title={
                disabled ? '' : 'Mapping not available for network properties'
              }
            >
              <EmptyVisualPropertyViewBox
                sx={{ mr: 2.1, cursor: 'not-allowed' }}
              />
            </Tooltip>
            <Tooltip
              placement="top"
              arrow={true}
              title={
                disabled ? '' : 'Bypasses not available for network properties'
              }
            >
              <EmptyVisualPropertyViewBox
                sx={{ mr: 2.1, cursor: 'not-allowed' }}
              />
            </Tooltip>
          </>
        ) : (
          <>
            <MappingForm
              sx={{ mr: 2.1 }}
              currentNetworkId={currentNetworkId}
              visualProperty={visualProperty}
            />
            <BypassForm
              sx={{ mr: 2.1 }}
              currentNetworkId={currentNetworkId}
              visualProperty={visualProperty}
            />
          </>
        )}
        <Tooltip
          placement="top"
          arrow={true}
          title={tooltip ?? visualProperty.tooltip}
        >
          <Typography
            variant="body2"
            sx={{ color: disabled ? 'gray' : 'black' }}
          >
            {visualProperty.displayName}
          </Typography>
        </Tooltip>
      </Box>

      {disabled && (
        <Tooltip
          placement="top"
          title={tooltip ?? visualProperty.tooltip}
          arrow={true}
          sx={{
            mr: 1,
          }}
        >
          <IconButton sx={{ padding: 0.5 }}>
            <InfoIcon sx={{ color: 'rgb(0,0,0,0.4)' }} />
          </IconButton>
        </Tooltip>
      )}

      {hasWarning && (
        <Tooltip
          placement="top"
          title={
            'Due to rendering limitations, custom graphics size cannot be edited and will scale to the size of nodes by default.  Original size values are preserved.'
          }
          arrow={true}
          sx={{
            mr: 1,
          }}
        >
          <IconButton sx={{ padding: 0.5 }}>
            <InfoIcon sx={{ color: 'rgb(0,0,0,0.4)' }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}

export default function VizmapperView(props: {
  networkId: IdType
  height: number
}): React.ReactElement {
  const TAB_ROTATE_DEGREE = 330
  const TAB_TEXT_WIDTH = 34
  const FONT_SIZE = 10
  const [currentTabIndex, setCurrentTabIndex] = React.useState(0)
  const visualStyles: Record<IdType, VisualStyle> = useVisualStyleStore(
    (state) => state.visualStyles,
  )

  const visualStyle = visualStyles[props.networkId]

  if (visualStyle == null) {
    return <div></div>
  }

  const customGraphicVps = getCustomGraphicNodeVps(
    VisualStyleFn.nodeVisualProperties(visualStyle),
  )

  const nonCustomGraphicVps = getNonCustomGraphicVps(
    VisualStyleFn.nodeVisualProperties(visualStyle),
  )

  const nodeVps = nonCustomGraphicVps.map((vp) => {
    return (
      <VisualPropertyView
        key={vp.name}
        currentNetworkId={props.networkId}
        visualProperty={vp}
      />
    )
  })

  // Only render the first valid custom graphic visual property and its associated size property
  const firstValidCustomGraphicVP =
    getFirstValidCustomGraphicVp(customGraphicVps)

  if (firstValidCustomGraphicVP !== undefined) {
    // const customGraphicsSizeVP = getSizePropertyForCustomGraphic(
    //   firstValidCustomGraphicVP,
    //   customGraphicVps,
    // )

    // nodeVps.push(
    //   <VisualPropertyView
    //     key={firstValidCustomGraphicVP.name}
    //     currentNetworkId={props.networkId}
    //     visualProperty={firstValidCustomGraphicVP}
    //   />,
    // )

    // Dont expose custom graphics size properties for now
    // there are rendering limitations in cy.js
    // if (customGraphicsSizeVP) {
    //   nodeVps.push(
    //     <VisualPropertyView
    //       key={customGraphicsSizeVP.name}
    //       currentNetworkId={props.networkId}
    //       visualProperty={customGraphicsSizeVP}
    //     />,
    //   )
    // }
  } else {
    // There are no existing custom graphics vps set, so let the user
    // edit the first image chart property
    // const imageChart1Vp = customGraphicVps.find(
    //   (vp) => vp.name === 'nodeImageChart1',
    // )
    // const imageChartSize1Vp = customGraphicVps.find(
    //   (vp) => vp.name === 'nodeImageChartSize1',
    // )

    // if (imageChart1Vp) {
    //   nodeVps.push(
    //     <VisualPropertyView
    //       key={imageChart1Vp.name}
    //       currentNetworkId={props.networkId}
    //       visualProperty={imageChart1Vp}
    //     />,
    //   )
    // }
    // if (imageChartSize1Vp) {
    //   nodeVps.push(
    //     <VisualPropertyView
    //       key={imageChartSize1Vp.name}
    //       currentNetworkId={props.networkId}
    //       visualProperty={imageChartSize1Vp}
    //     />,
    //   )
    // }
  }

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
        width: '100%',
        height: '100%',
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
            minHeight: 34,
            height: 34,
            width: 30,
          },
          height: 34,
          minHeight: 34,
        }}
        onChange={(e, nextTab) => setCurrentTabIndex(nextTab)}
      >
        <Tab label={<Typography variant="caption">Nodes</Typography>} />
        <Tab label={<Typography variant="caption">Edges</Typography>} />
        <Tab label={<Typography variant="caption">Network</Typography>} />
      </Tabs>
      <Box sx={{ display: 'flex', p: 1.5, ml: 0.5, minHeight: '40px' }}>
        <Box
          sx={{
            width: TAB_TEXT_WIDTH,
            textAlign: 'center',
            mr: 1.5,
            fontSize: FONT_SIZE,
            transform: `rotate(${TAB_ROTATE_DEGREE}deg)`,
          }}
        >
          Default
        </Box>
        <Box
          sx={{
            width: TAB_TEXT_WIDTH,
            textAlign: 'center',
            mr: 1.5,
            fontSize: FONT_SIZE,
            transform: `rotate(${TAB_ROTATE_DEGREE}deg)`,
          }}
        >
          Mapping
        </Box>
        <Box
          sx={{
            width: TAB_TEXT_WIDTH,
            textAlign: 'center',
            fontSize: FONT_SIZE,
            transform: `rotate(${TAB_ROTATE_DEGREE}deg)`,
          }}
        >
          Bypass
        </Box>
      </Box>
      <Divider />
      <div hidden={currentTabIndex !== 0}>
        {currentTabIndex === 0 && (
          <Box
            sx={{
              ml: 1,
              pt: 1,
              overflow: 'scroll',
              height: props.height - 162, // we want to only scroll the vp list instead of the whole allotment
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
              pt: 1,
              overflow: 'scroll',
              height: props.height - 162,
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
              pt: 1,
              overflow: 'scroll',
              height: props.height - 162,
            }}
          >
            {networkVps}
          </Box>
        )}
      </div>
    </Box>
  )
}
