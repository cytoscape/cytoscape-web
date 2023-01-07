import * as React from 'react'
import { Box, Popover, Typography, Button } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

import { IdType } from '../../../models/IdType'
import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../models/VisualStyleModel'

import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useTableStore } from '../../../store/TableStore'

import { VisualPropertyValueForm } from './VisualPropertyValueForm'

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

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '400px',
        height: '400px',
        minWidth: '30vw',
        minHeight: '30vh',
      }}
      // make sure there is no hovered component when the mouse leaves the bypass form
      onMouseLeave={() => setHovered(props.currentNetworkId, null)}
    >
      <Typography
        sx={{ m: 1 }}
        variant="h6"
      >{`${visualProperty.displayName} bypasses`}</Typography>

      <Box
        sx={{
          p: 1,
          m: 1,
          border: '1px solid gray',
          maxHeight: '300px',
          overflow: 'scroll',
        }}
      >
        <Box>Create Bypasses</Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start',
          }}
        >
          <Box sx={{ width: '200px', border: '1px solid gray', m: 1 }}>
            <Box>Selected Elements</Box>
            {visualProperty.group === 'node' ? (
              selectedNodes.length > 0 ? (
                selectedNodes.map((nodeView) => {
                  const eleTable =
                    visualProperty.group === 'node' ? nodeTable : edgeTable
                  const name = eleTable.rows.get(nodeView.id)?.name
                  return (
                    <Box
                      onMouseEnter={() =>
                        setHovered(props.currentNetworkId, nodeView.id)
                      }
                      onMouseLeave={() =>
                        setHovered(props.currentNetworkId, null)
                      }
                      sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      key={nodeView.id}
                    >
                      <Box
                        sx={{ width: 50, m: 1 }}
                      >{`${visualProperty.group}:  ${nodeView.id}`}</Box>
                      <Box sx={{ width: 50, m: 1 }}>{name}</Box>
                    </Box>
                  )
                })
              ) : (
                <Typography variant="caption">
                  Select nodes to apply a style bypass to them
                </Typography>
              )
            ) : null}
            {visualProperty.group === 'edge' ? (
              selectedEdges.length > 0 ? (
                selectedEdges.map((edgeView) => {
                  const eleTable =
                    visualProperty.group === 'node' ? nodeTable : edgeTable
                  const name = eleTable.rows.get(edgeView.id)?.name
                  return (
                    <Box
                      onMouseEnter={() =>
                        setHovered(props.currentNetworkId, edgeView.id)
                      }
                      onMouseLeave={() =>
                        setHovered(props.currentNetworkId, null)
                      }
                      sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      key={edgeView.id}
                    >
                      <Box
                        sx={{ width: 50, m: 1 }}
                      >{`${visualProperty.group}:  ${edgeView.id}`}</Box>
                      <Box sx={{ width: 50, m: 1 }}>{name}</Box>
                    </Box>
                  )
                })
              ) : (
                <Typography variant="caption">
                  Select edges to apply a style bypass to them
                </Typography>
              )
            ) : null}
          </Box>
          <Box sx={{ width: '200px', border: '1px solid gray', m: 1 }}>
            <Box>Bypass Value</Box>
            {validElementsSelected ? (
              <Box>
                <VisualPropertyValueForm
                  visualProperty={visualProperty}
                  currentValue={bypassValue}
                  onValueChange={(
                    newBypassValue: VisualPropertyValueType,
                  ): void => setBypassValue(newBypassValue)}
                />
              </Box>
            ) : null}
          </Box>
        </Box>
        <Button
          disabled={!validElementsSelected}
          onClick={() => {
            let ids: IdType[] = []
            const nodeIds = Object.values(networkView?.nodeViews)
              .filter((nodeView) => nodeView.selected)
              .map((nodeView) => nodeView.id)
            const edgeIds = Object.values(networkView?.edgeViews)
              .filter((edgeView) => edgeView.selected)
              .map((edgeView) => edgeView.id)
            if (visualProperty.group === 'node') {
              ids = nodeIds
            } else if (visualProperty.group === 'edge') {
              ids = edgeIds
            }
            setBypass(currentNetworkId, visualProperty.name, ids, bypassValue)
          }}
        >
          Apply bypass to selected elements
        </Button>
      </Box>
      <Box
        sx={{
          p: 1,
          m: 1,
          border: '1px solid gray',
          maxHeight: '300px',
          overflow: 'scroll',
        }}
      >
        <Box>Edit Bypasses</Box>
        {Array.from(visualProperty?.bypassMap?.entries() ?? []).map(
          ([eleId, value]) => {
            const eleTable =
              visualProperty.group === 'node' ? nodeTable : edgeTable
            const name = eleTable.rows.get(eleId)?.name
            return (
              <Box
                onMouseEnter={() => setHovered(props.currentNetworkId, eleId)}
                onMouseLeave={() => setHovered(props.currentNetworkId, null)}
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                key={eleId}
              >
                <Box
                  sx={{ width: 50, m: 1 }}
                >{`${visualProperty.group}:  ${eleId}`}</Box>
                <Box sx={{ width: 50, m: 1 }}>{name}</Box>
                <VisualPropertyValueForm
                  visualProperty={visualProperty}
                  currentValue={value}
                  onValueChange={(value) => {
                    setBypass(
                      currentNetworkId,
                      visualProperty.name,
                      [eleId],
                      value,
                    )
                  }}
                />
                <CloseIcon
                  sx={{ '&:hover': { cursor: 'pointer' } }}
                  onClick={() => {
                    deleteBypass(currentNetworkId, visualProperty.name, [eleId])
                    setHovered(currentNetworkId, null)
                  }}
                />
              </Box>
            )
          },
        )}
      </Box>
    </Box>
  )
}

export function BypassForm(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const [formAnchorEl, setFormAnchorEl] = React.useState<Element | null>(null)

  const showForm = (value: Element | null): void => {
    setFormAnchorEl(value)
  }

  return (
    <Box>
      <Box
        sx={{
          width: 48,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={(e) => showForm(e.currentTarget)}
      >
        {props.visualProperty.bypassMap != null ? '+' : '-'}
      </Box>
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
