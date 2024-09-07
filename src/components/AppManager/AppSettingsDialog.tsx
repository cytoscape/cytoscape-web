/**
 * A dialog to enable/disable the apps
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
} from '@mui/material'
import { WarningOutlined } from '@mui/icons-material'
import { useAppStore } from '../../store/AppStore'
import { AppStatus } from '../../models/AppModel/AppStatus'
import { CyApp } from '../../models/AppModel'

interface AppSettingsDialogProps {
  openDialog: boolean
  setOpenDialog: (open: boolean) => void
}

export const AppSettingsDialog = ({
  openDialog,
  setOpenDialog,
}: AppSettingsDialogProps) => {
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)
  const setStatus = useAppStore((state) => state.setStatus)

  return (
    <Dialog open={openDialog}>
      <DialogTitle>
        {Object.keys(apps).length === 0
          ? '(No Apps Available)'
          : 'Status of Apps'}
      </DialogTitle>
      <DialogContent>
        {Object.values(apps).map((app) => (
          <div
            key={app.id}
            style={{ display: 'flex', verticalAlign: 'center' }}
          >
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
            {app.status === AppStatus.Error && (
              <Tooltip title="Could not load the app">
                <WarningOutlined color="error" />
              </Tooltip>
            )}
          </div>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenDialog(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
