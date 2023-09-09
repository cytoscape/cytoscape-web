import { Box } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import TuneIcon from '@mui/icons-material/Tune'
import DeleteIcon from '@mui/icons-material/Delete'

interface SearchControlsProps {
  searchTerm: string
  setSearchTerm: (searchTerm: string) => void
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
}: SearchControlsProps): JSX.Element => {
  const handleSearch = (): void => {
    console.log('SEARCHING', searchTerm)
  }

  const handleAdvanced = (): void => {
    console.log('ADVANCED SEARCH')
  }

  const handleClear = (): void => {
    setSearchTerm('')
  }

  return (
    <Box sx={baseStyle}>
      {searchTerm !== '' ? (
        <DeleteIcon sx={{ cursor: 'pointer' }} onClick={handleClear} />
      ) : null}
      <SearchIcon sx={{ cursor: 'pointer' }} onClick={handleSearch} />
      <TuneIcon sx={{ cursor: 'pointer' }} onClick={handleAdvanced} />
    </Box>
  )
}
