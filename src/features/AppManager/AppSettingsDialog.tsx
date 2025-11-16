import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Theme,
  useTheme,
} from '@mui/material'

import { AppListPanel } from './AppListPanel'
import { ServiceListPanel } from './ServiceListPanel'

interface AppSettingsDialogProps {
  openDialog: boolean
  setOpenDialog: (open: boolean) => void
  setAppStateUpdated: (updated: boolean) => void
}

export const AppSettingsDialog = ({
  openDialog,
  setOpenDialog,
  setAppStateUpdated,
}: AppSettingsDialogProps) => {
  const theme: Theme = useTheme()
  return (
    <Dialog data-testid="app-settings-dialog" open={openDialog}>
      <DialogTitle></DialogTitle>
      <DialogContent>
        <AppListPanel setAppStateUpdated={setAppStateUpdated} />
        <Divider sx={{ marginBottom: theme.spacing(1) }} />
        <ServiceListPanel />
      </DialogContent>
      <Divider sx={{ margin: 0 }} />
      <DialogActions>
        <Button
          data-testid="app-settings-dialog-close-button"
          variant="contained"
          onClick={() => setOpenDialog(false)}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
