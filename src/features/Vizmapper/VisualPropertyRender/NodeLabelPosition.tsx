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

/**
 * The offset a draft describes, or undefined when the draft is not a complete
 * number. Number(), not parseInt(): parseInt truncated "1.5" to 1 and "1e3" to
 * 1, silently storing an offset the user never typed.
 */
export function parseOffset(draft: string): number | undefined {
  if (draft.trim() === '') {
    return undefined
  }
  const parsed = Number(draft)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** Whether a draft is a complete number, so Confirm may write it. */
export function isValidOffset(draft: string): boolean {
  return parseOffset(draft) !== undefined
}

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

  // Raw text for the two offset fields. Bound to the inputs so partial input
  // ("-", "") survives: binding them to the parsed number rewrote the field on
  // every keystroke, so a negative offset could not be typed.
  const [marginXDraft, setMarginXDraft] = React.useState(
    String((currentValue ?? DEFAULT_NODE_LABEL_POSITION).MARGIN_X),
  )
  const [marginYDraft, setMarginYDraft] = React.useState(
    String((currentValue ?? DEFAULT_NODE_LABEL_POSITION).MARGIN_Y),
  )

  React.useEffect(() => {
    const next = currentValue ?? DEFAULT_NODE_LABEL_POSITION
    setLocalValue(next)
    setMarginXDraft(String(next.MARGIN_X))
    setMarginYDraft(String(next.MARGIN_Y))
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
          inputProps={{ step: 1, 'aria-label': 'Label X offset' }}
          value={marginXDraft}
          error={!isValidOffset(marginXDraft)}
          onChange={(e) => {
            setMarginXDraft(e.target.value)
            // Write MARGIN_X only for a parsable draft; "-" or "" leaves the
            // last good offset in place instead of snapping to 0.
            const parsed = parseOffset(e.target.value)
            if (parsed !== undefined) {
              setLocalValue({ ...localValue, MARGIN_X: parsed })
            }
          }}
        />
      </Box>

      <Box sx={{ p: 1 }}>
        <Box sx={{ mb: 1 }}>Y offset</Box>
        <TextField
          type="number"
          size="small"
          inputProps={{ step: 1, 'aria-label': 'Label Y offset' }}
          value={marginYDraft}
          error={!isValidOffset(marginYDraft)}
          onChange={(e) => {
            setMarginYDraft(e.target.value)
            const parsed = parseOffset(e.target.value)
            if (parsed !== undefined) {
              setLocalValue({ ...localValue, MARGIN_Y: parsed })
            }
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
          disabled={
            !isValidOffset(marginXDraft) || !isValidOffset(marginYDraft)
          }
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
