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
import { AttributeName, ValueTypeName } from '../../../../models/TableModel'
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

import {
  typesCanBeMapped,
  validMappingsForVP,
} from '../../../../models/VisualStyleModel/impl/MappingFunctionImpl'

import {
  EmptyVisualPropertyViewBox,
  VisualPropertyViewBox,
} from '../VisualPropertyViewBox'

import { DiscreteMappingForm } from './DiscreteMappingForm'
import { ContinuousMappingForm } from './ContinuousMappingForm'
import { VisualPropertyGroup } from '../../../../models/VisualStyleModel/VisualPropertyGroup'

const mappingFnIconMap: Record<MappingFunctionType, React.ReactElement> = {
  [MappingFunctionType.Passthrough]: <PassthroughMappingFunctionIcon />,
  [MappingFunctionType.Discrete]: <DiscreteMappingFunctionIcon />,
  [MappingFunctionType.Continuous]: <ContinuousMappingFunctionIcon />,
}

function MappingFormContent(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const [column, setColumn] = React.useState<AttributeName | ''>(
    props.visualProperty.mapping?.attribute ?? '',
  )
  const [mappingType, setMappingType] = React.useState<
    MappingFunctionType | ''
  >(props.visualProperty.mapping?.type ?? '')

  const { columnValues, tables } = useTableStore((state) => ({
    columnValues: state.columnValues,
    tables: state.tables,
  }))
  const {
    removeMapping,
    createContinuousMapping,
    createDiscreteMapping,
    createPassthroughMapping,
  } = useVisualStyleStore((state) => ({
    removeMapping: state.removeMapping,
    createContinuousMapping: state.createContinuousMapping,
    createDiscreteMapping: state.createDiscreteMapping,
    createPassthroughMapping: state.createPassthroughMapping,
  }))

  const nodeTable = tables[props.currentNetworkId]?.nodeTable
  const edgeTable = tables[props.currentNetworkId]?.edgeTable
  const currentTable =
    props.visualProperty.group === VisualPropertyGroup.Node
      ? nodeTable
      : edgeTable
  const columns = Array.from(currentTable.columns.values())

  const mappingFnContent = {
    [MappingFunctionType.Discrete]: <DiscreteMappingForm {...props} />,
    [MappingFunctionType.Continuous]: <ContinuousMappingForm {...props} />,
    [MappingFunctionType.Passthrough]: <Box></Box>,
    '': <Box></Box>,
  }

  const createMapping = (
    mappingType: MappingFunctionType,
    attribute: AttributeName,
  ): void => {
    switch (mappingType) {
      case MappingFunctionType.Discrete: {
        createDiscreteMapping(
          props.currentNetworkId,
          props.visualProperty.name,
          attribute,
        )
        break
      }
      case MappingFunctionType.Continuous: {
        const attributeDataType = currentTable.columns.find(
          (c) => c.name === attribute,
        )?.type

        if (
          attributeDataType != null &&
          (attributeDataType === ValueTypeName.Integer ||
            attributeDataType === ValueTypeName.Long ||
            attributeDataType === ValueTypeName.Double)
        ) {
          const attributeValues = Array.from(
            columnValues(
              props.currentNetworkId,
              props.visualProperty.group as 'node' | 'edge',
              attribute,
            ),
          ).sort((a, b) => (a as number) - (b as number))

          createContinuousMapping(
            props.currentNetworkId,
            props.visualProperty.name,
            props.visualProperty.type,
            attribute,
            attributeValues,
          )
        }
        break
      }
      case MappingFunctionType.Passthrough: {
        createPassthroughMapping(
          props.currentNetworkId,
          props.visualProperty.name,
          attribute,
        )
        break
      }
    }
  }

  React.useEffect(() => {
    setMappingType(props.visualProperty.mapping?.type ?? '')
  }, [props.visualProperty.mapping])

  const handleMappingTypeChange = (
    nextMapping: MappingFunctionType | '',
  ): void => {
    const attributeType = currentTable.columns.find(
      (c) => c.name === column,
    )?.type
    if (nextMapping !== '' && column !== '' && attributeType != null) {
      // if the user switches to a new mapping that is not compatible with the current attribute, remove the mapping

      if (
        typesCanBeMapped(nextMapping, attributeType, props.visualProperty.type)
      ) {
        createMapping(nextMapping, column)
        setMappingType(nextMapping)
      } else {
        removeMapping(props.currentNetworkId, props.visualProperty.name)
        setMappingType('')
      }
    } else {
      setMappingType(nextMapping)
    }
  }

  const handleColumnChange = (nextAttribute: AttributeName): void => {
    const nextAttributeType = currentTable.columns.find(
      (c) => c.name === column,
    )?.type

    if (
      mappingType !== '' &&
      nextAttribute !== '' &&
      nextAttributeType != null
    ) {
      // if the user switches to a new attribute that is not compatible with the current mapping type, remove the mapping
      if (
        typesCanBeMapped(
          mappingType,
          nextAttributeType,
          props.visualProperty.type,
        )
      ) {
        createMapping(mappingType, nextAttribute)
        setColumn(nextAttribute)
      } else {
        removeMapping(props.currentNetworkId, props.visualProperty.name)
        setColumn('')
      }
    } else {
      setColumn(nextAttribute)
    }
  }

  const validColumns =
    mappingType !== ''
      ? columns.filter((c) => {
          return typesCanBeMapped(
            mappingType,
            c.type,
            props.visualProperty.type,
          )
        })
      : columns
  const validColumnNames = validColumns.map((c) => c.name)

  const validMappings = validMappingsForVP(props.visualProperty.type).filter(
    (mappingType) => {
      if (column === '') {
        return true
      } else {
        const attributeType = currentTable.columns.find(
          (c) => c.name === column,
        )?.type
        console.log(
          attributeType,
          props.visualProperty.type,
          props.visualProperty.mapping?.type,
        )
        return (
          attributeType != null &&
          typesCanBeMapped(
            mappingType,
            attributeType,
            props.visualProperty.type,
          )
        )
      }
    },
  )

  const mappingDimensions: Record<MappingFunctionType | '', [string, string]> =
    {
      [MappingFunctionType.Discrete]: ['400px', '600px'],
      [MappingFunctionType.Continuous]: ['650px', 'auto'],
      [MappingFunctionType.Passthrough]: ['400px', 'auto'],
      '': ['400px', '200px'],
    }

  console.log('MAPPING', props.visualProperty.mapping)
  console.log('MAPPING COLUMN', column)
  console.log('VALID MAPPINGS', validMappings)

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: mappingDimensions[mappingType][0],
        height: mappingDimensions[mappingType][1],
        overflow: 'hidden',
        p: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography>{`${props.visualProperty.displayName} mapping`}</Typography>
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
      <Box>
        <Divider sx={{ mt: 2, mb: 2 }} />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <FormControl
            sx={{ minWidth: '150px', maxWidth: '200px' }}
            size="small"
          >
            <InputLabel>Column</InputLabel>
            <Select
              defaultValue=""
              value={column}
              label="Column"
              onChange={(e) => handleColumnChange(e.target.value)}
            >
              {columns.map((c) => {
                const columnMenuItem = (
                  <MenuItem
                    disabled={!validColumnNames.includes(c.name)}
                    key={c.name}
                    value={c.name}
                  >
                    <Tooltip title={`Data type: ${c.type}`}>
                      <Box>{c.name}</Box>
                    </Tooltip>
                  </MenuItem>
                )

                if (validColumnNames.includes(c.name)) {
                  return columnMenuItem
                } else {
                  const invalidColumnTooltipStr = `${mappingType} mapping functions${
                    c.name !== '' ? ` on column '${c.name}' ` : ' '
                  }cannot be applied to property ${
                    props.visualProperty.displayName
                  }`

                  return (
                    <Tooltip key={c.name} title={invalidColumnTooltipStr}>
                      <Box>{columnMenuItem}</Box>
                    </Tooltip>
                  )
                }
              })}
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
              {Object.values(MappingFunctionType).map((mappingFnType) => {
                const mappingFnMenuItem = (
                  <MenuItem
                    disabled={!validMappings.includes(mappingFnType)}
                    key={mappingFnType}
                    value={mappingFnType}
                  >
                    {mappingFnType}
                  </MenuItem>
                )
                if (validMappings.includes(mappingFnType)) {
                  return mappingFnMenuItem
                } else {
                  const invalidMappingTooltipStr = `${mappingFnType} mapping functions${
                    column !== '' ? ` on column '${column}' ` : ' '
                  }cannot be applied to property ${
                    props.visualProperty.displayName
                  }`
                  return (
                    <Tooltip
                      key={mappingFnType}
                      title={invalidMappingTooltipStr}
                    >
                      <Box>{mappingFnMenuItem}</Box>
                    </Tooltip>
                  )
                }
              })}
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
      <EmptyVisualPropertyViewBox
        onClick={(e) => showForm(e.currentTarget)}
      ></EmptyVisualPropertyViewBox>
    ) : (
      <VisualPropertyViewBox onClick={(e) => showForm(e.currentTarget)}>
        {props.visualProperty.mapping?.type != null
          ? mappingFnIconMap[props.visualProperty.mapping?.type]
          : ''}
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
