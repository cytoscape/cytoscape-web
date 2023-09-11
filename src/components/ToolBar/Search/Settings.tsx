import Popover from '@mui/material/Popover'
import Typography from '@mui/material/Typography'
import { Switch } from '@mui/material'

interface SettingsProps {
  open: boolean
  anchorEl: HTMLButtonElement | null
  setAnchorEl: (anchorEl: HTMLButtonElement | null) => void
}

export const Settings = ({
  open,
  anchorEl,
  setAnchorEl,
}: SettingsProps): JSX.Element => {
  const handleClose = (): void => {
    setAnchorEl(null)
  }

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
    >
      <div style={{ padding: '16px' }}>
        <Typography variant="h6" gutterBottom>
          Settings
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Display Settings
        </Typography>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Switch />
          <Typography variant="body1" style={{ marginLeft: '8px' }}>
            Option 1
          </Typography>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Switch />
          <Typography variant="body1" style={{ marginLeft: '8px' }}>
            Option 2
          </Typography>
        </div>
      </div>
    </Popover>
  )
}
