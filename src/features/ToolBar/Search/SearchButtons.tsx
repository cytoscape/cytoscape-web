import SearchIcon from '@mui/icons-material/Search'
import { Box, Button } from '@mui/material'

interface SearchButtonsProps {
  handleClose: () => void
  startSearch: () => void
}
/**
 * A component contains search and cancel buttons.
 */
export const SearchButtons = ({
  handleClose,
  startSearch,
}: SearchButtonsProps): JSX.Element => {
  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: (theme) => theme.spacing(1),
        padding: 0,
        mt: 4,
      }}
    >
      <Button
        data-testid="search-settings-close-button"
        variant="outlined"
        onClick={handleClose}
      >
        Close
      </Button>
      <Button
        data-testid="search-settings-search-button"
        variant="contained"
        startIcon={<SearchIcon />}
        onClick={startSearch}
      >
        Search
      </Button>
    </Box>
  )
}
