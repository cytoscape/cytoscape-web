import * as React from 'react'
import {
  Box,
  Popover,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  SxProps,
  Tooltip,
  Divider,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

import { IdType } from '../../../models/IdType'
import { Table, ValueType, AttributeName } from '../../../models/TableModel'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useTableStore } from '../../../store/TableStore'

import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../models/VisualStyleModel'
import {
  // ContinuousMappingFunction,
  DiscreteMappingFunction,
  MappingFunctionType,
} from '../../../models/VisualStyleModel/VisualMappingFunction'
// import { ContinuousFunctionInterval } from '../../../models/VisualStyleModel/VisualMappingFunction/ContinuousMappingFunction'

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

function ContinuousMappingForm(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  return <Box></Box>
}

function DiscreteMappingForm(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const mapping = props.visualProperty.mapping

  const deleteDiscreteMappingValue = useVisualStyleStore(
    (state) => state.deleteDiscreteMappingValue,
  )

  const setDiscreteMappingValue = useVisualStyleStore(
    (state) => state.setDiscreteMappingValue,
  )

  return (
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
  )
}

function MappingFormContent(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const [attribute, setAttribute] = React.useState<AttributeName | ''>(
    props.visualProperty.mapping?.attribute ?? '',
  )
  const [mappingType, setMappingType] = React.useState<
    MappingFunctionType | ''
  >(props.visualProperty.mapping?.type ?? '')

  const tables: Record<IdType, { nodeTable: Table; edgeTable: Table }> =
    useTableStore((state) => state.tables)
  const nodeTable = tables[props.currentNetworkId]?.nodeTable
  const edgeTable = tables[props.currentNetworkId]?.edgeTable
  const currentTable =
    props.visualProperty.group === 'node' ? nodeTable : edgeTable
  const columns = Array.from(currentTable.columns.values())

  const setMapping = useVisualStyleStore((state) => state.setMapping)

  const mappingFnContent = {
    [MappingFunctionType.Discrete]: <DiscreteMappingForm {...props} />,
    [MappingFunctionType.Continuous]: <ContinuousMappingForm {...props} />,
    [MappingFunctionType.Passthrough]: <Box></Box>,
  }

  const handleMappingTypeChange = (
    nextMapping: MappingFunctionType | '',
  ): void => {
    if (nextMapping !== '' && attribute !== '') {
      setMappingType(nextMapping)
      setMapping(
        props.currentNetworkId,
        props.visualProperty.name,
        attribute,
        nextMapping,
      )
    } else {
      setMappingType(nextMapping)
    }
  }

  const handleAttributeChange = (nextAttribute: AttributeName): void => {
    if (mappingType !== '' && nextAttribute !== '') {
      setAttribute(nextAttribute)
      setMapping(
        props.currentNetworkId,
        props.visualProperty.name,
        nextAttribute,
        mappingType,
      )
    } else {
      setAttribute(nextAttribute)
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '400px',
        height: '600px',
        minWidth: '30vw',
        minHeight: '30vh',
        overflow: 'hidden',
      }}
    >
      <Typography
        sx={{ m: 1 }}
        variant="h6"
      >{`${props.visualProperty.displayName} mapping`}</Typography>
      <Box sx={{ p: 1, m: 1 }}>
        <Divider sx={{ mb: 1 }} />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <FormControl sx={{ minWidth: '150px' }} size="small">
            <InputLabel>Attribute</InputLabel>
            <Select
              defaultValue=""
              value={attribute}
              label="Column"
              onChange={(e) => handleAttributeChange(e.target.value)}
            >
              {columns.map((column) => (
                <MenuItem key={column.name} value={column.name}>
                  {column.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: '150px' }} size="small">
            <InputLabel>Mapping Type</InputLabel>
            <Select
              defaultValue=""
              value={mappingType}
              label="Mapping Type"
              onChange={(e) =>
                handleMappingTypeChange(
                  e.target.value as MappingFunctionType | '',
                )
              }
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
      <Box>{mappingFnContent[mappingType as MappingFunctionType]}</Box>
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

  const mappingExists = props.visualProperty.mapping?.type != null

  const tooltipText = `${props.visualProperty.displayName} Mapping${
    mappingExists ? `: ${String(props.visualProperty.mapping?.type)}` : ''
  }`
  return (
    <Box sx={props.sx ?? {}}>
      <Tooltip title={tooltipText}>{viewBox}</Tooltip>
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
