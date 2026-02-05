import * as React from 'react'
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  SelectChangeEvent,
  Button,
  Tooltip,
  Alert,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import { AttributeName } from '../../../../../models/TableModel/AttributeName'
import { ColorType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/ColorType'
import { useTableStore } from '../../../../../data/hooks/stores/TableStore'
import { IdType } from '../../../../../models/IdType'
import { getNumericColumnNames } from '../utils/numericColumnUtils'
import { CHART_CONSTANTS, COLORS } from '../utils/constants'
import { OrderControls, DataTableHeader, DataTableRow } from '../components'
import { generateRandomColor } from '../../../../../models/VisualStyleModel/impl/colorUtils'

interface CustomColorsFormProps {
  dataColumns: AttributeName[]
  colors: ColorType[]
  currentNetworkId?: IdType
  onUpdate: (dataColumns: AttributeName[], colors: ColorType[]) => void
}

export const CustomColorsForm: React.FC<CustomColorsFormProps> = ({
  dataColumns,
  colors,
  currentNetworkId,
  onUpdate,
}) => {
  const tables = useTableStore((s) => s.tables)
  const nodeTable = currentNetworkId ? tables[currentNetworkId]?.nodeTable : null

  // Available numeric columns
  const availableColumns: string[] = React.useMemo(() => {
    if (!nodeTable?.rows || !nodeTable?.columns) return []
    return getNumericColumnNames(nodeTable.columns, nodeTable.rows)
  }, [nodeTable])

  const nextDefaultCol = React.useMemo(() => {
    return availableColumns.find((c) => !dataColumns.includes(c)) || ''
  }, [availableColumns, dataColumns])

  const count = dataColumns.length

  const addRow = () =>
    onUpdate(
      [...dataColumns, nextDefaultCol],
      [...colors, COLORS.DEFAULT],
    )

  const removeRow = (i: number) =>
    onUpdate(
      dataColumns.filter((_, idx) => idx !== i),
      colors.filter((_, idx) => idx !== i),
    )

  const updateRow = (i: number, column: AttributeName, color: ColorType) => {
    // Ensure colors array matches dataColumns length, filling with gray if needed
    const currentColors = colors.length === dataColumns.length 
      ? colors 
      : dataColumns.map((_, idx) => colors[idx] || COLORS.DEFAULT)
    
    onUpdate(
      dataColumns.map((c, idx) => (idx === i ? column : c)),
      currentColors.map((c, idx) => (idx === i ? color : c)),
    )
  }

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Node Attributes & Colors
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
                      updateRow(
                        i,
                        e.target.value,
                        colors[i] || COLORS.DEFAULT,
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

                <Tooltip title={`Click to change color for ${col}`}>
                  <input
                    type="color"
                    value={(colors[i] ?? COLORS.DEFAULT) as ColorType}
                    onChange={(e) =>
                      updateRow(i, col, e.target.value as ColorType)
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
    </Box>
  )
}

