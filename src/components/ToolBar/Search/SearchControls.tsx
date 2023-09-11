import { Box, IconButton } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import TuneIcon from '@mui/icons-material/Tune'
import DeleteIcon from '@mui/icons-material/Delete'
import { useState } from 'react'
import { Settings } from './Settings'

interface SearchControlsProps {
  searchTerm: string
  startSearch: () => void
  clearSearch: () => void
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
}: SearchControlsProps): JSX.Element => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)

  const handleOpenSettings = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setAnchorEl(event.currentTarget)
  }

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
      <Settings open={open} anchorEl={anchorEl} setAnchorEl={setAnchorEl} />
    </>
  )
}
