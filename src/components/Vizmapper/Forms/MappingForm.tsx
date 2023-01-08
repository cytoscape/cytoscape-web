import * as React from 'react'
import {
  Box,
  Popover,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SxProps,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

import { IdType } from '../../../models/IdType'
import { Table, ValueType } from '../../../models/TableModel'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useTableStore } from '../../../store/TableStore'

import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../models/VisualStyleModel'
import {
  ContinuousMappingFunction,
  DiscreteMappingFunction,
  MappingFunctionType,
} from '../../../models/VisualStyleModel/VisualMappingFunction'
import { ContinuousFunctionInterval } from '../../../models/VisualStyleModel/VisualMappingFunction/ContinuousMappingFunction'

import {
  PassthroughMappingFunctionIcon,
  DiscreteMappingFunctionIcon,
  ContinuousMappingFunctionIcon,
} from '../VisualStyleIcons'
import { VisualPropertyValueForm } from './VisualPropertyValueForm'

import {
  EmptyVisualPropertyViewBox,
  VisualPropertyViewBox,
} from './VisualPropertyViewBox'

const mappingFnIconMap: Record<MappingFunctionType, React.ReactElement> = {
  passthrough: <PassthroughMappingFunctionIcon />,
  discrete: <DiscreteMappingFunctionIcon />,
  continuous: <ContinuousMappingFunctionIcon />,
}

function MappingFormContent(props: {
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
                alignItems: 'center',
              }}
              key={String(value)}
            >
              <Box sx={{ width: 100, overflowX: 'scroll', ml: 1 }}>
                {String(value)}
              </Box>
              <VisualPropertyValueForm
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
                sx={{ '&:hover': { cursor: 'pointer' } }}
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
        width: '400px',
        height: '400px',
        minWidth: '30vw',
        minHeight: '30vh',
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

export function MappingForm(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
  sx?: SxProps
}): React.ReactElement {
  const [formAnchorEl, setFormAnchorEl] = React.useState<Element | null>(null)

  const showForm = (value: Element | null): void => {
    setFormAnchorEl(value)
  }
  const viewBox =
    props.visualProperty.mapping?.type == null ? (
      <EmptyVisualPropertyViewBox onClick={(e) => showForm(e.currentTarget)}>
        {'+'}
      </EmptyVisualPropertyViewBox>
    ) : (
      <VisualPropertyViewBox onClick={(e) => showForm(e.currentTarget)}>
        {props.visualProperty.mapping?.type != null
          ? mappingFnIconMap[props.visualProperty.mapping?.type]
          : '+'}{' '}
      </VisualPropertyViewBox>
    )
  return (
    <Box sx={props.sx ?? {}}>
      {viewBox}
      <Popover
        open={formAnchorEl != null}
        anchorEl={formAnchorEl}
        onClose={() => showForm(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 55 }}
      >
        <MappingFormContent {...props} />
      </Popover>
    </Box>
  )
}
