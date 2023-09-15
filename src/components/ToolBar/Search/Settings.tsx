import Popover from '@mui/material/Popover'
import Typography from '@mui/material/Typography'
import { Switch } from '@mui/material'
import { SearchTargetSelector } from './SearchTargetSelector'
import { SearchOperatorSelector } from './SearchOperatorSelector'

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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '1rem',
        }}
      >
        <Typography variant="h6" gutterBottom>
          Search Settings:
        </Typography>
        <SearchOperatorSelector />

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body1">Fuzzy Search</Typography>
          <Switch />
        </div>
        <SearchTargetSelector />
      </div>
    </Popover>
  )
}
