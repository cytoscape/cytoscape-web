import * as React from 'react'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Divider,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { IdType } from '../../models/IdType'
import VisualStyleFn, {
  EdgeVisualPropertyName,
  NodeVisualPropertyName,
  VisualProperty,
  VisualPropertyValueType,
  VisualStyle,
  VisualPropertyGroup,
} from '../../models/VisualStyleModel'

import { useVisualStyleStore } from '../../store/VisualStyleStore'
import { useUiStateStore } from '../../store/UiStateStore'

import { MappingForm } from './Forms/MappingForm'
import { BypassForm } from './Forms/BypassForm'
import { DefaultValueForm } from './Forms/DefaultValueForm'
import { EmptyVisualPropertyViewBox } from './Forms/VisualPropertyViewBox'

import { getDefaultVisualStyle } from '../../models/VisualStyleModel/impl/DefaultVisualStyle'
import {
  getCustomGraphicNodeVps,
  getFirstValidCustomGraphicVp,
  getNonCustomGraphicVps,
} from '../../models/VisualStyleModel/impl/CustomGraphicsImpl'

// ---- Hoisted to avoid remounting/flicker on hover ----
type StyledAccordionProps = { label: string; children: React.ReactNode }
const StyledAccordion = ({ label, children }: StyledAccordionProps) => (
  <Accordion
    defaultExpanded
    disableGutters
    elevation={0}
    square
    sx={{
      backgroundColor: 'transparent',
      '&:before': { display: 'none' },
      mb: 1,
    }}
  >
    <AccordionSummary
      expandIcon={<ExpandMoreIcon />}
      sx={{
        pl: 1,
        mb: 1,
        minHeight: 32,
        backgroundColor: '#f5f5f5',
        '& .MuiAccordionSummary-content': { margin: 0 },
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
    </AccordionSummary>
    <AccordionDetails
      sx={{
        p: 0,
        pl: 2,
        '& > *:not(:last-child)': { mb: 1 },
      }}
    >
      {children}
    </AccordionDetails>
  </Accordion>
)

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
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {disabled ? (
          <EmptyVisualPropertyViewBox
            sx={{ ml: 4, mr: 1.5, cursor: 'not-allowed' }}
          />
        ) : (
          <DefaultValueForm
            sx={{ ml: 4, mr: 1.5 }}
            visualProperty={visualProperty}
            currentNetworkId={currentNetworkId}
          />
        )}
        {visualProperty.group === VisualPropertyGroup.Network || disabled ? (
          <>
            <EmptyVisualPropertyViewBox
              sx={{ mr: 1.5, cursor: 'not-allowed' }}
            />
            <EmptyVisualPropertyViewBox
              sx={{ mr: 1.5, cursor: 'not-allowed' }}
            />
          </>
        ) : visualProperty.name.includes('nodeImageChart') ? (
          <>
            <EmptyVisualPropertyViewBox
              sx={{ mr: 1.5, cursor: 'not-allowed' }}
            />
            <BypassForm
              sx={{ mr: 1.5 }}
              currentNetworkId={currentNetworkId}
              visualProperty={visualProperty}
            />
          </>
        ) : (
          <>
            <MappingForm
              sx={{ mr: 1.5 }}
              currentNetworkId={currentNetworkId}
              visualProperty={visualProperty}
            />
            <BypassForm
              sx={{ mr: 1.5 }}
              currentNetworkId={currentNetworkId}
              visualProperty={visualProperty}
            />
          </>
        )}
        <Tooltip
          placement="top"
          arrow
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

      {(disabled || hasWarning) && (
        <Tooltip
          placement="top"
          arrow
          title={
            disabled
              ? tooltip!
              : 'Custom graphics size cannot be edited; it will scale automatically.'
          }
          sx={{ ml: 1 }}
        >
          <IconButton sx={{ p: 0.5 }}>
            <InfoIcon sx={{ color: 'rgba(0,0,0,0.4)' }} />
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

  const { networkId, height } = props
  const [currentTabIndex, setCurrentTabIndex] = React.useState(0)
  const visualStyles: Record<IdType, VisualStyle> = useVisualStyleStore(
    (s) => s.visualStyles,
  )
  const visualStyle = visualStyles[networkId]
  if (!visualStyle) return <div />

  // --- Node props grouping ---
  const allNodeVps = VisualStyleFn.nodeVisualProperties(visualStyle)
  const customGraphicVps = getCustomGraphicNodeVps(allNodeVps)
  const nonCustomGraphicVps = getNonCustomGraphicVps(allNodeVps)
  const customGraphicsVp = getFirstValidCustomGraphicVp(customGraphicVps)

  const borderProps = nonCustomGraphicVps.filter(
    (vp) =>
      vp.name.toLowerCase().includes('border') ||
      vp.displayName.toLowerCase().includes('border'),
  )
  const fillNames = new Set(['fill color', 'opacity'])
  const fillProps = nonCustomGraphicVps.filter((vp) =>
    fillNames.has(vp.displayName.toLowerCase()),
  )
  const labelProps = nonCustomGraphicVps.filter(
    (vp) =>
      vp.name.toLowerCase().startsWith('label') ||
      vp.displayName.toLowerCase().startsWith('label'),
  )
  const generalProps = nonCustomGraphicVps.filter(
    (vp) =>
      !borderProps.includes(vp) &&
      !fillProps.includes(vp) &&
      !labelProps.includes(vp),
  )
  const customProps = customGraphicsVp ? [customGraphicsVp] : []

  // --- Edge props grouping ---
  const edgeVps = VisualStyleFn.edgeVisualProperties(visualStyle)
  const edgeLabelProps = edgeVps.filter(
    (vp) =>
      vp.name.toLowerCase().startsWith('label') ||
      vp.displayName.toLowerCase().startsWith('label'),
  )
  const edgeFillNames = new Set(['opacity', 'stroke color'])
  const edgeFillProps = edgeVps.filter((vp) =>
    edgeFillNames.has(vp.displayName.toLowerCase()),
  )
  const edgeSourceTargetProps = edgeVps.filter((vp) => {
    const nm = vp.name.toLowerCase()
    const dn = vp.displayName.toLowerCase()
    return (
      nm.startsWith('source') ||
      nm.startsWith('target') ||
      dn.startsWith('source') ||
      dn.startsWith('target')
    )
  })
  const edgeGeneralProps = edgeVps.filter(
    (vp) =>
      !edgeLabelProps.includes(vp) &&
      !edgeFillProps.includes(vp) &&
      !edgeSourceTargetProps.includes(vp),
  )

  // --- Network props ---
  const networkVps = VisualStyleFn.networkVisualProperties(visualStyle)

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', width: '100%', height }}
    >
      {/* Tabs */}
      <Tabs
        value={currentTabIndex}
        onChange={(_, i) => setCurrentTabIndex(i)}
        TabIndicatorProps={{ sx: { backgroundColor: 'white' } }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          fontSize: 10,
          pb: 0.5,
          backgroundColor: '#2F80ED',
          '& button.Mui-selected': { color: 'white' },
          '& button': { minHeight: 34, height: 34, width: 30 },
        }}
      >
        <Tab label={<Typography variant="caption">Nodes</Typography>} />
        <Tab label={<Typography variant="caption">Edges</Typography>} />
        <Tab label={<Typography variant="caption">Network</Typography>} />
      </Tabs>

      {/* Secondary labels (disable pointer events to avoid intercepting clicks) */}
      <Box
        sx={{
          display: 'flex',
          p: 1,
          ml: 6,
          minHeight: 40,
          pointerEvents: 'none',
        }}
      >
        {['Default', 'Mapping', 'Bypass'].map((label, idx) => (
          <Box
            key={idx}
            sx={{
              width: TAB_TEXT_WIDTH,
              textAlign: 'center',
              mr: idx < 2 ? 1.5 : 0,
              fontSize: 10,
              transform: `rotate(${TAB_ROTATE_DEGREE}deg)`,
            }}
          >
            {label}
          </Box>
        ))}
      </Box>

      <Divider />

      {/* Scrollable content (ensure it's on top) */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1,
          pt: 1,
          pb: '100px',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {(() => {
          switch (currentTabIndex) {
            case 0: {
              const sections0 = [
                { label: 'Border', items: borderProps },
                { label: 'Fill', items: fillProps },
                { label: 'Label', items: labelProps },
                { label: 'General', items: generalProps },
                ...(customProps.length > 0
                  ? [{ label: 'Custom Graphics', items: customProps }]
                  : []),
              ]
              return sections0.map(({ label, items }) => (
                <StyledAccordion key={label} label={label}>
                  {items.map((vp) => (
                    <VisualPropertyView
                      key={vp.name}
                      currentNetworkId={networkId}
                      visualProperty={vp}
                    />
                  ))}
                </StyledAccordion>
              ))
            }
            case 1: {
              const sections1 = [
                { label: 'Label', items: edgeLabelProps },
                { label: 'Fill', items: edgeFillProps },
                { label: 'Source and Target', items: edgeSourceTargetProps },
                { label: 'General', items: edgeGeneralProps },
              ]
              return sections1.map(({ label, items }) => (
                <StyledAccordion key={label} label={label}>
                  {items.map((vp) => (
                    <VisualPropertyView
                      key={vp.name}
                      currentNetworkId={networkId}
                      visualProperty={vp}
                    />
                  ))}
                </StyledAccordion>
              ))
            }
            case 2:
              return (
                <Box>
                  {networkVps.map((vp) => (
                    <VisualPropertyView
                      key={vp.name}
                      currentNetworkId={networkId}
                      visualProperty={vp}
                    />
                  ))}
                </Box>
              )
            default:
              return null
          }
        })()}
      </Box>

      {/* Bottom spacer so layout tools don’t overlap */}
      <Box sx={{ flex: '0 0 auto', borderTop: '1px solid #ddd', p: 1 }} />
    </Box>
  )
}
