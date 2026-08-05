import {
  Box,
  Button,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import React from 'react'

import { DEFAULT_NODE_LABEL_POSITION } from '../../../models/VisualStyleModel/impl/defaultVisualStyle'
import {
  NodeLabelOrientationType,
  orientationToPositionMap,
  translateNodePositionToOrientation,
} from '../../../models/VisualStyleModel/impl/nodeLabelPositionMap'
import {
  NodeLabelPositionType,
  NodeLabelPositionValueType,
} from '../../../models/VisualStyleModel/VisualPropertyValue'

export function NodeLabelPositionPicker(props: {
  currentValue: NodeLabelPositionType | null
  onValueChange: (labelPosition: NodeLabelPositionType) => void
  closePopover: (reason: string) => void
}): React.ReactElement {
  const { currentValue } = props

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

      <Box sx={{ p: 1 }}>
        <Box sx={{ mb: 1 }}>X offset</Box>
        <TextField
          type="number"
          size="small"
          inputProps={{ step: 1 }}
          value={localValue.MARGIN_X}
          onChange={(e) => {
            const parsed = Number.parseInt(e.target.value, 10)
            setLocalValue({
              ...localValue,
              MARGIN_X: Number.isNaN(parsed) ? 0 : parsed,
            })
          }}
        />
      </Box>

      <Box sx={{ p: 1 }}>
        <Box sx={{ mb: 1 }}>Y offset</Box>
        <TextField
          type="number"
          size="small"
          inputProps={{ step: 1 }}
          value={localValue.MARGIN_Y}
          onChange={(e) => {
            const parsed = Number.parseInt(e.target.value, 10)
            setLocalValue({
              ...localValue,
              MARGIN_Y: Number.isNaN(parsed) ? 0 : parsed,
            })
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 1,
          p: 1,
          mt: 2,
        }}
      >
        <Button
          variant="outlined"
          onClick={() => {
            props.closePopover('cancel')
            setLocalValue(currentValue ?? DEFAULT_NODE_LABEL_POSITION)
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
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

export function NodeLabelPositionRender(): React.ReactElement {
  return <Typography variant="body1" sx={{ fontSize: 8 }}></Typography>
}
