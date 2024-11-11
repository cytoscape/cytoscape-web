import { Search } from "@mui/icons-material"
import { Box, IconButton, TextField } from "@mui/material"
import { ReactElement, useState } from "react"

export const NetworkSeachField = (props: {
  startSearch: (searchValue: string) => Promise<void>
  handleClose: () => void
}): ReactElement => {
  const [searchValue, setSearchValue] = useState<string>('')

  // Execute search when enter key is pressed
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    event.stopPropagation()
    if (event.key === 'Enter') {
      void props.startSearch(searchValue)
    }

    if (event.key === 'Escape') {
      props.handleClose()
    }
  }
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'end',
      }}
    >
      <TextField
        autoFocus
        margin="dense"
        label="Search NDEx"
        type="text"
        fullWidth
        variant="standard"
        onChange={(e) => setSearchValue(e.target.value)}
        value={searchValue}
        onKeyDown={handleKeyDown}
      />
      <IconButton onClick={() => props.startSearch(searchValue)}>
        <Search />
      </IconButton>
    </Box>
  )
}