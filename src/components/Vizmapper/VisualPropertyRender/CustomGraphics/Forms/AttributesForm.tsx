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
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { IdType } from '../../../../../models/IdType'
import { useTableStore } from '../../../../../store/TableStore'
import { AttributeName } from '../../../../../models/TableModel/AttributeName'
import { ColorType } from '../../../../../models/VisualStyleModel/VisualPropertyValue'
import { ValueTypeName } from '../../../../../models/TableModel'
import { VALID_PIE_CHART_SLICE_INDEX_RANGE } from '../../../../../models/VisualStyleModel/impl/CustomGraphicsImpl'
import { StepGuidance } from '../WizardSteps/StepGuidance'
import { generateRandomColor } from '../utils/colorUtils'

interface AttributesFormProps {
  dataColumns: AttributeName[]
  colors: ColorType[]
  colorScheme: string
  currentNetworkId: IdType
  onUpdate: (dataColumns: AttributeName[], colors: ColorType[]) => void
  hideGuidance?: boolean
}

const DEFAULT_COLOR = '#000000' as ColorType

export const AttributesForm: React.FC<AttributesFormProps> = ({
  dataColumns,
  colors,
  colorScheme,
  currentNetworkId,
  onUpdate,
  hideGuidance = false,
}) => {
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
    return availableColumns.find((c) => !dataColumns.includes(c)) || ''
  }, [availableColumns, dataColumns])

  const addRow = () =>
    onUpdate(
      [...dataColumns, nextDefaultCol],
      [...colors, generateRandomColor()],
    )

  const removeRow = (i: number) =>
    onUpdate(
      dataColumns.filter((_, idx) => idx !== i),
      colors.filter((_, idx) => idx !== i),
    )

  const updateRow = (i: number, column: AttributeName, color: ColorType) =>
    onUpdate(
      dataColumns.map((c, idx) => (idx === i ? column : c)),
      colors.map((c, idx) => (idx === i ? color : c)),
    )

  const count = dataColumns.length

  const moveRow = (from: number, to: number) => {
    if (count <= 1) return
    const newCols = Array.from(dataColumns)
    const newColors = Array.from(colors)
    const [colMoved] = newCols.splice(from, 1)
    const [colorMoved] = newColors.splice(from, 1)
    newCols.splice(to, 0, colMoved)
    newColors.splice(to, 0, colorMoved)
    onUpdate(newCols, newColors)
  }

  const showGuidance = !hideGuidance && dataColumns.length === 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Show guidance when no attributes are configured */}
      {showGuidance && (
        <StepGuidance
          title="Getting Started"
          description={`Add up to ${VALID_PIE_CHART_SLICE_INDEX_RANGE[1]} node attributes to create chart slices. Click 'Add Node Attribute' to begin.`}
        />
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
            {dataColumns.length}
          </Typography>
          <Typography variant="caption">
            / {VALID_PIE_CHART_SLICE_INDEX_RANGE[1]} slices
          </Typography>
        </Box>
      </Box>

      {/* Column Headers */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '70px 1fr 32px 32px',
          gap: 0.5,
          alignItems: 'center',
          px: 0.75,
          py: 0.25,
          bgcolor: 'grey.50',
          borderRadius: 1,
          mb: 0.5,
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

      {dataColumns.map((col, i) => {
        const options = availableColumns.filter(
          (c) => c === col || !dataColumns.includes(c),
        )
        return (
          <Box
            key={i}
            sx={{
              display: 'grid',
              gridTemplateColumns: '70px 1fr 32px 32px',
              alignItems: 'center',
              p: 0.5,
              border: '1px solid #eee',
              borderRadius: 1,
            }}
          >
            {/* Slice Order with Up/Down arrows */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  bgcolor: 'grey.200',
                  color: 'text.secondary',
                  fontSize: '0.7rem',
                  fontWeight: 'medium',
                }}
              >
                {i + 1}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <IconButton
                  size="small"
                  onClick={() => moveRow(i, (i - 1 + count) % count)}
                  disabled={count <= 1}
                  sx={{ p: 0.25, minWidth: 20, height: 16 }}
                >
                  <ArrowUpwardIcon sx={{ fontSize: 12 }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => moveRow(i, (i + 1) % count)}
                  disabled={count <= 1}
                  sx={{ p: 0.25, minWidth: 20, height: 16 }}
                >
                  <ArrowDownwardIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Box>
            </Box>

            <FormControl
              size="small"
              sx={{ '& .MuiInputBase-root': { height: 32, width: 340 } }}
            >
              <Select
                labelId={`col-label-${i}`}
                value={col}
                onChange={(e: SelectChangeEvent<string>) =>
                  updateRow(i, e.target.value, colors[i] || '#000000')
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
              value={(colors[i] ?? DEFAULT_COLOR) as ColorType}
              onChange={(e) => updateRow(i, col, e.target.value as ColorType)}
              style={{
                width: 24,
                height: 24,
                border: 0,
                padding: 0,
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            />

            <IconButton
              size="small"
              onClick={() => removeRow(i)}
              disabled={count <= 1}
              sx={{ justifySelf: 'center', p: 0.5 }}
            >
              <DeleteIcon sx={{ fontSize: 16 }} />
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
            disabled={
              nextDefaultCol === '' ||
              dataColumns.length >= VALID_PIE_CHART_SLICE_INDEX_RANGE[1]
            }
            title={
              dataColumns.length >= VALID_PIE_CHART_SLICE_INDEX_RANGE[1]
                ? `Maximum of ${VALID_PIE_CHART_SLICE_INDEX_RANGE[1]} slices reached`
                : nextDefaultCol === ''
                  ? 'No more numeric attributes available to add'
                  : 'Add a numeric attribute to the chart'
            }
            sx={{ color: '#1976d2', textTransform: 'none' }}
          >
            {dataColumns.length >= VALID_PIE_CHART_SLICE_INDEX_RANGE[1]
              ? 'Maximum Slices Reached'
              : nextDefaultCol === ''
                ? 'No Attributes Available'
                : 'ADD NODE ATTRIBUTE'}
          </Button>
        </Box>

        {/* Show message when maximum slices reached */}
        {dataColumns.length >= VALID_PIE_CHART_SLICE_INDEX_RANGE[1] && (
          <StepGuidance
            title={`Maximum of ${VALID_PIE_CHART_SLICE_INDEX_RANGE[1]} slices reached`}
            description="You can remove existing attributes using the delete button (🗑️) to make room for different ones, or reorder them using the arrow buttons."
            variant="warning"
          />
        )}

        {/* Show helpful message when no numeric attributes are available */}
        {nextDefaultCol === '' &&
          availableColumns.length === 0 &&
          dataColumns.length < VALID_PIE_CHART_SLICE_INDEX_RANGE[1] && (
            <StepGuidance
              title="No numeric data available for charts"
              description="To create pie or ring charts, your network nodes need numeric attributes (columns with numbers). Currently, no numeric columns were found in the node table."
              variant="warning"
            />
          )}

        {/* Show message when some attributes exist but none are available to add */}
        {nextDefaultCol === '' &&
          availableColumns.length > 0 &&
          dataColumns.length < VALID_PIE_CHART_SLICE_INDEX_RANGE[1] && (
            <StepGuidance
              title="All available attributes are already added"
              description="You can remove existing attributes using the delete button (🗑️) to make room for different ones, or reorder them using the arrow buttons."
              variant="warning"
            />
          )}
      </Box>
    </Box>
  )
}
