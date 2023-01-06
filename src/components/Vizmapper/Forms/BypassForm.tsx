import * as React from 'react'
import { Box, Popover } from '@mui/material'
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
  const viewModels = useViewModelStore((state) => state.viewModels)
  const networkView = viewModels[currentNetworkId]
  const setBypass = useVisualStyleStore((state) => state.setBypass)
  const deleteBypass = useVisualStyleStore((state) => state.deleteBypass)
  const tables = useTableStore((state) => state.tables)
  const table = tables[currentNetworkId]
  const nodeTable = table?.nodeTable
  const edgeTable = table?.edgeTable

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          border: '1px solid gray',
          m: 1,
        }}
      >
        <Box
          sx={{
            m: 1,
            border: '1px solid gray',
            maxHeight: '300px',
            overflow: 'scroll',
          }}
        >
          <Box>Selected Elements</Box>
          {visualProperty.group === 'node'
            ? Object.values(networkView?.nodeViews)
                .filter((nodeView) => nodeView.selected)
                .map((nodeView) => {
                  return <Box key={nodeView.id}>{`Node: ${nodeView.id}`}</Box>
                })
            : null}
          {visualProperty.group === 'edge'
            ? Object.values(networkView?.edgeViews)
                .filter((edgeView) => edgeView.selected)
                .map((edgeView) => {
                  return <Box key={edgeView.id}>{`Edge: ${edgeView.id}`}</Box>
                })
            : null}
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
          <Box>Current Bypasses</Box>
          {Array.from(visualProperty?.bypassMap?.entries() ?? []).map(
            ([eleId, value]) => {
              const eleTable =
                visualProperty.group === 'node' ? nodeTable : edgeTable
              const name = eleTable.rows.get(eleId)?.name
              return (
                <Box
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
                      deleteBypass(currentNetworkId, visualProperty.name, [
                        eleId,
                      ])
                    }}
                  />
                </Box>
              )
            },
          )}
        </Box>
      </Box>
      <Box sx={{ border: '1px solid gray', m: 1 }}>
        <Box>Value Picker</Box>
        <VisualPropertyValueForm
          visualProperty={visualProperty}
          currentValue={visualProperty.defaultValue}
          onValueChange={(newBypassValue: VisualPropertyValueType): void => {
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
            setBypass(
              currentNetworkId,
              visualProperty.name,
              ids,
              newBypassValue,
            )
          }}
        />
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
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
