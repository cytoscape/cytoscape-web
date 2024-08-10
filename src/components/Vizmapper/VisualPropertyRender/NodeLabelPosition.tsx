import {
  NodeLabelPositionType,
  VerticalAlignType,
  HorizontalAlignType,
} from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box, Typography } from '@mui/material'
import { DEFAULT_NODE_LABEL_POSITION } from '../../../models/VisualStyleModel/impl/DefaultVisualStyle'

export function NodeLabelPositionPicker(props: {
  currentValue: NodeLabelPositionType | null
  onValueChange: (labelPosition: NodeLabelPositionType) => void
  closePopover: () => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props

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
                  currentValue?.VERTICAL_ALIGN === verticalAlign
                    ? 'blue'
                    : 'black',
                width: 100,
                p: 1,
                '&:hover': { cursor: 'pointer' },
              }}
              onClick={() => {
                onValueChange(
                  Object.assign(
                    {},
                    currentValue ?? DEFAULT_NODE_LABEL_POSITION,
                    {
                      VERTICAL_ALIGN: verticalAlign,
                    },
                  ),
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
                  currentValue?.HORIZONTAL_ALIGN === horizontalAlign
                    ? 'blue'
                    : 'black',
                width: 100,
                p: 1,
                '&:hover': { cursor: 'pointer' },
              }}
              onClick={() => {
                onValueChange(
                  Object.assign(
                    {},
                    currentValue ?? DEFAULT_NODE_LABEL_POSITION,
                    {
                      HORIZONTAL_ALIGN: horizontalAlign,
                    },
                  ),
                )
              }}
              key={horizontalAlign}
            >
              {horizontalAlign}
            </Box>
          ),
        )}
      </Box>
    </Box>
  )
}

export function NodeLabelPositionRender(props: {
  value: NodeLabelPositionType
}): React.ReactElement {
  return <Typography variant="body1" sx={{ fontSize: 8 }}></Typography>
}
