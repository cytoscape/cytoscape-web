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
import { Column } from '../../../models'
import { getKeybyAttribute } from '../../../features/MergeNetworks/utils/attributes-operations'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { useUndoStack } from '../../../task/ApplyVisualStyle'

function BypassFormContent(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
  repositionPopover: () => void
}): React.ReactElement {
  const { postEdit } = useUndoStack()
  const { visualProperty, currentNetworkId, repositionPopover } = props
  const [bypassValue, setBypassValue] = React.useState(
    visualProperty.defaultValue,
  )
  const [elementsWithBypass, setElementsWithBypass] = React.useState<
    Map<string, boolean>
  >(new Map())
  const [elementsWithoutBypass, setElementsWithoutBypass] = React.useState<
    Map<string, boolean>
  >(new Map())
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

  // get union of selected elements and bypass elements
  // put all selected elements first (even if they have a bypass)
  // render all elements, if they don't have a bypass, leave it empty
  const bypassElementIds = new Set(
    visualProperty?.bypassMap
      ? [...visualProperty.bypassMap.keys()].map(String)
      : [],
  )

  React.useEffect(() => {
    // Use Case I: users want to assign bypasses to selected elements
    if (selectedElements.length > 0) {
      const withBypass: Map<string, boolean> = new Map()
      const withoutBypass: Map<string, boolean> = new Map()

      selectedElements.forEach((id) => {
        if (bypassElementIds.has(id)) {
          withBypass.set(id, true)
        } else {
          withoutBypass.set(id, false)
        }
      })

      setElementsWithBypass(withBypass)
      setElementsWithoutBypass(withoutBypass)
    }
    // Use Case II: users want to know what elements have bypasses
    else {
      const elements = isNode
        ? Array.from(nodeTable.rows.keys())
        : Array.from(edgeTable.rows.keys())

      const withBypass: Map<string, boolean> = new Map()
      elements.forEach((id) => {
        if (bypassElementIds.has(id)) {
          withBypass.set(id, true)
        }
      })

      setElementsWithBypass(withBypass)
    }
  }, [])

  //Select all elements for the use case: users want to know what elements have bypasses
  React.useEffect(() => {
    if (selectedElements.length === 0 && elementsWithBypass.size > 0) {
      setAccordionExpanded(true)
      additiveSelect(currentNetworkId, Array.from(elementsWithBypass.keys()))
    }
  }, [selectedElements.length, elementsWithBypass.size])

  const emptyBypassForm = (
    <>
      <Typography sx={{ m: 2 }}>
        Select network elements to apply a bypass
      </Typography>
    </>
  )
  const renderTableRows = (
    elements: Map<string, boolean>,
    hasBypass: boolean,
  ) => {
    // Sort the elements alphabetically according to the selected column
    const sortedElements = Array.from(elements.keys()).sort((idA, idB) => {
      const nameA: string = getKeybyAttribute(
        selectedElementTable.rows.get(idA)?.[eleNameByCol] ?? '',
      ).toString()
      const nameB: string = getKeybyAttribute(
        selectedElementTable.rows.get(idB)?.[eleNameByCol] ?? '',
      ).toString()
      if (nameA === '' && nameB !== '') return 1
      if (nameB === '' && nameA !== '') return -1
      return nameA.localeCompare(nameB)
    })

    return sortedElements.map((id) => {
      const bypassValue = visualProperty.bypassMap?.get(id) ?? null
      return (
        <TableRow
          key={id}
          sx={{
            backgroundColor: elements.get(id)
              ? 'rgba(233, 242, 249)'
              : 'inherit',
          }}
        >
          <TableCell
            sx={{
              maxWidth: 185,
              overflow: 'auto',
            }}
          >
            <Box display="flex" justifyContent="flex-start" sx={{ pl: 1.75 }}>
              {getKeybyAttribute(
                selectedElementTable.rows.get(id)?.[eleNameByCol] ?? '',
              ).toString()}
            </Box>
          </TableCell>

          <TableCell sx={{ paddingLeft: '15%' }}>
            <Box display="flex" justifyContent="flex-start">
              <VisualPropertyValueForm
                visualProperty={visualProperty}
                currentValue={bypassValue}
                currentNetworkId={currentNetworkId}
                onValueChange={(value) => {
                  postEdit(UndoCommandType.SET_BYPASS_MAP, [
                    currentNetworkId,
                    visualProperty.name,
                    visualProperty?.bypassMap ?? new Map(),
                  ])
                  setBypass(currentNetworkId, visualProperty.name, [id], value)
                  if (hasBypass) {
                    setElementsWithBypass((prev) => new Map(prev).set(id, true))
                  } else {
                    setElementsWithoutBypass((prev) =>
                      new Map(prev).set(id, true),
                    )
                  }
                }}
              />
            </Box>
          </TableCell>

          <TableCell sx={{ textAlign: 'center' }}>
            <Box display="flex" justifyContent="center">
              <IconButton
                onClick={() => {
                  postEdit(UndoCommandType.SET_BYPASS_MAP, [
                    currentNetworkId,
                    visualProperty.name,
                    visualProperty?.bypassMap ?? new Map(),
                  ])
                  deleteBypass(currentNetworkId, visualProperty.name, [id])
                  if (hasBypass) {
                    setElementsWithBypass((prev) =>
                      new Map(prev).set(id, false),
                    )
                  } else {
                    setElementsWithoutBypass((prev) =>
                      new Map(prev).set(id, false),
                    )
                  }
                }}
                disabled={!elements.get(id)}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </TableCell>
        </TableRow>
      )
    })
  }

  const nonEmptyBypassForm = (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          m: 2,
          mb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', flexDirection: 'row' }}>
            <Typography sx={{ mr: 1, pt: 0.25 }}>
              {`Apply the bypass value to all selected ${isNode ? 'nodes' : 'edges'}:`}
            </Typography>
            <VisualPropertyValueForm
              visualProperty={visualProperty}
              currentValue={bypassValue}
              currentNetworkId={currentNetworkId}
              onValueChange={(
                newBypassValue: VisualPropertyValueType,
              ): void => {
                postEdit(UndoCommandType.SET_BYPASS_MAP, [
                  currentNetworkId,
                  visualProperty.name,
                  visualProperty?.bypassMap ?? new Map(),
                ])
                setBypassValue(newBypassValue)
                setBypass(
                  currentNetworkId,
                  visualProperty.name,
                  selectedElements,
                  newBypassValue,
                )
                setElementsWithBypass(() => {
                  const newMap = new Map()
                  selectedElements.forEach((id) => {
                    newMap.set(id, true)
                  })
                  return newMap
                })
                setElementsWithoutBypass(() => new Map())
              }}
            />
          </Box>
        </Box>
        <Box sx={{ mt: 1 }}>
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
          <Typography sx={{ pt: 0.5 }}>Bypass Details</Typography>
          {elementsWithBypass.size > 0 && elementsWithoutBypass.size > 0 && (
            <Tooltip title="The table below is divided into two sections: elements with bypasses and elements without bypasses, separated by a divider line.">
              <IconButton
                onClick={(e) => e.stopPropagation()}
                sx={{ ml: '2px', p: '4px !important' }}
              >
                <InfoIcon sx={{ color: 'rgb(0,0,0,0.4)' }} />
              </IconButton>
            </Tooltip>
          )}
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
                      title="Bypass overrides default and mapped values for specific elements, ensuring custom settings take priority"
                      placement="top"
                    >
                      <IconButton sx={{ padding: 0.5, mb: 0.5 }}>
                        <InfoIcon sx={{ color: 'rgb(0,0,0,0.4)' }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ minWidth: 85 }}>Remove</TableCell>
                </TableRow>
              </TableHead>
              <TableBody sx={{ overflow: 'auto' }}>
                {renderTableRows(elementsWithBypass, true)}
                {elementsWithBypass.size > 0 &&
                  elementsWithoutBypass.size > 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Divider />
                      </TableCell>
                    </TableRow>
                  )}
                {renderTableRows(elementsWithoutBypass, false)}
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
        >{`${visualProperty.displayName} Bypasses`}</Typography>
        <Button
          sx={{
            color: '#F50157',
            backgroundColor: 'transparent',
            '&:hover': {
              color: '#FFFFFF',
              backgroundColor: '#F50157',
            },
            '&:disabled': {
              backgroundColor: 'transparent',
            },
          }}
          size="small"
          onClick={() => {
            postEdit(UndoCommandType.SET_BYPASS_MAP, [
              currentNetworkId,
              visualProperty.name,
              visualProperty?.bypassMap ?? new Map(),
            ])
            deleteBypass(
              currentNetworkId,
              visualProperty.name,
              Array.from(elementsWithBypass.keys()),
            )
            deleteBypass(
              currentNetworkId,
              visualProperty.name,
              Array.from(elementsWithoutBypass.keys()),
            )
            setElementsWithBypass(() => new Map())
            setElementsWithoutBypass(() => {
              return new Map(
                Array.from(elementsWithBypass.keys())
                  .concat(Array.from(elementsWithoutBypass.keys()))
                  .map((id) => [id, false]),
              )
            })
          }}
          disabled={
            Array.from(elementsWithBypass.values()).every((e) => e === false) &&
            Array.from(elementsWithoutBypass.values()).every((e) => e === false)
          }
        >
          Remove All Bypasses
        </Button>
      </Box>
      <Divider sx={{ mt: 1.5 }} />
      <Box>
        {elementsWithBypass.size === 0 && elementsWithoutBypass.size === 0
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
