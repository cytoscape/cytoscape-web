import { ColorType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'
import { PhotoshopPicker, SwatchesPicker } from 'react-color'
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
      <PhotoshopPicker
        color={localColorValue}
        onChange={(color: any) => {
          setLocalColorValue(color.hex)
          debouncedValueChange(color.hex)
        }}
      />
    </Box>
  )
}

export function ColorPicker2(props: {
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

  const customColors = [
    ['#B71C1C', '#D32F2F', '#F44336', '#E57373', '#FFCDD2'],
    ['#880E4F', '#C2185B', '#E91E63', '#F06292', '#F8BBD0'],
    ['#4A148C', '#7B1FA2', '#9C27B0', '#BA68C8', '#E1BEE7'],
    ['#311B92', '#512DA8', '#673AB7', '#9575CD', '#D1C4E9'],
    ['#1A237E', '#303F9F', '#3F51B5', '#7986CB', '#C5CAE9'],

    ['#0D47A1', '#1976D2', '#2196F3', '#64B5F6', '#BBDEFB'],
    ['#01579B', '#0288D1', '#03A9F4', '#4FC3F7', '#B3E5FC'],
    ['#006064', '#0097A7', '#00BCD4', '#4DD0E1', '#B2EBF2'],
    ['#004D40', '#00796B', '#009688', '#4DB6AC', '#B2DFDB'],
    ['#194D33', '#388E3C', '#4CAF50', '#81C784', '#C8E6C9'],

    ['#33691E', '#689F38', '#8BC34A', '#AED581', '#DCEDC8'],
    ['#827717', '#AFB42B', '#CDDC39', '#DCE775', '#F0F4C3'],
    ['#F57F17', '#FBC02D', '#FFEB3B', '#FFF176', '#FFF9C4'],
    ['#FF6F00', '#FFA000', '#FFC107', '#FFD54F', '#FFECB3'],
    ['#E65100', '#F57C00', '#FF9800', '#FFB74D', '#FFE0B2'],

    ['#BF360C', '#E64A19', '#FF5722', '#FF8A65', '#FFCCBC'],
    ['#3E2723', '#5D4037', '#795548', '#A1887F', '#D7CCC8'],
    ['#263238', '#455A64', '#607D8B', '#90A4AE', '#CFD8DC'],
  ];
  
  return (
    <Box>
      <SwatchesPicker
        width={480}
        colors={customColors}
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
