import React from 'react'
import {
  Box,
  Paper,
  Button,
  Popover,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from '@mui/material'
import Palette from '@mui/icons-material/Palette'
import {
  PALETTES,
  getColorBrewerPaletteColors,
} from '../../../../../models/VisualStyleModel/impl/colorPalettes'
import { PalettePreview } from './PalettePreview'
import { ColorType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/ColorType'

interface ColorPalettePickerProps {
  currentPaletteName: string
  onPaletteSelect: (
    minColor: ColorType,
    middleColor: ColorType,
    maxColor: ColorType,
    paletteName: string,
  ) => void
}

export function ColorPalettePicker({
  currentPaletteName,
  onPaletteSelect,
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

  const handleColorPalette = (
    event: React.MouseEvent<HTMLElement>,
    newColorPalette: string | null,
  ): void => {
    if (newColorPalette !== null) {
      setColorPalette(newColorPalette)
    }
  }

  const handleConfirm = (): void => {
    // Apply reverse logic: if reverse is checked, swap min and max
    const finalMin = isReverseColorChecked ? minPalette : maxPalette
    const finalMax = isReverseColorChecked ? maxPalette : minPalette
    onPaletteSelect(finalMin, middlePalette, finalMax, textPalette)
    hideColorPickerMenu()
  }

  return (
    <Paper
      sx={{
        display: 'flex',
        p: 1,
        m: 1,
        ml: 3,
        mr: 3,
        justifyContent: 'center',
        backgroundColor: '#fcfffc',
        color: '#595858',
      }}
    >
      Current Palette:&ensp;
      <Button
        onClick={showColorPickerMenu}
        variant="outlined"
        sx={{ color: '#63a5e8' }}
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
        <ToggleButtonGroup
          value={colorPalette}
          onChange={handleColorPalette}
          orientation="horizontal"
          exclusive
          fullWidth={true}
        >
          {Object.entries(PALETTES)
            .filter(([paletteId, palette]) => {
              // Only show ColorBrewer diverging palettes (those with min/middle/max)
              return (
                palette.metadata.category === 'diverging' &&
                palette.min &&
                palette.middle &&
                palette.max
              )
            })
            .map(([paletteId, palette]) => {
              const isColorBlindUnsafe =
                palette.metadata.colorBlindSafe === false
              if (isColorBlindUnsafe && isColorBlindChecked) {
                return null
              }
              const colors = getColorBrewerPaletteColors(paletteId)
              if (!colors) return null

              return (
                <ToggleButton
                  key={paletteId}
                  value={paletteId}
                  aria-label={palette.metadata.name}
                  onClick={() => {
                    setMinPalette(colors.min)
                    setMiddlePalette(colors.middle)
                    setMaxPalette(colors.max)
                    setTextPalette(colors.name)
                  }}
                >
                  <Tooltip
                    title={
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 'bold', mb: 0.5 }}
                        >
                          {palette.metadata.name}
                        </Typography>
                        {palette.metadata.description && (
                          <Typography
                            variant="caption"
                            sx={{ display: 'block', mb: 0.5 }}
                          >
                            {palette.metadata.description}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          Category: {palette.metadata.category}
                        </Typography>
                        {palette.metadata.colorBlindSafe !== false && (
                          <Typography
                            variant="caption"
                            sx={{ display: 'block', color: 'success.main' }}
                          >
                            Colorblind-safe
                          </Typography>
                        )}
                      </Box>
                    }
                    placement="right"
                  >
                    <PalettePreview
                      palette={palette}
                      width={15}
                      height={150}
                      orientation="vertical"
                      showMetadata={false}
                    />
                  </Tooltip>
                </ToggleButton>
              )
            })}
        </ToggleButtonGroup>

        <Paper
          sx={{
            display: 'flex',
            p: 1,
            m: 1,
            ml: 3,
            mr: 3,
            justifyContent: 'space-evenly',
            backgroundColor: '#fcfffc',
            color: '#595858',
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
            backgroundColor: '#fcfffc',
            color: '#595858',
          }}
        >
          <Button color="primary" onClick={hideColorPickerMenu} size="small">
            Cancel
          </Button>
          <Button
            sx={{
              color: '#FFFFFF',
              backgroundColor: '#337ab7',
              '&:hover': {
                backgroundColor: '#285a9b',
              },
            }}
            onClick={handleConfirm}
            size="small"
          >
            Confirm
          </Button>
        </Paper>
      </Popover>
    </Paper>
  )
}
