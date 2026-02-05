import { styled } from '@mui/material/styles'

export const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.common.white,
  marginLeft: 0,
  height: 32,
  width: '30vw',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))
