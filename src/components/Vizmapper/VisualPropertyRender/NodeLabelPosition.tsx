import {
  NodeLabelPositionType,
  NodeLabelPositionValueType,
} from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box, Button, MenuItem, Select, Typography } from '@mui/material'
import { DEFAULT_NODE_LABEL_POSITION } from '../../../models/VisualStyleModel/impl/DefaultVisualStyle'
import React from 'react'
import {
  NodeLabelOrientationType,
  orientationToPositionMap,
  translateNodePositionToOrientation,
} from '../../../models/VisualStyleModel/impl/nodeLabelPositionMap'
import { MantineProvider, NumberInput } from '@mantine/core'

export function NodeLabelPositionPicker(props: {
  currentValue: NodeLabelPositionType | null
  onValueChange: (labelPosition: NodeLabelPositionType) => void
  closePopover: (reason: string) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props

  const [labelOrientation, setlabelOrientation] =
    React.useState<NodeLabelOrientationType>(
      translateNodePositionToOrientation(
        currentValue ?? DEFAULT_NODE_LABEL_POSITION,
      ),
    )

  const [localValue, setLocalValue] = React.useState(
    currentValue ?? DEFAULT_NODE_LABEL_POSITION,
  )

  React.useEffect(() => {
    setLocalValue(currentValue ?? DEFAULT_NODE_LABEL_POSITION)
  }, [currentValue])

  const handleOrientationChange = (orientation: NodeLabelOrientationType) => {
    const position = orientationToPositionMap[orientation]
    setlabelOrientation(orientation)
    const computedPosition = Object.assign({}, position, {
      MARGIN_X: localValue.MARGIN_X,
      MARGIN_Y: localValue.MARGIN_Y,
      JUSTIFICATION: localValue.JUSTIFICATION,
    })

    setLocalValue(computedPosition)
  }

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ p: 1 }}>
        <Box sx={{ mb: 1 }}>Orientation</Box>
        <Select
          size="small"
          value={labelOrientation}
          label="Preset label positions"
          onChange={(e) =>
            handleOrientationChange(e.target.value as NodeLabelOrientationType)
          }
        >
          {Object.values(NodeLabelOrientationType).map((orientation) => {
            return (
              <MenuItem key={orientation} value={orientation}>
                {orientation}
              </MenuItem>
            )
          })}
        </Select>
      </Box>
      <Box sx={{ p: 1 }}>
        <Box sx={{ mb: 1 }}>Label Justification</Box>
        <Select
          size="small"
          value={localValue.JUSTIFICATION}
          label="Text justification"
          onChange={(e) => {
            setLocalValue({
              ...localValue,
              JUSTIFICATION: e.target.value as NodeLabelPositionValueType,
            })
          }}
        >
          <MenuItem value="left">Left</MenuItem>
          <MenuItem value="center">Center</MenuItem>
          <MenuItem value="right">Right</MenuItem>
        </Select>{' '}
      </Box>

      <MantineProvider>
        <Box sx={{ p: 1 }}>
          <Box sx={{ mb: 1 }}>X offset</Box>
          <NumberInput
            allowDecimal={false}
            value={localValue.MARGIN_X}
            onChange={(e: number) => {
              setLocalValue({
                ...localValue,
                MARGIN_X: e,
              })
            }}
          />
        </Box>

        <Box sx={{ p: 1 }}>
          <Box sx={{ mb: 1 }}>Y offset</Box>

          <NumberInput
            allowDecimal={false}
            value={localValue.MARGIN_Y}
            onChange={(e: number) => {
              setLocalValue({
                ...localValue,
                MARGIN_Y: e,
              })
            }}
          />
        </Box>
      </MantineProvider>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
        <Button
          color="error"
          onClick={() => {
            props.closePopover('cancel')
            setLocalValue(currentValue ?? DEFAULT_NODE_LABEL_POSITION)
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            props.onValueChange(localValue)
            props.closePopover('confirm')
          }}
        >
          Confirm
        </Button>
      </Box>
    </Box>
  )
}

export function NodeLabelPositionRender(props: {
  value: NodeLabelPositionType
}): React.ReactElement {
  return <Typography variant="body1" sx={{ fontSize: 8 }}></Typography>
}
