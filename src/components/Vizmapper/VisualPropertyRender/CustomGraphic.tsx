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
import { IdType } from '../../../models/IdType'
import { useTableStore } from '../../../store/TableStore'
import { CustomGraphicsType } from '../../../models/VisualStyleModel'
import { DEFAULT_CUSTOM_GRAPHICS } from '../../../models/VisualStyleModel/impl/DefaultVisualStyle'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { CustomGraphicsNameType } from '../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { ValueTypeName } from '../../../models/TableModel'
import {
  SequentialCustomGraphicColors,
  DivergingCustomGraphicColors,
  ViridisCustomGraphicColors
} from '../../../models/VisualStyleModel/impl/CustomColor'
import {
  PieChartPropertiesType,
  RingChartPropertiesType
} from '../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { AttributeName } from '../../../models/TableModel/AttributeName'
import { ColorType } from '../../../models/VisualStyleModel/VisualPropertyValue'


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

};
const DEFAULT_COLOR = '#000000' as ColorType

function pickEvenly(base: string[], count: number): string[] {
  if (!base.length || count <= 0) return []
  const n = base.length
  if (count === 1) return [base[Math.floor((n - 1) / 2)]]
  if (count <= n) {
    return Array.from({ length: count }, (_, i) => {
      const idx = Math.round(i * (n - 1) / (count - 1))
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
}) => {
  const { cy_colorScheme, cy_colors, cy_dataColumns, cy_startAngle } = properties

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
      .filter(col => {
        const vals = rows.map(r => r[col.name])
        const allInts = vals.every(v => Number.isInteger(v))
        const allNums = vals.every(v => typeof v === 'number')
        const vt = allInts ? ValueTypeName.Integer
          : allNums ? ValueTypeName.Double
            : null

        return vt === ValueTypeName.Integer
          || vt === ValueTypeName.Double
          || vt === ValueTypeName.Long
      })
      .map(col => col.name)
  }, [nodeTable])
  // first unused numeric column or empty
  const nextDefaultCol = React.useMemo(() => {
    return availableColumns.find(c => !cy_dataColumns.includes(c)) || ''
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

  const updateRow = (
    i: number,
    column: AttributeName,
    color: ColorType
  ) =>
    update({
      cy_dataColumns: cy_dataColumns.map((c, idx) =>
        idx === i ? column : c
      ),
      cy_colors: cy_colors.map((c, idx) =>
        idx === i ? color : c
      ),
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
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'nowrap', ml: 2 }}>
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
      <Typography variant="subtitle2">Node Attributes &amp; Colors</Typography>
      {cy_dataColumns.map((col, i) => {
        const options = availableColumns.filter(
          (c) => c === col || !cy_dataColumns.includes(c)
        )
        return (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
            {/* Move Up with wrap */}
            <IconButton
              size="small"
              onClick={() => moveRow(i, (i - 1 + count) % count)}
              disabled={count <= 1}
            >
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>

            {/* Move Down with wrap */}
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
              // ensure the value is a ColorType

              value={(cy_colors[i] ?? DEFAULT_COLOR) as ColorType}
              onChange={e =>
                updateRow(
                  i,
                  col,
                  // cast the string from the input into ColorType
                  e.target.value as ColorType
                )
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


      {/* Moved "Add Node Attribute" button above Start Angle */}
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: 1 }}>
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="subtitle2">
              Hole Size (0–1)
            </Typography>
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
                const vNum = Array.isArray(newValue) ? newValue[0] : newValue
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
    </Box>
  )
}

/** Props for the two-step dialog */
interface CustomGraphicDialogProps {
  open: boolean
  initialValue: CustomGraphicsType | null
  currentNetworkId: IdType
  onCancel: () => void
  onConfirm: (value: CustomGraphicsType) => void
}

/**
 * Modal dialog centered on screen:
 * Step 1: pick Pie vs Ring
 * Step 2: configure chart via ChartGraphicForm
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

  const defaults =
    initialValue?.name === CustomGraphicsNameType.RingChart
      ? defaultRingProps
      : defaultPieProps
  const [kind, setKind] = React.useState<'PieChart' | 'RingChart'>('PieChart')
  const [pieProps, setPieProps] = React.useState<ChartProperties>(defaults)
  const [ringProps, setRingProps] = React.useState<ChartProperties>(defaults)
  const [step, setStep] = React.useState<0 | 1>(0)
  const fullKind: ChartKind = kind === 'RingChart'
    ? CustomGraphicsNameType.RingChart
    : CustomGraphicsNameType.PieChart

  React.useEffect(() => {
    if (!open) return

    // Determine initial kind
    const initialKind: 'PieChart' | 'RingChart' =
      initialValue?.name === CustomGraphicsNameType.RingChart
        ? 'RingChart'
        : 'PieChart'
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

    setStep(0)
  }, [open, initialValue])

  const currentProps = kind === 'PieChart' ? pieProps : ringProps
  const updateCurrent = (newProps: ChartProperties) =>
    kind === 'PieChart' ? setPieProps(newProps) : setRingProps(newProps)
  const isLastStep = step === 1

  // New handler to remove graphics and reset to defaults
  const handleRemoveCharts = () => {
    setPieProps(defaults)
    setRingProps(defaults)
    setKind('PieChart')
    setStep(1)
    onConfirm(DEFAULT_CUSTOM_GRAPHICS)
  }

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        {step === 0 ? 'Select Chart Type' : 'Configure Chart Properties'}
      </DialogTitle>

      <DialogContent dividers>
        {step === 0 ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              py: 4,
            }}
          >
            {(['PieChart', 'RingChart'] as const).map((k) => {
              const selected = kind === k
              const Icon = k === 'PieChart' ? PieChartIcon : DonutLargeIcon
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
                    {k === 'PieChart' ? 'Pie Chart' : 'Ring Chart'}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        ) : (
          <ChartGraphicForm
            properties={currentProps}
            onChange={updateCurrent}
            currentNetworkId={currentNetworkId}
            kind={fullKind}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            onClick={() => setStep((s) => (s > 0 ? (s - 1) as 0 | 1 : s))}
            disabled={step === 0}
          >
            Back
          </Button>
          <Button
            onClick={handleRemoveCharts}
            disabled={step === 0}
          >
            Remove Charts
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
                  name:
                    kind === 'PieChart'
                      ? CustomGraphicsNameType.PieChart
                      : CustomGraphicsNameType.RingChart,
                  properties: currentProps,
                })
              } else {
                setStep(1)
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
  return (
    <Box sx={{ p: 1, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      <Typography variant="body2">
        {/* This could render the custom graphic in the future */}
      </Typography>
    </Box>
  )
}