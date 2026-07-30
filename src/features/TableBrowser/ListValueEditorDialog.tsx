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
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'

import { ValueType } from '../../models/TableModel/ValueType'
import { ValueTypeName } from '../../models/TableModel'
import { ValueTypeNameChip } from '../../components/ValueTypeNameChip'
import { ListPastePanel } from './ListPastePanel'
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
  const [pastedItems, setPastedItems] = useState<string[]>([])
  // 0 = Paste, 1 = Manual. Paste-first for an empty cell; Manual-first when
  // there are already items to edit (so existing values are visible on open).
  const [tab, setTab] = useState(0)

  // Reset the editable rows whenever a new cell/value is opened.
  useEffect(() => {
    if (open) {
      const initial = toEditableItems(value)
      setItems(initial)
      setErrors({})
      setPastedItems([])
      setTab(initial.length === 0 ? 0 : 1)
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
    let finalItems = items
    if (tab === 0 && pastedItems.length > 0) {
      finalItems = items.length === 0 ? pastedItems : [...items, ...pastedItems]
    }

    const result = validateAndBuildListValue(finalItems, listType)
    if (result.value === null) {
      setErrors(result.errors)
      return
    }
    onSave(result.value)
  }

  const handlePasteAppend = (): void => {
    const finalItems = [...items, ...pastedItems]
    const result = validateAndBuildListValue(finalItems, listType)
    if (result.value === null) {
      setErrors(result.errors)
      return
    }
    onSave(result.value)
  }

  const handlePasteReplace = (): void => {
    const result = validateAndBuildListValue(pastedItems, listType)
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
      maxWidth="sm"
      fullWidth
      data-testid="list-value-editor-dialog"
    >
      <DialogTitle>Edit list: {columnName}</DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <Box>
            <ValueTypeNameChip type={listType} variant="chip-and-text" />
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            data-testid="list-value-editor-count"
          >
            {items.length} item{items.length === 1 ? '' : 's'}
          </Typography>
        </Box>
        <Tabs
          value={tab}
          onChange={(_e, next) => setTab(next as number)}
          sx={{ mt: 1, mb: 1, minHeight: 36 }}
        >
          <Tab
            label="Paste"
            sx={{ minHeight: 36 }}
            data-testid="list-editor-tab-paste"
          />
          <Tab
            label="Manual"
            sx={{ minHeight: 36 }}
            data-testid="list-editor-tab-manual"
          />
        </Tabs>

        {/* Paste tab — kept mounted so paste-in-progress state survives tab
            switches; hidden rather than unmounted. */}
        <Box
          role="tabpanel"
          hidden={tab !== 0}
          sx={{ display: tab === 0 ? 'block' : 'none' }}
        >
          <ListPastePanel
            listType={listType}
            onParsedItemsChange={setPastedItems}
          />
        </Box>

        {/* Manual tab — one editable row per element. */}
        <Box
          role="tabpanel"
          hidden={tab !== 1}
          sx={{ display: tab === 1 ? 'block' : 'none' }}
        >
          {items.length === 0 ? (
            <Typography sx={{ mt: 1 }} color="text.secondary">
              No items yet. Use “Add item”, or switch to the Paste tab to add
              several at once.
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button data-testid="list-value-editor-cancel" onClick={onCancel}>Cancel</Button>
        {tab === 0 ? (
          <>
            <Button
              onClick={handlePasteAppend}
              variant="outlined"
              disabled={pastedItems.length === 0}
              data-testid="list-value-editor-append"
            >
              Append
            </Button>
            <Button
              onClick={handlePasteReplace}
              variant="contained"
              color={items.length > 0 ? 'warning' : 'primary'}
              disabled={pastedItems.length === 0}
              data-testid="list-value-editor-replace"
            >
              {items.length > 0 ? `Replace all (${items.length})` : 'Replace'}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleSave}
            variant="contained"
            data-testid="list-value-editor-save"
          >
            Save
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default ListValueEditorDialog
