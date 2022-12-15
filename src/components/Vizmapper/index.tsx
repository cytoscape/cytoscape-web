import * as React from 'react'
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Popover,
} from '@mui/material'

import { IdType } from '../../models/IdType'
import { Table, ValueType } from '../../models/TableModel'
import VisualStyleFn, {
  VisualProperty,
  VisualPropertyValueType,
  VisualStyle,
} from '../../models/VisualStyleModel'
import {
  ContinuousMappingFunction,
  DiscreteMappingFunction,
  MappingFunctionType,
} from '../../models/VisualStyleModel/VisualMappingFunction'
import { VisualPropertyValueTypeString } from '../../models/VisualStyleModel/VisualPropertyValueTypeString'

import { useVisualStyleStore } from '../../store/VisualStyleStore'
import { useViewModelStore } from '../../store/ViewModelStore'
import { useTableStore } from '../../store/TableStore'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CloseIcon from '@mui/icons-material/Close'

import { NodeShapePicker } from './NodeShape'
import { ColorPicker } from './Color'
import { NodeBorderLinePicker } from './NodeBorderLine'
import { NumberInput } from './Number'
import { FontPicker } from './Font'
import { HoritzontalAlignPicker } from './HorizontalAlign'
import { VerticalAlignPicker } from './VerticalAlign'
import { VisibilityPicker } from './Visibility'
import { EdgeArrowShapePicker } from './EdgeArrowShape'
import { EdgeLinePicker } from './EdgeLine'
import { StringInput } from './String'
import { BooleanSwitch } from './Boolean'
import { ContinuousFunctionInterval } from '../../models/VisualStyleModel/VisualMappingFunction/ContinuousMappingFunction'

const type2RenderFnMap: Record<
  VisualPropertyValueTypeString,
  (props: {
    currentValue: VisualPropertyValueType
    onValueChange: (newValue: VisualPropertyValueType) => void
  }) => React.ReactElement
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

const ClickableVisualPropertyValue = (props: {
  visualProperty: VisualProperty<VisualPropertyValueType>
  currentValue: VisualPropertyValueType
  onValueChange: (newValue: VisualPropertyValueType) => void
}): React.ReactElement => {
  const [valuePicker, setValuePicker] = React.useState<Element | null>(null)

  const showValuePicker = (value: Element | null): void => {
    setValuePicker(value)
  }

  return (
    <Box>
      <Box
        sx={{
          p: 1,
          m: 1,
          '&:hover': { border: '1px solid gray', cursor: 'pointer' },
        }}
        onClick={(e) => showValuePicker(e.currentTarget)}
      >
        {props.currentValue}
      </Box>
      <Popover
        open={Boolean(valuePicker)}
        anchorEl={valuePicker}
        onClose={() => showValuePicker(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ width: 300, height: 150, p: 1, m: 1 }}>
          {(type2RenderFnMap[props.visualProperty.type] ?? (() => {}))({
            onValueChange: (value: VisualPropertyValueType) =>
              props.onValueChange(value),
            currentValue: props.currentValue,
          })}
        </Box>
      </Popover>
    </Box>
  )
}

function MappingFunctionView(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const [attribute, setAttribute] = React.useState(
    props.visualProperty.mapping?.attribute ?? '',
  )
  const [mappingType, setMappingType] = React.useState(
    props.visualProperty.mapping?.type ?? '',
  )

  const mapping = props.visualProperty.mapping
  const deleteDiscreteMappingValue = useVisualStyleStore(
    (state) => state.deleteDiscreteMappingValue,
  )

  const setDiscreteMappingValue = useVisualStyleStore(
    (state) => state.setDiscreteMappingValue,
  )

  const tables: Record<IdType, { nodeTable: Table; edgeTable: Table }> =
    useTableStore((state) => state.tables)
  const nodeTable = tables[props.currentNetworkId]?.nodeTable
  const edgeTable = tables[props.currentNetworkId]?.edgeTable
  const currentTable =
    props.visualProperty.group === 'node' ? nodeTable : edgeTable
  const columns = Array.from(currentTable.columns.values())

  const mappingFnContent = {
    [MappingFunctionType.Discrete]: (
      <Box>
        <Box>Discrete Value Map</Box>

        {Array.from(
          (mapping as DiscreteMappingFunction)?.vpValueMap?.entries() ??
            new Map(),
        ).map(([value, vpValue]: [ValueType, VisualPropertyValueType]) => {
          return (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
              key={String(value)}
            >
              <Box>{String(value)}</Box>
              <ClickableVisualPropertyValue
                currentValue={vpValue}
                onValueChange={(newValue: VisualPropertyValueType) => {
                  setDiscreteMappingValue(
                    props.currentNetworkId,
                    props.visualProperty.name,
                    value,
                    newValue,
                  )
                }}
                visualProperty={props.visualProperty}
              />
              <CloseIcon
                onClick={() =>
                  deleteDiscreteMappingValue(
                    props.currentNetworkId,
                    props.visualProperty.name,
                    value,
                  )
                }
              />
            </Box>
          )
        })}
      </Box>
    ),
    [MappingFunctionType.Continuous]: (
      <Box>
        <Box>{JSON.stringify(mapping, null, 2)}</Box>
        {((mapping as ContinuousMappingFunction)?.intervals ?? []).map(
          (interval: ContinuousFunctionInterval, index: number) => {
            return (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
                key={index}
              >
                {JSON.stringify(interval, null, 2)}
              </Box>
            )
          },
        )}
      </Box>
    ),
    [MappingFunctionType.Passthrough]: <Box></Box>,
  }

  return (
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
          justifyContent: 'space-between',
          border: '1px solid gray',
          p: 1,
          m: 1,
        }}
      >
        <Box>
          <FormControl>
            <InputLabel>Column</InputLabel>
            <Select
              defaultValue=""
              value={attribute ?? 'None'}
              label="Column"
              onChange={(e) => setAttribute(e.target.value)}
            >
              {columns.map((column) => (
                <MenuItem key={column.name} value={column.name}>
                  {column.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box>
          <FormControl>
            <InputLabel>Mapping Type</InputLabel>
            <Select
              defaultValue=""
              value={mappingType ?? 'None'}
              label="Column"
              onChange={(e) => setMappingType(e.target.value)}
            >
              {Object.values(MappingFunctionType).map((mappingFnType) => (
                <MenuItem key={mappingFnType} value={mappingFnType}>
                  {mappingFnType}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
      <Box sx={{ p: 1, m: 1, border: '1px solid gray' }}>
        {mappingFnContent[mappingType as MappingFunctionType]}
      </Box>
    </Box>
  )
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
  const tables = useTableStore((state) => state.tables)
  const table = tables[props.currentNetworkId]
  const nodeTable = table?.nodeTable
  const edgeTable = table?.edgeTable
  const viewModels = useViewModelStore((state) => state.viewModels)
  const networkView = viewModels[props.currentNetworkId]

  const handleChange = (panel: string): void => {
    setExpanded(panel === expanded ? '' : panel)
  }

  const defaultExpandedContent = (
    <ClickableVisualPropertyValue
      visualProperty={visualProperty}
      currentValue={visualProperty.defaultValue}
      onValueChange={(value) =>
        setDefault(props.currentNetworkId, visualProperty.name, value)
      }
    ></ClickableVisualPropertyValue>
  )

  const mappingExanpdedContent = (
    <Box>
      <MappingFunctionView
        currentNetworkId={props.currentNetworkId}
        visualProperty={visualProperty}
      />
    </Box>
  )
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
          {Array.from(visualProperty?.bypassMap?.entries() ?? []).map(
            ([eleId, value]) => {
              const eleTable =
                visualProperty.group === 'node' ? nodeTable : edgeTable
              const name = eleTable.rows.get(eleId)?.name
              return (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  key={eleId}
                >
                  <Box>{`${eleId}`}</Box>
                  <Box>{name}</Box>
                  <ClickableVisualPropertyValue
                    visualProperty={visualProperty}
                    currentValue={value}
                    onValueChange={(value) => {
                      setBypass(
                        props.currentNetworkId,
                        visualProperty.name,
                        [eleId],
                        value,
                      )
                    }}
                  />
                  <CloseIcon
                    sx={{ '&:hover': { cursor: 'pointer' } }}
                    onClick={() => {
                      deleteBypass(
                        props.currentNetworkId,
                        visualProperty.name,
                        [eleId],
                      )
                    }}
                  />
                </Box>
              )
            },
          )}
        </Box>
      </Box>
      <Box sx={{ border: '1px solid gray', p: 1, m: 1 }}>
        <Box>Value Picker</Box>
        <ClickableVisualPropertyValue
          visualProperty={visualProperty}
          currentValue={visualProperty.defaultValue}
          onValueChange={(newBypassValue: VisualPropertyValueType): void => {
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
          }}
        />
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
