import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'

import { ValueType } from '../../models/TableModel/ValueType'
import { ValueTypeName } from '../../models/TableModel/ValueTypeName'
import { dataTypeLabel } from '../../models/TableModel/impl/dataTypeDisplay'
import {
  addItem,
  elementType,
  removeItem,
  toEditableItems,
  updateItem,
  validateAndBuildListValue,
} from './utils/listCellEditor'

interface ListValueEditorDialogProps {
  open: boolean
  columnName: string
  listType: ValueTypeName
  /** The current cell value (list) being edited. */
  value: ValueType | null | undefined
  onCancel: () => void
  onSave: (value: ValueType) => void
}

/**
 * Dialog that edits a list-typed cell one element at a time (CW-563).
 *
 * Each list element is an editable row; users add/remove rows instead of
 * hand-crafting a comma-separated string. Numeric/boolean element types are
 * validated on save via the pure helpers in ./utils/listCellEditor.
 */
export const ListValueEditorDialog = ({
  open,
  columnName,
  listType,
  value,
  onCancel,
  onSave,
}: ListValueEditorDialogProps): JSX.Element => {
  const [items, setItems] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<number, string>>({})

  // Reset the editable rows whenever a new cell/value is opened.
  useEffect(() => {
    if (open) {
      setItems(toEditableItems(value))
      setErrors({})
    }
  }, [open, value])

  const singleType = elementType(listType)
  const isBooleanList = singleType === ValueTypeName.Boolean
  const isNumericList =
    singleType === ValueTypeName.Long ||
    singleType === ValueTypeName.Integer ||
    singleType === ValueTypeName.Double

  const handleItemChange = (index: number, next: string): void => {
    setItems((prev) => updateItem(prev, index, next))
  }

  const handleAdd = (): void => {
    setItems((prev) => addItem(prev, isBooleanList ? 'true' : ''))
  }

  const handleRemove = (index: number): void => {
    setItems((prev) => removeItem(prev, index))
  }

  const handleSave = (): void => {
    const result = validateAndBuildListValue(items, listType)
    if (result.value === null) {
      setErrors(result.errors)
      return
    }
    onSave(result.value)
  }

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      data-testid="list-value-editor-dialog"
    >
      <DialogTitle>Edit list: {columnName}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="caption" color="text.secondary">
          {dataTypeLabel(listType)}
        </Typography>
        {items.length === 0 ? (
          <Typography sx={{ mt: 1 }} color="text.secondary">
            No items. Use “Add item” to create one.
          </Typography>
        ) : null}
        {items.map((item, index) => (
          <Box
            // eslint-disable-next-line react/no-array-index-key -- rows are positional and reorder on remove; index is the stable identity here
            key={index}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}
          >
            {isBooleanList ? (
              <TextField
                select
                size="small"
                fullWidth
                value={item === 'true' ? 'true' : 'false'}
                onChange={(e) => handleItemChange(index, e.target.value)}
                inputProps={{ 'data-testid': `list-item-input-${index}` }}
              >
                <MenuItem value="true">true</MenuItem>
                <MenuItem value="false">false</MenuItem>
              </TextField>
            ) : (
              <TextField
                size="small"
                fullWidth
                type={isNumericList ? 'number' : 'text'}
                value={item}
                error={errors[index] !== undefined}
                helperText={errors[index]}
                onChange={(e) => handleItemChange(index, e.target.value)}
                inputProps={{ 'data-testid': `list-item-input-${index}` }}
              />
            )}
            <Tooltip title="Remove item">
              <IconButton
                size="small"
                aria-label={`remove item ${index}`}
                onClick={() => handleRemove(index)}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
        <Button
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ mt: 2 }}
          data-testid="list-value-editor-add"
        >
          Add item
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          data-testid="list-value-editor-save"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ListValueEditorDialog
