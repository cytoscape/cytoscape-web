import * as React from 'react'
import {
  Box,
  Popover,
  Typography,
  Button,
  SxProps,
  Badge,
  IconButton,
  Checkbox,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Select,
  MenuItem,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import * as MapperFactory from '../../../models/VisualStyleModel/impl/MapperFactory'
import { IdType } from '../../../models/IdType'
import {
  ContinuousMappingFunction,
  DiscreteMappingFunction,
  EdgeVisualPropertyName,
  Mapper,
  MappingFunctionType,
  NodeVisualPropertyName,
  PassthroughMappingFunction,
  VisualProperty,
  VisualPropertyValueType,
} from '../../../models/VisualStyleModel'

import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useTableStore } from '../../../store/TableStore'

import {
  VisualPropertyValueForm,
  VisualPropertyValueRender,
} from './VisualPropertyValueForm'
import {
  EmptyVisualPropertyViewBox,
  VisualPropertyViewBox,
} from './VisualPropertyViewBox'
import { NetworkView } from '../../../models/ViewModel'
import { VisualPropertyGroup } from '../../../models/VisualStyleModel/VisualPropertyGroup'
import { translateEdgeIdToCX } from '../../../models/NetworkModel/impl/CyNetwork'
import {
  LockColorCheckbox,
  LockSizeCheckbox,
} from '../VisualPropertyRender/Checkbox'
import { useState } from 'react'
import { Column } from 'src/models'

function BypassFormContent(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const { visualProperty, currentNetworkId } = props
  const [bypassValue, setBypassValue] = React.useState(
    visualProperty.defaultValue,
  )

  const vpName = props.visualProperty.name
  const isSize =
    vpName === NodeVisualPropertyName.NodeHeight ||
    vpName === NodeVisualPropertyName.NodeWidth
  const isEdgeLineColor =
    vpName === EdgeVisualPropertyName.EdgeLineColor ||
    vpName === EdgeVisualPropertyName.EdgeTargetArrowColor ||
    vpName === EdgeVisualPropertyName.EdgeSourceArrowColor
  const getViewModel = useViewModelStore((state) => state.getViewModel)
  const networkView: NetworkView | undefined = getViewModel(currentNetworkId)

  const visualStyle = useVisualStyleStore((state) => state.visualStyles)
  const setBypass = useVisualStyleStore((state) => state.setBypass)
  const deleteBypass = useVisualStyleStore((state) => state.deleteBypass)
  const toggleSelected = useViewModelStore((state) => state.toggleSelected)
  const additiveSelect = useViewModelStore((state) => state.additiveSelect)
  const additiveUnselect = useViewModelStore((state) => state.additiveUnselect)
  const DEFAULT_ELENAME_BY_COL = 'DEFAULT'
  const [eleNameByCol, setEleNameByCol] = useState(DEFAULT_ELENAME_BY_COL)
  const handleEleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEleNameByCol(event.target.value)
  }

  const labelName =
    visualProperty.group === VisualPropertyGroup.Node
      ? NodeVisualPropertyName.NodeLabel
      : EdgeVisualPropertyName.EdgeLabel
  const labelVp = visualStyle[currentNetworkId][labelName]
  const tables = useTableStore((state) => state.tables)
  const table = tables[currentNetworkId]
  const nodeTable = table?.nodeTable
  const edgeTable = table?.edgeTable

  const selectedNodes = networkView?.selectedNodes ?? []
  const selectedEdges = networkView?.selectedEdges ?? []

  const validElementsSelected =
    (selectedNodes.length > 0 &&
      visualProperty.group === VisualPropertyGroup.Node) ||
    (selectedEdges.length > 0 &&
      visualProperty.group === VisualPropertyGroup.Edge)

  // get union of selected elements and bypass elements
  // put all selected elements first (even if they have a bypass)
  // render all elements, if they don't have a bypass, leave it empty
  const selectedElements: IdType[] =
    visualProperty.group === VisualPropertyGroup.Node
      ? selectedNodes
      : selectedEdges

  const selectedElementTable =
    visualProperty.group === VisualPropertyGroup.Node ? nodeTable : edgeTable

  const bypassElementIds = new Set(
    Array.from(visualProperty?.bypassMap?.keys()).map((k) => String(k)) ?? [],
  )

  const elementsToRender: Array<{
    id: IdType
    name: string
    selected: boolean
    hasBypass: boolean
  }> = []

  let selectedElementsWithBypass = 0
  selectedElements.forEach((id: IdType) => {
    const hasBypass = visualProperty?.bypassMap.has(id)
    const { defaultValue, mapping, bypassMap } = labelVp
    // default name is the name attribute(if it exists) or the id
    let name = selectedElementTable.rows.get(id)?.name ?? (id as string)
    // if the mapping is defined, then overwrite with the mapped value
    // with the priority of bypassMap > mapping > defaultValue
    if (bypassMap !== undefined && bypassMap.has(id)) {
      name = bypassMap.get(id) as string
    } else if (mapping !== undefined) {
      let mapper: Mapper
      const mappingType: MappingFunctionType = mapping.type
      if (mappingType === MappingFunctionType.Discrete) {
        mapper = MapperFactory.createDiscreteMapper(
          mapping as DiscreteMappingFunction,
        )
      } else if (mappingType === MappingFunctionType.Continuous) {
        mapper = MapperFactory.createContinuousMapper(
          mapping as ContinuousMappingFunction,
        )
      } else if (mappingType === MappingFunctionType.Passthrough) {
        mapper = MapperFactory.createPassthroughMapper(
          mapping as PassthroughMappingFunction,
        )
      } else {
        throw new Error(`Unknown mapping type for ${vpName}`)
      }
      name = mapper(
        selectedElementTable.rows.get(id)?.[mapping.attribute] ?? '',
      ) as string
    } else if (defaultValue !== undefined && defaultValue !== '') {
      name = defaultValue as string
    }

    elementsToRender.push({
      id,
      selected: true,
      name: name as string,
      hasBypass: hasBypass ?? false,
    })

    if (hasBypass) {
      selectedElementsWithBypass += 1
    }

    if (bypassElementIds.has(id)) {
      bypassElementIds.delete(id)
    }
  })

  const elements =
    selectedElementsWithBypass > 0
      ? selectedElements
      : selectedElements.length === 0
        ? visualProperty.group === VisualPropertyGroup.Node
          ? Array.from(nodeTable.rows.keys())
          : Array.from(edgeTable.rows.keys()).map((id) =>
              translateEdgeIdToCX(id),
            )
        : selectedElements

  elements
    .filter((e) => bypassElementIds.has(e))
    .forEach((e) => {
      elementsToRender.push({
        id: e,
        selected: false,
        name: (selectedElementTable.rows.get(e)?.name ?? '') as string,

        hasBypass: true,
      })
    })
  const emptyBypassForm = (
    <>
      <Typography>Select network elements to apply a bypass</Typography>
    </>
  )

  const allSelected = selectedElements.length === elementsToRender.length
  const someSelected = selectedElements.length > 0 && !allSelected
  // const noneSelected = selectedElements.length === 0

  const nonEmptyBypassForm = (
    <>
      <TableContainer sx={{ height: 460, overflow: 'auto' }}>
        <Table size={'small'} stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onClick={() => {
                    if (allSelected) {
                      additiveUnselect(
                        currentNetworkId,
                        elementsToRender.map((e) => e.id),
                      )
                    } else {
                      additiveSelect(
                        currentNetworkId,
                        elementsToRender.map((e) => e.id),
                      )
                    }
                  }}
                />
              </TableCell>
              <TableCell>
                <Select
                  size="small"
                  labelId="label"
                  value={eleNameByCol}
                  onChange={handleEleNameChange}
                >
                  <MenuItem value={DEFAULT_ELENAME_BY_COL}>
                    {`${
                      visualProperty.group[0].toUpperCase() +
                      visualProperty.group.slice(1).toLowerCase()
                    } Name (Default)`}
                  </MenuItem>
                  {selectedElementTable.columns.map((col: Column) => {
                    return <MenuItem value={col.name}>{col.name}</MenuItem>
                  })}
                </Select>
              </TableCell>
              <TableCell>Bypass</TableCell>
              <TableCell padding={'none'}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={{ overflow: 'scroll' }}>
            {elementsToRender.map((ele) => {
              const { id, selected, hasBypass, name } = ele
              const bypassValue = visualProperty.bypassMap?.get(id) ?? null

              return (
                <TableRow key={id} hover={true} selected={selected}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      onClick={() => toggleSelected(currentNetworkId, [id])}
                      checked={selected}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'scroll' }}>
                    {eleNameByCol === DEFAULT_ELENAME_BY_COL
                      ? name
                      : (selectedElementTable.rows.get(id)?.[eleNameByCol] ??
                        '')}
                  </TableCell>

                  <TableCell>
                    <VisualPropertyValueForm
                      visualProperty={visualProperty}
                      currentValue={bypassValue}
                      currentNetworkId={currentNetworkId}
                      onValueChange={(value) => {
                        setBypass(
                          currentNetworkId,
                          visualProperty.name,
                          [id],
                          value,
                        )
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => {
                        deleteBypass(currentNetworkId, visualProperty.name, [
                          id,
                        ])
                      }}
                      disabled={!hasBypass}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pt: 1,
        }}
      >
        <Box>
          <Button
            size="small"
            color="error"
            disabled={selectedElementsWithBypass === 0}
            onClick={() => {
              deleteBypass(
                currentNetworkId,
                visualProperty.name,
                selectedElements,
              )
            }}
          >
            Remove selected
          </Button>
        </Box>
        <Box sx={{ m: 1, mr: 0, display: 'flex', justifyContent: 'end' }}>
          <VisualPropertyValueForm
            visualProperty={visualProperty}
            currentValue={bypassValue}
            currentNetworkId={currentNetworkId}
            onValueChange={(newBypassValue: VisualPropertyValueType): void =>
              setBypassValue(newBypassValue)
            }
          />
          <Button
            sx={{ ml: 1 }}
            size="small"
            variant="contained"
            disabled={!validElementsSelected}
            onClick={() => {
              setBypass(
                currentNetworkId,
                visualProperty.name,
                selectedElements,
                bypassValue,
              )
            }}
          >
            Apply to selected
          </Button>
        </Box>
      </Box>
    </>
  )

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
        pl: 1,
        pr: 1,
      }}
    >
      <Typography
        sx={{ m: 1 }}
      >{`${visualProperty.displayName} bypasses`}</Typography>
      <Box>
        <Divider />
        {elementsToRender.length > 0 ? nonEmptyBypassForm : emptyBypassForm}
        <Divider />
        {isSize && (
          <LockSizeCheckbox currentNetworkId={props.currentNetworkId} />
        )}
        {isEdgeLineColor && (
          <LockColorCheckbox currentNetworkId={currentNetworkId} />
        )}
      </Box>
    </Box>
  )
}

export function BypassForm(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
  sx?: SxProps
}): React.ReactElement {
  const [formAnchorEl, setFormAnchorEl] = React.useState<Element | null>(null)

  const showForm = (value: Element | null): void => {
    setFormAnchorEl(value)
  }

  const getViewModel = useViewModelStore((state) => state.getViewModel)
  const currentNetworkId = props.currentNetworkId

  const networkView: NetworkView | undefined = getViewModel(currentNetworkId)

  const selectedNodes = networkView?.selectedNodes ?? []
  const selectedEdges = networkView?.selectedEdges ?? []

  const selectedElements =
    props.visualProperty.group === VisualPropertyGroup.Node
      ? selectedNodes
      : selectedEdges

  const noBypasses =
    (selectedElements.length > 0 &&
      selectedElements.filter((e) => props.visualProperty.bypassMap.has(e))
        .length === 0) ||
    props.visualProperty.bypassMap.size === 0

  const onlyOneBypassValue =
    (selectedElements.length > 0 &&
      selectedElements.filter((e) => props.visualProperty.bypassMap.has(e))
        .length === 1) ||
    props.visualProperty.bypassMap.size === 1

  let viewBox = null

  if (noBypasses) {
    viewBox = <EmptyVisualPropertyViewBox />
  } else {
    viewBox = (
      <Badge
        max={10000}
        color="primary"
        badgeContent={props.visualProperty.bypassMap.size}
        invisible={props.visualProperty.bypassMap.size <= 1}
      >
        <VisualPropertyViewBox>
          {onlyOneBypassValue ? (
            <VisualPropertyValueRender
              vpName={props.visualProperty.name}
              value={Array.from(props.visualProperty.bypassMap.values())[0]}
              vpValueType={props.visualProperty.type}
            />
          ) : (
            <Box>?</Box>
          )}
        </VisualPropertyViewBox>
      </Badge>
    )
  }

  return (
    <Box sx={props.sx ?? {}}>
      <Box onClick={(e) => showForm(e.currentTarget)}>{viewBox}</Box>
      <Popover
        open={formAnchorEl != null}
        anchorEl={formAnchorEl}
        onClose={() => {
          showForm(null)
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 55 }}
      >
        <BypassFormContent {...props} />
      </Popover>
    </Box>
  )
}
