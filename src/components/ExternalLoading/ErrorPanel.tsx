import { ReactElement } from 'react'
import { Box } from '@mui/material'

interface ErrorPanelProps {
  message: string
}

export const ErrorPanel = (props: ErrorPanelProps): ReactElement => {
  return (
    <Box
      sx={{ width: '100%', height: '100%', display: 'grid', padding: '1em' }}
    >
      <Box sx={{ margin: 'auto' }}>
        <h2>{props.message}</h2>
      </Box>
    </Box>
  )
}
