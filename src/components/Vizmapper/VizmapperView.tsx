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
import { useViewModelStore } from '../../store/ViewModelStore'

import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CloseIcon from '@mui/icons-material/Close'

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
  const setBypass = useVisualStyleStore((state) => state.setBypass)
  const deleteBypass = useVisualStyleStore((state) => state.deleteBypass)
  const viewModels = useViewModelStore((state) => state.viewModels)
  const networkView = viewModels[props.currentNetworkId]

  const handleChange = (panel: string): void => {
    setExpanded(panel === expanded ? '' : panel)
  }

  const defaultExpandedContent = (
    type2RenderFnMap[visualProperty.type] ?? (() => {})
  )({
    onClick: (newDefaultValue: VisualPropertyValueType): void => {
      setDefault(props.currentNetworkId, visualProperty.name, newDefaultValue)
    },
    currentValue: visualProperty.defaultValue,
  })

  const mappingExanpdedContent = <div></div>
  const bypassExpandedContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          border: '1px solid gray',
          p: 1,
          m: 1,
        }}
      >
        <Box
          sx={{
            p: 1,
            m: 1,
            border: '1px solid gray',
            maxHeight: '300px',
            overflow: 'scroll',
          }}
        >
          <Box>Selected Elements</Box>
          {visualProperty.group === 'node'
            ? Object.values(networkView?.nodeViews)
                .filter((nodeView) => nodeView.selected)
                .map((nodeView) => {
                  return <Box key={nodeView.id}>{`Node: ${nodeView.id}`}</Box>
                })
            : null}
          {visualProperty.group === 'edge'
            ? Object.values(networkView?.edgeViews)
                .filter((edgeView) => edgeView.selected)
                .map((edgeView) => {
                  return <Box key={edgeView.id}>{`Edge: ${edgeView.id}`}</Box>
                })
            : null}
        </Box>
        <Box
          sx={{
            p: 1,
            m: 1,
            border: '1px solid gray',
            maxHeight: '300px',
            overflow: 'scroll',
          }}
        >
          <Box>Current Bypasses</Box>
          {Object.entries(visualProperty?.bypassMap ?? {}).map(
            ([eleId, value]) => {
              return (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                  key={eleId}
                >
                  <Box>{`${eleId}`}</Box>
                  <Box>{value as string}</Box>
                  <CloseIcon
                    onClick={() =>
                      deleteBypass(
                        props.currentNetworkId,
                        visualProperty.name,
                        [eleId],
                      )
                    }
                  />
                </Box>
              )
            },
          )}
        </Box>
      </Box>
      <Box sx={{ border: '1px solid gray', p: 1, m: 1 }}>
        <Box>Value Picker</Box>
        {(type2RenderFnMap[visualProperty.type] ?? (() => {}))({
          onClick: (newBypassValue: VisualPropertyValueType): void => {
            let ids: IdType[] = []
            const nodeIds = Object.values(networkView?.nodeViews)
              .filter((nodeView) => nodeView.selected)
              .map((nodeView) => nodeView.id)
            const edgeIds = Object.values(networkView?.edgeViews)
              .filter((edgeView) => edgeView.selected)
              .map((edgeView) => edgeView.id)
            if (visualProperty.group === 'node') {
              ids = nodeIds
            } else if (visualProperty.group === 'edge') {
              ids = edgeIds
            }
            setBypass(
              props.currentNetworkId,
              visualProperty.name,
              ids,
              newBypassValue,
            )
          },
          currentValue: visualProperty.defaultValue,
        })}
      </Box>
    </Box>
  )

  const expandedContentMap: Record<string, React.ReactElement> = {
    defaultValue: defaultExpandedContent,
    mapping: mappingExanpdedContent,
    bypass: bypassExpandedContent,
    '': <Box></Box>,
  }

  return (
    <Accordion expanded={expanded !== ''}>
      <AccordionSummary
        expandIcon={
          <ExpandMoreIcon
            sx={{ width: 50, height: 50, p: 1 }}
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
