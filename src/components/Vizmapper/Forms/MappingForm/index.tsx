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
  Button,
} from '@mui/material'

import { IdType } from '../../../../models/IdType'
import { Table, AttributeName } from '../../../../models/TableModel'
import { useVisualStyleStore } from '../../../../store/VisualStyleStore'
import { useTableStore } from '../../../../store/TableStore'

import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../../models/VisualStyleModel'
import { MappingFunctionType } from '../../../../models/VisualStyleModel/VisualMappingFunction'

import {
  PassthroughMappingFunctionIcon,
  DiscreteMappingFunctionIcon,
  ContinuousMappingFunctionIcon,
} from '../../VisualStyleIcons'

import { typesCanBeMapped } from '../../../../models/VisualStyleModel/impl/MappingFunctionImpl'

import {
  EmptyVisualPropertyViewBox,
  VisualPropertyViewBox,
} from '../VisualPropertyViewBox'

import { DiscreteMappingForm } from './DiscreteMappingForm'
import { ContinuousMappingForm } from './ContinuousMappingForm'

const mappingFnIconMap: Record<MappingFunctionType, React.ReactElement> = {
  passthrough: <PassthroughMappingFunctionIcon />,
  discrete: <DiscreteMappingFunctionIcon />,
  continuous: <ContinuousMappingFunctionIcon />,
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
  const removeMapping = useVisualStyleStore((state) => state.removeMapping)
  const mappingFnContent = {
    [MappingFunctionType.Discrete]: <DiscreteMappingForm {...props} />,
    [MappingFunctionType.Continuous]: <ContinuousMappingForm {...props} />,
    [MappingFunctionType.Passthrough]: <Box></Box>,
    '': <Box></Box>,
  }

  React.useEffect(() => {
    setMappingType(props.visualProperty.mapping?.type ?? '')
  }, [props.visualProperty.mapping])

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

  const validColumns =
    mappingType === 'passthrough'
      ? columns.filter((c) =>
          typesCanBeMapped(c.type, props.visualProperty.type),
        )
      : columns

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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography
          sx={{ m: 1 }}
          variant="h6"
        >{`${props.visualProperty.displayName} mapping`}</Typography>
        <Button
          disabled={props.visualProperty.mapping == null}
          size="small"
          color="error"
          onClick={() =>
            removeMapping(props.currentNetworkId, props.visualProperty.name)
          }
        >
          Remove Mapping
        </Button>
      </Box>
      <Box sx={{ p: 1, m: 1 }}>
        <Divider sx={{ mb: 1 }} />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <FormControl
            sx={{ minWidth: '150px', maxWidth: '200px' }}
            size="small"
          >
            <InputLabel>Attribute</InputLabel>
            <Select
              defaultValue=""
              value={attribute}
              label="Column"
              onChange={(e) => handleAttributeChange(e.target.value)}
            >
              {validColumns.map((column) => (
                <MenuItem key={column.name} value={column.name}>
                  <Tooltip title={`Data type: ${column.type}`}>
                    <Box>{column.name}</Box>
                  </Tooltip>
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
