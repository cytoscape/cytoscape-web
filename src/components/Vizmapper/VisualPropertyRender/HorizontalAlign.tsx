import { HorizontalAlignType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box, Typography } from '@mui/material'

export function HoritzontalAlignPicker(props: {
  currentValue: HorizontalAlignType | null
  onValueChange: (horizontalAlign: HorizontalAlignType) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props

  return (
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
              color: currentValue === horizontalAlign ? 'blue' : 'black',
              width: 100,
              p: 1,
              '&:hover': { cursor: 'pointer' },
            }}
            onClick={() => onValueChange(horizontalAlign)}
            key={horizontalAlign}
          >
            {horizontalAlign}
          </Box>
        ),
      )}
    </Box>
  )
}

export function HorizontalAlign(props: {
  value: HorizontalAlignType
}): React.ReactElement {
  return (
    <Typography variant="body1" sx={{ fontSize: 8 }}>
      {props.value}
    </Typography>
  )
}
