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

const ChartGraphicForm: React.FC<ChartGraphicFormProps> = ({
  properties,
  onChange,
  currentNetworkId,
  kind,
}) => {
  const { cy_colors, cy_dataColumns, cy_startAngle, cy_holeSize } = properties

  const tables = useTableStore((s) => s.tables)
  const nodeTable = tables[currentNetworkId]?.nodeTable
  const availableColumns: string[] = nodeTable
    ? nodeTable.columns.map((col: Column) => col.name)
    : []

  const update = (patch: Partial<ChartProperties>) =>
    onChange({ ...properties, ...patch })

  // pick the first unused column, or empty
  const nextDefaultCol = React.useMemo(() => {
    return availableColumns.find((c) => !cy_dataColumns.includes(c)) || ''
  }, [availableColumns, cy_dataColumns])

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
      <Typography variant="subtitle2">Node Attributes &amp; Colors</Typography>

      {cy_dataColumns.map((col, i) => {
        const options = availableColumns.filter(
          (c) => c === col || !cy_dataColumns.includes(c)
        )
        return (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl sx={{ flex: 1 }}>
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

      {/* Centered, labeled “add” button */}
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
      // Compute initial kind
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
  }, [open]) // only run when open changes

  const currentProps = kind === 'PieChart' ? pieProps : ringProps
  const updateCurrent = (newProps: ChartProperties) =>
    kind === 'PieChart' ? setPieProps(newProps) : setRingProps(newProps)

  const isLastStep = step === 1

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
        <Button
          onClick={() => setStep((s) => (s > 0 ? (s - 1) as 0 | 1 : s))}
          disabled={step === 0}
        >
          Back
        </Button>

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
      </Typography>
    </Box>
  )
}