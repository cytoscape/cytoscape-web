import { HoritzontalAlignType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'

export function HoritzontalAlignPicker(props: {
  currentValue: HoritzontalAlignType | null
  onValueChange: (horizontalAlign: HoritzontalAlignType) => void
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
      {Object.values(HoritzontalAlignType).map(
        (horizontalAlign: HoritzontalAlignType) => (
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
  value: HoritzontalAlignType
}): React.ReactElement {
  return <Box>{props.value}</Box>
}
