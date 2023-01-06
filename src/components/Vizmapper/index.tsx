import * as React from 'react'
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tabs,
  Tab,
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

import { useVisualStyleStore } from '../../store/VisualStyleStore'
import { useViewModelStore } from '../../store/ViewModelStore'
import { useTableStore } from '../../store/TableStore'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CloseIcon from '@mui/icons-material/Close'

import { ContinuousFunctionInterval } from '../../models/VisualStyleModel/VisualMappingFunction/ContinuousMappingFunction'
import {
  PassthroughMappingFunctionIcon,
  DiscreteMappingFunctionIcon,
  ContinuousMappingFunctionIcon,
} from './VisualStyleIcons'

import { ClickableVisualPropertyValue } from './ClickableVisualPropertyValue'

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
          m: 1,
        }}
      >
        <Box
          sx={{
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
                  <Box
                    sx={{ width: 50, m: 1 }}
                  >{`${visualProperty.group}:  ${eleId}`}</Box>
                  <Box sx={{ width: 50, m: 1 }}>{name}</Box>
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
      <Box sx={{ border: '1px solid gray', m: 1 }}>
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

  const mappingFnIconMap: Record<MappingFunctionType, React.ReactElement> = {
    passthrough: <PassthroughMappingFunctionIcon />,
    discrete: <DiscreteMappingFunctionIcon />,
    continuous: <ContinuousMappingFunctionIcon />,
  }

  return (
    <Accordion expanded={expanded !== ''}>
      <AccordionSummary
        expandIcon={
          <ExpandMoreIcon
            sx={{ width: 50, height: 50, p: 1 }}
            onClick={() =>
              expanded !== '' ? handleChange('') : handleChange('mapping')
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
              sx={{
                p: 1,
                mr: 1,
                height: 60,
                width: 60,
                border: '1px solid gray',
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
              {
                <ClickableVisualPropertyValue
                  visualProperty={visualProperty}
                  currentValue={visualProperty.defaultValue}
                  onValueChange={(newValue) =>
                    setDefault(
                      props.currentNetworkId,
                      visualProperty.name,
                      newValue,
                    )
                  }
                />
              }
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
              {visualProperty.mapping?.type != null
                ? mappingFnIconMap[visualProperty.mapping?.type]
                : '+'}
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
