import DeleteIcon from '@mui/icons-material/Delete'
import {
  Box,
  Button,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  SxProps,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'

import { useTableStore } from '../../../../data/hooks/stores/TableStore'
import { useVisualStyleStore } from '../../../../data/hooks/stores/VisualStyleStore'
import { useUndoStack } from '../../../../data/hooks/useUndoStack'
import { IdType } from '../../../../models/IdType'
import { UndoCommandType } from '../../../../models/StoreModel/UndoStoreModel'
import { AttributeName } from '../../../../models/TableModel'
import {
  EdgeVisualPropertyName,
  NodeVisualPropertyName,
  VisualProperty,
  VisualPropertyValueType,
} from '../../../../models/VisualStyleModel'
import {
  resolveMappingColumnChange,
  typesCanBeMapped,
  validMappingsForVP,
} from '../../../../models/VisualStyleModel/impl/mappingFunctionImpl'
import { MappingFunctionType } from '../../../../models/VisualStyleModel/VisualMappingFunction'
import { VisualPropertyGroup } from '../../../../models/VisualStyleModel/VisualPropertyGroup'
import {
  LockColorCheckbox,
  LockSizeCheckbox,
} from '../../VisualPropertyRender/Checkbox'
import {
  ContinuousMappingIcon,
  DiscreteMappingIcon,
  PassthroughMappingIcon,
} from '../../VisualStyleIcons'
import {
  EmptyVisualPropertyViewBox,
  VisualPropertyViewBox,
} from '../VisualPropertyViewBox'
import { ContinuousMappingForm } from './ContinuousMappingForm'
import { DiscreteMappingForm } from './DiscreteMappingForm'

const mappingFnIconMap: Record<MappingFunctionType, React.ReactElement> = {
  [MappingFunctionType.Passthrough]: <PassthroughMappingIcon />,
  [MappingFunctionType.Discrete]: <DiscreteMappingIcon />,
  [MappingFunctionType.Continuous]: <ContinuousMappingIcon />,
}

// Select reads `value` from its direct children, so every option must be a
// MenuItem: wrapping one in a Tooltip leaves the current value unmatched and
// the Select blank (#831). A disabled MenuItem ignores the pointer, so its
// content takes the pointer back to show the tooltip and swallows the click.
const disabledOptionSx: SxProps = { pointerEvents: 'auto' }
const stopOptionClick = (e: React.MouseEvent): void => e.stopPropagation()

function MappingFormContent(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
  repositionPopover: () => void
}): React.ReactElement {
  const { postEdit } = useUndoStack()
  const [column, setColumn] = useState<AttributeName | ''>(
    props.visualProperty.mapping?.attribute ?? '',
  )
  const [mappingType, setMappingType] = useState<MappingFunctionType | ''>(
    props.visualProperty.mapping?.type ?? '',
  )

  const { columnValues, tables } = useTableStore((state) => ({
    columnValues: state.columnValues,
    tables: state.tables,
  }))
  const { removeMapping, createMapping } = useVisualStyleStore((state) => ({
    removeMapping: state.removeMapping,
    createMapping: state.createMapping,
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

  useEffect(() => {
    setMappingType(props.visualProperty.mapping?.type ?? '')
  }, [props.visualProperty.mapping])

  const handleMappingTypeChange = (
    nextMapping: MappingFunctionType | '',
  ): void => {
    const attributeType = currentTable.columns.find(
      (c) => c.name === column,
    )?.type
    if (nextMapping !== '' && column !== '' && attributeType != null) {
      if (
        typesCanBeMapped(nextMapping, attributeType, props.visualProperty.type)
      ) {
        const attributeDataType = currentTable.columns.find(
          (c) => c.name === column,
        )?.type
        const attributeValues = Array.from(
          columnValues(
            props.currentNetworkId,
            props.visualProperty.group as 'node' | 'edge',
            column,
          ),
        ).sort((a, b) => (a as number) - (b as number))

        if (attributeDataType != null) {
          if (props.visualProperty.mapping !== undefined) {
            postEdit(
              UndoCommandType.SET_MAPPING_TYPE,
              `Set ${props.visualProperty.displayName} mapping type to ${nextMapping}`,
              [
                props.currentNetworkId,
                props.visualProperty.name,
                props.visualProperty.mapping,
              ],
              [
                props.currentNetworkId,
                props.visualProperty.name,
                props.visualProperty.type,
                nextMapping,
                column,
                attributeDataType,
                attributeValues,
              ],
            )
          } else {
            postEdit(
              UndoCommandType.CREATE_MAPPING,
              `Create mapping for ${props.visualProperty.displayName} on attribute ${column}`,
              [props.currentNetworkId, props.visualProperty.name],
              [
                props.currentNetworkId,
                props.visualProperty.name,
                props.visualProperty.type,
                nextMapping,
                column,
                attributeDataType,
                attributeValues,
              ],
            )
          }

          createMapping(
            props.currentNetworkId,
            props.visualProperty.name,
            props.visualProperty.type,
            nextMapping,
            column,
            attributeDataType,
            attributeValues,
          )
        }

        setMappingType(nextMapping)
      } else {
        // if the user switches to a new mapping that is not compatible with the current attribute, remove the mapping
        postEdit(
          UndoCommandType.REMOVE_MAPPING,
          `Remove mapping for ${props.visualProperty.displayName}`,
          [
            props.currentNetworkId,
            props.visualProperty.name,
            props.visualProperty.mapping,
          ],
          [
            props.currentNetworkId,
            props.visualProperty.name,
            props.visualProperty.mapping,
          ],
        )
        removeMapping(props.currentNetworkId, props.visualProperty.name)

        setMappingType('')
      }
    } else {
      setMappingType(nextMapping)
    }
    props.repositionPopover()
  }

  const handleColumnChange = (nextAttribute: AttributeName): void => {
    // CW-616 / CW-651: resolve the action from the NEWLY selected attribute.
    const change = resolveMappingColumnChange(
      columns,
      nextAttribute,
      mappingType,
      props.visualProperty.type,
    )

    if (change.kind === 'create') {
      const attributeDataType = change.attributeType
      const nextMappingType = change.mappingType
      const attributeValues = Array.from(
        columnValues(
          props.currentNetworkId,
          props.visualProperty.group as 'node' | 'edge',
          nextAttribute,
        ),
      ).sort((a, b) => (a as number) - (b as number))

      if (props.visualProperty.mapping !== undefined) {
        postEdit(
          UndoCommandType.SET_MAPPING_COLUMN,
          `Set ${props.visualProperty.displayName} mapping attribute to ${nextAttribute}`,
          [
            props.currentNetworkId,
            props.visualProperty.name,
            props.visualProperty.mapping,
          ],
          [
            props.currentNetworkId,
            props.visualProperty.name,
            props.visualProperty.type,
            nextMappingType,
            nextAttribute,
            attributeDataType,
            attributeValues,
          ],
        )
      } else {
        postEdit(
          UndoCommandType.CREATE_MAPPING,
          `Create mapping for ${props.visualProperty.displayName} on attribute ${nextAttribute}`,
          [props.currentNetworkId, props.visualProperty.name],
          [
            props.currentNetworkId,
            props.visualProperty.name,
            props.visualProperty.type,
            nextMappingType,
            nextAttribute,
            attributeDataType,
            attributeValues,
          ],
        )
      }
      createMapping(
        props.currentNetworkId,
        props.visualProperty.name,
        props.visualProperty.type,
        nextMappingType,
        nextAttribute,
        attributeDataType,
        attributeValues,
      )

      setColumn(nextAttribute)
    } else if (change.kind === 'remove') {
      // The new attribute is not compatible with the current mapping type.
      postEdit(
        UndoCommandType.REMOVE_MAPPING,
        `Remove mapping for ${props.visualProperty.displayName}`,
        [
          props.currentNetworkId,
          props.visualProperty.name,
          props.visualProperty.mapping,
        ],
        [
          props.currentNetworkId,
          props.visualProperty.name,
          props.visualProperty.mapping,
        ],
      )
      removeMapping(props.currentNetworkId, props.visualProperty.name)
      setColumn('')
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
      [MappingFunctionType.Discrete]: ['500px', '600px'],
      [MappingFunctionType.Continuous]: ['780px', 'auto'],
      [MappingFunctionType.Passthrough]: ['500px', 'auto'],
      '': ['500px', '150px'],
    }
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: (mappingDimensions[mappingType] || mappingDimensions[''])[0],
        height: (mappingDimensions[mappingType] || mappingDimensions[''])[1],
        overflow: 'hidden',
        p: 2,
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
          sx={{ m: 0.5, fontWeight: 'bold' }}
        >{`${props.visualProperty.displayName} mapping`}</Typography>
        <Button
          data-testid="mapping-form-remove-button"
          variant="contained"
          color="error"
          disabled={props.visualProperty.mapping == null}
          size="small"
          startIcon={<DeleteIcon />}
          onClick={() => {
            postEdit(
              UndoCommandType.REMOVE_MAPPING,
              `Remove mapping for ${props.visualProperty.displayName}`,
              [
                props.currentNetworkId,
                props.visualProperty.name,
                props.visualProperty.mapping,
              ],
              [
                props.currentNetworkId,
                props.visualProperty.name,
                props.visualProperty.mapping,
              ],
            )
            removeMapping(props.currentNetworkId, props.visualProperty.name)
            props.repositionPopover()
          }}
        >
          Remove Mapping
        </Button>
      </Box>
      <Box>
        <Divider sx={{ mt: 1.5, mb: 2 }} />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <FormControl
            sx={{ minWidth: '150px', maxWidth: '250px' }}
            size="small"
          >
            <InputLabel>Column</InputLabel>
            <Select
              data-testid="mapping-form-column-select"
              defaultValue=""
              value={column}
              label="Column"
              onChange={(e) => handleColumnChange(e.target.value)}
            >
              {columns.map((c) => {
                const enabled =
                  validColumnNames.includes(c.name) || c.name === column
                const title = enabled
                  ? `Data type: ${c.type}`
                  : `${mappingType} mapping functions on column '${
                      c.name
                    }' cannot be applied to property ${
                      props.visualProperty.displayName
                    }`
                return (
                  <MenuItem disabled={!enabled} key={c.name} value={c.name}>
                    <Tooltip arrow title={title} placement="right">
                      <Box
                        sx={{
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          ...(enabled ? {} : disabledOptionSx),
                        }}
                        onClick={enabled ? undefined : stopOptionClick}
                      >
                        {c.name}
                      </Box>
                    </Tooltip>
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: '150px' }} size="small">
            <InputLabel>Mapping Type</InputLabel>
            <Select
              data-testid="mapping-form-type-select"
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
                const enabled =
                  validMappings.includes(mappingFnType) ||
                  mappingFnType === mappingType
                return (
                  <MenuItem
                    disabled={!enabled}
                    key={mappingFnType}
                    value={mappingFnType}
                  >
                    {enabled ? (
                      mappingFnType
                    ) : (
                      <Tooltip
                        arrow
                        placement="right"
                        title={`${mappingFnType} mapping functions${
                          column !== '' ? ` on column '${column}' ` : ' '
                        }cannot be applied to property ${
                          props.visualProperty.displayName
                        }`}
                      >
                        <Box sx={disabledOptionSx} onClick={stopOptionClick}>
                          {mappingFnType}
                        </Box>
                      </Tooltip>
                    )}
                  </MenuItem>
                )
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
  const [formAnchorEl, setFormAnchorEl] = useState<Element | null>(null)
  const viewBoxRef = useRef<HTMLDivElement | null>(null)
  const vpName = props.visualProperty.name
  const isSize =
    vpName === NodeVisualPropertyName.NodeHeight ||
    vpName === NodeVisualPropertyName.NodeWidth
  const isEdgeLineColor =
    vpName === EdgeVisualPropertyName.EdgeLineColor ||
    vpName === EdgeVisualPropertyName.EdgeTargetArrowColor ||
    vpName === EdgeVisualPropertyName.EdgeSourceArrowColor

  const repositionPopover = () => {
    if (viewBoxRef.current) {
      setFormAnchorEl(null)
      setTimeout(() => {
        setFormAnchorEl(viewBoxRef.current) // A hack to force a reposition
      }, 0)
    }
  }
  const showForm = (value: Element | null): void => {
    setFormAnchorEl(value)
  }
  const viewBox =
    props.visualProperty.mapping?.type == null ? (
      <EmptyVisualPropertyViewBox
        data-testid="mapping-form-view-box"
        onClick={(e) => showForm(e.currentTarget)}
      ></EmptyVisualPropertyViewBox>
    ) : (
      <VisualPropertyViewBox
        data-testid="mapping-form-view-box"
        onClick={(e) => showForm(e.currentTarget)}
      >
        {props.visualProperty.mapping?.type != null
          ? mappingFnIconMap[props.visualProperty.mapping?.type]
          : ''}
      </VisualPropertyViewBox>
    )

  return (
    <Box sx={props.sx ?? {}}>
      <Box ref={viewBoxRef}>{viewBox}</Box>
      <Popover
        data-testid="mapping-form-popover"
        open={formAnchorEl != null}
        anchorEl={formAnchorEl}
        disableEscapeKeyDown={true}
        hideBackdrop={true}
        onClose={() => showForm(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 55 }}
      >
        <MappingFormContent {...props} repositionPopover={repositionPopover} />

        {(isSize || isEdgeLineColor) && (
          <Box sx={{ pl: 2, pr: 2 }}>
            <Divider />
            <Box sx={{ mt: 1, mb: 1, ml: 1.5, mr: 1.5 }}>
              {isSize && (
                <LockSizeCheckbox currentNetworkId={props.currentNetworkId} />
              )}
              {isEdgeLineColor && (
                <LockColorCheckbox currentNetworkId={props.currentNetworkId} />
              )}
            </Box>
          </Box>
        )}

        {/* The only way out: this popover blocks click-away and Escape so a
            half-built mapping is never lost to a stray click
            (docs/specifications/DIALOG_DISMISS_POLICY.md). */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
            px: 2,
            py: 1,
          }}
        >
          <Button
            data-testid="mapping-form-close-button"
            variant="outlined"
            size="small"
            onClick={() => showForm(null)}
          >
            Close
          </Button>
        </Box>
      </Popover>
    </Box>
  )
}
