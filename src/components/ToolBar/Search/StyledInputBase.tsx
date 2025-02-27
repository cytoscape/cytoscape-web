import { InputBase } from '@mui/material'
import { styled } from '@mui/material/styles'

export const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(1)})`,
    transition: theme.transitions.create('width'),
    height: '100%',
    width: '100%',
    fontSize: '0.875rem',
  },
  flexGrow: 1,
}))
