import ChevronLeft from '@mui/icons-material/ChevronLeft'
import ChevronRight from '@mui/icons-material/ChevronRight'
import Palette from '@mui/icons-material/Palette'
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  IconButton,
  Paper,
  Popover,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import React from 'react'

import {
  getPaletteGradientColors,
  PALETTES,
} from '../../../../../models/VisualStyleModel/impl/colorPalettes'
import { ColorType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/ColorType'
import { PalettePreview } from './PalettePreview'

type PaletteCategory = 'sequential' | 'diverging'

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
  const [category, setCategory] =
    React.useState<PaletteCategory>(recommendedCategory)
  const [isColorBlindChecked, setIsColorBlindChecked] = React.useState(false)
  const [isReverseColorChecked, setIsReverseColorChecked] =
    React.useState(false)
  const [colorPalette, setColorPalette] = React.useState('')
  const [minPalette, setMinPalette] = React.useState<ColorType>('#000000')
  const [middlePalette, setMiddlePalette] = React.useState<ColorType>('#ffffff')
  const [maxPalette, setMaxPalette] = React.useState<ColorType>('#000000')
  const [textPalette, setTextPalette] = React.useState('None')

  // Follow the data-driven recommendation whenever it changes (CW-460).
  React.useEffect(() => {
    setCategory(recommendedCategory)
  }, [recommendedCategory])

  const showColorPickerMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setAnchorEl(event.currentTarget)
  }

  const handleCategoryChange = (
    _event: React.MouseEvent<HTMLElement>,
    newCategory: PaletteCategory | null,
  ): void => {
    if (newCategory !== null) {
      setCategory(newCategory)
    }
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

  // Scroll state for the palette strip. Overlay scrollbars (macOS, iOS) stay
  // invisible until a gesture starts, so the strip needs its own arrows to
  // show that there is more to the right (#653).
  const stripRef = React.useRef<HTMLDivElement | null>(null)
  const [stripScroll, setStripScroll] = React.useState({
    overflowing: false,
    atStart: true,
    atEnd: false,
  })

  const readStripScroll = React.useCallback((): void => {
    const el = stripRef.current
    if (el == null) return
    const maxScrollLeft = el.scrollWidth - el.clientWidth
    setStripScroll({
      overflowing: maxScrollLeft > 1,
      atStart: el.scrollLeft <= 1,
      atEnd: el.scrollLeft >= maxScrollLeft - 1,
    })
  }, [])

  // A callback ref, not an effect: MUI's Portal mounts the popover body one
  // render after the parent's effects run, so an effect here would only ever
  // see a null strip. Watching the box also covers MUI measuring the Paper at
  // its full content width before clamping it to the viewport.
  const observerRef = React.useRef<ResizeObserver | null>(null)
  const attachStrip = React.useCallback(
    (el: HTMLDivElement | null): void => {
      observerRef.current?.disconnect()
      observerRef.current = null
      stripRef.current = el
      if (el == null) return
      readStripScroll()
      if (typeof ResizeObserver === 'undefined') return
      observerRef.current = new ResizeObserver(readStripScroll)
      observerRef.current.observe(el)
    },
    [readStripScroll],
  )

  // Filtering by category or colorblind safety changes the content width
  // without resizing the strip itself.
  React.useEffect(() => {
    readStripScroll()
  }, [category, isColorBlindChecked, readStripScroll])

  const scrollStrip = (direction: -1 | 1): void => {
    const el = stripRef.current
    if (el == null) return
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
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
        <Box sx={{ display: 'flex', justifyContent: 'center', pb: 1 }}>
          <ToggleButtonGroup
            value={category}
            onChange={handleCategoryChange}
            exclusive
            size="small"
          >
            <ToggleButton value="sequential" aria-label="sequential palettes">
              Sequential
            </ToggleButton>
            <ToggleButton value="diverging" aria-label="diverging palettes">
              Diverging
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        {/*
          The Popover Paper is `overflow-x: hidden` with a
          `max-width: calc(100% - 32px)` clamp, so the palette strip has to
          scroll itself. Without this container the palettes past the viewport
          edge are clipped and unreachable below ~760px of width (#653).
        */}
        <Box sx={{ display: 'flex', alignItems: 'center', maxWidth: '100%' }}>
          {stripScroll.overflowing && (
            <IconButton
              data-testid="palette-scroll-left"
              aria-label="scroll palettes left"
              size="small"
              disabled={stripScroll.atStart}
              onClick={() => scrollStrip(-1)}
            >
              <ChevronLeft />
            </IconButton>
          )}
          <Box
            data-testid="palette-strip"
            ref={attachStrip}
            onScroll={readStripScroll}
            sx={{
              display: 'flex',
              maxWidth: '100%',
              overflowX: 'auto',
              overflowY: 'hidden',
              px: 1,
              // Slim the track down on the platforms that reserve space for a
              // scrollbar. macOS uses overlay scrollbars, so there it only
              // shows up during the gesture — hence the arrows above.
              '&::-webkit-scrollbar': { height: 8 },
              '&::-webkit-scrollbar-thumb': {
                borderRadius: 4,
                backgroundColor: 'action.disabled',
              },
            }}
          >
            <ToggleButtonGroup
              value={colorPalette}
              onChange={handleColorPalette}
              orientation="horizontal"
              exclusive
              size="small"
              sx={{
                flexShrink: 0,
                '& .MuiToggleButton-root': { flexShrink: 0 },
              }}
            >
              {Object.entries(PALETTES)
                .filter(([, palette]) => {
                  // Show palettes matching the selected category (CW-460).
                  return palette.metadata.category === category
                })
                .map(([paletteId, palette]) => {
                  const isColorBlindUnsafe =
                    palette.metadata.colorBlindSafe === false
                  if (isColorBlindUnsafe && isColorBlindChecked) {
                    return null
                  }
                  const colors = getPaletteGradientColors(paletteId)
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
                            <Typography
                              variant="caption"
                              sx={{ display: 'block' }}
                            >
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
          </Box>
          {stripScroll.overflowing && (
            <IconButton
              data-testid="palette-scroll-right"
              aria-label="scroll palettes right"
              size="small"
              disabled={stripScroll.atEnd}
              onClick={() => scrollStrip(1)}
            >
              <ChevronRight />
            </IconButton>
          )}
        </Box>

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
