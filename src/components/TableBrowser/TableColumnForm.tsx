import * as React from 'react'
import { TableColumn } from './TableBrowser'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import Tooltip from '@mui/material/Tooltip'
import {
  TextField,
  Button,
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Box,
  Select,
} from '@mui/material'

import { ValueTypeName } from '../../models/TableModel'
import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../models/VisualStyleModel'

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
    [props.dependentVisualProperties],
  )

  return (
    <Dialog
      maxWidth="sm"
      fullWidth={true}
      open={props.open}
      onClose={props.onClose}
    >
      <DialogTitle>Rename Column</DialogTitle>
      <DialogContent>
        <TextField
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
        <Button color="primary" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          sx={{
            color: '#FFFFFF',
            backgroundColor: '#337ab7',
            '&:hover': {
              backgroundColor: '#285a9b',
            },
            '&:disabled': {
              backgroundColor: 'transparent',
            },
          }}
          onClick={() => props.onSubmit(value, mappingSyncSetting)}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
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
    [props.dependentVisualProperties],
  )
  return (
    <Dialog
      maxWidth="sm"
      fullWidth={true}
      open={props.open}
      onClose={props.onClose}
    >
      <DialogTitle>Delete Column</DialogTitle>
      <DialogContent>
        <Box>Are you sure you want to delete column {props.column.id}?</Box>
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
        <Button color="primary" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          sx={{
            color: '#F50157',
            backgroundColor: 'transparent',
            '&:hover': {
              color: '#FFFFFF',
              backgroundColor: '#fc266f',
            },
            '&:disabled': {
              backgroundColor: 'transparent',
            },
          }}
          onClick={() => props.onSubmit(mappingSyncSetting)}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
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
  const disabled = columnName === ''

  const submitButton = disabled ? (
    <Tooltip title="Column name must not be empty">
      <Box>
        <Button disabled={true}>Confirm</Button>
      </Box>
    </Tooltip>
  ) : (
    <Button
      sx={{
        color: '#FFFFFF',
        backgroundColor: '#337ab7',
        '&:hover': {
          backgroundColor: '#285a9b',
        },
        '&:disabled': {
          backgroundColor: 'transparent',
        },
      }}
      disabled={columnName === ''}
      onClick={() => {
        props.onSubmit(columnName, valueTypeName, defaultValue)
        setColumnName('')
        setDefaultValue('')
        setValueTypeName(ValueTypeName.String)
      }}
    >
      Confirm
    </Button>
  )

  return (
    <Dialog
      maxWidth="sm"
      fullWidth={true}
      open={props.open}
      onClose={props.onClose}
    >
      <DialogTitle>Create New Column</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column' }}>
        <TextField
          size="small"
          sx={{ mt: 1, mb: 1 }}
          onChange={(e) => setColumnName(e.target.value)}
          value={columnName}
          label={'Column Name'}
        />
        <FormControl variant="standard" size="small">
          <InputLabel id="data-type-select">Data type</InputLabel>
          <Select
            size="small"
            labelId="data-type-select"
            value={valueTypeName}
            onChange={(e) => setValueTypeName(e.target.value as ValueTypeName)}
          >
            {Object.values(ValueTypeName).map((v) => {
              return (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              )
            })}
          </Select>
        </FormControl>
        <TextField
          size="small"
          sx={{ mt: 1, mb: 1 }}
          onChange={(e) => setDefaultValue(e.target.value)}
          value={defaultValue}
          label={'Default value'}
        />
        {props.error != null ? (
          <Alert severity="error">{`${props.error}`}</Alert>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button
          color="primary"
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
    </Dialog>
  )
}
