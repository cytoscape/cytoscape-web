import { Box, Button, Tab, Tabs } from '@mui/material'
import React from 'react'
import { ChromePicker, CompactPicker, SwatchesPicker } from 'react-color'

import {
  CompactCustomColors,
  DivergingCustomColors,
  SequentialCustomColors,
  VirdisCustomColors,
} from '../../../models/VisualStyleModel/impl/colorUtils'
import { ColorType } from '../../../models/VisualStyleModel/VisualPropertyValue'

export function ColorPicker(props: {
  currentValue: ColorType | null
  onValueChange: (color: ColorType) => void
  closePopover: (reason: string) => void
}): React.ReactElement {
  const { currentValue } = props
  const [activeTab, setActiveTab] = React.useState(0)

  // use local state to appear instantaneous in the color picker,
  // but the actual visual style model updates are debounced
  const [localColorValue, setLocalColorValue] = React.useState<ColorType>(
    currentValue ?? `#ffffff`,
  )

  React.useEffect(() => {
    setLocalColorValue(currentValue ?? `#ffffff`)
  }, [currentValue])

  return (
    // A definite width, so the pickers below can size themselves as a
    // percentage of it. The popover Paper is shrink-to-fit and clips at
    // `overflow-x: hidden`, so anything wider than the viewport is
    // unreachable (#653).
    <Box sx={{ width: 'min(1000px, calc(100vw - 64px))' }}>
      <Tabs
        data-testid="color-picker-tabs"
        value={activeTab}
        onChange={(event, newValue) => setActiveTab(newValue)}
        aria-label="Tab panel"
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        <Tab
          data-testid="color-picker-sequential-tab"
          sx={{ pl: 3, pr: 3 }}
          label="ColorBrewer Sequential"
        />
        <Tab
          data-testid="color-picker-diverging-tab"
          sx={{ pl: 3, pr: 3 }}
          label="ColorBrewer Diverging"
        />
        <Tab
          data-testid="color-picker-viridis-tab"
          sx={{ pl: 3, pr: 3 }}
          label="Viridis Sequential"
        />
        <Tab
          data-testid="color-picker-swatches-tab"
          sx={{ pl: 3, pr: 3 }}
          label="Swatches"
        />
        <Tab
          data-testid="color-picker-picker-tab"
          sx={{ pl: 3, pr: 3 }}
          label="Color Picker"
        />
      </Tabs>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 1,
          height: 275,
          // The swatch grids are sized as a percentage of this box; letting
          // flex shrink them below that would re-clip the last column.
          '& > *': { flexShrink: 0 },
        }}
      >
        {activeTab === 0 && (
          <SwatchesPicker
            // @types/react-color types `width` as a number; the style hook
            // takes the same value and accepts a CSS string.
            styles={{ default: { picker: { width: 'min(945px, 100%)' } } }}
            colors={SequentialCustomColors}
            color={localColorValue}
            onChange={(color: any) => {
              setLocalColorValue(color.hex)
            }}
          />
        )}
        {activeTab === 1 && (
          <SwatchesPicker
            // @types/react-color types `width` as a number; the style hook
            // takes the same value and accepts a CSS string.
            styles={{ default: { picker: { width: 'min(600px, 100%)' } } }}
            colors={DivergingCustomColors}
            color={localColorValue}
            onChange={(color: any) => {
              setLocalColorValue(color.hex)
            }}
          />
        )}
        {activeTab === 2 && (
          <SwatchesPicker
            // @types/react-color types `width` as a number; the style hook
            // takes the same value and accepts a CSS string.
            styles={{ default: { picker: { width: 'min(231px, 100%)' } } }}
            colors={VirdisCustomColors}
            color={localColorValue}
            onChange={(color: any) => {
              setLocalColorValue(color.hex)
            }}
          />
        )}
        {activeTab === 3 && (
          <CompactPicker
            colors={CompactCustomColors}
            color={localColorValue}
            onChange={(color: any) => {
              setLocalColorValue(color.hex)
            }}
          />
        )}
        {activeTab === 4 && (
          <ChromePicker
            color={localColorValue}
            onChange={(color: any) => {
              setLocalColorValue(color.hex)
            }}
          />
        )}
      </Box>
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, p: 1 }}
      >
        <Button
          data-testid="color-picker-cancel-button"
          variant="outlined"
          onClick={() => {
            props.closePopover('cancel')
            setLocalColorValue(currentValue ?? `#ffffff`)
          }}
        >
          Cancel
        </Button>
        <Button
          data-testid="color-picker-confirm-button"
          variant="contained"
          onClick={() => {
            props.onValueChange(localColorValue)
            props.closePopover('confirm')
          }}
        >
          Confirm
        </Button>
      </Box>
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
