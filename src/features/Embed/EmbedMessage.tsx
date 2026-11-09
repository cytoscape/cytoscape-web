import { Box, Button, LinearProgress, Typography } from '@mui/material'
import { ReactElement } from 'react'

/** Label of the link from the embed to the editor. */
export const LINK_OUT_LABEL = 'Open in Cytoscape Web'

interface EmbedMessageProps {
  title: string
  detail?: string
  /** Shows the link to the editor when given. */
  linkOutUrl?: string
  showProgress?: boolean
}

/** A state of the embed other than a network on screen, filling the frame. */
export const EmbedMessage = ({
  title,
  detail,
  linkOutUrl,
  showProgress = false,
}: EmbedMessageProps): ReactElement => (
  <Box
    data-testid="embed-message"
    sx={{
      height: '100vh',
      display: 'grid',
      placeItems: 'center',
      p: 2,
      boxSizing: 'border-box',
      backgroundColor: (theme) => theme.palette.background.paper,
    }}
  >
    <Box sx={{ maxWidth: '32rem', textAlign: 'center' }}>
      <Typography variant="h6" component="h1" data-testid="embed-message-title">
        {title}
      </Typography>
      {detail !== undefined && (
        <Typography
          variant="body2"
          sx={{ mt: 1, color: (theme) => theme.palette.text.secondary }}
        >
          {detail}
        </Typography>
      )}
      {showProgress && <LinearProgress sx={{ mt: 2 }} />}
      {linkOutUrl !== undefined && (
        <Button
          data-testid="embed-message-link-out"
          variant="outlined"
          size="small"
          href={linkOutUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ mt: 2 }}
        >
          {LINK_OUT_LABEL}
        </Button>
      )}
    </Box>
  </Box>
)
