import { ColorType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'
import { PhotoshopPicker, SwatchesPicker, CompactPicker } from 'react-color'
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

export function ColorPickerGithub(props: {
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


  const customColors = ['#ffffff', '#d3d2ff', '#d3d2ff', '#d3d2ff', '#ffcfd1', '#ffcfd1', '#ffcfd1', '#ffffcf', '#c5ffcf', '#c5ffcf', '#c5ffcf', '#c5ffcf', 
                        '#d2d2d2', '#a4a2ff', '#a4a2ff', '#a4a2ff', '#ff9ba2', '#ff9ba2', '#ff9ba2', '#feff9b', '#7eff9c', '#7eff9c', '#7eff9c', '#7fffd0', 
                        '#d2d2d2', '#63a5ff', '#746fff', '#ae6bff', '#ff5ea4', '#ff5f6e', '#ff9b6a', '#feff5e', '#7eff61', '#00ff62', '#00ff62', '#00ffd0',
                        '#a3a3a3', '#00a6ff', '#4035ff', '#b421ff', '#ff00a5', '#ff0030', '#ff9c1e', '#feff00', '#7dff00', '#00ff00', '#00ff63', '#00ffd1',
                        '#a3a3a3', '#00a7ff', '#1900ff', '#b600ff', '#ff00a5', '#ff0000', '#ff9c00', '#feff00', '#7dff00', '#00ff00', '#00ff63', '#00ffd1',
                        '#717171', '#00a7d5', '#1200d8', '#b500d7', '#e800a6', '#e70000', '#dba000', '#d1d300', '#94d500', '#00d800', '#00d86a', '#00d8d3',
                        '#717171', '#00a8a4', '#0b00a8', '#b400a7', '#b400a7', '#b40000', '#ac6e00', '#a2a400', '#a2a400', '#00a800', '#00a86f', '#00a8a4',
                        '#3a3a3a', '#007472', '#050075', '#7e0074', '#7d0000', '#7d0000', '#717200', '#717200', '#717200', '#1c7400', '#007472', '#007472',
                        '#000000', '#003c3b', '#01003c', '#41003c', '#41003c', '#3a3a00', '#808900', '#3a3a00', '#3a3a00', '#003c3b', '#003c3b', '#3a3a3a',
                      ]

  return (
    <Box>
      <CompactPicker
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

  const customColors = [
    ['#ffea00', '#98e21e', '#00ce71', '#00af91', '#008f9a', '#2f689b', '#55378d', '#560061'],
    ['#fcfec2', '#ffbf86', '#ff7762', '#ec3379', '#b31b8e', '#75008e', '#2d0c60', '#000001'],
    ['#effb00', '#ffc100', '#ff8b46', '#f25872', '#d41995', '#a600b3', '#6b00b2', '#120096'],
    ['#fbffa6', '#ffc600', '#ff7e00', '#ed3c46', '#ba106f', '#7c007c', '#350062', '#000001'],
  ];
  
  return (
    <Box>
      <SwatchesPicker
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

  const customColors = [
    ['#f7fdf6', '#e5f7e3', '#c5eec5', '#9ae1a1', '#60cf7c', '#00b962', '#009a49', '#006836'], 
    ['#f7fdf1', '#e0f6de', '#caefca', '#a2e4bb', '#69d6cb', '#0bbfdb', '#009ac9', '#0065ac'],
    ['#fff8fc', '#f1e5f3', '#d6d7ea', '#aac6e1', '#aac6e1', '#009eca', '#009096', '#00735a'],
    ['#fff8f4', '#ffe2e1', '#ffc8c6', '#ffa2bd', '#ff62ac', '#f700a4', '#ca008c', '#940085'],
    ['#fff8ee', '#ffeacc', '#ffd7a3', '#ffbf89', '#ff8f5c', '#ff614a', '#f10011', '#b40000'],
    ['#f7fdfd', '#e1eff6', '#c2d9ea', '#a1c5e1', '#95a1cf', '#9e73bd', '#9f41aa', '#860079'],
    ['#ffffe7', '#fff8bf', '#ffe594', '#ffc847', '#ff9c00', '#ff6f00', '#e44500', '#a52300'],
    ['#ffffcf', '#ffefa4', '#ffe594', '#ffb646', '#ff8f33', '#ff3b1e', '#fd000a', '#cc0026'],
    ['#fff6f2', '#ffe2d6', '#ffbfa8', '#ff9478', '#ff654c', '#ff1126', '#e60012', '#b40000'],
    ['#f9f5fa', '#ebe4f2', '#dfbfe0', '#da9ad0', '#f662bb', '#ff0097', '#e90060', '#ac0048'],
    ['#fff6ed', '#ffe8d2', '#ffd3a8', '#ffb26e', '#ff8f33', '#ff6600', '#f13b00', '#a52300'],
    ['#f7fcff', '#dfeef9', '#c8e1f2', '#9cd2e6', '#5fbade', '#19a0d0', '#007fc1', '#0050a2'],
    ['#fdfcfd', '#f2eff7', '#dfdfef', '#c4c4e2', '#a9a4d1', '#8d88c5', '#7b59b0', '#5d0095'],
    ['#ffffe7', '#f7fdbc', '#d8f4a7', '#a8e493', '#66d17f', '#00b962', '#009347', '#006836'],
    ['#ffffff', '#f2f2f2', '#dedede', '#c5c5c5', '#a0a0a0', '#7e7e7e', '#5c5c5c', '#2a2a2a'],
    ['#f7fdfd', '#e5f7fa', '#cbf0e9', '#91e0cf', '#47cdad', '#00bb7e', '#009a49', '#006623'],
    ['#ffffdb', '#ecfab5', '#c5eeb9', '#6fd7c2', '#00c3cd', '#009fca', '#006bb5', '#003293'],
    ['#fff8fc', '#f0eaf4', '#d6d7ea', '#aac6e1', '#6fb5d7', '#009eca', '#007ebc', '#005a89'],
  ];
  
  return (
    <Box>
      <SwatchesPicker
        width={930}
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

  const customColors = [
    ['#ff0000', '#ff304d', '#ff939b', '#ffdddf', '#e0dfff', '#9e9cff', '#5750ff', '#1900ff'], 
    ['#cd002c', '#ed5e52', '#ffa989', '#ffdecc', '#d2e9f3', '#8ecee4', '#1ba1cd', '#0073b9'],
    ['#ca5a00', '#f38600', '#ffbc64', '#ffe2bb', '#dddfef', '#bcb3da', '#8f7db8', '#682497'],
    ['#8e2191', '#ac78b7', '#cfacd7', '#eed8ec', '#d8f3d7', '#a0e2a6', '#3bbb66', '#008739'],
    ['#ee2957', '#ff6a43', '#ffb262', '#ffe38e', '#e5f89b', '#a6e4aa', '#47cdae', '#0096c8'],
    ['#a15600', '#d18820', '#e8c882', '#faeac7', '#c5efe8', '#71d7c8', '#00a59a', '#007569'],
    ['#00ffff', '#00ffff', '#74ffff', '#d7ffff', '#ffddff', '#ff92ff', '#ff29ff', '#ff00ff'],
    ['#f10021', '#ff6a43', '#ffb262', '#ffe38e', '#d8f38e', '#a1e16b', '#4ac967', '#00a755'],
    ['#e0008a', '#f378b8', '#febae0', '#ffe2f2', '#e6f7d4', '#b5e78a', '#75c739', '#35a002'],
    ['#cd002c', '#ed5e52', '#ffa989', '#ffdecc', '#e4e4e4', '#c2c2c2', '#929292', '#575757'],
    ['#f10021', '#ff6a43', '#ffb262', '#ffe393', '#e0f6f9', '#a8e0ed', '#6db8d9', '#3d82c0'],
  ];
  
  return (
    <Box>
      <SwatchesPicker
        width={580}
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
