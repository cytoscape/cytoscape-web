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
  FormControlLabel,
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

  const bypassElementIds = new Set(visualProperty?.bypassMap?.keys() ?? [])

  const elementsToRender: Array<{
    id: IdType
    name: string
    selected: boolean
    hasBypass: boolean
  }> = []

  selectedElements.forEach((e) => {
    elementsToRender.push({
      id: e.id,
      selected: e.selected ?? false,
      name: (selectedElementTable.rows.get(e.id)?.name ?? '') as string,

      hasBypass: visualProperty?.bypassMap.has(e.id) ?? false,
    })

    if (bypassElementIds.has(e.id)) {
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

  const nonEmptyBypassForm = (
    <>
      <Box sx={{ height: 250, overflow: 'scroll' }}>
        {elementsToRender.map((ele) => {
          const { id, selected, hasBypass, name } = ele
          const bypassValue = visualProperty.bypassMap?.get(id)

          const viewBox =
            bypassValue != null ? (
              <VisualPropertyValueForm
                visualProperty={visualProperty}
                currentValue={bypassValue}
                onValueChange={(value) => {
                  setBypass(currentNetworkId, visualProperty.name, [id], value)
                }}
              />
            ) : (
              <EmptyVisualPropertyViewBox />
            )

          return (
            <Box
              onMouseEnter={() => setHovered(props.currentNetworkId, id)}
              onMouseLeave={() => setHovered(props.currentNetworkId, null)}
              sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
              }}
              key={id}
            >
              <FormControlLabel
                onClick={() => toggleSelected(currentNetworkId, [id])}
                control={<Checkbox checked={selected} />}
                label="Selected"
              />
              <Box sx={{ width: 100, mr: 1 }}>{name}</Box>
              {viewBox}
              <IconButton
                onClick={() => {
                  deleteBypass(currentNetworkId, visualProperty.name, [id])
                  setHovered(currentNetworkId, null)
                }}
                disabled={!hasBypass}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          )
        })}
      </Box>
      <Box sx={{ p: 1, m: 1, mr: 1, display: 'flex', justifyContent: 'end' }}>
        <VisualPropertyValueForm
          visualProperty={visualProperty}
          currentValue={bypassValue}
          onValueChange={(newBypassValue: VisualPropertyValueType): void =>
            setBypassValue(newBypassValue)
          }
        />
        <Button
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
          Apply bypass to selected
        </Button>
      </Box>
    </>
  )

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '400px',
        height: '400px',
        minWidth: '30vw',
        minHeight: '30vh',
        overflow: 'scroll',
      }}
      // make sure there is no hovered component when the mouse leaves the bypass form
      onMouseLeave={() => setHovered(props.currentNetworkId, null)}
    >
      <Typography
        sx={{ m: 1 }}
        variant="h6"
      >{`${visualProperty.displayName} bypasses`}</Typography>
      <Box sx={{ p: 1, m: 1 }}>
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

  const noBypasses = props.visualProperty.bypassMap?.size === 0

  let viewBox = null

  if (noBypasses) {
    viewBox = <EmptyVisualPropertyViewBox />
  } else {
    viewBox = (
      <Badge
        color="primary"
        badgeContent={props.visualProperty.bypassMap.size}
        invisible={props.visualProperty.bypassMap.size <= 1}
      >
        <VisualPropertyViewBox>
          <VisualPropertyValueRender
            value={Array.from(props.visualProperty.bypassMap.values())[0]}
            vpValueType={props.visualProperty.type}
          />
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
        onClose={() => showForm(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 55 }}
      >
        <BypassFormContent {...props} />
      </Popover>
    </Box>
  )
}
