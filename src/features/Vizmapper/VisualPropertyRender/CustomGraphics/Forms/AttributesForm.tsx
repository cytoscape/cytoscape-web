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
import { IdType } from '../../../../../models/IdType'
import { useTableStore } from '../../../../../data/hooks/stores/TableStore'
import { AttributeName } from '../../../../../models/TableModel/AttributeName'
import { ColorType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/ColorType'
import { StepGuidance } from '../WizardSteps/StepGuidance'
import { generateRandomColor } from '../utils/colorUtils'
import { getNumericColumnNames } from '../utils/numericColumnUtils'
import { CHART_CONSTANTS, COLORS } from '../utils/constants'
import { OrderControls, DataTableHeader, DataTableRow } from '../components'

interface AttributesFormProps {
  dataColumns: AttributeName[]
  colors: ColorType[]
  colorScheme: string
  currentNetworkId: IdType
  onUpdate: (dataColumns: AttributeName[], colors: ColorType[]) => void
  hideGuidance?: boolean
}

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
    if (!nodeTable?.rows || !nodeTable?.columns) return []
    return getNumericColumnNames(nodeTable.columns, nodeTable.rows)
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
          description={`Add up to ${CHART_CONSTANTS.MAX_SLICES} node attributes to create chart slices. Click 'Add Node Attribute' to begin.`}
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
            / {CHART_CONSTANTS.MAX_SLICES} slices
          </Typography>
        </Box>
      </Box>

      {/* Column Headers */}
      <DataTableHeader
        columns={[
          {
            label: 'Order',
            tooltip:
              'Slice order determines which slice appears first in the chart',
            width: '70px',
          },
          { label: 'Node Attribute', width: '1fr' },
          { label: 'Color', width: '32px', align: 'center' },
          { label: 'Remove', width: '32px', align: 'center' },
        ]}
      />

      {dataColumns.map((col, i) => {
        const options = availableColumns.filter(
          (c) => c === col || !dataColumns.includes(c),
        )
        return (
          <DataTableRow key={i} columns={['70px', '1fr', '32px', '32px']}>
            {/* Slice Order with Up/Down arrows */}
            <OrderControls
              order={i + 1}
              total={count}
              onMoveUp={() => moveRow(i, (i - 1 + count) % count)}
              onMoveDown={() => moveRow(i, (i + 1) % count)}
              disabled={count <= 1}
            />

            <FormControl
              size="small"
              sx={{ '& .MuiInputBase-root': { height: 32, width: 340 } }}
            >
              <Select
                labelId={`col-label-${i}`}
                value={col}
                onChange={(e: SelectChangeEvent<string>) =>
                  updateRow(
                    i,
                    e.target.value,
                    colors[i] || COLORS.DEFAULT_FALLBACK,
                  )
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
              value={(colors[i] ?? COLORS.DEFAULT_FALLBACK) as ColorType}
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
          </DataTableRow>
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
              dataColumns.length >= CHART_CONSTANTS.MAX_SLICES
            }
            title={
              dataColumns.length >= CHART_CONSTANTS.MAX_SLICES
                ? `Maximum of ${CHART_CONSTANTS.MAX_SLICES} slices reached`
                : nextDefaultCol === ''
                  ? 'No more numeric attributes available to add'
                  : 'Add a numeric attribute to the chart'
            }
            sx={{ color: '#1976d2', textTransform: 'none' }}
          >
            {dataColumns.length >= CHART_CONSTANTS.MAX_SLICES
              ? 'Maximum Slices Reached'
              : nextDefaultCol === ''
                ? 'No Attributes Available'
                : 'ADD NODE ATTRIBUTE'}
          </Button>
        </Box>

        {/* Show message when maximum slices reached */}
        {dataColumns.length >= CHART_CONSTANTS.MAX_SLICES && (
          <StepGuidance
            title={`Maximum of ${CHART_CONSTANTS.MAX_SLICES} slices reached`}
            description="You can remove existing attributes using the delete button (🗑️) to make room for different ones, or reorder them using the arrow buttons."
            variant="warning"
          />
        )}

        {/* Show helpful message when no numeric attributes are available */}
        {nextDefaultCol === '' &&
          availableColumns.length === 0 &&
          dataColumns.length === 0 &&
          dataColumns.length < CHART_CONSTANTS.MAX_SLICES && (
            <StepGuidance
              title="No numeric data available for charts"
              description="To create pie or ring charts, your network nodes need numeric attributes (columns with numbers). Currently, no numeric columns were found in the node table."
              variant="warning"
            />
          )}

        {/* Show message when some attributes exist but none are available to add */}
        {nextDefaultCol === '' &&
          availableColumns.length > 0 &&
          dataColumns.length < CHART_CONSTANTS.MAX_SLICES && (
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
