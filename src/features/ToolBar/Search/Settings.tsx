import { Theme, Unstable_Grid2 as Grid, useTheme } from '@mui/material'
import { Popover } from '@mui/material'

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
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <Grid
        container
        spacing={0}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          padding: theme.spacing(2),
        }}
      >
        <Grid
          container
          spacing={6}
          justifyContent="space-between"
          justifyItems="flex-start"
          alignItems="flex-start"
          alignContent="flex-start"
          sx={{ px: 1 }}
        >
          <Grid>
            <SearchOperatorSelector />
          </Grid>
          <Grid>
            <SearchTargetSelector
              searchTargets={searchTargets}
              setSearchTargets={setSearchTargets}
            />
          </Grid>
          <Grid>
            <SearchModeSelector />
          </Grid>
        </Grid>
        <Grid container sx={{ mt: 2 }}>
          <SearchButtons handleClose={handleClose} startSearch={startSearch} />
        </Grid>
      </Grid>
    </Popover>
  )
}
