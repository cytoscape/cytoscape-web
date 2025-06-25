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
import { IdType } from '../../../models/IdType'
import { useTableStore } from '../../../store/TableStore'
import { Column } from '../../../models'
import { CustomGraphicsType } from '../../../models/VisualStyleModel'
import { DEFAULT_CUSTOM_GRAPHICS } from '../../../models/VisualStyleModel/impl/DefaultVisualStyle'

/** The shape of chart-specific properties */
export interface ChartProperties {
  cy_colorScheme: string
  cy_colors: string[]
  cy_dataColumns: string[]
  cy_startAngle: number         // start angle in degrees 0–360
  cy_holeSize?: number          // for ring charts, 0–1
}

/** Props for the editable chart form */
interface ChartGraphicFormProps {
  properties: ChartProperties
  onChange: (newProps: ChartProperties) => void
  currentNetworkId: IdType
  kind: 'PieChart' | 'RingChart'
}

// Expanded palettes (ColorBrewer-like)
const PALETTES: Record<string, string[]> = {
  Sequential1: [
    '#f7fdf6', '#e5f7e3', '#c5eec5', '#9ae1a1', '#60cf7c',
    '#00b962', '#009a49', '#006836',
  ],
  Sequential2: [
    '#f7fdf1', '#e0f6de', '#caefca', '#a2e4bb', '#69d6cb',
    '#0bbfdb', '#009ac9', '#0065ac',
  ],
  Sequential3: [
    '#fff8fc', '#f1e5f3', '#d6d7ea', '#aac6e1', '#aac6e2',
    '#009eca', '#009096', '#00735a',
  ],
  Sequential4: [
    '#fff8f4', '#ffe2e1', '#ffc8c6', '#ffa2bd', '#ff62ac',
    '#f700a4', '#ca008c', '#940085',
  ],
  Sequential5: [
    '#fff8ee', '#ffeacc', '#ffd7a3', '#ffbf89', '#ff8f5c',
    '#ff614a', '#f10011', '#b40000',
  ],
  Sequential6: [
    '#f7fdfd', '#e1eff6', '#c2d9ea', '#a1c5e1', '#95a1cf',
    '#9e73bd', '#9f41aa', '#860079',
  ],
  Sequential7: [
    '#ffffe7', '#fff8bf', '#ffe594', '#ffc847', '#ff9c00',
    '#ff6f00', '#e44500', '#a52300',
  ],
  Sequential8: [
    '#ffffcf', '#ffefa4', '#ffe594', '#ffb646', '#ff8f33',
    '#ff3b1e', '#fd000a', '#cc0026',
  ],
  Sequential9: [
    '#fff6f2', '#ffe2d6', '#ffbfa8', '#ff9478', '#ff654c',
    '#ff1126', '#e60012', '#b40000',
  ],
  Sequential10: [
    '#f9f5fa', '#ebe4f2', '#dfbfe0', '#da9ad0', '#f662bb',
    '#ff0097', '#e90060', '#ac0048',
  ],
  Sequential11: [
    '#fff6ed', '#ffe8d2', '#ffd3a8', '#ffb26e', '#ff8f33',
    '#ff6600', '#f13b00', '#a52300',
  ],
  Sequential12: [
    '#f7fcff', '#dfeef9', '#c8e1f2', '#9cd2e6', '#5fbade',
    '#19a0d0', '#007fc1', '#0050a2',
  ],
  Sequential13: [
    '#fdfcfd', '#f2eff7', '#dfdfef', '#c4c4e2', '#a9a4d1',
    '#8d88c5', '#7b59b0', '#5d0095',
  ],
  Sequential14: [
    '#ffffe7', '#f7fdbc', '#d8f4a7', '#a8e493', '#66d17f',
    '#00b962', '#009347', '#006836',
  ],
  Sequential15: [
    '#ffffff', '#f2f2f2', '#dedede', '#c5c5c5', '#a0a0a0',
    '#7e7e7e', '#5c5c5c', '#2a2a2a',
  ],
  Sequential16: [
    '#f7fdfd', '#e5f7fa', '#cbf0e9', '#91e0cf', '#47cdad',
    '#00bb7e', '#009a49', '#006623',
  ],
  Sequential17: [
    '#ffffdb', '#ecfab5', '#c5eeb9', '#6fd7c2', '#00c3cd',
    '#009fca', '#006bb5', '#003293',
  ],
  Sequential18: [
    '#fff8fc', '#f0eaf4', '#d6d7ea', '#aac6e1', '#6fb5d7',
    '#009eca', '#007ebc', '#005a89',
  ],

  Diverging: [
    '#ff0000', '#ff304d', '#ff939b', '#ffdddf', '#e0dfff',
    '#9e9cff', '#5750ff', '#1900ff',
  ],
  Diverging2: [
    '#cd002c', '#ed5e52', '#ffa989', '#ffdecc', '#d2e9f3',
    '#8ecee4', '#1ba1cd', '#0073b9',
  ],
  Diverging3: [
    '#ca5a00', '#f38600', '#ffbc64', '#ffe2bb', '#dddfef',
    '#bcb3da', '#8f7db8', '#682497',
  ],
  Diverging4: [
    '#8e2191', '#ac78b7', '#cfacd7', '#eed8ec', '#d8f3d7',
    '#a0e2a6', '#3bbb66', '#008739',
  ],
  Diverging5: [
    '#ee2957', '#ff6a43', '#ffb262', '#ffe38e', '#e5f89b',
    '#a6e4aa', '#47cdae', '#0096c8',
  ],
  Diverging6: [
    '#a15600', '#d18820', '#e8c882', '#faeac7', '#c5efe8',
    '#71d7c8', '#00a59a', '#007569',
  ],
  Diverging7: [
    '#00ffff', '#3AFFFF', '#74ffff', '#d7ffff', '#ffddff',
    '#ff92ff', '#ff29ff', '#ff00ff',
  ],
  Diverging8: [
    '#f10021', '#ff6a43', '#ffb262', '#ffe38e', '#d8f38e',
    '#a1e16b', '#4ac967', '#00a755',
  ],
  Diverging9: [
    '#e0008a', '#f378b8', '#febae0', '#ffe2f2', '#e6f7d4',
    '#b5e78a', '#75c739', '#35a002',
  ],
  Diverging10: [
    '#cd002c', '#ed5e52', '#ffa989', '#ffdecc', '#e4e4e4',
    '#c2c2c2', '#929292', '#575757',
  ],
  Diverging11: [
    '#f10021', '#ff6a43', '#ffb262', '#ffe393', '#e0f6f9',
    '#a8e0ed', '#6db8d9', '#3d82c0',
  ],
};

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
  const { cy_colorScheme, cy_colors, cy_dataColumns, cy_startAngle, cy_holeSize } = properties

  const tables = useTableStore((s) => s.tables)
  const nodeTable = tables[currentNetworkId]?.nodeTable

  // only keep numeric columns
  const availableColumns: string[] = React.useMemo(() => {
    if (!nodeTable || !nodeTable.rows) return []
    return nodeTable.columns
      .filter((col: Column) =>
        Array.from(nodeTable.rows.values()).every(row => typeof row[col.name] === 'number')
      )
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
      cy_colors: [...cy_colors, '#000000'],
    })

  const removeRow = (i: number) =>
    update({
      cy_dataColumns: cy_dataColumns.filter((_, idx) => idx !== i),
      cy_colors: cy_colors.filter((_, idx) => idx !== i),
    })

  const updateRow = (i: number, column: string, color: string) =>
    update({
      cy_dataColumns: cy_dataColumns.map((c, idx) =>
        idx === i ? column : c
      ),
      cy_colors: cy_colors.map((col, idx) =>
        idx === i ? color : col
      ),
    })

  // assign colors evenly based on palette
  const handlePaletteChange = (scheme: string) => {
    const base = PALETTES[scheme] || []
    const newColors = pickEvenly(base, cy_dataColumns.length)
    update({ cy_colorScheme: scheme, cy_colors: newColors })
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

      {/* Preview aligned with current properties: one swatch per property */}
      {cy_dataColumns.length > 0 && (
        <Box>
          <Typography variant="subtitle2">Segment Colors Preview</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            {cy_colors.map((col, idx) => (
              <Tooltip key={idx} title={col}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
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
      )}

      {/* Node Attributes & Colors */}
      <Typography variant="subtitle2">Node Attributes &amp; Colors</Typography>
      {cy_dataColumns.map((col, i) => {
        const options = availableColumns.filter(
          (c) => c === col || !cy_dataColumns.includes(c)
        )
        return (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
              value={cy_colors[i] || '#000000'}
              onChange={(e) => updateRow(i, col, e.target.value)}
              style={{ width: 32, height: 32, border: 0, padding: 0 }}
            />

            <IconButton
              size="small"
              onClick={() => removeRow(i)}
              disabled={cy_dataColumns.length <= 1}
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
        <Typography variant="subtitle2">Start Angle (degrees)</Typography>
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
      {kind === 'RingChart' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: 1 }}>
          <Typography variant="subtitle2">Hole Size (0–1)</Typography>
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
  const defaults: ChartProperties = {
    cy_colorScheme: '',
    cy_colors: [],
    cy_dataColumns: [],
    cy_startAngle: 0,
    cy_holeSize: 0.4,
  }
  const [kind, setKind] = React.useState<'PieChart' | 'RingChart'>('PieChart')
  const [pieProps, setPieProps] = React.useState<ChartProperties>(defaults)
  const [ringProps, setRingProps] = React.useState<ChartProperties>(defaults)
  const [step, setStep] = React.useState<0 | 1>(0)

  React.useEffect(() => {
    if (open) {
      // Determine initial kind
      const initialKind =
        initialValue?.name === 'org.cytoscape.RingChart' ? 'RingChart' : 'PieChart'
      setKind(initialKind)

      // Initialize pieProps
      if (initialValue?.name === 'org.cytoscape.PieChart') {
        const props = initialValue.properties as ChartProperties
        setPieProps({
          cy_colorScheme: props.cy_colorScheme ?? '',
          cy_colors: props.cy_colors ?? [],
          cy_dataColumns: props.cy_dataColumns ?? [],
          cy_startAngle: props.cy_startAngle ?? 0,
          cy_holeSize: props.cy_holeSize ?? 0.4,
        })
      } else {
        setPieProps(defaults)
      }

      // Initialize ringProps
      if (initialValue?.name === 'org.cytoscape.RingChart') {
        const props = initialValue.properties as ChartProperties
        setRingProps({
          cy_colorScheme: props.cy_colorScheme ?? '',
          cy_colors: props.cy_colors ?? [],
          cy_dataColumns: props.cy_dataColumns ?? [],
          cy_startAngle: props.cy_startAngle ?? 0,
          cy_holeSize: props.cy_holeSize ?? 0.4,
        })
      } else {
        setRingProps(defaults)
      }

      setStep(0)
    }
  }, [open])

  const currentProps = kind === 'PieChart' ? pieProps : ringProps
  const updateCurrent = (newProps: ChartProperties) =>
    kind === 'PieChart' ? setPieProps(newProps) : setRingProps(newProps)
  const isLastStep = step === 1

  // New handler to remove graphics and reset to defaults
  const handleRemoveGraphics = () => {
    setPieProps(defaults)
    setRingProps(defaults)
    setKind('PieChart')
    setStep(1)
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
            kind={kind}
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
            onClick={handleRemoveGraphics}
            disabled={step === 0}
          >
            Remove Graphics
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
                      ? 'org.cytoscape.PieChart'
                      : 'org.cytoscape.RingChart',
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
        {/* Customize summary display if desired */}
      </Typography>
    </Box>
  )
}