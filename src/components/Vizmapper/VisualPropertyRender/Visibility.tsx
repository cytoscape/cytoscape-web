import { VisibilityType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'

export function VisibilityPicker(props: {
  currentValue: VisibilityType | null
  onValueChange: (visibility: VisibilityType) => void
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
      {Object.values(VisibilityType).map((visibility: VisibilityType) => (
        <Box
          sx={{
            color: currentValue === visibility ? 'blue' : 'black',
            width: 100,
            p: 1,
            '&:hover': { cursor: 'pointer' },
          }}
          onClick={() => onValueChange(visibility)}
          key={visibility}
        >
          {visibility}
        </Box>
      ))}
    </Box>
  )
}

export function Visibility(props: {
  value: VisibilityType
}): React.ReactElement {
  return <Box>{props.value}</Box>
}
