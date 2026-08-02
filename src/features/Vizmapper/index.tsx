import InfoIcon from '@mui/icons-material/Info'
import { Box, IconButton, Tab, Tabs, Tooltip, Typography } from '@mui/material'
import * as React from 'react'

import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { logUi } from '../../debug'
import { IdType } from '../../models/IdType'
import VisualStyleFn, {
  EdgeVisualPropertyName,
  NodeVisualPropertyName,
  VisualProperty,
  VisualPropertyValueType,
  VisualStyle,
} from '../../models/VisualStyleModel'
import {
  getCustomGraphicNodeVps,
  getFirstValidCustomGraphicVp,
  getNonCustomGraphicVps,
} from '../../models/VisualStyleModel/impl/customGraphicsImpl'
import { getDefaultVisualStyle } from '../../models/VisualStyleModel/impl/defaultVisualStyle'
import { VisualPropertyGroup } from '../../models/VisualStyleModel/VisualPropertyGroup'
import { BypassForm } from './Forms/BypassForm'
import { DefaultValueForm } from './Forms/DefaultValueForm'
import { MappingForm } from './Forms/MappingForm'
import { EmptyVisualPropertyViewBox } from './Forms/VisualPropertyViewBox'
import { StyleManager } from './StyleManager'

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
    tooltip = `Node width and height are locked. Use the '${heightName}' property to adjust the node size, or uncheck “Lock node width and height” in '${heightName}' to enable editing of the Width.`
  if (arrowColorDisabled)
    tooltip = `Edge color to arrows is enabled. Use the '${edgeLineColorName}' property to adjust the arrow color, or uncheck “Edge color to arrows” in '${edgeLineColorName}' to enable editing of the arrow color.`

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
            sx={{
              color: (theme) =>
                disabled
                  ? theme.palette.text.disabled
                  : theme.palette.text.primary,
            }}
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
            'Due to rendering limitations, custom graphics size cannot be edited and will scale to the size of nodes by default. Original size values are preserved. ' +
            'Custom-graphic images render here but not in Cytoscape Desktop, which loads images from its own image pool rather than from the network file.'
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

  const allNodeVps = VisualStyleFn.nodeVisualProperties(visualStyle)
  const customGraphicVps = getCustomGraphicNodeVps(allNodeVps)
  const nonCustomGraphicVps = getNonCustomGraphicVps(allNodeVps)
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
    nodeVps.push(
      <VisualPropertyView
        key={firstValidCustomGraphicVP.name}
        currentNetworkId={props.networkId}
        visualProperty={firstValidCustomGraphicVP}
      />,
    )
  } else {
    logUi.error('No valid custom graphics visual properties found', {
      networkId: props.networkId,
    })
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
      data-testid="vizmapper"
      sx={{
        width: '100%',
        height: '100%',
      }}
    >
      {/* key resets menu/dialog state when the user switches networks, so an
          open dialog can never act on a different network's style */}
      <StyleManager key={props.networkId} networkId={props.networkId} />
      <Tabs
        data-testid="vizmapper-tabs"
        value={currentTabIndex}
        sx={{
          display: 'flex',
          alignItems: 'center',
          pb: 0.5,
          '& button': {
            minHeight: 34,
            height: 34,
          },
          minHeight: 34,
          height: 34,
          backgroundColor: (theme) => theme.palette.background.default,
        }}
        onChange={(e, nextTab) => setCurrentTabIndex(nextTab)}
      >
        <Tab data-testid="vizmapper-nodes-tab" label="Nodes" />
        <Tab data-testid="vizmapper-edges-tab" label="Edges" />
        <Tab data-testid="vizmapper-network-tab" label="Network" />
      </Tabs>
      <Box
        sx={{
          display: 'flex',
          px: 1.5,
          pt: 1.5,
          pb: 0,
          ml: 0.5,
          minHeight: '40px',
          borderBottom: (theme) =>
            `2px solid ${theme.palette.background.default}`,
        }}
      >
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
      <div hidden={currentTabIndex !== 0}>
        {currentTabIndex === 0 && (
          <Box
            sx={{
              ml: 1,
              overflow: 'scroll',
              height: props.height - 202, // we want to only scroll the vp list instead of the whole allotment
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
              height: props.height - 202,
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
              height: props.height - 202,
            }}
          >
            {networkVps}
          </Box>
        )}
      </div>
    </Box>
  )
}
