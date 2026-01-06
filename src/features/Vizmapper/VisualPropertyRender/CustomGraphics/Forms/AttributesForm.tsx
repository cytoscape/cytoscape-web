import * as React from 'react'
import {
  Box,
  Typography,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Alert,
  Tooltip,
} from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight'
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft'
import { IdType } from '../../../../../models/IdType'
import { useTableStore } from '../../../../../data/hooks/stores/TableStore'
import { AttributeName } from '../../../../../models/TableModel/AttributeName'
import { ColorType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/ColorType'
import { StepGuidance } from '../WizardSteps/StepGuidance'
import { generateRandomColor } from '../../../../../models/VisualStyleModel/impl/colorUtils'
import { getNumericColumnNames } from '../utils/numericColumnUtils'
import { CHART_CONSTANTS, COLORS } from '../utils/constants'
import { OrderControls } from '../components'

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

  // Get all numeric columns
  const availableColumns: string[] = React.useMemo(() => {
    if (!nodeTable?.rows || !nodeTable?.columns) return []
    return getNumericColumnNames(nodeTable.columns, nodeTable.rows)
  }, [nodeTable])

  // Get unselected columns
  const unselectedColumns = React.useMemo(() => {
    return availableColumns.filter((col) => !dataColumns.includes(col))
  }, [availableColumns, dataColumns])

  // Selection state for both lists
  const [selectedAvailable, setSelectedAvailable] = React.useState<string[]>([])
  const [selectedSelected, setSelectedSelected] = React.useState<string[]>([])

  // Handle item selection in available list
  const handleAvailableToggle = (column: string) => {
    setSelectedAvailable((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column],
    )
  }

  // Handle item selection in selected list
  const handleSelectedToggle = (column: string) => {
    setSelectedSelected((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column],
    )
  }

  // Move selected items from available to selected
  const handleMoveToSelected = () => {
    if (selectedAvailable.length === 0) return
    const remaining = selectedAvailable.length + dataColumns.length
    if (remaining > CHART_CONSTANTS.MAX_SLICES) {
      // Only move what fits
      const toMove = selectedAvailable.slice(
        0,
        CHART_CONSTANTS.MAX_SLICES - dataColumns.length,
      )
      const newColumns = [...dataColumns, ...toMove]
      const newColors = [...colors, ...toMove.map(() => generateRandomColor())]
      onUpdate(newColumns, newColors)
      setSelectedAvailable([])
    } else {
      const newColumns = [...dataColumns, ...selectedAvailable]
      const newColors = [
        ...colors,
        ...selectedAvailable.map(() => generateRandomColor()),
      ]
      onUpdate(newColumns, newColors)
      setSelectedAvailable([])
    }
  }

  // Move all available items to selected
  const handleMoveAllToSelected = () => {
    const remaining = unselectedColumns.length + dataColumns.length
    if (remaining > CHART_CONSTANTS.MAX_SLICES) {
      const toMove = unselectedColumns.slice(
        0,
        CHART_CONSTANTS.MAX_SLICES - dataColumns.length,
      )
      const newColumns = [...dataColumns, ...toMove]
      const newColors = [...colors, ...toMove.map(() => generateRandomColor())]
      onUpdate(newColumns, newColors)
    } else {
      const newColumns = [...dataColumns, ...unselectedColumns]
      const newColors = [
        ...colors,
        ...unselectedColumns.map(() => generateRandomColor()),
      ]
      onUpdate(newColumns, newColors)
    }
    setSelectedAvailable([])
  }

  // Move selected items from selected to available
  const handleMoveToAvailable = () => {
    if (selectedSelected.length === 0) return
    const indices = selectedSelected.map((col) => dataColumns.indexOf(col))
    const newColumns = dataColumns.filter((_, idx) => !indices.includes(idx))
    const newColors = colors.filter((_, idx) => !indices.includes(idx))
    onUpdate(newColumns, newColors)
    setSelectedSelected([])
  }

  // Move all selected items to available
  const handleMoveAllToAvailable = () => {
    onUpdate([], [])
    setSelectedSelected([])
  }

  // Handle reordering in selected list
  const moveRow = (from: number, to: number) => {
    if (dataColumns.length <= 1) return
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Dual List Transfer Component */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* Available Attributes */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Available Attributes:
          </Typography>
          {unselectedColumns.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {availableColumns.length === 0
                  ? 'No numeric attributes available'
                  : 'All attributes selected'}
              </Typography>
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
              <List dense disablePadding>
                {unselectedColumns.map((col, index) => {
                  const isSelected = selectedAvailable.includes(col)
                  return (
                    <ListItem
                      key={col}
                      disablePadding
                      onClick={() => handleAvailableToggle(col)}
                      sx={{
                        bgcolor: isSelected ? 'action.selected' : 'transparent',
                        '&:hover': {
                          bgcolor: isSelected
                            ? 'action.selected'
                            : 'action.hover',
                        },
                        cursor: 'pointer',
                      }}
                    >
                      <ListItemButton>
                        <ListItemText
                          primary={
                            <Typography variant="body2">
                              {index + 1}. {col}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  )
                })}
              </List>
            </Paper>
          )}
        </Box>

        {/* Transfer Buttons */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 1,
            pt: 3,
          }}
        >
          <Tooltip title="Move selected to Selected Attributes">
            <span>
              <Button
                variant="outlined"
                size="small"
                onClick={handleMoveToSelected}
                disabled={
                  selectedAvailable.length === 0 ||
                  dataColumns.length >= CHART_CONSTANTS.MAX_SLICES
                }
                sx={{ minWidth: 40, px: 1 }}
              >
                <ChevronRightIcon />
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Move all to Selected Attributes">
            <span>
              <Button
                variant="outlined"
                size="small"
                onClick={handleMoveAllToSelected}
                disabled={
                  unselectedColumns.length === 0 ||
                  dataColumns.length >= CHART_CONSTANTS.MAX_SLICES
                }
                sx={{ minWidth: 40, px: 1 }}
              >
                <KeyboardDoubleArrowRightIcon />
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Move selected to Available Attributes">
            <span>
              <Button
                variant="outlined"
                size="small"
                onClick={handleMoveToAvailable}
                disabled={selectedSelected.length === 0}
                sx={{ minWidth: 40, px: 1 }}
              >
                <ChevronLeftIcon />
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Move all to Available Attributes">
            <span>
              <Button
                variant="outlined"
                size="small"
                onClick={handleMoveAllToAvailable}
                disabled={dataColumns.length === 0}
                sx={{ minWidth: 40, px: 1 }}
              >
                <KeyboardDoubleArrowLeftIcon />
              </Button>
            </span>
          </Tooltip>
        </Box>

        {/* Selected Attributes */}
        <Box sx={{ flex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Selected Attributes:
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {dataColumns.length}/{CHART_CONSTANTS.MAX_SLICES}
            </Typography>
          </Box>
          {dataColumns.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No attributes selected
              </Typography>
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
              <List dense disablePadding>
                {dataColumns.map((col, index) => {
                  const isSelected = selectedSelected.includes(col)
                  return (
                    <ListItem
                      key={`${col}-${index}`}
                      disablePadding
                      onClick={() => handleSelectedToggle(col)}
                      sx={{
                        bgcolor: isSelected ? 'action.selected' : 'transparent',
                        '&:hover': {
                          bgcolor: isSelected
                            ? 'action.selected'
                            : 'action.hover',
                        },
                        cursor: 'pointer',
                      }}
                    >
                      <ListItemButton>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            width: '100%',
                          }}
                        >
                          <OrderControls
                            order={index + 1}
                            total={dataColumns.length}
                            onMoveUp={() =>
                              moveRow(
                                index,
                                (index - 1 + dataColumns.length) %
                                  dataColumns.length,
                              )
                            }
                            onMoveDown={() =>
                              moveRow(index, (index + 1) % dataColumns.length)
                            }
                            disabled={dataColumns.length <= 1}
                          />
                          <ListItemText
                            primary={
                              <Typography variant="body2">
                                {index + 1}. {col}
                              </Typography>
                            }
                            sx={{ flex: 1 }}
                          />
                        </Box>
                      </ListItemButton>
                    </ListItem>
                  )
                })}
              </List>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Warning messages */}
      {dataColumns.length >= CHART_CONSTANTS.MAX_SLICES && (
        <Alert severity="warning">
          Maximum of {CHART_CONSTANTS.MAX_SLICES} attributes reached. Remove
          attributes to select different ones.
        </Alert>
      )}
      {availableColumns.length === 0 && (
        <Alert severity="info">
          No numeric attributes available in the node table.
        </Alert>
      )}
    </Box>
  )
}
