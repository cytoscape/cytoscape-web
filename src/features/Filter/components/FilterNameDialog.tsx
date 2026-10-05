import {
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material'
import { useEffect, useState } from 'react'

import { CyDialog } from '@/components/CyDialog'

interface FilterNameDialogProps {
  open: boolean
  title: string
  confirmLabel: string
  initialName: string
  // Why the last name was refused, shown under the field
  error?: string
  // Returns whether the name was accepted; the dialog stays open otherwise
  onConfirm: (name: string) => boolean
  onCancel: () => void
}

/**
 * Asks for a filter name: "Create New Filter" and "Rename Filter"
 */
export const FilterNameDialog = ({
  open,
  title,
  confirmLabel,
  initialName,
  error,
  onConfirm,
  onCancel,
}: FilterNameDialogProps): JSX.Element => {
  const [name, setName] = useState<string>(initialName)

  useEffect(() => {
    if (open) setName(initialName)
  }, [open, initialName])

  const confirm = (): void => {
    if (name.trim() === '') return
    onConfirm(name)
  }

  return (
    <CyDialog
      open={open}
      fullWidth
      maxWidth="xs"
      data-testid="filter-name-dialog"
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText variant="body2">
          Please provide a name for your filter.
        </DialogContentText>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          size="small"
          value={name}
          error={error !== undefined}
          helperText={error}
          inputProps={{
            'aria-label': 'Filter name',
            'data-testid': 'filter-name-input',
          }}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') confirm()
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button data-testid="filter-name-cancel-button" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="contained"
          data-testid="filter-name-confirm-button"
          disabled={name.trim() === ''}
          onClick={confirm}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </CyDialog>
  )
}
