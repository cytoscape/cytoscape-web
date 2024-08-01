/**
 * A dialog to enable/disable the apps
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material'
import { useAppStore } from '../../store/AppStore'

interface AppSettingsDialogProps {
  open: boolean
  setOpen: (isOpen: boolean) => void
  handleClose: () => void
}

export const AppSettingsDialog = ({
  open,
  setOpen,
  handleClose,
}: AppSettingsDialogProps) => {
  const apps = useAppStore((state) => state.apps)
  const isEnabled = useAppStore((state) => state.isEnabled)
  const setEnabled = useAppStore((state) => state.setEnabled)

  const handleClick = () => {
    setOpen(false)
    handleClose()
  }

  return (
    <Dialog open={open}>
      <DialogTitle>App Settings</DialogTitle>
      <DialogContent>
        {Object.values(apps).map((app) => (
          <div key={app.id}>
            <input
              type="checkbox"
              checked={isEnabled.get(app.id)}
              onChange={(e) => setEnabled(app.id, e.target.checked)}
            />
            {app.name}
          </div>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClick}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
