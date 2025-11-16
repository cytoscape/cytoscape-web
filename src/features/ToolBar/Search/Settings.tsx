import { Theme, useTheme } from '@mui/material'
import Popover from '@mui/material/Popover'
import Grid from '@mui/material/Unstable_Grid2'

import { GraphObjectType } from '../../../models/NetworkModel'
import { SearchButtons } from './SearchButtons'
import { SearchModeSelector } from './SearchModeSelector'
import { SearchOperatorSelector } from './SearchOperatorSelector'
import { SearchTargetSelector } from './SearchTargetSelector'

interface SettingsProps {
  open: boolean
  anchorEl: HTMLElement | null
  setAnchorEl: (anchorEl: HTMLElement | null) => void
  startSearch: () => void
  searchTargets: Record<GraphObjectType, boolean>
  setSearchTargets: (searchTargets: Record<GraphObjectType, boolean>) => void
}

export const Settings = ({
  open,
  anchorEl,
  setAnchorEl,
  startSearch,
  searchTargets,
  setSearchTargets,
}: SettingsProps): JSX.Element => {
  const theme: Theme = useTheme()

  const handleClose = (): void => {
    setAnchorEl(null)
  }

  return (
    <Popover
      data-testid="search-settings-popover"
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
    >
      <Grid
        container
        spacing={0}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          padding: theme.spacing(2),
          width: '30vw',
        }}
      >
        <Grid container xs={12}>
          <Grid xs={4}>
            <SearchOperatorSelector />
          </Grid>
          <Grid xs={4}>
            <SearchTargetSelector
              searchTargets={searchTargets}
              setSearchTargets={setSearchTargets}
            />
          </Grid>
          <Grid xs={4}>
            <SearchModeSelector />
          </Grid>
        </Grid>
        <Grid container xs={12}>
          <SearchButtons handleClose={handleClose} startSearch={startSearch} />
        </Grid>
      </Grid>
    </Popover>
  )
}
