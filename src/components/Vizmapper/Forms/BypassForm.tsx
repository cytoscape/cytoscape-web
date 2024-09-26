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
  repositionPopover: () => void
}): React.ReactElement {
  const { visualProperty, currentNetworkId, repositionPopover } = props
  const [bypassValue, setBypassValue] = React.useState(
    visualProperty.defaultValue,
  )
  const [isAccordionExpanded, setAccordionExpanded] = React.useState(false)
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

  const handleAccordionToggle = () => {
    setAccordionExpanded((prevExpanded) => !prevExpanded)
    repositionPopover()
  }

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
    selectedElements.length > 0 &&
    (visualProperty.group === VisualPropertyGroup.Node ||
      visualProperty.group === VisualPropertyGroup.Edge)

  // get union of selected elements and bypass elements
  // put all selected elements first (even if they have a bypass)
  // render all elements, if they don't have a bypass, leave it empty
  const bypassElementIds = new Set(
    visualProperty?.bypassMap
      ? [...visualProperty.bypassMap.keys()].map(String)
      : [],
  )

  let elementsWithByPass: Array<{
    id: IdType
    hasBypass: boolean
  }> = []
  let elementsWithOutByPass: Array<{
    id: IdType
    hasBypass: boolean
  }> = []

  // Use Case I: users want to assign bypasses to selected elements
  if (selectedElements.length > 0) {
    elementsWithByPass = selectedElements
      .filter((e) => bypassElementIds.has(e))
      .map((id: IdType) => {
        return {
          id,
          hasBypass: true,
        }
      })
    elementsWithOutByPass = selectedElements
      .filter((e) => !bypassElementIds.has(e))
      .map((id: IdType) => {
        return {
          id,
          hasBypass: false,
        }
      })
    // Use Case II: users want to know what elements have bypasses
  } else {
    const elements = isNode
      ? Array.from(nodeTable.rows.keys())
      : Array.from(edgeTable.rows.keys())
    elementsWithByPass = elements
      .filter((e) => bypassElementIds.has(e))
      .map((e) => {
        return {
          id: e,
          hasBypass: true,
        }
      })
  }

  //Select all elements for the use case: users want to know what elements have bypasses
  React.useEffect(() => {
    if (selectedElements.length === 0 && elementsWithByPass.length > 0) {
      setAccordionExpanded(true)
      additiveSelect(
        currentNetworkId,
        elementsWithByPass.map((e) => e.id),
      )
    }
  }, [selectedElements.length, elementsWithByPass.length])

  const emptyBypassForm = (
    <>
      <Typography sx={{ m: 2 }}>
        Select network elements to apply a bypass
      </Typography>
    </>
  )
  const renderTableRow = (ele: { id: IdType; hasBypass: boolean }) => {
    const bypassValue = visualProperty.bypassMap?.get(ele.id) ?? null
    return (
      <TableRow key={ele.id}>
        <TableCell
          sx={{
            maxWidth: 185,
            overflow: 'auto',
          }}
        >
          <Box display="flex" justifyContent="flex-start" sx={{ pl: 1.75 }}>
            {selectedElementTable.rows.get(ele.id)?.[eleNameByCol] ?? ''}
          </Box>
        </TableCell>

        <TableCell sx={{ paddingLeft: '15%' }}>
          <Box display="flex" justifyContent="flex-start">
            <VisualPropertyValueForm
              visualProperty={visualProperty}
              currentValue={bypassValue}
              currentNetworkId={currentNetworkId}
              onValueChange={(value) => {
                setBypass(
                  currentNetworkId,
                  visualProperty.name,
                  [ele.id],
                  value,
                )
              }}
            />
          </Box>
        </TableCell>

        <TableCell sx={{ textAlign: 'center' }}>
          <Box display="flex" justifyContent="center">
            <IconButton
              onClick={() => {
                deleteBypass(currentNetworkId, visualProperty.name, [ele.id])
              }}
              disabled={!ele.hasBypass}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </TableCell>
      </TableRow>
    )
  }

  const nonEmptyBypassForm = (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          mt: 1,
          mb: 1,
        }}
      >
        <Box sx={{ m: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', flexDirection: 'row' }}>
            <Typography sx={{ mr: 1, pt: 0.25 }}>Bypass Value:</Typography>
            <VisualPropertyValueForm
              visualProperty={visualProperty}
              currentValue={bypassValue}
              currentNetworkId={currentNetworkId}
              onValueChange={(newBypassValue: VisualPropertyValueType): void =>
                setBypassValue(newBypassValue)
              }
            />
          </Box>

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
            Apply to Selected
          </Button>
        </Box>
        <Box sx={{ ml: 2 }}>
          {isSize && <LockSizeCheckbox currentNetworkId={currentNetworkId} />}
          {isEdgeLineColor && (
            <LockColorCheckbox currentNetworkId={currentNetworkId} />
          )}
        </Box>
      </Box>
      <Accordion
        sx={{ margin: '0 !important' }}
        expanded={isAccordionExpanded}
        onChange={handleAccordionToggle}
        TransitionProps={{
          onExited: repositionPopover, // When accordion collapses
          onEntered: repositionPopover, // When accordion expands
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Bypass Details</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 1, maxHeight: '350px', overflow: 'auto' }}>
          <TableContainer
            sx={{ overflow: 'auto', maxHeight: '325px', maxWidth: '475px' }}
          >
            <Table size={'small'} stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 150 }}>
                    <Select
                      size="small"
                      labelId="label"
                      value={eleNameByCol}
                      onChange={handleEleNameChange}
                      sx={{ maxWidth: 155 }}
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
                  <TableCell sx={{ minWidth: 85 }}>Remove</TableCell>
                </TableRow>
              </TableHead>
              <TableBody sx={{ overflow: 'auto' }}>
                {elementsWithOutByPass.map(renderTableRow)}
                {elementsWithByPass.length > 0 &&
                  elementsWithOutByPass.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Divider />
                      </TableCell>
                    </TableRow>
                  )}
                {elementsWithByPass.map(renderTableRow)}
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
        width: '500px',
        maxHeight: '600px',
        overflow: 'hidden',
        pl: 1,
        pr: 1,
      }}
    >
      <Typography
        sx={{ m: 2, fontWeight: 'bold' }}
      >{`${visualProperty.displayName} Bypasses`}</Typography>
      <Box sx={{ pb: 2 }}>
        <Divider />
        {elementsWithByPass.length === 0 && elementsWithOutByPass.length === 0
          ? emptyBypassForm
          : nonEmptyBypassForm}
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
  const viewBoxRef = React.useRef<HTMLDivElement | null>(null)
  // Force popover repositioning when accordion is expanded/collapsed
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
      <Box
        ref={viewBoxRef}
        onClick={(e) => {
          showForm(e.currentTarget)
        }}
      >
        {viewBox}
      </Box>
      <Popover
        open={formAnchorEl != null}
        anchorEl={formAnchorEl}
        onClose={() => {
          showForm(null)
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 55 }}
        transformOrigin={{ vertical: 'top', horizontal: 55 }}
      >
        <BypassFormContent {...props} repositionPopover={repositionPopover} />
      </Popover>
    </Box>
  )
}
