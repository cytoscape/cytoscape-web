import { styled } from '@mui/material/styles'

export const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.spacing(2),
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.background.paper,
  marginLeft: 0,
  height: 32,
  width: '30vw',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))
