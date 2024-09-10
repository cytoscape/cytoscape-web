import {
  NodeLabelPositionType,
  VerticalAlignType,
  HorizontalAlignType,
} from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box, Button, Typography } from '@mui/material'
import { DEFAULT_NODE_LABEL_POSITION } from '../../../models/VisualStyleModel/impl/DefaultVisualStyle'
import React from 'react'

export function NodeLabelPositionPicker(props: {
  currentValue: NodeLabelPositionType | null
  onValueChange: (labelPosition: NodeLabelPositionType) => void
  closePopover: (reason: string) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props

  const [localValue, setLocalValue] = React.useState(
    currentValue ?? DEFAULT_NODE_LABEL_POSITION,
  )

  React.useEffect(() => {
    setLocalValue(currentValue ?? DEFAULT_NODE_LABEL_POSITION)
  }, [currentValue])

  return (
    <Box sx={{ p: 2 }}>
      <Box>Vertical Align</Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        {Object.values(VerticalAlignType).map(
          (verticalAlign: VerticalAlignType) => (
            <Box
              sx={{
                color:
                  localValue?.VERTICAL_ALIGN === verticalAlign
                    ? 'blue'
                    : 'black',
                fontWeight:
                  localValue?.VERTICAL_ALIGN === verticalAlign
                    ? 'bold'
                    : 'normal',

                width: 100,
                p: 1,
                '&:hover': { cursor: 'pointer' },
              }}
              onClick={() => {
                setLocalValue(
                  Object.assign({}, localValue ?? DEFAULT_NODE_LABEL_POSITION, {
                    VERTICAL_ALIGN: verticalAlign,
                  }),
                )
              }}
              key={verticalAlign}
            >
              {verticalAlign}
            </Box>
          ),
        )}
      </Box>
      <Box>Horizontal Align</Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        {Object.values(HorizontalAlignType).map(
          (horizontalAlign: HorizontalAlignType) => (
            <Box
              sx={{
                color:
                  localValue?.HORIZONTAL_ALIGN === horizontalAlign
                    ? 'blue'
                    : 'black',
                fontWeight:
                  localValue?.HORIZONTAL_ALIGN === horizontalAlign
                    ? 'bold'
                    : 'normal',

                width: 100,
                p: 1,
                '&:hover': { cursor: 'pointer' },
              }}
              onClick={() => {
                setLocalValue(
                  Object.assign({}, localValue ?? DEFAULT_NODE_LABEL_POSITION, {
                    HORIZONTAL_ALIGN: horizontalAlign,
                  }),
                )
              }}
              key={horizontalAlign}
            >
              {horizontalAlign}
            </Box>
          ),
        )}
      </Box>
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
