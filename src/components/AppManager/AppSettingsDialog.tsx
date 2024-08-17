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
import { AppStatus } from '../../models/AppModel/AppStatus'

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
  const setStatus = useAppStore((state) => state.setStatus)

  const handleClick = () => {
    setOpen(false)
    handleClose()
  }

  return (
    <Dialog open={open}>
      <DialogTitle>Active Apps</DialogTitle>
      <DialogContent>
        {Object.values(apps).map((app) => (
          <div key={app.id}>
            <input
              type="checkbox"
              disabled={app.status === AppStatus.Error}
              checked={app.status === AppStatus.Active}
              onChange={(e) =>
                setStatus(
                  app.id,
                  e.target.checked ? AppStatus.Active : AppStatus.Inactive,
                )
              }
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
