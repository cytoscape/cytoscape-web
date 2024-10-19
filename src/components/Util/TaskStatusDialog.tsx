import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  Typography,
} from '@mui/material'
import { useAppStore } from '../../store/AppStore'
import { ServiceAppTask } from '../../models/AppModel/ServiceAppTask'
import { ServiceStatus } from '../../models/AppModel/ServiceStatus'

/**
 * A dialog to display the progress of the ServiceAppTask.
 */
interface TaskStatusDialogProps {
  url: string
  open: boolean
  setOpen: (open: boolean) => void
}

export const TaskStatusDialog = ({
  url,
  open,
  setOpen,
}: TaskStatusDialogProps): JSX.Element => {
  const handleClose = (): void => {
    setOpen(false)
  }
  const currentTask: ServiceAppTask | undefined = useAppStore(
    (state) => state.currentTask,
  )

  if (currentTask === undefined) {
    return <></>
  }

  const taskStatus: ServiceStatus = currentTask.status
  const progress: number = currentTask.progress

  return (
    <Dialog
      open={open}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
    >
      <DialogTitle id="confirmation-dialog-title">
        <Typography variant="h6">Running Remote Service...</Typography>
        (ID: {currentTask.id})
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="confirmation-dialog-description">
          Status: {taskStatus}
        </DialogContentText>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '1em',
          }}
        >
          <CircularProgress style={{ marginRight: '1em' }} />
          <LinearProgress
            variant="determinate"
            value={progress}
            style={{ flexGrow: 1 }}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}
