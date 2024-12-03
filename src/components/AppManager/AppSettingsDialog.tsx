import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  useTheme,
  Theme,
} from '@mui/material'
import { ServiceListPanel } from './ServiceListPanel'
import { AppListPanel } from './AppListPanel'

interface AppSettingsDialogProps {
  openDialog: boolean
  setOpenDialog: (open: boolean) => void
}

export const AppSettingsDialog = ({
  openDialog,
  setOpenDialog,
}: AppSettingsDialogProps) => {
  const theme: Theme = useTheme()
  return (
    <Dialog open={openDialog}>
      <DialogTitle></DialogTitle>
      <DialogContent>
        <AppListPanel />
        <Divider sx={{ marginBottom: theme.spacing(1) }} />
        <ServiceListPanel />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenDialog(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
