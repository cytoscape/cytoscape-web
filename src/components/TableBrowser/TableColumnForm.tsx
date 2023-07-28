import * as React from 'react'
import { TableColumn } from './TableBrowser'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { TextField, Button, Alert } from '@mui/material'

export default function TableColumnForm(props: {
  column: TableColumn
  open: boolean
  error: string | undefined
  onClose: () => void
  onSubmit: (newColumnName: string) => void
  dependentVisualProperties: string[]
}): React.ReactElement {

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
