import { VerticalAlignType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'

export function VerticalAlignPicker(props: {
  currentValue: VerticalAlignType | null
  onValueChange: (verticalAlign: VerticalAlignType) => void
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
      {Object.values(VerticalAlignType).map(
        (verticalAlign: VerticalAlignType) => (
          <Box
            sx={{
              color: currentValue === verticalAlign ? 'blue' : 'black',
              width: 100,
              p: 1,
              '&:hover': { cursor: 'pointer' },
            }}
            onClick={() => onValueChange(verticalAlign)}
            key={verticalAlign}
          >
            {verticalAlign}
          </Box>
        ),
      )}
    </Box>
  )
}

export function VerticalAlign(props: {
  value: VerticalAlignType
}): React.ReactElement {
  return <Box>{props.value}</Box>
}
