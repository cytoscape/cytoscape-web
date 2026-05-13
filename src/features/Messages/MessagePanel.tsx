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
      data-testid={props['data-testid']}
      sx={{
        width: '100%',
        height: '100%',
        display: 'grid',
        padding: '1em',
        backgroundColor: (theme) => theme.palette.background.paper,
        borderRadius: (theme) => theme.spacing(1),
      }}
    >
      <Box
        sx={{
          margin: 'auto',
          color: (theme) => theme.palette.text.disabled,
          borderRadius: (theme) => theme.spacing(1),
        }}
      >
        <h2>{props.message}</h2>
        <h6>{props.subMessage}</h6>
        {props.showProgress ?? false ? <LinearProgress /> : null}
      </Box>
    </Box>
  )
}
