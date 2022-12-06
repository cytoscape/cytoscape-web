import { Color } from '../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'
import { ChromePicker } from 'react-color'

export function ColorPicker(props: {
  currentValue: Color
  onClick: (shape: Color) => void
}): React.ReactElement {
  const { onClick, currentValue } = props

  return (
    <Box>
      <ChromePicker
        color={currentValue}
        onChange={(color: any) => onClick(color.hex)}
      />
    </Box>
  )
}

export function Color(props: { color: Color }): React.ReactElement {
  return <Box sx={{ backgroundColor: props.color }}></Box>
}
