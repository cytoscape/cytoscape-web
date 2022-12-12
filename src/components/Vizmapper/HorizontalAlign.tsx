import { HoritzontalAlignType } from '../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'

export function HoritzontalAlignPicker(props: {
  currentValue: HoritzontalAlignType
  onClick: (horizontalAlign: HoritzontalAlignType) => void
}): React.ReactElement {
  const { onClick, currentValue } = props

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
            onClick={() => onClick(horizontalAlign)}
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
  horizontalAlign: HoritzontalAlignType
}): React.ReactElement {
  return <Box>{props.horizontalAlign}</Box>
}
