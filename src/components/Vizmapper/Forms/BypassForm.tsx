import * as React from 'react'
import {
  Box,
  Popover,
  Typography,
  Button,
  SxProps,
  Badge,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Select,
  MenuItem,
  Tooltip,
  AccordionDetails,
  Accordion,
  AccordionSummary,
} from '@mui/material'
import {
  Delete as DeleteIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material'
import * as MapperFactory from '../../../models/VisualStyleModel/impl/MapperFactory'
import { IdType } from '../../../models/IdType'
import {
  EdgeVisualPropertyName,
  Mapper,
  MappingFunctionType,
  NodeVisualPropertyName,
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
  const additiveSelect = useViewModelStore((state) => state.additiveSelect)
  const tables = useTableStore((state) => state.tables)

  const table = tables[currentNetworkId]
  const nodeTable = table?.nodeTable
  const edgeTable = table?.edgeTable
  const selectedNodes = networkView?.selectedNodes ?? []
  const selectedEdges = networkView?.selectedEdges ?? []
  const isNode = visualProperty.group === VisualPropertyGroup.Node
  const selectedElements: IdType[] = isNode ? selectedNodes : selectedEdges
  const selectedElementTable = isNode ? nodeTable : edgeTable

  const defaultColName = selectedElementTable.columns
    .map((col) => col.name.toLowerCase())
    .includes('name')
    ? (selectedElementTable.columns.find(
        (col) => col.name.toLowerCase() === 'name',
      )?.name as string)
    : selectedElementTable.columns[0].name

  const [eleNameByCol, setEleNameByCol] = useState(defaultColName)
  const handleEleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEleNameByCol(event.target.value)
  }

  const labelName = isNode
    ? NodeVisualPropertyName.NodeLabel
    : EdgeVisualPropertyName.EdgeLabel
  const labelVp = visualStyle[currentNetworkId][labelName]
  React.useEffect(() => {
    const { mapping } = labelVp
    if (
      mapping !== undefined &&
      mapping.type === MappingFunctionType.Passthrough
    ) {
      setEleNameByCol(mapping.attribute)
    }
  }, [labelVp])

  const validElementsSelected =
    selectedNodes.length > 0 &&
    (visualProperty.group === VisualPropertyGroup.Node ||
      visualProperty.group === VisualPropertyGroup.Edge)

  // get union of selected elements and bypass elements
  // put all selected elements first (even if they have a bypass)
  // render all elements, if they don't have a bypass, leave it empty
  const bypassElementIds = new Set(
    Array.from(visualProperty?.bypassMap?.keys()).map((k) => String(k)) ?? [],
  )

  const elementsToRender: Array<{
    id: IdType
    selected: boolean
    hasBypass: boolean
  }> = []

  let selectedElementsWithBypass = 0
  selectedElements.forEach((id: IdType) => {
    const hasBypass = visualProperty?.bypassMap.has(id)
    elementsToRender.push({
      id,
      selected: true,
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
        ? isNode
          ? Array.from(nodeTable.rows.keys())
          : Array.from(edgeTable.rows.keys())
        : selectedElements

  elements
    .filter((e) => bypassElementIds.has(e))
    .forEach((e) => {
      elementsToRender.push({
        id: e,
        selected: false,
        hasBypass: true,
      })
    })

  if (selectedElements.length === 0 && elementsToRender.length > 0) {
    additiveSelect(
      currentNetworkId,
      elementsToRender.map((e) => e.id),
    )
  }
  const emptyBypassForm = (
    <>
      <Typography sx={{ m: 2 }}>
        Select network elements to apply a bypass
      </Typography>
    </>
  )

  const nonEmptyBypassForm = (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pt: 1,
        }}
      >
        <Box>
          {isSize && <LockSizeCheckbox currentNetworkId={currentNetworkId} />}
          {isEdgeLineColor && (
            <LockColorCheckbox currentNetworkId={currentNetworkId} />
          )}
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
            Apply to all
          </Button>
        </Box>
      </Box>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Advanced Options</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer sx={{ height: '400px', overflow: 'auto' }}>
            <Table size={'small'} stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Select
                      size="small"
                      labelId="label"
                      value={eleNameByCol}
                      onChange={handleEleNameChange}
                    >
                      {selectedElementTable.columns.map((col: Column) => {
                        return <MenuItem value={col.name}>{col.name}</MenuItem>
                      })}
                    </Select>
                  </TableCell>
                  <TableCell sx={{ minWidth: 180 }}>
                    Bypass/Overwrite
                    <Tooltip
                      arrow={true}
                      title="This is to overwrite "
                      placement="top"
                    >
                      <IconButton sx={{ padding: 0.5, mb: 0.5 }}>
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell>Remove</TableCell>
                </TableRow>
              </TableHead>
              <TableBody sx={{ overflow: 'auto' }}>
                {elementsToRender.map((ele) => {
                  const { id, selected, hasBypass } = ele
                  const bypassValue = visualProperty.bypassMap?.get(id) ?? null
                  return (
                    <TableRow key={id}>
                      <TableCell sx={{ maxWidth: 200, overflow: 'auto' }}>
                        <div>
                          {selectedElementTable.rows.get(id)?.[eleNameByCol] ??
                            ''}
                        </div>
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
                            deleteBypass(
                              currentNetworkId,
                              visualProperty.name,
                              [id],
                            )
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
        </AccordionDetails>
      </Accordion>
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
        sx={{ m: 2, fontWeight: 'bold' }}
      >{`${visualProperty.displayName} Bypasses`}</Typography>
      <Box>
        <Divider />
        {elementsToRender.length > 0 ? nonEmptyBypassForm : emptyBypassForm}
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

  const bypassValuesBySelected = Array.from(
    props.visualProperty.bypassMap.entries(),
  )
    .filter(([k, v]) => selectedElements.includes(k))
    .map(([_, v]) => v)
  const onlyOneBypassValue =
    new Set(
      selectedElements.length > 0
        ? bypassValuesBySelected
        : props.visualProperty.bypassMap.values(),
    ).size === 1

  let viewBox = null

  if (noBypasses) {
    viewBox = <EmptyVisualPropertyViewBox />
  } else {
    viewBox = (
      <Badge
        max={10000}
        color="primary"
        badgeContent={
          selectedElements.length > 0
            ? bypassValuesBySelected.length
            : props.visualProperty.bypassMap.size
        }
        invisible={
          selectedElements.length > 0
            ? bypassValuesBySelected.length <= 1
            : props.visualProperty.bypassMap.size <= 1
        }
      >
        <VisualPropertyViewBox>
          {onlyOneBypassValue ? (
            <VisualPropertyValueRender
              vpName={props.visualProperty.name}
              value={
                selectedElements.length > 0
                  ? bypassValuesBySelected[0]
                  : Array.from(props.visualProperty.bypassMap.values())[0]
              }
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
