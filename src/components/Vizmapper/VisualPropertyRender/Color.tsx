import { ColorType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'
import { ChromePicker, SwatchesPicker, CompactPicker } from 'react-color'
import React from 'react'
import debounce from 'lodash.debounce'
import {
  CompactCustomColors,
  VirdisCustomColors,
  SequentialCustomColors,
  DivergingCustomColors,
} from '../../../models/VisualStyleModel/impl/CustomColor'

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

export function ColorPickerCompact(props: {
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
      <CompactPicker
        colors={CompactCustomColors}
        color={localColorValue}
        onChange={(color: any) => {
          setLocalColorValue(color.hex)
          debouncedValueChange(color.hex)
        }}
      />
    </Box>
  )
}

export function ColorPickerViridis(props: {
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
      <SwatchesPicker
        colors={VirdisCustomColors}
        color={localColorValue}
        onChange={(color: any) => {
          setLocalColorValue(color.hex)
          debouncedValueChange(color.hex)
        }}
      />
    </Box>
  )
}

export function ColorPickerSequential(props: {
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
      <SwatchesPicker
        width={1000}
        colors={SequentialCustomColors}
        color={localColorValue}
        onChange={(color: any) => {
          setLocalColorValue(color.hex)
          debouncedValueChange(color.hex)
        }}
      />
    </Box>
  )
}

export function ColorPickerDiverging(props: {
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
      <SwatchesPicker
        width={600}
        colors={DivergingCustomColors}
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
