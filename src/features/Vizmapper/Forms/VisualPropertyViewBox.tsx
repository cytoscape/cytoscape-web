import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'

export const VisualPropertyViewBox = styled(Box)(({ theme }) => ({
  height: 30,
  width: 30,
  border: theme.palette.mode === 'dark' ? `1px solid ${theme.palette.divider}` : 'none',
  borderRadius: '20%',
  boxShadow: theme.shadows[2],
  '&:hover': {
    cursor: 'pointer',
    boxShadow: theme.shadows[4],
  },
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}))

export const EmptyVisualPropertyViewBox = styled(Box)(({ theme }) => ({
  height: 30,
  width: 30,
  backgroundColor: theme.palette.action.disabledBackground,
  boxShadow: theme.shadows[2],
  cursor: 'pointer',
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
  borderRadius: '20%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}))
