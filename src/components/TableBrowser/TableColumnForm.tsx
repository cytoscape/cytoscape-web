import * as React from 'react'
import { TableColumn } from './TableBrowser'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { TextField, Button, Alert, FormControl, InputLabel, MenuItem, Box, Select } from '@mui/material'

import { ValueTypeName } from '../../models/TableModel'

interface TableFormProps {
  column: TableColumn
  open: boolean
  error: string | undefined
  onClose: () => void
  onSubmit: (newColumnName: string) => void
  dependentVisualProperties: string[]
}

interface DeleteTableColumnFormProps extends TableFormProps {
  onSubmit: () => void
}

interface CreateTableColumnFormProps {
  open: boolean
  error: string | undefined
  onClose: () => void
  onSubmit: (newColumnName: string, dataType: ValueTypeName, value: string) => void

}
export function EditTableColumnForm(props: TableFormProps): React.ReactElement {

  const [value, setValue] = React.useState(props.column.id)

  React.useEffect(() => setValue(props.column.id), [props.column])

  return (
    <Dialog
      maxWidth="sm"
      fullWidth={true}
      open={props.open}
      onClose={props.onClose}
    >
      <DialogTitle>Edit Column</DialogTitle>
      <DialogContent>
        <TextField size="small" sx={{ mt: 1, mb: 1 }} onChange={e => setValue(e.target.value)} value={value} label={'Column Name'} />
        {props.dependentVisualProperties.length > 0 ? <Alert severity="warning">{`Warning, the following visual properties have mappings that are dependent on column ${props.column.id}.  Changes to the following visual properties may be needed: ${props.dependentVisualProperties.join(', ')}`}</Alert>
          : null}
        {props.error != null ? <Alert severity="error">{`${props.error}`}</Alert>
          : null}

      </DialogContent>
      <DialogActions>
        <Button onClick={() => props.onSubmit(value)}>Confirm</Button>
        <Button color="error" onClick={props.onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>)
}

export function DeleteTableColumnForm(props: DeleteTableColumnFormProps): React.ReactElement {
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
        {props.dependentVisualProperties.length > 0 ? <Alert severity="warning">{`Warning, the following visual properties have mappings that are dependent on column ${props.column.id}.  Changes to the following visual properties may be needed: ${props.dependentVisualProperties.join(', ')}`}</Alert>
          : null}
        {props.error != null ? <Alert severity="error">{`${props.error}`}</Alert>
          : null}

      </DialogContent>
      <DialogActions>
        <Button onClick={() => props.onSubmit()}>Confirm</Button>
        <Button color="error" onClick={props.onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>)
}


export function CreateTableColumnForm(props: CreateTableColumnFormProps): React.ReactElement {
  const [columnName, setColumnName] = React.useState('')
  const [valueTypeName, setValueTypeName] = React.useState<ValueTypeName>(ValueTypeName.String)
  const [defaultValue, setDefaultValue] = React.useState('')

  return (
    <Dialog
      maxWidth="sm"
      fullWidth={true}
      open={props.open}
      onClose={props.onClose}
    >
      <DialogTitle>Create New Column</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column' }}>
        <TextField size="small" sx={{ mt: 1, mb: 1 }} onChange={e => setColumnName(e.target.value)} value={columnName} label={'Column Name'} />
        <FormControl>
          <InputLabel id="data-type-select">Data type</InputLabel>
          <Select
            size="small"
            labelId="data-type-select"
            value={valueTypeName}
            onChange={(e) => setValueTypeName(e.target.value as ValueTypeName)}
          >
            {Object.values(ValueTypeName).map(v => {
              return <MenuItem key={v} value={v}>{v}</MenuItem>
            })}
          </Select>
        </FormControl>
        <TextField size="small" sx={{ mt: 1, mb: 1 }} onChange={e => setDefaultValue(e.target.value)} value={defaultValue} label={'Default value'} />
        {props.error != null ? <Alert severity="error">{`${props.error}`}</Alert>
          : null}

      </DialogContent>

      <DialogActions>
        <Button onClick={() => props.onSubmit(columnName, valueTypeName, defaultValue)}>Confirm</Button>
        <Button color="error" onClick={props.onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>)
}
