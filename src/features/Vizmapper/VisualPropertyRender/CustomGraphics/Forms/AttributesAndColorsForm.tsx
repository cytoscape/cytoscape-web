import * as React from 'react'
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  SelectChangeEvent,
  Button,
  Tooltip,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Alert,
  Popover,
  Tabs,
  Tab,
  Card,
  CardContent,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import PaletteIcon from '@mui/icons-material/Palette'
import { IdType } from '../../../../../models/IdType'
import { useTableStore } from '../../../../../data/hooks/stores/TableStore'
import { AttributeName } from '../../../../../models/TableModel/AttributeName'
import { ColorType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/ColorType'
import { generateRandomColor } from '../../../../../models/VisualStyleModel/impl/colorUtils'
import { getNumericColumnNames } from '../utils/numericColumnUtils'
import { CHART_CONSTANTS, COLORS } from '../utils/constants'
import { OrderControls, DataTableHeader, DataTableRow } from '../components'
import { PALETTES } from '../../../../../models/VisualStyleModel/impl/colorPalettes'
import { pickEvenly } from '../../../../../models/VisualStyleModel/impl/colorUtils'

interface AttributesAndColorsFormProps {
  dataColumns: AttributeName[]
  colors: ColorType[]
  colorScheme: string
  currentNetworkId: IdType
  onUpdate: (
    dataColumns: AttributeName[],
    colors: ColorType[],
    colorScheme: string,
  ) => void
}

type ColorMode = 'palette' | 'custom'

// Group palettes by type
const PALETTE_GROUPS = {
  Sequential: Object.keys(PALETTES).filter((key) =>
    key.startsWith('Sequential'),
  ),
  Diverging: Object.keys(PALETTES).filter((key) => key.startsWith('Diverging')),
  Viridis: Object.keys(PALETTES).filter((key) => key.startsWith('Viridis')),
} as const

export const AttributesAndColorsForm: React.FC<
  AttributesAndColorsFormProps
> = ({ dataColumns, colors, colorScheme, currentNetworkId, onUpdate }) => {
  const tables = useTableStore((s) => s.tables)
  const nodeTable = tables[currentNetworkId]?.nodeTable

  // Determine color mode based on current state
  const colorMode: ColorMode = colorScheme ? 'palette' : 'custom'

  // Available numeric columns
  const availableColumns: string[] = React.useMemo(() => {
    if (!nodeTable?.rows || !nodeTable?.columns) return []
    return getNumericColumnNames(nodeTable.columns, nodeTable.rows)
  }, [nodeTable])

  const nextDefaultCol = React.useMemo(() => {
    return availableColumns.find((c) => !dataColumns.includes(c)) || ''
  }, [availableColumns, dataColumns])

  // Palette selection state
  const [paletteAnchorEl, setPaletteAnchorEl] =
    React.useState<HTMLButtonElement | null>(null)
  const [activeTab, setActiveTab] = React.useState(0)
  const paletteOpen = Boolean(paletteAnchorEl)

  // Handle color mode change
  const handleColorModeChange = (mode: ColorMode) => {
    if (mode === 'palette') {
      // Switching to palette mode - clear individual colors, keep dataColumns
      onUpdate(dataColumns, [], '')
    } else {
      // Switching to custom mode - clear palette, generate random colors
      const newColors = dataColumns.map(() => generateRandomColor())
      onUpdate(dataColumns, newColors, '')
    }
  }

  // Handle palette selection
  const handlePaletteSelect = (scheme: string) => {
    const palette = PALETTES[scheme]
    const base = palette?.colors ?? []
    const newColors = pickEvenly(base, dataColumns.length) as ColorType[]
    onUpdate(dataColumns, newColors, scheme)
    setPaletteAnchorEl(null)
  }

  // Handle adding attribute
  const addRow = () => {
    const newCol = nextDefaultCol
    if (colorMode === 'palette' && colorScheme) {
      // If in palette mode, regenerate colors from palette
      const palette = PALETTES[colorScheme]
      const base = palette?.colors ?? []
      const newColors = pickEvenly(
        base,
        dataColumns.length + 1,
      ) as ColorType[]
      onUpdate([...dataColumns, newCol], newColors, colorScheme)
    } else {
      // Custom mode - add random color
      onUpdate(
        [...dataColumns, newCol],
        [...colors, generateRandomColor()],
        '',
      )
    }
  }

  // Handle removing attribute
  const removeRow = (i: number) => {
    if (colorMode === 'palette' && colorScheme) {
      // Regenerate colors from palette
      const palette = PALETTES[colorScheme]
      const base = palette?.colors ?? []
      const newColors = pickEvenly(
        base,
        dataColumns.length - 1,
      ) as ColorType[]
      onUpdate(
        dataColumns.filter((_, idx) => idx !== i),
        newColors,
        colorScheme,
      )
    } else {
      onUpdate(
        dataColumns.filter((_, idx) => idx !== i),
        colors.filter((_, idx) => idx !== i),
        '',
      )
    }
  }

  // Handle updating attribute
  const updateRow = (i: number, column: AttributeName, color?: ColorType) => {
    if (colorMode === 'palette' && colorScheme && !color) {
      // Regenerate from palette
      const palette = PALETTES[colorScheme]
      const base = palette?.colors ?? []
      const newColors = pickEvenly(base, dataColumns.length) as ColorType[]
      onUpdate(
        dataColumns.map((c, idx) => (idx === i ? column : c)),
        newColors,
        colorScheme,
      )
    } else {
      // Custom mode or explicit color change
      const newColor = color || colors[i] || COLORS.DEFAULT_FALLBACK
      onUpdate(
        dataColumns.map((c, idx) => (idx === i ? column : c)),
        colors.map((c, idx) => (idx === i ? newColor : c)),
        color ? '' : colorScheme, // Clear palette if custom color set
      )
    }
  }

  // Handle custom color change (switches to custom mode)
  const handleCustomColorChange = (i: number, column: AttributeName, color: ColorType) => {
    // Switch to custom mode when individual color is changed
    updateRow(i, column, color)
    if (colorMode === 'palette') {
      // This will trigger mode switch
      onUpdate(
        dataColumns,
        colors.map((c, idx) => (idx === i ? color : c)),
        '', // Clear palette
      )
    }
  }

  const count = dataColumns.length

  const moveRow = (from: number, to: number) => {
    if (count <= 1) return
    const newCols = Array.from(dataColumns)
    const newColors = Array.from(colors)
    const [colMoved] = newCols.splice(from, 1)
    const [colorMoved] = newColors.splice(from, 1)
    newCols.splice(to, 0, colMoved)
    newColors.splice(to, 0, colorMoved)
    onUpdate(newCols, newColors, colorScheme)
  }

  const tabNames = Object.keys(PALETTE_GROUPS)
  const currentPaletteKeys = Object.values(PALETTE_GROUPS)[activeTab]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Color Mode Selection */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
          Color Mode
        </Typography>
        <RadioGroup
          row
          value={colorMode}
          onChange={(e) => handleColorModeChange(e.target.value as ColorMode)}
        >
          <FormControlLabel
            value="palette"
            control={<Radio size="small" />}
            label="Color Palette"
          />
          <FormControlLabel
            value="custom"
            control={<Radio size="small" />}
            label="Custom Colors"
          />
        </RadioGroup>
        {colorMode === 'palette' && colorScheme && (
          <Chip
            label={colorScheme}
            size="small"
            color="primary"
            sx={{ mt: 1 }}
          />
        )}
      </Box>

      {/* Palette Selection (only in palette mode) */}
      {colorMode === 'palette' && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
            Select Color Palette
          </Typography>
          <Button
            variant="outlined"
            startIcon={<PaletteIcon />}
            onClick={(e) => setPaletteAnchorEl(e.currentTarget)}
            sx={{
              justifyContent: 'space-between',
              textTransform: 'none',
              minHeight: 40,
              width: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography>{colorScheme || 'No palette selected'}</Typography>
              {colorScheme && colors.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {colors.slice(0, 4).map((color, index) => (
                    <Box
                      key={index}
                      sx={{
                        width: 16,
                        height: 16,
                        bgcolor: color,
                        border: '1px solid',
                        borderColor: 'grey.400',
                        borderRadius: 0.5,
                      }}
                    />
                  ))}
                  {colors.length > 4 && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      +{colors.length - 4}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Button>

          <Popover
            open={paletteOpen}
            anchorEl={paletteAnchorEl}
            onClose={() => setPaletteAnchorEl(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            PaperProps={{
              sx: {
                maxWidth: 500,
                width: 500,
                height: 600,
                overflow: 'hidden',
              },
            }}
          >
            <Box
              sx={{
                p: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="subtitle1" sx={{ fontSize: '0.9rem' }}>
                  Select Color Palette
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handlePaletteSelect('')}
                  sx={{
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    borderColor: !colorScheme ? COLORS.PRIMARY : COLORS.BORDER,
                    color: !colorScheme ? COLORS.PRIMARY : 'inherit',
                  }}
                >
                  No Palette
                </Button>
              </Box>

              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                variant="fullWidth"
                sx={{
                  mb: 2,
                  '& .MuiTab-root': {
                    fontSize: '0.8rem',
                    textTransform: 'none',
                    minHeight: 32,
                  },
                }}
              >
                {tabNames.map((tabName) => (
                  <Tab key={tabName} label={tabName} />
                ))}
              </Tabs>

              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: 300,
                  }}
                >
                  {currentPaletteKeys.map((paletteKey) => {
                    const palette = PALETTES[paletteKey]
                    if (!palette) return null
                    const paletteColors = palette.colors
                    return (
                      <Card
                        key={paletteKey}
                        sx={{
                          cursor: 'pointer',
                          border:
                            colorScheme === paletteKey
                              ? `2px solid ${COLORS.PRIMARY}`
                              : `1px solid ${COLORS.BORDER}`,
                          '&:hover': {
                            borderColor: COLORS.PRIMARY,
                            boxShadow: 3,
                            transform: 'translateY(-2px)',
                          },
                          transition: 'all 0.2s ease',
                          width: '100%',
                        }}
                        onClick={() => handlePaletteSelect(paletteKey)}
                      >
                        <CardContent
                          sx={{
                            p: 0.5,
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'center',
                              height: 16,
                              borderRadius: 1,
                              overflow: 'hidden',
                              gap: 0.5,
                            }}
                          >
                            {paletteColors.map((color, index) => (
                              <Tooltip key={index} title={color}>
                                <Box
                                  sx={{
                                    width: 16,
                                    height: 16,
                                    bgcolor: color,
                                    border: '1px solid',
                                    borderColor: 'grey.400',
                                    borderRadius: 0.5,
                                    '&:hover': {
                                      opacity: 0.8,
                                    },
                                  }}
                                />
                              </Tooltip>
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    )
                  })}
                </Box>
              </Box>
            </Box>
          </Popover>
        </Box>
      )}

      {/* Attributes Table */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Node Attributes
          </Typography>
          <Chip
            label={`${dataColumns.length} / ${CHART_CONSTANTS.MAX_SLICES}`}
            size="small"
            color={dataColumns.length > 0 ? 'primary' : 'default'}
          />
        </Box>

        {dataColumns.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Add at least one numeric attribute to create chart slices.
          </Alert>
        )}

        {dataColumns.length > 0 && (
          <>
            <DataTableHeader
              columns={[
                {
                  label: 'Order',
                  tooltip:
                    'Slice order determines which slice appears first in the chart',
                  width: '70px',
                },
                { label: 'Node Attribute', width: '1fr' },
                { label: 'Color', width: '40px', align: 'center' },
                { label: 'Remove', width: '40px', align: 'center' },
              ]}
            />

            {dataColumns.map((col, i) => {
              const options = availableColumns.filter(
                (c) => c === col || !dataColumns.includes(c),
              )
              return (
                <DataTableRow key={i} columns={['70px', '1fr', '40px', '40px']}>
                  <OrderControls
                    order={i + 1}
                    total={count}
                    onMoveUp={() => moveRow(i, (i - 1 + count) % count)}
                    onMoveDown={() => moveRow(i, (i + 1) % count)}
                    disabled={count <= 1}
                  />

                  <FormControl
                    size="small"
                    sx={{ '& .MuiInputBase-root': { height: 32, width: '100%' } }}
                  >
                    <Select
                      labelId={`col-label-${i}`}
                      value={col}
                      onChange={(e: SelectChangeEvent<string>) =>
                        updateRow(i, e.target.value)
                      }
                    >
                      {options.map((c) => (
                        <MenuItem key={c} value={c}>
                          {c}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {colorMode === 'custom' && (
                    <Tooltip title={`Click to change color for ${col}`}>
                      <input
                        type="color"
                        value={(colors[i] ?? COLORS.DEFAULT_FALLBACK) as ColorType}
                        onChange={(e) =>
                          handleCustomColorChange(i, col, e.target.value as ColorType)
                        }
                        style={{
                          width: 32,
                          height: 32,
                          border: '1px solid',
                          borderColor: '#e0e0e0',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      />
                    </Tooltip>
                  )}
                  {colorMode === 'palette' && (
                    <Tooltip title={`Color from palette: ${colorScheme}`}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: colors[i] || COLORS.DEFAULT,
                          border: '1px solid',
                          borderColor: 'grey.400',
                          borderRadius: 1,
                        }}
                      />
                    </Tooltip>
                  )}

                  <IconButton
                    size="small"
                    onClick={() => removeRow(i)}
                    disabled={count <= 1}
                    sx={{ p: 0.5 }}
                  >
                    <DeleteIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </DataTableRow>
              )
            })}
          </>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button
            startIcon={<AddIcon />}
            size="small"
            onClick={addRow}
            disabled={
              nextDefaultCol === '' ||
              dataColumns.length >= CHART_CONSTANTS.MAX_SLICES
            }
            title={
              dataColumns.length >= CHART_CONSTANTS.MAX_SLICES
                ? `Maximum of ${CHART_CONSTANTS.MAX_SLICES} slices reached`
                : nextDefaultCol === ''
                  ? 'No more numeric attributes available to add'
                  : 'Add a numeric attribute to the chart'
            }
            sx={{ textTransform: 'none' }}
          >
            {dataColumns.length >= CHART_CONSTANTS.MAX_SLICES
              ? 'Maximum Slices Reached'
              : nextDefaultCol === ''
                ? 'No Attributes Available'
                : 'Add Node Attribute'}
          </Button>
        </Box>

        {dataColumns.length >= CHART_CONSTANTS.MAX_SLICES && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Maximum of {CHART_CONSTANTS.MAX_SLICES} slices reached. Remove
            existing attributes to add different ones.
          </Alert>
        )}

        {nextDefaultCol === '' &&
          availableColumns.length === 0 &&
          dataColumns.length === 0 && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              No numeric data available for charts. Your network nodes need
              numeric attributes (columns with numbers) to create charts.
            </Alert>
          )}
      </Box>
    </Box>
  )
}

