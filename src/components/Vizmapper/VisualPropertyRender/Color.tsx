import { ColorType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'
import { ChromePicker } from 'react-color'
import React from 'react'
import debounce from 'lodash.debounce'

export function ColorPicker(props: {
  currentValue: ColorType | null
  onValueChange: (color: ColorType) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  const debouncedValueChange = debounce(onValueChange, 200)

  // use local state to appear instantaneous in the color picker,
  // but the actual visual style model updates are debounced
  const [localColorValue, setLocalColorValue] = React.useState<ColorType>(
    currentValue ?? `#ffffff`,
  )

  return (
    <Box>
      <ChromePicker
        color={localColorValue}
        onChange={(color: any) => {
          setLocalColorValue(color.hex)
          debouncedValueChange(color.hex)
        }}
      />
    </Box>
  )
}

export function Color(props: { value: ColorType }): React.ReactElement {
  return (
    <Box
      sx={{
        backgroundColor: props.value,
        flex: 1,
        width: 50,
        height: 50,
        borderRadius: '20%',
      }}
    ></Box>
  )
}
