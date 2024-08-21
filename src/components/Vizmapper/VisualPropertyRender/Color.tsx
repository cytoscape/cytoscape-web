import { ColorType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box, Tab, Tabs } from '@mui/material'
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
  closePopover: () => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  const debouncedValueChange = debounce(onValueChange, 200)
  const [activeTab, setActiveTab] = React.useState(0)

  // use local state to appear instantaneous in the color picker,
  // but the actual visual style model updates are debounced
  const [localColorValue, setLocalColorValue] = React.useState<ColorType>(
    currentValue ?? `#ffffff`,
  )

  return (
    <Box>
      <Tabs
        value={activeTab}
        onChange={(event, newValue) => setActiveTab(newValue)}
        aria-label="Tab panel"
      >
        <Tab sx={{ pl: 3, pr: 3 }} label="ColorBrewer Sequential" />
        <Tab sx={{ pl: 3, pr: 3 }} label="ColorBrewer Diverging" />
        <Tab sx={{ pl: 3, pr: 3 }} label="Viridis Sequential" />
        <Tab sx={{ pl: 3, pr: 3 }} label="Swatches" />
        <Tab sx={{ pl: 3, pr: 3 }} label="Color Picker" />
      </Tabs>
      {activeTab === 0 && (
        <SwatchesPicker
          width={945}
          colors={SequentialCustomColors}
          color={localColorValue}
          onChange={(color: any) => {
            setLocalColorValue(color.hex)
            debouncedValueChange(color.hex)
          }}
        />
      )}
      {activeTab === 1 && (
        <SwatchesPicker
          width={600}
          colors={DivergingCustomColors}
          color={localColorValue}
          onChange={(color: any) => {
            setLocalColorValue(color.hex)
            debouncedValueChange(color.hex)
          }}
        />
      )}
      {activeTab === 2 && (
        <SwatchesPicker
          width={231}
          colors={VirdisCustomColors}
          color={localColorValue}
          onChange={(color: any) => {
            setLocalColorValue(color.hex)
            debouncedValueChange(color.hex)
          }}
        />
      )}
      {activeTab === 3 && (
        <CompactPicker
          colors={CompactCustomColors}
          color={localColorValue}
          onChange={(color: any) => {
            setLocalColorValue(color.hex)
            debouncedValueChange(color.hex)
          }}
        />
      )}
      {activeTab === 4 && (
        <ChromePicker
          color={localColorValue}
          onChange={(color: any) => {
            setLocalColorValue(color.hex)
            debouncedValueChange(color.hex)
          }}
        />
      )}
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
