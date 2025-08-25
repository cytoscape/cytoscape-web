import * as React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  SelectChangeEvent,
  TextField,
  Slider,
  Tooltip,
} from '@mui/material'
import PieChartIcon from '@mui/icons-material/PieChart'
import DonutLargeIcon from '@mui/icons-material/DonutLarge'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { IdType } from '../../../../models/IdType'
import { useTableStore } from '../../../../store/TableStore'
import { CustomGraphicsType } from '../../../../models/VisualStyleModel'
import { DEFAULT_CUSTOM_GRAPHICS } from '../../../../models/VisualStyleModel/impl/DefaultVisualStyle'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { CustomGraphicsNameType } from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { ValueTypeName } from '../../../../models/TableModel'
import {
  SequentialCustomGraphicColors,
  DivergingCustomGraphicColors,
  ViridisCustomGraphicColors,
} from '../../../../models/VisualStyleModel/impl/CustomColor'
import {
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { AttributeName } from '../../../../models/TableModel/AttributeName'
import { ColorType } from '../../../../models/VisualStyleModel/VisualPropertyValue'
import { PieChartRender as PieChartRenderComponent } from './PieChartRender'
import { RingChartRender as RingChartRenderComponent } from './RingChartRender'

/** The shape of chart-specific properties */
export type ChartKind =
  | typeof CustomGraphicsNameType.PieChart
  | typeof CustomGraphicsNameType.RingChart

/** Props for the editable chart form */
interface ChartGraphicFormProps {
  // only PieChart or RingChart properties ever arrive here
  properties: PieChartPropertiesType | RingChartPropertiesType

  // mirror the properties type in the callback
  onChange: (newProps: PieChartPropertiesType | RingChartPropertiesType) => void

  currentNetworkId: IdType

  // use the exact custom‐graphics name constants
  kind: ChartKind

  // Wizard step display options
  showOnlyAttributes?: boolean
  showOnlyPalette?: boolean
  showOnlyProperties?: boolean
  showPreview?: boolean
}
type ChartProperties = PieChartPropertiesType | RingChartPropertiesType
// Expanded palettes (ColorBrewer-like)
const PALETTES: Record<string, string[]> = {
  Sequential1: SequentialCustomGraphicColors[0],
  Sequential2: SequentialCustomGraphicColors[1],
  Sequential3: SequentialCustomGraphicColors[2],
  Sequential4: SequentialCustomGraphicColors[3],
  Sequential5: SequentialCustomGraphicColors[4],
  Sequential6: SequentialCustomGraphicColors[5],
  Sequential7: SequentialCustomGraphicColors[6],
  Sequential8: SequentialCustomGraphicColors[7],
  Sequential9: SequentialCustomGraphicColors[8],
  Sequential10: SequentialCustomGraphicColors[9],
  Sequential11: SequentialCustomGraphicColors[10],
  Sequential12: SequentialCustomGraphicColors[11],
  Sequential13: SequentialCustomGraphicColors[12],
  Sequential14: SequentialCustomGraphicColors[13],
  Sequential15: SequentialCustomGraphicColors[14],
  Sequential16: SequentialCustomGraphicColors[15],
  Sequential17: SequentialCustomGraphicColors[16],
  Sequential18: SequentialCustomGraphicColors[17],

  Diverging1: DivergingCustomGraphicColors[0],
  Diverging2: DivergingCustomGraphicColors[1],
  Diverging3: DivergingCustomGraphicColors[2],
  Diverging4: DivergingCustomGraphicColors[3],
  Diverging5: DivergingCustomGraphicColors[4],
  Diverging6: DivergingCustomGraphicColors[5],
  Diverging7: DivergingCustomGraphicColors[6],
  Diverging8: DivergingCustomGraphicColors[7],
  Diverging9: DivergingCustomGraphicColors[8],
  Diverging10: DivergingCustomGraphicColors[9],
  Diverging11: DivergingCustomGraphicColors[10],

  Viridis1: ViridisCustomGraphicColors[0],
  Viridis2: ViridisCustomGraphicColors[1],
  Viridis3: ViridisCustomGraphicColors[2],
  Viridis4: ViridisCustomGraphicColors[3],
}
const DEFAULT_COLOR = '#000000' as ColorType

function pickEvenly(base: string[], count: number): string[] {
  if (!base.length || count <= 0) return []
  const n = base.length
  if (count === 1) return [base[Math.floor((n - 1) / 2)]]
  if (count <= n) {
    return Array.from({ length: count }, (_, i) => {
      const idx = Math.round((i * (n - 1)) / (count - 1))
      return base[idx]
    })
  }
  return Array.from({ length: count }, (_, i) => base[i % n])
}

const ChartGraphicForm: React.FC<ChartGraphicFormProps> = ({
  properties,
  onChange,
  currentNetworkId,
  kind,
  showOnlyAttributes = false,
  showOnlyPalette = false,
  showOnlyProperties = false,
  showPreview = false,
}) => {
  const { cy_colorScheme, cy_colors, cy_dataColumns, cy_startAngle } =
    properties

  let cy_holeSize: number | undefined
  if (kind === CustomGraphicsNameType.RingChart) {
    cy_holeSize = (properties as RingChartPropertiesType).cy_holeSize
  }

  const tables = useTableStore((s) => s.tables)
  const nodeTable = tables[currentNetworkId]?.nodeTable

  // only keep numeric columns
  const availableColumns: string[] = React.useMemo(() => {
    if (!nodeTable?.rows) return []

    const rows = Array.from(nodeTable.rows.values())
    if (!rows.length) return []

    return nodeTable.columns
      .filter((col) => {
        const vals = rows.map((r) => r[col.name])
        const allInts = vals.every((v) => Number.isInteger(v))
        const allNums = vals.every((v) => typeof v === 'number')
        const vt = allInts
          ? ValueTypeName.Integer
          : allNums
            ? ValueTypeName.Double
            : null

        return (
          vt === ValueTypeName.Integer ||
          vt === ValueTypeName.Double ||
          vt === ValueTypeName.Long
        )
      })
      .map((col) => col.name)
  }, [nodeTable])
  // first unused numeric column or empty
  const nextDefaultCol = React.useMemo(() => {
    return availableColumns.find((c) => !cy_dataColumns.includes(c)) || ''
  }, [availableColumns, cy_dataColumns])

  const update = (patch: Partial<ChartProperties>) =>
    onChange({ ...properties, ...patch })

  const addRow = () =>
    update({
      cy_dataColumns: [...cy_dataColumns, nextDefaultCol],
      cy_colors: [...cy_colors, '#FFFFFF'],
    })

  const removeRow = (i: number) =>
    update({
      cy_dataColumns: cy_dataColumns.filter((_, idx) => idx !== i),
      cy_colors: cy_colors.filter((_, idx) => idx !== i),
    })

  const updateRow = (i: number, column: AttributeName, color: ColorType) =>
    update({
      cy_dataColumns: cy_dataColumns.map((c, idx) => (idx === i ? column : c)),
      cy_colors: cy_colors.map((c, idx) => (idx === i ? color : c)),
    })
  const count = cy_dataColumns.length

  const moveRow = (from: number, to: number) => {
    if (count <= 1) return
    const newCols = Array.from(cy_dataColumns)
    const newColors = Array.from(cy_colors)
    const [colMoved] = newCols.splice(from, 1)
    const [colorMoved] = newColors.splice(from, 1)
    newCols.splice(to, 0, colMoved)
    newColors.splice(to, 0, colorMoved)
    update({ cy_dataColumns: newCols, cy_colors: newColors })
  }
  // assign colors evenly based on palette
  const handlePaletteChange = (scheme: string) => {
    const base = PALETTES[scheme] ?? []
    const newColors = pickEvenly(base, cy_dataColumns.length) as ColorType[]

    update({
      cy_colorScheme: scheme,
      cy_colors: newColors,
    })
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
      {/* Step 1: Select Attributes - Show only attributes section */}
      {showOnlyAttributes && (
        <>
          {/* Show guidance when no attributes are configured */}
          {cy_dataColumns.length === 0 && (
            <Box
              sx={{
                p: 1.5,
                border: '1px solid',
                borderColor: 'grey.300',
                borderRadius: 1,
                bgcolor: 'grey.50',
                mb: 2,
              }}
            >
              <Typography
                variant="body2"
                sx={{ fontWeight: 'medium', mb: 0.5 }}
              >
                Step 1: Select Node Attributes
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
              >
                Choose which numeric attributes from your node table will be
                displayed in the{' '}
                {kind === CustomGraphicsNameType.PieChart
                  ? 'pie chart'
                  : 'ring chart'}
                . Each attribute will become a slice in your chart.
              </Typography>
            </Box>
          )}

          {/* Node Attributes & Colors */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle2">
              Node Attributes &amp; Colors
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: 'grey.100',
                color: 'text.secondary',
                fontSize: '0.75rem',
                fontWeight: 'medium',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                {cy_dataColumns.length}
              </Typography>
              <Typography variant="caption">
                / 16 slice{cy_dataColumns.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>

          {/* Column Headers */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '60px 40px 40px 1fr 40px 40px',
              gap: 1,
              alignItems: 'center',
              px: 1,
              py: 0.5,
              bgcolor: 'grey.50',
              borderRadius: 1,
              mb: 1,
            }}
          >
            <Tooltip title="Slice order determines which slice appears first in the chart">
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 'medium',
                  color: 'text.secondary',
                  cursor: 'help',
                }}
              >
                Order
              </Typography>
            </Tooltip>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 'medium',
                color: 'text.secondary',
                textAlign: 'center',
              }}
            >
              Up
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 'medium',
                color: 'text.secondary',
                textAlign: 'center',
              }}
            >
              Down
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontWeight: 'medium', color: 'text.secondary' }}
            >
              Node Attribute
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 'medium',
                color: 'text.secondary',
                textAlign: 'center',
              }}
            >
              Color
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 'medium',
                color: 'text.secondary',
                textAlign: 'center',
              }}
            >
              Remove
            </Typography>
          </Box>

          {cy_dataColumns.map((col, i) => {
            const options = availableColumns.filter(
              (c) => c === col || !cy_dataColumns.includes(c),
            )
            return (
              <Box
                key={i}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '60px 40px 40px 1fr 40px 40px',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  border: '1px solid #eee',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                {/* Slice Order */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: 'grey.200',
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    fontWeight: 'medium',
                  }}
                >
                  {i + 1}
                </Box>

                {/* Move Up with wrap */}
                <IconButton
                  size="small"
                  onClick={() => moveRow(i, (i - 1 + count) % count)}
                  disabled={count <= 1}
                  sx={{ justifySelf: 'center' }}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>

                {/* Move Down with wrap */}
                <IconButton
                  size="small"
                  onClick={() => moveRow(i, (i + 1) % count)}
                  disabled={count <= 1}
                  sx={{ justifySelf: 'center' }}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>

                <FormControl size="small">
                  <InputLabel id={`col-label-${i}`}>Node Attribute</InputLabel>
                  <Select
                    labelId={`col-label-${i}`}
                    value={col}
                    label="Node Attribute"
                    onChange={(e: SelectChangeEvent<string>) =>
                      updateRow(i, e.target.value, cy_colors[i] || '#000000')
                    }
                  >
                    {options.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <input
                  type="color"
                  value={(cy_colors[i] ?? DEFAULT_COLOR) as ColorType}
                  onChange={(e) =>
                    updateRow(i, col, e.target.value as ColorType)
                  }
                  style={{
                    width: 32,
                    height: 32,
                    border: 0,
                    padding: 0,
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                />

                <IconButton
                  size="small"
                  onClick={() => removeRow(i)}
                  disabled={count <= 1}
                  sx={{ justifySelf: 'center' }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )
          })}

          {/* Add Node Attribute button */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Button
                startIcon={<AddIcon />}
                size="small"
                onClick={addRow}
                disabled={nextDefaultCol === '' || cy_dataColumns.length >= 16}
                title={
                  cy_dataColumns.length >= 16
                    ? 'Maximum of 16 slices reached'
                    : nextDefaultCol === ''
                      ? 'No more numeric attributes available to add'
                      : 'Add a numeric attribute to the chart'
                }
              >
                {cy_dataColumns.length >= 16
                  ? 'Maximum Slices Reached'
                  : nextDefaultCol === ''
                    ? 'No Attributes Available'
                    : 'Add Node Attribute'}
              </Button>
            </Box>

            {/* Show message when maximum slices reached */}
            {cy_dataColumns.length >= 16 && (
              <Box
                sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'grey.300',
                  borderRadius: 1,
                  bgcolor: 'grey.50',
                  mb: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 'medium', mb: 0.5 }}
                >
                  Maximum of 16 slices reached
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
                >
                  You can remove existing attributes using the delete button
                  (🗑️) to make room for different ones, or reorder them using
                  the arrow buttons.
                </Typography>
              </Box>
            )}

            {/* Show helpful message when no numeric attributes are available */}
            {nextDefaultCol === '' &&
              availableColumns.length === 0 &&
              cy_dataColumns.length < 16 && (
                <Box
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    bgcolor: 'grey.50',
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 'medium', mb: 0.5 }}
                  >
                    No numeric data available for charts
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
                  >
                    To create pie or ring charts, your network nodes need
                    numeric attributes (columns with numbers). Currently, no
                    numeric columns were found in the node table.
                  </Typography>
                </Box>
              )}

            {/* Show message when some attributes exist but none are available to add */}
            {nextDefaultCol === '' &&
              availableColumns.length > 0 &&
              cy_dataColumns.length < 16 && (
                <Box
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    bgcolor: 'grey.50',
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 'medium', mb: 0.5 }}
                  >
                    All available attributes are already added
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
                  >
                    You can remove existing attributes using the delete button
                    (🗑️) to make room for different ones, or reorder them using
                    the arrow buttons.
                  </Typography>
                </Box>
              )}

            {/* Show available attributes count when there are some */}
            {availableColumns.length > 0 && (
              <Typography
                variant="caption"
                sx={{
                  textAlign: 'center',
                  color: 'text.secondary',
                  fontStyle: 'italic',
                }}
              >
                {availableColumns.length} numeric attribute
                {availableColumns.length !== 1 ? 's' : ''} available
              </Typography>
            )}
          </Box>
        </>
      )}

      {/* Step 2: Select Palette - Show only palette section */}
      {showOnlyPalette && (
        <>
          <Box
            sx={{
              p: 1.5,
              border: '1px solid',
              borderColor: 'grey.300',
              borderRadius: 1,
              bgcolor: 'grey.50',
              mb: 2,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>
              Step 2: Choose Color Palette
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
            >
              Select a color palette for your {cy_dataColumns.length} attribute
              {cy_dataColumns.length !== 1 ? 's' : ''}. The colors will be
              applied to each slice of your chart.
            </Typography>
          </Box>

          {/* Color Palette dropdown */}
          <Typography variant="subtitle2">Color Palette</Typography>
          <FormControl size="small">
            <InputLabel id="palette-label">Palette</InputLabel>
            <Select
              labelId="palette-label"
              value={cy_colorScheme}
              label="Palette"
              onChange={(e: SelectChangeEvent<string>) =>
                handlePaletteChange(e.target.value)
              }
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {Object.entries(PALETTES).map(([name, colors]) => (
                <MenuItem key={name} value={name}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                    }}
                  >
                    <Typography variant="body2">{name}</Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 0.5,
                        flexWrap: 'nowrap',
                        ml: 2,
                      }}
                    >
                      {colors.map((col) => (
                        <Tooltip key={col} title={col}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              bgcolor: col,
                              border: '1px solid',
                              borderColor: 'grey.400',
                              borderRadius: 0.5,
                            }}
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Show current colors preview */}
          {cy_colors.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Current Colors
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {cy_colors.map((color, index) => (
                  <Tooltip
                    key={index}
                    title={`${cy_dataColumns[index]}: ${color}`}
                  >
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        bgcolor: color,
                        border: '1px solid',
                        borderColor: 'grey.400',
                        borderRadius: 1,
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Box>
          )}
        </>
      )}

      {/* Step 3: Configure Properties - Show only properties section */}
      {showOnlyProperties && (
        <>
          <Box
            sx={{
              p: 1.5,
              border: '1px solid',
              borderColor: 'grey.300',
              borderRadius: 1,
              bgcolor: 'grey.50',
              mb: 2,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>
              Step 3: Configure Chart Properties
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
            >
              Adjust the start angle and{' '}
              {kind === CustomGraphicsNameType.RingChart
                ? 'hole size'
                : 'other properties'}{' '}
              for your chart.
            </Typography>
          </Box>

          {/* Start Angle slider/input */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="subtitle2">Start Angle (degrees)</Typography>
              <Tooltip title="0° → 3 o'clock; 90° → 12 o'clock; 180° → 9 o'clock; 270° → 6 o'clock">
                <InfoOutlinedIcon fontSize="small" color="action" />
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Slider
                value={cy_startAngle}
                min={0}
                max={360}
                step={1}
                valueLabelDisplay="auto"
                onChange={(_, newValue) => {
                  const vNum = Array.isArray(newValue) ? newValue[0] : newValue
                  update({ cy_startAngle: vNum })
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                type="number"
                value={cy_startAngle}
                onChange={(e) => {
                  let v = parseInt(e.target.value, 10)
                  if (isNaN(v)) v = 0
                  v = Math.max(0, Math.min(360, v))
                  update({ cy_startAngle: v })
                }}
                inputProps={{ min: 0, max: 360 }}
                size="small"
                sx={{ width: 80 }}
              />
            </Box>
          </Box>

          {/* Hole Size for RingChart only */}
          {kind === CustomGraphicsNameType.RingChart && (
            <Box
              sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: 1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="subtitle2">Hole Size (0–1)</Typography>
                <Tooltip title="0 → full pie (no hole); 1 → completely hollow (no chart)">
                  <InfoOutlinedIcon fontSize="small" color="action" />
                </Tooltip>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Slider
                  value={cy_holeSize ?? 0.4}
                  min={0}
                  max={1}
                  step={0.05}
                  valueLabelDisplay="auto"
                  onChange={(_, newValue) => {
                    const vNum = Array.isArray(newValue)
                      ? newValue[0]
                      : newValue
                    update({ cy_holeSize: vNum })
                  }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  type="number"
                  value={cy_holeSize ?? 0.4}
                  onChange={(e) => {
                    let v = parseFloat(e.target.value)
                    if (isNaN(v)) v = 0.4
                    v = Math.max(0, Math.min(1, v))
                    update({ cy_holeSize: v })
                  }}
                  inputProps={{ min: 0, max: 1, step: 0.05 }}
                  size="small"
                  sx={{ width: 80 }}
                />
              </Box>
            </Box>
          )}
        </>
      )}

      {/* Step 4: Preview - Show all sections with preview */}
      {showPreview && (
        <>
          <Box
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'success.main',
              borderRadius: 1,
              bgcolor: 'success.light',
              color: 'success.contrastText',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
              Preview & Finalize
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              Review your{' '}
              {kind === CustomGraphicsNameType.PieChart
                ? 'pie chart'
                : 'ring chart'}{' '}
              configuration. You can edit any section below before confirming.
            </Typography>
          </Box>

          {/* Show all sections for editing */}
          <Typography variant="subtitle2">
            Node Attributes &amp; Colors
          </Typography>
          {cy_dataColumns.map((col, i) => {
            const options = availableColumns.filter(
              (c) => c === col || !cy_dataColumns.includes(c),
            )
            return (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  border: '1px solid #eee',
                  borderRadius: 1,
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => moveRow(i, (i - 1 + count) % count)}
                  disabled={count <= 1}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => moveRow(i, (i + 1) % count)}
                  disabled={count <= 1}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
                <FormControl sx={{ flex: 1 }} size="small">
                  <InputLabel id={`col-label-${i}`}>Node Attribute</InputLabel>
                  <Select
                    labelId={`col-label-${i}`}
                    value={col}
                    label="Node Attribute"
                    onChange={(e: SelectChangeEvent<string>) =>
                      updateRow(i, e.target.value, cy_colors[i] || '#000000')
                    }
                  >
                    {options.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <input
                  type="color"
                  value={(cy_colors[i] ?? DEFAULT_COLOR) as ColorType}
                  onChange={(e) =>
                    updateRow(i, col, e.target.value as ColorType)
                  }
                  style={{ width: 32, height: 32, border: 0, padding: 0 }}
                />
                <IconButton
                  size="small"
                  onClick={() => removeRow(i)}
                  disabled={count <= 1}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )
          })}

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
            <Button
              startIcon={<AddIcon />}
              size="small"
              onClick={addRow}
              disabled={nextDefaultCol === ''}
            >
              Add Node Attribute
            </Button>
          </Box>

          <Typography variant="subtitle2">Color Palette</Typography>
          <FormControl size="small">
            <InputLabel id="palette-label">Palette</InputLabel>
            <Select
              labelId="palette-label"
              value={cy_colorScheme}
              label="Palette"
              onChange={(e: SelectChangeEvent<string>) =>
                handlePaletteChange(e.target.value)
              }
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {Object.entries(PALETTES).map(([name, colors]) => (
                <MenuItem key={name} value={name}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                    }}
                  >
                    <Typography variant="body2">{name}</Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 0.5,
                        flexWrap: 'nowrap',
                        ml: 2,
                      }}
                    >
                      {colors.map((col) => (
                        <Tooltip key={col} title={col}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              bgcolor: col,
                              border: '1px solid',
                              borderColor: 'grey.400',
                              borderRadius: 0.5,
                            }}
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="subtitle2">Start Angle (degrees)</Typography>
              <Tooltip title="0° → 3 o'clock; 90° → 12 o'clock; 180° → 9 o'clock; 270° → 6 o'clock">
                <InfoOutlinedIcon fontSize="small" color="action" />
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Slider
                value={cy_startAngle}
                min={0}
                max={360}
                step={1}
                valueLabelDisplay="auto"
                onChange={(_, newValue) => {
                  const vNum = Array.isArray(newValue) ? newValue[0] : newValue
                  update({ cy_startAngle: vNum })
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                type="number"
                value={cy_startAngle}
                onChange={(e) => {
                  let v = parseInt(e.target.value, 10)
                  if (isNaN(v)) v = 0
                  v = Math.max(0, Math.min(360, v))
                  update({ cy_startAngle: v })
                }}
                inputProps={{ min: 0, max: 360 }}
                size="small"
                sx={{ width: 80 }}
              />
            </Box>
          </Box>

          {kind === CustomGraphicsNameType.RingChart && (
            <Box
              sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: 1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="subtitle2">Hole Size (0–1)</Typography>
                <Tooltip title="0 → full pie (no hole); 1 → completely hollow (no chart)">
                  <InfoOutlinedIcon fontSize="small" color="action" />
                </Tooltip>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Slider
                  value={cy_holeSize ?? 0.4}
                  min={0}
                  max={1}
                  step={0.05}
                  valueLabelDisplay="auto"
                  onChange={(_, newValue) => {
                    const vNum = Array.isArray(newValue)
                      ? newValue[0]
                      : newValue
                    update({ cy_holeSize: vNum })
                  }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  type="number"
                  value={cy_holeSize ?? 0.4}
                  onChange={(e) => {
                    let v = parseFloat(e.target.value)
                    if (isNaN(v)) v = 0.4
                    v = Math.max(0, Math.min(1, v))
                    update({ cy_holeSize: v })
                  }}
                  inputProps={{ min: 0, max: 1, step: 0.05 }}
                  size="small"
                  sx={{ width: 80 }}
                />
              </Box>
            </Box>
          )}
        </>
      )}

      {/* Default: Show everything (for backward compatibility) */}
      {!showOnlyAttributes &&
        !showOnlyPalette &&
        !showOnlyProperties &&
        !showPreview && (
          <>
            {/* Show guidance when no attributes are configured */}
            {cy_dataColumns.length === 0 && (
              <Box
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'primary.main',
                  borderRadius: 1,
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 'medium', mb: 1 }}
                >
                  Getting Started
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                  To create a{' '}
                  {kind === CustomGraphicsNameType.PieChart
                    ? 'pie chart'
                    : 'ring chart'}
                  , you need to add numeric attributes from your node table.
                  Each attribute will become a slice in your chart. Click "Add
                  Node Attribute" below to get started.
                </Typography>
              </Box>
            )}

            {/* Color Palette dropdown */}
            <Typography variant="subtitle2">Color Palette</Typography>
            <FormControl size="small">
              <InputLabel id="palette-label">Palette</InputLabel>
              <Select
                labelId="palette-label"
                value={cy_colorScheme}
                label="Palette"
                onChange={(e: SelectChangeEvent<string>) =>
                  handlePaletteChange(e.target.value)
                }
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {Object.entries(PALETTES).map(([name, colors]) => (
                  <MenuItem key={name} value={name}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      <Typography variant="body2">{name}</Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 0.5,
                          flexWrap: 'nowrap',
                          ml: 2,
                        }}
                      >
                        {colors.map((col) => (
                          <Tooltip key={col} title={col}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                bgcolor: col,
                                border: '1px solid',
                                borderColor: 'grey.400',
                                borderRadius: 0.5,
                              }}
                            />
                          </Tooltip>
                        ))}
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Node Attributes & Colors */}
            <Typography variant="subtitle2">
              Node Attributes &amp; Colors
            </Typography>
            {cy_dataColumns.map((col, i) => {
              const options = availableColumns.filter(
                (c) => c === col || !cy_dataColumns.includes(c),
              )
              return (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    border: '1px solid #eee',
                    borderRadius: 1,
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => moveRow(i, (i - 1 + count) % count)}
                    disabled={count <= 1}
                  >
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => moveRow(i, (i + 1) % count)}
                    disabled={count <= 1}
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                  <FormControl sx={{ flex: 1 }} size="small">
                    <InputLabel id={`col-label-${i}`}>
                      Node Attribute
                    </InputLabel>
                    <Select
                      labelId={`col-label-${i}`}
                      value={col}
                      label="Node Attribute"
                      onChange={(e: SelectChangeEvent<string>) =>
                        updateRow(i, e.target.value, cy_colors[i] || '#000000')
                      }
                    >
                      {options.map((c) => (
                        <MenuItem key={c} value={c}>
                          {c}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <input
                    type="color"
                    value={(cy_colors[i] ?? DEFAULT_COLOR) as ColorType}
                    onChange={(e) =>
                      updateRow(i, col, e.target.value as ColorType)
                    }
                    style={{ width: 32, height: 32, border: 0, padding: 0 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => removeRow(i)}
                    disabled={count <= 1}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              )
            })}

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Button
                startIcon={<AddIcon />}
                size="small"
                onClick={addRow}
                disabled={nextDefaultCol === ''}
              >
                Add Node Attribute
              </Button>
            </Box>

            {/* Start Angle slider/input */}
            <Box
              sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: 1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="subtitle2">
                  Start Angle (degrees)
                </Typography>
                <Tooltip title="0° → 3 o'clock; 90° → 12 o'clock; 180° → 9 o'clock; 270° → 6 o'clock">
                  <InfoOutlinedIcon fontSize="small" color="action" />
                </Tooltip>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Slider
                  value={cy_startAngle}
                  min={0}
                  max={360}
                  step={1}
                  valueLabelDisplay="auto"
                  onChange={(_, newValue) => {
                    const vNum = Array.isArray(newValue)
                      ? newValue[0]
                      : newValue
                    update({ cy_startAngle: vNum })
                  }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  type="number"
                  value={cy_startAngle}
                  onChange={(e) => {
                    let v = parseInt(e.target.value, 10)
                    if (isNaN(v)) v = 0
                    v = Math.max(0, Math.min(360, v))
                    update({ cy_startAngle: v })
                  }}
                  inputProps={{ min: 0, max: 360 }}
                  size="small"
                  sx={{ width: 80 }}
                />
              </Box>
            </Box>

            {/* Hole Size for RingChart only */}
            {kind === CustomGraphicsNameType.RingChart && (
              <Box
                sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: 1 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="subtitle2">Hole Size (0–1)</Typography>
                  <Tooltip title="0 → full pie (no hole); 1 → completely hollow (no chart)">
                    <InfoOutlinedIcon fontSize="small" color="action" />
                  </Tooltip>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Slider
                    value={cy_holeSize ?? 0.4}
                    min={0}
                    max={1}
                    step={0.05}
                    valueLabelDisplay="auto"
                    onChange={(_, newValue) => {
                      const vNum = Array.isArray(newValue)
                        ? newValue[0]
                        : newValue
                      update({ cy_holeSize: vNum })
                    }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    type="number"
                    value={cy_holeSize ?? 0.4}
                    onChange={(e) => {
                      let v = parseFloat(e.target.value)
                      if (isNaN(v)) v = 0.4
                      v = Math.max(0, Math.min(1, v))
                      update({ cy_holeSize: v })
                    }}
                    inputProps={{ min: 0, max: 1, step: 0.05 }}
                    size="small"
                    sx={{ width: 80 }}
                  />
                </Box>
              </Box>
            )}
          </>
        )}
    </Box>
  )
}

/** Props for the multi-step wizard dialog */
interface CustomGraphicDialogProps {
  open: boolean
  initialValue: CustomGraphicsType | null
  currentNetworkId: IdType
  onCancel: () => void
  onConfirm: (value: CustomGraphicsType) => void
}

// Define the wizard steps
enum WizardStep {
  SelectType = 0,
  SelectAttributes = 1,
  SelectPalette = 2,
  ConfigureProperties = 3,
  Preview = 4,
}

/**
 * Multi-step wizard dialog for creating/editing custom graphics:
 * Step 0: Select chart type (Pie vs Ring)
 * Step 1: Select node attributes
 * Step 2: Choose color palette
 * Step 3: Configure properties (start angle, hole size)
 * Step 4: Preview and finalize
 */
export const CustomGraphicDialog: React.FC<CustomGraphicDialogProps> = ({
  open,
  initialValue,
  currentNetworkId,
  onCancel,
  onConfirm,
}) => {
  const defaultPieProps: PieChartPropertiesType = {
    cy_range: [0, 1],
    cy_colorScheme: '',
    cy_startAngle: 0,
    cy_colors: [] as ColorType[],
    cy_dataColumns: [] as AttributeName[],
  }

  const defaultRingProps: RingChartPropertiesType = {
    cy_range: [0, 1],
    cy_colorScheme: '',
    cy_startAngle: 0,
    cy_holeSize: 0.4,
    cy_colors: [] as ColorType[],
    cy_dataColumns: [] as AttributeName[],
  }

  // Determine initial state based on whether a custom graphic exists
  const hasExistingGraphic =
    initialValue && initialValue.name !== CustomGraphicsNameType.None

  // Initialize step: if existing graphic, go to preview; otherwise start at step 0
  const initialStep = hasExistingGraphic
    ? WizardStep.Preview
    : WizardStep.SelectType

  const [currentStep, setCurrentStep] = React.useState<WizardStep>(initialStep)
  const [kind, setKind] = React.useState<ChartKind>(
    CustomGraphicsNameType.PieChart,
  )
  const [pieProps, setPieProps] =
    React.useState<ChartProperties>(defaultPieProps)
  const [ringProps, setRingProps] =
    React.useState<ChartProperties>(defaultRingProps)

  const fullKind: ChartKind = kind

  React.useEffect(() => {
    if (!open) return

    // Determine initial kind
    const initialKind: ChartKind =
      initialValue?.name === CustomGraphicsNameType.RingChart
        ? CustomGraphicsNameType.RingChart
        : CustomGraphicsNameType.PieChart
    setKind(initialKind)

    // Initialize pieProps
    if (initialValue?.name === CustomGraphicsNameType.PieChart) {
      const pieInit = initialValue.properties as PieChartPropertiesType
      setPieProps({
        ...defaultPieProps,
        ...pieInit,
      })
    } else {
      setPieProps(defaultPieProps)
    }

    // Initialize ringProps
    if (initialValue?.name === CustomGraphicsNameType.RingChart) {
      const ringInit = initialValue.properties as RingChartPropertiesType
      setRingProps({
        ...defaultRingProps,
        ...ringInit,
      })
    } else {
      setRingProps(defaultRingProps)
    }

    // Set initial step based on whether we have an existing graphic
    const hasExistingGraphic =
      initialValue && initialValue.name !== CustomGraphicsNameType.None
    setCurrentStep(
      hasExistingGraphic ? WizardStep.Preview : WizardStep.SelectType,
    )
  }, [open, initialValue])

  const currentProps =
    kind === CustomGraphicsNameType.PieChart ? pieProps : ringProps
  const updateCurrent = (newProps: ChartProperties) =>
    kind === CustomGraphicsNameType.PieChart
      ? setPieProps(newProps)
      : setRingProps(newProps)
  const isLastStep = currentStep === WizardStep.Preview

  // Navigation functions
  const goToNextStep = () => {
    if (currentStep < WizardStep.Preview) {
      setCurrentStep(currentStep + 1)
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > WizardStep.SelectType) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (step: WizardStep) => {
    setCurrentStep(step)
  }

  // Helper function to get step title
  const getStepTitle = (step: WizardStep): string => {
    switch (step) {
      case WizardStep.SelectType:
        return 'Select Chart Type'
      case WizardStep.SelectAttributes:
        return 'Select Node Attributes'
      case WizardStep.SelectPalette:
        return 'Choose Color Palette'
      case WizardStep.ConfigureProperties:
        return 'Configure Chart Properties'
      case WizardStep.Preview:
        return 'Preview & Finalize'
      default:
        return 'Custom Graphics'
    }
  }

  // New handler to remove graphics and reset to defaults
  const handleRemoveCharts = () => {
    setPieProps(defaultPieProps)
    setRingProps(defaultRingProps)
    setKind(CustomGraphicsNameType.PieChart)
    setCurrentStep(WizardStep.SelectType)
    onConfirm(DEFAULT_CUSTOM_GRAPHICS)
  }

  // Render content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case WizardStep.SelectType:
        return renderSelectTypeStep()
      case WizardStep.SelectAttributes:
        return renderSelectAttributesStep()
      case WizardStep.SelectPalette:
        return renderSelectPaletteStep()
      case WizardStep.ConfigureProperties:
        return renderConfigurePropertiesStep()
      case WizardStep.Preview:
        return renderPreviewStep()
      default:
        return null
    }
  }

  // Step 0: Select chart type
  const renderSelectTypeStep = () => (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        py: 4,
      }}
    >
      {(
        [
          CustomGraphicsNameType.PieChart,
          CustomGraphicsNameType.RingChart,
        ] as const
      ).map((k) => {
        const selected = kind === k
        const Icon =
          k === CustomGraphicsNameType.PieChart ? PieChartIcon : DonutLargeIcon
        return (
          <Box
            key={k}
            onClick={() => setKind(k)}
            sx={{
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              p: 1,
              borderRadius: 2,
              border: selected ? 2 : 1,
              borderColor: selected ? 'primary.main' : 'grey.300',
              bgcolor: selected ? 'action.selected' : 'transparent',
              '&:hover': { opacity: 0.8 },
            }}
          >
            <Box
              sx={{
                width: 120,
                height: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <Icon sx={{ fontSize: 64 }} />
            </Box>
            <Typography fontSize="1rem">
              {k === CustomGraphicsNameType.PieChart
                ? 'Pie Chart'
                : 'Ring Chart'}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )

  // Step 1: Select node attributes
  const renderSelectAttributesStep = () => (
    <ChartGraphicForm
      properties={currentProps}
      onChange={updateCurrent}
      currentNetworkId={currentNetworkId}
      kind={fullKind}
      showOnlyAttributes={true}
    />
  )

  // Step 2: Select color palette
  const renderSelectPaletteStep = () => (
    <ChartGraphicForm
      properties={currentProps}
      onChange={updateCurrent}
      currentNetworkId={currentNetworkId}
      kind={fullKind}
      showOnlyPalette={true}
    />
  )

  // Step 3: Configure properties
  const renderConfigurePropertiesStep = () => (
    <ChartGraphicForm
      properties={currentProps}
      onChange={updateCurrent}
      currentNetworkId={currentNetworkId}
      kind={fullKind}
      showOnlyProperties={true}
    />
  )

  // Step 4: Preview and finalize
  const renderPreviewStep = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Chart Preview */}
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Chart Preview
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          {kind === CustomGraphicsNameType.PieChart ? (
            <PieChartRenderComponent
              properties={pieProps as PieChartPropertiesType}
              size={120}
              showLabels={true}
            />
          ) : (
            <RingChartRenderComponent
              properties={ringProps as RingChartPropertiesType}
              size={120}
              showLabels={true}
            />
          )}
        </Box>
      </Box>

      {/* Editable Form */}
      <ChartGraphicForm
        properties={currentProps}
        onChange={updateCurrent}
        currentNetworkId={currentNetworkId}
        kind={fullKind}
        showPreview={true}
      />
    </Box>
  )

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6">{getStepTitle(currentStep)}</Typography>
        <Button
          sx={{
            color: '#F50157',
            backgroundColor: 'transparent',
            '&:hover': {
              color: '#FFFFFF',
              backgroundColor: '#F50157',
            },
            '&:disabled': {
              backgroundColor: 'transparent',
            },
          }}
          disabled={
            currentStep === WizardStep.SelectType ||
            initialValue?.name === CustomGraphicsNameType.None
          }
          size="small"
          onClick={handleRemoveCharts}
        >
          Remove Chart
        </Button>
      </DialogTitle>

      <DialogContent dividers>{renderStepContent()}</DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            onClick={goToPreviousStep}
            disabled={currentStep === WizardStep.SelectType}
          >
            Back
          </Button>
        </Box>
        <Box>
          <Button onClick={onCancel} sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (isLastStep) {
                onConfirm({
                  ...DEFAULT_CUSTOM_GRAPHICS,
                  type: 'chart',
                  name: kind,
                  properties: currentProps,
                })
              } else {
                goToNextStep()
              }
            }}
          >
            {isLastStep ? 'Confirm' : 'Next'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}

/** Inline adapter for VisualPropertyValueForm */
export function CustomGraphicPicker(props: {
  currentValue: CustomGraphicsType | null
  onValueChange: (v: CustomGraphicsType) => void
  closePopover: (reason: string) => void
  currentNetworkId: IdType
}): React.ReactElement {
  const { currentValue, onValueChange, closePopover, currentNetworkId } = props

  return (
    <CustomGraphicDialog
      open={true}
      currentNetworkId={currentNetworkId}
      initialValue={currentValue}
      onCancel={() => closePopover('cancel')}
      onConfirm={(v) => {
        onValueChange(v)
        closePopover('confirm')
      }}
    />
  )
}

/** Read-only render of chart properties */
export function CustomGraphicRender(props: {
  value: CustomGraphicsType
}): React.ReactElement {
  const { value } = props

  // If no custom graphic or it's None type, show empty state
  if (!value || value.name === CustomGraphicsNameType.None) {
    return (
      <Box sx={{ p: 1, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No custom graphic configured
        </Typography>
      </Box>
    )
  }

  // Render pie chart
  if (value.name === CustomGraphicsNameType.PieChart) {
    const properties = value.properties as PieChartPropertiesType
    return (
      <Box
        sx={{
          p: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transform: 'translate(5px, 5px)',
        }}
      >
        <PieChartRenderComponent
          properties={properties}
          width={60}
          height={60}
          showLabels={true}
        />
      </Box>
    )
  }

  // Render ring chart
  if (value.name === CustomGraphicsNameType.RingChart) {
    const properties = value.properties as RingChartPropertiesType
    return (
      <Box
        sx={{
          p: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transform: 'translate(4px, 12px)',
        }}
      >
        <RingChartRenderComponent
          properties={properties}
          width={60}
          height={60}
          showLabels={true}
        />
      </Box>
    )
  }

  // Fallback for other types (like Image in the future)
  return (
    <Box sx={{ p: 1, textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        {value.name}
      </Typography>
    </Box>
  )
}
