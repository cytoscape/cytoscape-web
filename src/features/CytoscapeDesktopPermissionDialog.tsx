import {
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { ReactElement } from 'react'

import { CyDialog } from '@/components/CyDialog'

interface CytoscapeDesktopPermissionDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * One-time explanation shown before the first attempt to communicate with
 * Cytoscape Desktop (CW-Localhost). The browser may raise a local-network
 * permission prompt; this tells the user that allowing it is what enables
 * importing/exporting networks to and from Cytoscape Desktop.
 */
export const CytoscapeDesktopPermissionDialog = ({
  open,
  onConfirm,
  onCancel,
}: CytoscapeDesktopPermissionDialogProps): ReactElement => {
  return (
    <CyDialog
      dismiss="lightweight"
      open={open}
      onClose={onCancel}
      data-testid="cytoscape-desktop-permission-dialog"
    >
      <DialogTitle>Connect to Cytoscape Desktop</DialogTitle>
      <DialogContent>
        <DialogContentText component="div">
          Cytoscape Web talks to Cytoscape Desktop on your machine over
          <strong> localhost (127.0.0.1:1234)</strong>. Your browser may ask for
          permission to access the local network.
          <br />
          <br />
          Click <strong>Allow</strong> (or <strong>Enable</strong>) on that
          prompt to let Cytoscape Web import and export networks to and from
          Cytoscape Desktop. Make sure Cytoscape Desktop is running with the
          CyNDEx-2 app installed.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          data-testid="cytoscape-desktop-permission-continue"
        >
          Continue
        </Button>
      </DialogActions>
    </CyDialog>
  )
}
