import { Box, IconButton } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import TuneIcon from '@mui/icons-material/Tune'
import DeleteIcon from '@mui/icons-material/Delete'
import { Settings } from './Settings'
import { GraphObjectType } from '../../../models/NetworkModel'

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

  return (
    <>
      <Box sx={baseStyle}>
        {searchTerm !== '' ? (
          <DeleteIcon sx={{ cursor: 'pointer' }} onClick={clearSearch} />
        ) : null}

        <IconButton color="inherit" onClick={startSearch}>
          <SearchIcon />
        </IconButton>
        <IconButton color="inherit" onClick={handleOpenSettings}>
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
