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

/**
 * CW-436: string and numeric values (e.g. node label text) do not fit in the
 * fixed 30x30 swatch and get clipped. This variant reads like a compact text
 * field: it keeps the swatch height for alignment but grows horizontally (up to
 * a max width) and truncates overflow with an ellipsis.
 */
export const VisualPropertyTextViewBox = styled(Box)(({ theme }) => ({
  minHeight: 30,
  minWidth: 30,
  maxWidth: 160,
  padding: '0 8px',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 4,
  boxShadow: theme.shadows[2],
  '&:hover': {
    cursor: 'pointer',
    boxShadow: theme.shadows[4],
  },
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  '& p': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
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
