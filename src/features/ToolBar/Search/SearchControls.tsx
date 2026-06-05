import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import TuneIcon from '@mui/icons-material/Tune'
import { Box, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { GraphObjectType } from '../../../models/NetworkModel'
import { Settings } from './Settings'

interface SearchControlsProps {
  searchTerm: string
  startSearch: () => void
  clearSearch: () => void
  anchorEl: HTMLElement | null
  setAnchorEl: (anchorEl: HTMLElement | null) => void
  handleOpenSettings: () => void
  searchTargets: Record<GraphObjectType, boolean>
  setSearchTargets: (searchTargets: Record<GraphObjectType, boolean>) => void
}

const baseStyle = {
  height: '100%',
  paddingRight: '1em',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const SearchControls = ({
  searchTerm,
  startSearch,
  clearSearch,
  anchorEl,
  setAnchorEl,
  handleOpenSettings,
  searchTargets,
  setSearchTargets,
}: SearchControlsProps): JSX.Element => {
  const open = Boolean(anchorEl)

  const theme = useTheme()

  return (
    <>
      <Box sx={baseStyle}>
        {searchTerm !== '' ? (
          <DeleteIcon
            data-testid="search-clear-button"
            sx={{ cursor: 'pointer', color: theme.palette.text.primary }}
            onClick={clearSearch}
          />
        ) : null}

        <IconButton
          data-testid="search-submit-button"
          sx={{ color: theme.palette.text.primary }}
          onClick={startSearch}
        >
          <SearchIcon />
        </IconButton>
        <IconButton
          data-testid="search-settings-button"
          sx={{ color: theme.palette.text.primary }}
          onClick={handleOpenSettings}
        >
          <TuneIcon />
        </IconButton>
      </Box>
      <Settings
        open={open}
        anchorEl={anchorEl}
        setAnchorEl={setAnchorEl}
        startSearch={startSearch}
        searchTargets={searchTargets}
        setSearchTargets={setSearchTargets}
      />
    </>
  )
}
