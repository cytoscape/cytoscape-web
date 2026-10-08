import Palette from '@mui/icons-material/Palette'
import {
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Paper,
  Popover,
  Typography,
} from '@mui/material'
import React from 'react'

import { PaletteSelector } from '@/features/Vizmapper/PalettePicker'
import { getPaletteGradientColors } from '@/models/VisualStyleModel/impl/colorPalettes'
import { PaletteCategory } from '@/models/VisualStyleModel/VisualPropertyValue/ColorPalette'
import { ColorType } from '@/models/VisualStyleModel/VisualPropertyValue/ColorType'

interface ColorPalettePickerProps {
  currentPaletteName: string
  onPaletteSelect: (
    minColor: ColorType,
    middleColor: ColorType,
    maxColor: ColorType,
    paletteName: string,
  ) => void
  /**
   * Category to preselect (CW-460). Defaults to diverging, but callers can pass
   * a data-driven recommendation (sequential for single-sided data).
   */
  recommendedCategory?: PaletteCategory
}

export function ColorPalettePicker({
  currentPaletteName,
  onPaletteSelect,
  recommendedCategory = 'diverging',
}: ColorPalettePickerProps): React.ReactElement {
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null)
  const [isColorBlindChecked, setIsColorBlindChecked] = React.useState(false)
  const [isReverseColorChecked, setIsReverseColorChecked] =
    React.useState(false)
  const [colorPalette, setColorPalette] = React.useState('')
  const [minPalette, setMinPalette] = React.useState<ColorType>('#000000')
  const [middlePalette, setMiddlePalette] = React.useState<ColorType>('#ffffff')
  const [maxPalette, setMaxPalette] = React.useState<ColorType>('#000000')
  const [textPalette, setTextPalette] = React.useState('None')

  const showColorPickerMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setAnchorEl(event.currentTarget)
  }

  const hideColorPickerMenu = (): void => {
    setAnchorEl(null)
  }

  const handleColorBlindCheckboxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setIsColorBlindChecked(event.target.checked)
  }

  const handleReverseColorCheckboxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setIsReverseColorChecked(event.target.checked)
  }

  const handlePaletteChange = (paletteId: string): void => {
    const colors = getPaletteGradientColors(paletteId)
    // Nothing to apply, so leave the selection alone rather than highlighting a
    // palette whose gradient Confirm would not send.
    if (colors == null) return
    setColorPalette(paletteId)
    setMinPalette(colors.min)
    setMiddlePalette(colors.middle)
    setMaxPalette(colors.max)
    setTextPalette(colors.name)
  }

  const handleConfirm = (): void => {
    // Apply reverse logic: if reverse is checked, swap min and max
    const finalMin = isReverseColorChecked ? maxPalette : minPalette
    const finalMax = isReverseColorChecked ? minPalette : maxPalette
    onPaletteSelect(finalMin, middlePalette, finalMax, textPalette)
    hideColorPickerMenu()
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'flex',
        py: 1,
        px: 2,
        gap: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
      }}
    >
      <span>Current Palette:</span>
      <Button
        onClick={showColorPickerMenu}
        variant="outlined"
        size="small"
        startIcon={<Palette />}
      >
        {currentPaletteName}
      </Button>
      <Popover
        open={anchorEl != null}
        anchorEl={anchorEl}
        onClose={hideColorPickerMenu}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Typography align={'center'} sx={{ p: 1 }}>
          Set Palette
        </Typography>
        <PaletteSelector
          layout="strip"
          value={colorPalette}
          onChange={handlePaletteChange}
          defaultCategory={recommendedCategory}
          colorBlindSafeOnly={isColorBlindChecked}
        />

        <Paper
          sx={{
            display: 'flex',
            p: 1,
            m: 1,
            ml: 3,
            mr: 3,
            justifyContent: 'space-evenly',
          }}
        >
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isReverseColorChecked}
                  onChange={handleReverseColorCheckboxChange}
                />
              }
              label="reverse colors"
            />
          </FormGroup>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isColorBlindChecked}
                  onChange={handleColorBlindCheckboxChange}
                />
              }
              label="colorblind-friendly"
            />
          </FormGroup>
        </Paper>
        <Paper
          sx={{
            display: 'flex',
            p: 1,
            m: 1,
            ml: 3,
            mr: 3,
            justifyContent: 'space-evenly',
          }}
        >
          <Button
            color="primary"
            variant="outlined"
            onClick={hideColorPickerMenu}
            size="small"
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleConfirm} size="small">
            Confirm
          </Button>
        </Paper>
      </Popover>
    </Paper>
  )
}
