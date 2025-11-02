import { Box, Button, Theme, useTheme } from '@mui/material'

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
  const theme: Theme = useTheme()

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: theme.spacing(1),
        padding: 0,
        margin: 0,
      }}
    >
      <Button color="inherit" onClick={handleClose}>
        Close
      </Button>
      <Button color="primary" variant="contained" onClick={startSearch}>
        Search
      </Button>
    </Box>
  )
}
