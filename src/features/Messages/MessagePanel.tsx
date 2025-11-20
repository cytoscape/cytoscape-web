import { Box, LinearProgress } from '@mui/material'
import { ReactElement } from 'react'

interface MessagePanelProps {
  message: string
  subMessage?: string
  showProgress?: boolean
  'data-testid'?: string
}

export const MessagePanel = (props: MessagePanelProps): ReactElement => {
  return (
    <Box
      sx={{ width: '100%', height: '100%', display: 'grid', padding: '1em' }}
      data-testid={props['data-testid']}
    >
      <Box sx={{ margin: 'auto' }}>
        <h2>{props.message}</h2>
        <h6>{props.subMessage}</h6>
        {props.showProgress ?? false ? <LinearProgress /> : null}
      </Box>
    </Box>
  )
}
