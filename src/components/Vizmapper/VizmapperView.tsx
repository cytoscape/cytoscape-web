import * as React from 'react'
import Box from '@mui/material/Box'
import { Typography } from '@mui/material'
// import InputLabel from '@mui/material/InputLabel'
// import MenuItem from '@mui/material/MenuItem'
// import FormControl from '@mui/material/FormControl'
// import Select from '@mui/material/Select'
import { IdType } from '../../models/IdType'
import VisualStyleFn, {
  VisualProperty,
  VisualPropertyValueType,
  VisualStyle,
} from '../../models/VisualStyleModel'
import { useVisualStyleStore } from '../../store/VisualStyleStore'

import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

import { NodeShapePicker } from './NodeShape'
import { ColorPicker } from './Color'
import { NodeBorderLinePicker } from './NodeBorderLine'
import { NumberInput } from './Number'
import { VisualPropertyValueTypeString } from '../../models/VisualStyleModel/VisualStyle'
import { FontPicker } from './Font'
import { HoritzontalAlignPicker } from './HorizontalAlign'
import { VerticalAlignPicker } from './VerticalAlign'
import { VisibilityPicker } from './Visibility'
import { EdgeArrowShapePicker } from './EdgeArrowShape'
import { EdgeLinePicker } from './EdgeLine'
import { StringInput } from './String'
import { BooleanSwitch } from './Boolean'

const type2RenderFnMap: Record<
  VisualPropertyValueTypeString,
  (props: any) => React.ReactElement
> = {
  nodeShape: NodeShapePicker,
  color: ColorPicker,
  nodeBorderLine: NodeBorderLinePicker,
  number: NumberInput,
  font: FontPicker,
  horizontalAlign: HoritzontalAlignPicker,
  verticalAlign: VerticalAlignPicker,
  visibility: VisibilityPicker,
  edgeArrowShape: EdgeArrowShapePicker,
  edgeLine: EdgeLinePicker,
  string: StringInput,
  boolean: BooleanSwitch,
}

function VisualPropertyView(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const { visualProperty } = props
  const [expanded, setExpanded] = React.useState('')
  const setDefault = useVisualStyleStore((state) => state.setDefault)

  const handleChange = (panel: string): void => {
    setExpanded(panel === expanded ? '' : panel)
  }

  const defaultExpandedContent = (
    type2RenderFnMap[visualProperty.type] ?? (() => {})
  )({
    onClick: (defaultValue: VisualPropertyValueType): void => {
      setDefault(props.currentNetworkId, visualProperty.name, defaultValue)
    },
    currentValue: visualProperty.defaultValue,
  })

  const mappingExanpdedContent = <div></div>
  const bypassExpandedContent = <div></div>

  const expandedContentMap: Record<string, React.ReactElement> = {
    defaultValue: defaultExpandedContent,
    mapping: mappingExanpdedContent,
    bypass: bypassExpandedContent,
    '': <div></div>,
  }

  return (
    <Accordion expanded={expanded !== ''}>
      <AccordionSummary
        expandIcon={
          <ExpandMoreIcon
            onClick={() =>
              expanded !== '' ? handleChange('') : handleChange('defaultValue')
            }
          />
        }
      >
        <Box
          sx={{
            p: 1,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex' }}>
            <Box
              onClick={(e) => {
                handleChange('defaultValue')
              }}
              sx={{
                p: 1,
                mr: 1,
                height: 60,
                width: 60,
                border:
                  expanded === 'defaultValue'
                    ? '3px solid gray'
                    : '1px solid gray',
                borderRadius: '20%',
                '&:hover': {
                  cursor: 'pointer',
                  border: '3px solid gray',
                },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {visualProperty.defaultValue}
            </Box>
            <Box
              onClick={() => handleChange('mapping')}
              sx={{
                p: 1,
                mr: 1,
                height: 60,
                width: 60,
                border:
                  expanded === 'mapping' ? '3px solid gray' : '1px solid gray',

                borderRadius: '20%',
                '&:hover': {
                  cursor: 'pointer',
                  border: '3px solid gray',
                },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {visualProperty.mapping?.type ?? '+'}
            </Box>
            <Box
              onClick={() => handleChange('bypass')}
              sx={{
                p: 1,
                mr: 1,
                height: 60,
                width: 60,
                border:
                  expanded === 'bypass' ? '3px solid gray' : '1px solid gray',

                borderRadius: '20%',
                '&:hover': {
                  cursor: 'pointer',
                  border: '3px solid gray',
                },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {visualProperty.bypassMap != null ? '+' : '-'}
            </Box>
          </Box>
          <Box
            onClick={() =>
              expanded !== '' ? handleChange('') : handleChange('defaultValue')
            }
          >
            {visualProperty.displayName}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box> {expandedContentMap[expanded]}</Box>
      </AccordionDetails>
    </Accordion>
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
      <Typography variant="body1" sx={{ p: 1 }}>
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
