import { ReactElement } from 'react'
import Box from '@mui/material/Box'

interface MessagePanelProps {
  message: string
}

export const MessagePanel = (props: MessagePanelProps): ReactElement => {
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
