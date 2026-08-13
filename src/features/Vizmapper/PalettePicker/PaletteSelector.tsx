import ChevronLeft from '@mui/icons-material/ChevronLeft'
import ChevronRight from '@mui/icons-material/ChevronRight'
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import React from 'react'

import {
  getPalettesByCategory,
  PALETTE_CATEGORY_LABELS,
  PALETTE_CATEGORY_ORDER,
} from '@/models/VisualStyleModel/impl/colorPalettes'
import { PaletteCategory } from '@/models/VisualStyleModel/VisualPropertyValue/ColorPalette'
import { PalettePreview } from './PalettePreview'
import { PaletteTooltip } from './PaletteTooltip'

/**
 * `strip` — one tall gradient per palette on a horizontal, scrolling row.
 * Reads as a continuous ramp, which is what a continuous mapping applies.
 *
 * `list` — one card per palette in a vertical, scrolling column, each showing
 * the discrete swatches. Reads as the N colors a chart will use.
 */
export type PaletteSelectorLayout = 'strip' | 'list'

export interface PaletteSelectorProps {
  /** Selected palette id, or '' for none. */
  value: string
  onChange: (paletteId: string) => void
  layout?: PaletteSelectorLayout
  /** Categories to offer as tabs. Defaults to every category in the table. */
  categories?: PaletteCategory[]
  /**
   * Category to open on. Following a later change lets a caller move the
   * selector to a data-driven recommendation (CW-460).
   */
  defaultCategory?: PaletteCategory
  /** Hide palettes explicitly marked `colorBlindSafe: false`. */
  colorBlindSafeOnly?: boolean
  /** Renders a "No palette" button in the header when provided. */
  onClear?: () => void
  /** Height of a strip preview. Ignored by the list layout. */
  previewHeight?: number
}

/**
 * The palette chooser behind every palette-picking surface in the Vizmapper:
 * category tabs over the one `metadata.category` taxonomy, then the palettes of
 * the active category in the requested layout.
 *
 * Both layouts scroll rather than clip, and the strip carries its own arrows —
 * a popover Paper is `overflow-x: hidden` and clamped to the viewport, so
 * anything wider is otherwise unreachable, and overlay scrollbars (macOS, iOS)
 * never advertise that scrolling is possible (#653).
 */
export function PaletteSelector({
  value,
  onChange,
  layout = 'list',
  categories = PALETTE_CATEGORY_ORDER,
  defaultCategory,
  colorBlindSafeOnly = false,
  onClear,
  previewHeight = 150,
}: PaletteSelectorProps): React.ReactElement {
  const initialCategory = defaultCategory ?? categories[0]
  const [category, setCategory] = React.useState<PaletteCategory>(
    categories.includes(initialCategory) ? initialCategory : categories[0],
  )

  // Follow the caller's recommendation whenever it changes (CW-460).
  React.useEffect(() => {
    if (defaultCategory != null && categories.includes(defaultCategory)) {
      setCategory(defaultCategory)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recommendation changes only; `categories` is a literal at every call site
  }, [defaultCategory])

  const palettes = React.useMemo(
    () => getPalettesByCategory(category, { colorBlindSafeOnly }),
    [category, colorBlindSafeOnly],
  )

  // Scroll state for the strip layout.
  const stripRef = React.useRef<HTMLDivElement | null>(null)
  const observerRef = React.useRef<ResizeObserver | null>(null)
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

  // A callback ref, not an effect: MUI's Portal mounts a popover body one
  // render after the parent's effects run, so an effect here would only ever
  // see a null strip. Watching the box also covers MUI measuring the Paper at
  // its full content width before clamping it to the viewport.
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

  // Switching category or filter changes the content width without resizing
  // the strip itself.
  React.useEffect(() => {
    readStripScroll()
  }, [palettes, readStripScroll])

  const scrollStrip = (direction: -1 | 1): void => {
    const el = stripRef.current
    if (el == null) return
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <Box
      data-testid="palette-selector"
      sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          minWidth: 0,
        }}
      >
        <Tabs
          data-testid="palette-category-tabs"
          value={category}
          onChange={(_event, next: PaletteCategory) => setCategory(next)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              textTransform: 'none',
            },
          }}
        >
          {categories.map((name) => (
            <Tab
              key={name}
              value={name}
              label={PALETTE_CATEGORY_LABELS[name]}
              data-testid={`palette-category-tab-${name}`}
              aria-label={`${PALETTE_CATEGORY_LABELS[name]} palettes`}
            />
          ))}
        </Tabs>
        {onClear != null && (
          <Button
            data-testid="palette-clear-button"
            size="small"
            variant="outlined"
            onClick={onClear}
            sx={{ flexShrink: 0, textTransform: 'none' }}
          >
            No palette
          </Button>
        )}
      </Box>

      {layout === 'strip' ? (
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
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
              // shows up during the gesture — hence the arrows.
              '&::-webkit-scrollbar': { height: 8 },
              '&::-webkit-scrollbar-thumb': {
                borderRadius: 4,
                backgroundColor: 'action.disabled',
              },
            }}
          >
            <ToggleButtonGroup
              value={value}
              onChange={(_event, next: string | null) => {
                if (next !== null) onChange(next)
              }}
              exclusive
              size="small"
              sx={{
                flexShrink: 0,
                '& .MuiToggleButton-root': { flexShrink: 0 },
              }}
            >
              {palettes.map(({ id, palette }) => (
                <ToggleButton
                  key={id}
                  value={id}
                  aria-label={palette.metadata.name}
                >
                  <PaletteTooltip palette={palette}>
                    <PalettePreview
                      palette={palette}
                      width={15}
                      height={previewHeight}
                      orientation="vertical"
                      showMetadata={false}
                    />
                  </PaletteTooltip>
                </ToggleButton>
              ))}
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
      ) : (
        <Box
          data-testid="palette-list"
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            px: 1,
            py: 0.5,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
              width: '100%',
              maxWidth: 300,
            }}
          >
            {palettes.map(({ id, palette }) => (
              <PaletteTooltip key={id} palette={palette}>
                <Card
                  data-testid={`palette-card-${id}`}
                  aria-label={palette.metadata.name}
                  // A Card is a div, so the button behaviour the strip layout
                  // gets from ToggleButton has to be spelled out here.
                  role="button"
                  tabIndex={0}
                  aria-pressed={value === id}
                  onClick={() => onChange(id)}
                  onKeyDown={(event: React.KeyboardEvent) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    // Space would otherwise scroll the list.
                    event.preventDefault()
                    onChange(id)
                  }}
                  sx={{
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: value === id ? 'primary.main' : 'divider',
                    outline: value === id ? '1px solid' : 'none',
                    outlineColor: 'primary.main',
                    transition: 'border-color 0.2s ease',
                    '&:hover': { borderColor: 'primary.main', boxShadow: 3 },
                  }}
                >
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <PalettePreview
                      palette={palette}
                      width={16}
                      height={20}
                      orientation="horizontal"
                      showMetadata={false}
                    />
                  </CardContent>
                </Card>
              </PaletteTooltip>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}
