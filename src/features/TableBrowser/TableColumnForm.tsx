import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import Tooltip from '@mui/material/Tooltip'
import * as React from 'react'

import { CyDialog } from '@/components/CyDialog'
import { ValueTypeName } from '../../models/TableModel'
import { ValueTypeNameChip } from '../../components/ValueTypeNameChip'
import { orderedValueTypeNames } from '../../models/TableModel/impl/valueTypeNameDisplay'
import {
  deserializeValue,
  isListType,
  serializeValue,
} from '../../models/TableModel/impl/valueTypeImpl'
import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../models/VisualStyleModel'
import { ListValueEditorDialog } from './ListValueEditorDialog'
import { TableColumn } from './TableBrowser'

interface TableFormProps {
  column: TableColumn
  open: boolean
  error?: string
  onClose: () => void
  onSubmit: (
    newColumnName: string,
    mappingUpdateType?: 'rename' | 'delete',
  ) => void
  dependentVisualProperties: Array<VisualProperty<VisualPropertyValueType>>
}

interface DeleteTableColumnFormProps {
  column: TableColumn
  open: boolean
  error?: string
  onClose: () => void
  onSubmit: (mappingUpdateType?: 'delete') => void
  dependentVisualProperties: Array<VisualProperty<VisualPropertyValueType>>
}

interface CreateTableColumnFormProps {
  open: boolean
  error?: string
  onClose: () => void
  onSubmit: (
    newColumnName: string,
    dataType: ValueTypeName,
    value: string,
  ) => void
}
export function EditTableColumnForm(props: TableFormProps): React.ReactElement {
  const [value, setValue] = React.useState(props.column.id)
  const [mappingSyncSetting, setMappingSyncSetting] = React.useState<
    'rename' | 'delete' | undefined
  >(undefined)

  React.useEffect(() => setValue(props.column.id), [props.column])
  const columnHasDependentProperties =
    props.dependentVisualProperties.length > 0

  React.useEffect(
    () =>
      setMappingSyncSetting(
        columnHasDependentProperties ? 'rename' : undefined,
      ),
    [props.dependentVisualProperties, columnHasDependentProperties],
  )

  return (
    <CyDialog
      data-testid="edit-table-column-dialog"
      maxWidth="sm"
      fullWidth={true}
      open={props.open}
    >
      <DialogTitle>Rename Column</DialogTitle>
      <DialogContent>
        <TextField
          data-testid="edit-table-column-name-input"
          size="small"
          sx={{ mt: 1, mb: 1 }}
          onChange={(e) => setValue(e.target.value)}
          value={value}
          label={'Column Name'}
        />
        {columnHasDependentProperties ? (
          <Alert severity="warning">{`Warning, the following visual properties have mappings that are dependent on column ${
            props.column.id
          }. Changes to the following visual properties may be needed: ${props.dependentVisualProperties
            .map((vp) => vp.displayName)
            .join(', ')}`}</Alert>
        ) : null}
        {props.error != null ? (
          <Alert severity="error">{`${props.error}`}</Alert>
        ) : null}
        {columnHasDependentProperties ? (
          <>
            <FormControlLabel
              value="rename"
              control={<Radio checked={mappingSyncSetting === 'rename'} />}
              onChange={() => setMappingSyncSetting('rename')}
              label="Update the style mapping(s)"
            />
            <FormControlLabel
              value="delete"
              control={
                <Radio
                  checked={mappingSyncSetting === 'delete'}
                  onChange={() => setMappingSyncSetting('delete')}
                />
              }
              label="Delete the style mapping(s)"
            />
            <Tooltip title="Warning: You will not be able to save a network that contains invalid mappings to NDEx">
              <FormControlLabel
                value="delete"
                control={
                  <Radio
                    checked={mappingSyncSetting === undefined}
                    onChange={() => setMappingSyncSetting(undefined)}
                  />
                }
                label="Leave the mapping(s) as is"
              />
            </Tooltip>
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button
          data-testid="edit-table-column-cancel-button"
          variant="outlined"
          onClick={props.onClose}
        >
          Cancel
        </Button>
        <Button
          data-testid="edit-table-column-confirm-button"
          variant="contained"
          onClick={() => props.onSubmit(value, mappingSyncSetting)}
        >
          Confirm
        </Button>
      </DialogActions>
    </CyDialog>
  )
}

export function DeleteTableColumnForm(
  props: DeleteTableColumnFormProps,
): React.ReactElement {
  const [mappingSyncSetting, setMappingSyncSetting] = React.useState<
    'delete' | undefined
  >(undefined)

  const columnHasDependentProperties =
    props.dependentVisualProperties.length > 0

  React.useEffect(
    () =>
      setMappingSyncSetting(
        columnHasDependentProperties ? 'delete' : undefined,
      ),
    [props.dependentVisualProperties, columnHasDependentProperties],
  )
  return (
    <CyDialog
      data-testid="delete-table-column-dialog"
      maxWidth="sm"
      fullWidth={true}
      open={props.open}
    >
      <DialogTitle>Delete Column</DialogTitle>
      <DialogContent>
        <Box>
          Are you sure you want to delete column &quot;{props.column.id}&quot;?
        </Box>
        {columnHasDependentProperties ? (
          <Alert severity="warning">{`Warning, the following visual properties have mappings that are dependent on column ${
            props.column.id
          }. Changes to the following visual properties may be needed: ${props.dependentVisualProperties
            .map((vp) => vp.displayName)
            .join(', ')}`}</Alert>
        ) : null}
        {props.error != null ? (
          <Alert severity="error">{`${props.error}`}</Alert>
        ) : null}
        {columnHasDependentProperties ? (
          <>
            <FormControlLabel
              value="delete"
              control={
                <Radio
                  checked={mappingSyncSetting === 'delete'}
                  onChange={() => setMappingSyncSetting('delete')}
                />
              }
              label="Delete the style mapping(s)"
            />
            <Tooltip title="Warning: You will not be able to save a network that contains invalid mappings to NDEx">
              <FormControlLabel
                value="delete"
                control={
                  <Radio
                    checked={mappingSyncSetting === undefined}
                    onChange={() => setMappingSyncSetting(undefined)}
                  />
                }
                label="Leave the mapping(s) as is"
              />
            </Tooltip>
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button
          data-testid="delete-table-column-cancel-button"
          variant="outlined"
          onClick={props.onClose}
        >
          Cancel
        </Button>
        <Button
          data-testid="delete-table-column-confirm-button"
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => props.onSubmit(mappingSyncSetting)}
        >
          Delete
        </Button>
      </DialogActions>
    </CyDialog>
  )
}

export function CreateTableColumnForm(
  props: CreateTableColumnFormProps,
): React.ReactElement {
  const [columnName, setColumnName] = React.useState('')
  const [valueTypeName, setValueTypeName] = React.useState<ValueTypeName>(
    ValueTypeName.String,
  )
  const [defaultValue, setDefaultValue] = React.useState('')
  // Opens the shared list editor for a list-typed default value (CW-563).
  const [listEditorOpen, setListEditorOpen] = React.useState(false)

  React.useEffect(() => {
    if (props.open) {
      setColumnName('')
      setDefaultValue('')
      setValueTypeName(ValueTypeName.String)
    }
  }, [props.open])

  const disabled = columnName === ''

  const submitButton = disabled ? (
    <Tooltip title="Column name must not be empty">
      <Box>
        <Button
          data-testid="create-table-column-confirm-button"
          variant="contained"
          disabled
        >
          Confirm
        </Button>
      </Box>
    </Tooltip>
  ) : (
    <Button
      data-testid="create-table-column-confirm-button"
      variant="contained"
      disabled={columnName === ''}
      onClick={() => {
        props.onSubmit(columnName, valueTypeName, defaultValue)
      }}
    >
      Confirm
    </Button>
  )

  return (
    <CyDialog
      data-testid="create-table-column-dialog"
      maxWidth="sm"
      fullWidth={true}
      open={props.open}
    >
      <DialogTitle>Create New Column</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column' }}>
        <TextField
          data-testid="create-table-column-name-input"
          size="small"
          sx={{ mt: 1, mb: 1 }}
          onChange={(e) => setColumnName(e.target.value)}
          value={columnName}
          label={'Column Name'}
        />
        <FormControl variant="standard" size="small">
          <InputLabel id="data-type-select">Data type</InputLabel>
          <Select
            data-testid="create-table-column-type-select"
            size="small"
            labelId="data-type-select"
            value={valueTypeName}
            onChange={(e) => setValueTypeName(e.target.value as ValueTypeName)}
          >
            {orderedValueTypeNames.map((v) => {
              return (
                <MenuItem key={v} value={v}>
                  <ValueTypeNameChip
                    type={v}
                    variant="chip-and-text"
                    showTooltip={false}
                  />
                </MenuItem>
              )
            })}
          </Select>
        </FormControl>
        {isListType(valueTypeName) ? (
          <TextField
            data-testid="create-table-column-default-value-input"
            size="small"
            sx={{ mt: 1, mb: 1 }}
            value={defaultValue}
            label={'Default value'}
            placeholder="Click to edit list…"
            onClick={() => setListEditorOpen(true)}
            InputProps={{
              readOnly: true,
              sx: { cursor: 'pointer' },
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label="edit list default value"
                    onClick={() => setListEditorOpen(true)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        ) : (
          <TextField
            data-testid="create-table-column-default-value-input"
            size="small"
            sx={{ mt: 1, mb: 1 }}
            onChange={(e) => setDefaultValue(e.target.value)}
            value={defaultValue}
            label={'Default value'}
          />
        )}
        <ListValueEditorDialog
          open={listEditorOpen}
          columnName={columnName || 'Default value'}
          listType={valueTypeName}
          value={
            defaultValue.length > 0
              ? deserializeValue(valueTypeName, defaultValue)
              : []
          }
          onCancel={() => setListEditorOpen(false)}
          onSave={(v) => {
            // The column-creation contract carries the default as a string, so
            // we serialize the edited list before storing it (CW-563).
            setDefaultValue(serializeValue(v))
            setListEditorOpen(false)
          }}
        />
        {props.error != null ? (
          <Alert severity="error">{`${props.error}`}</Alert>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button
          data-testid="create-table-column-cancel-button"
          variant="outlined"
          onClick={() => {
            setColumnName('')
            setDefaultValue('')
            setValueTypeName(ValueTypeName.String)
            props.onClose()
          }}
        >
          Cancel
        </Button>
        {submitButton}
      </DialogActions>
    </CyDialog>
  )
}
