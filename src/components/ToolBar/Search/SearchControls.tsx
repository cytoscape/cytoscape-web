import { Box } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import TuneIcon from '@mui/icons-material/Tune'
import DeleteIcon from '@mui/icons-material/Delete'

interface SearchControlsProps {
  searchTerm: string
  setSearchTerm: (searchTerm: string) => void
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
  setSearchTerm,
  startSearch,
  clearSearch,
}: SearchControlsProps): JSX.Element => {
  const handleAdvanced = (): void => {
    console.log('ADVANCED SEARCH')
  }

  return (
    <Box sx={baseStyle}>
      {searchTerm !== '' ? (
        <DeleteIcon sx={{ cursor: 'pointer' }} onClick={clearSearch} />
      ) : null}
      <SearchIcon sx={{ cursor: 'pointer' }} onClick={startSearch} />
      <TuneIcon sx={{ cursor: 'pointer' }} onClick={handleAdvanced} />
    </Box>
  )
}
