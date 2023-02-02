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
  Tooltip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'

import { IdType } from '../../../models/IdType'
import {
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

function BypassFormContent(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const { visualProperty, currentNetworkId } = props
  const [bypassValue, setBypassValue] = React.useState(
    visualProperty.defaultValue,
  )

  const viewModels = useViewModelStore((state) => state.viewModels)
  const networkView = viewModels[currentNetworkId]
  const setBypass = useVisualStyleStore((state) => state.setBypass)
  const deleteBypass = useVisualStyleStore((state) => state.deleteBypass)
  const setHovered = useViewModelStore((state) => state.setHovered)
  const toggleSelected = useViewModelStore((state) => state.toggleSelected)
  const additiveSelect = useViewModelStore((state) => state.additiveSelect)
  const additiveUnselect = useViewModelStore((state) => state.additiveUnselect)

  const tables = useTableStore((state) => state.tables)
  const table = tables[currentNetworkId]
  const nodeTable = table?.nodeTable
  const edgeTable = table?.edgeTable
  const selectedNodes = Object.values(networkView?.nodeViews).filter(
    (nodeView) => nodeView.selected,
  )
  const selectedEdges = Object.values(networkView?.edgeViews).filter(
    (edgeView) => edgeView.selected,
  )

  const validElementsSelected =
    (selectedNodes.length > 0 && visualProperty.group === 'node') ||
    (selectedEdges.length > 0 && visualProperty.group === 'edge')

  // get union of selected elements and bypass elements
  // put all selected elements first (even if they have a bypass)
  // render all elements, if they dont have a bypass, leave it empty
  const selectedElements =
    visualProperty.group === 'node' ? selectedNodes : selectedEdges

  const selectedElementTable =
    visualProperty.group === 'node' ? nodeTable : edgeTable

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
  selectedElements.forEach((e) => {
    const hasBypass = visualProperty?.bypassMap.has(e.id)
    elementsToRender.push({
      id: e.id,
      selected: e.selected,
      name: (selectedElementTable.rows.get(e.id)?.name ?? '') as string,

      hasBypass: hasBypass ?? false,
    })

    if (hasBypass) {
      selectedElementsWithBypass += 1
      bypassElementIds.delete(e.id)
    }
  })

  Array.from(bypassElementIds).forEach((eleId) => {
    elementsToRender.push({
      id: eleId,
      selected: false,
      name: (selectedElementTable.rows.get(eleId)?.name ?? '') as string,

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
                {visualProperty.group[0].toUpperCase() +
                  visualProperty.group.slice(1).toLowerCase()}{' '}
                Name
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
                <TableRow
                  onMouseEnter={() => setHovered(props.currentNetworkId, id)}
                  onMouseLeave={() => setHovered(props.currentNetworkId, null)}
                  key={id}
                  hover={true}
                  selected={selected}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      onClick={() => toggleSelected(currentNetworkId, [id])}
                      checked={selected}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'scroll' }}>
                    {name}
                  </TableCell>

                  <TableCell>
                    <VisualPropertyValueForm
                      visualProperty={visualProperty}
                      currentValue={bypassValue}
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
                        setHovered(currentNetworkId, null)
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
              const selectedElementIds = selectedElements.map((e) => e.id)
              deleteBypass(
                currentNetworkId,
                visualProperty.name,
                selectedElementIds,
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
              const selectedElementIds = selectedElements.map((e) => e.id)
              setBypass(
                currentNetworkId,
                visualProperty.name,
                selectedElementIds,
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
      // make sure there is no hovered component when the mouse leaves the bypass form
      onMouseLeave={() => setHovered(props.currentNetworkId, null)}
    >
      <Typography
        sx={{ m: 1 }}
        variant="h6"
      >{`${visualProperty.displayName} bypasses`}</Typography>
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

  const setHovered = useViewModelStore((state) => state.setHovered)

  const showForm = (value: Element | null): void => {
    setFormAnchorEl(value)
  }

  const noBypasses = props.visualProperty.bypassMap?.size === 0

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
          <VisualPropertyValueRender
            vpName={props.visualProperty.name}
            value={Array.from(props.visualProperty.bypassMap.values())[0]}
            vpValueType={props.visualProperty.type}
          />
        </VisualPropertyViewBox>
      </Badge>
    )
  }

  return (
    <Box sx={props.sx ?? {}}>
      <Tooltip title={`${props.visualProperty.displayName} Bypasses`}>
        <Box onClick={(e) => showForm(e.currentTarget)}>{viewBox}</Box>
      </Tooltip>
      <Popover
        open={formAnchorEl != null}
        anchorEl={formAnchorEl}
        onClose={() => {
          showForm(null)
          setHovered(props.currentNetworkId, null)
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 55 }}
      >
        <BypassFormContent {...props} />
      </Popover>
    </Box>
  )
}
