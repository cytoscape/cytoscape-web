import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import { useEffect, useState } from 'react'

import { CyDialog } from '@/components/CyDialog'

interface StyleNameDialogProps {
  open: boolean
  title: string
  confirmLabel: string
  initialName: string
  onConfirm: (name: string) => void
  onClose: () => void
}

/**
 * Small prompt dialog used for naming styles and templates
 * (create / rename / save to library).
 */
export const StyleNameDialog = (
  props: StyleNameDialogProps,
): React.ReactElement => {
  const { open, title, confirmLabel, initialName, onConfirm, onClose } = props
  const [name, setName] = useState<string>(initialName)

  useEffect(() => {
    if (open) {
      setName(initialName)
    }
  }, [open, initialName])

  const trimmed = name.trim()

  const handleConfirm = (): void => {
    if (trimmed === '') {
      return
    }
    onConfirm(trimmed)
    onClose()
  }

  return (
    <CyDialog
      dismiss="form"
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      data-testid="style-name-dialog"
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          size="small"
          label="Style name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleConfirm()
            }
          }}
          inputProps={{ 'data-testid': 'style-name-input' }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} data-testid="style-name-cancel-button">
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={trimmed === ''}
          onClick={handleConfirm}
          data-testid="style-name-confirm-button"
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </CyDialog>
  )
}
