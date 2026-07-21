import CloseIcon from '@mui/icons-material/Close'
import { Box, IconButton, Paper, Typography } from '@mui/material'
import { JSX } from 'react'

import { LayoutToolsPanel } from './LayoutToolsPanel'
import { useLayoutToolsPanelStore } from './store/layoutToolsPanelStore'

/**
 * Floating Layout Tools panel shown in the lower-left corner of the network
 * canvas (CW-540), mirroring Cytoscape Desktop. Visibility is toggled from the
 * Layout menu. Mirrors the FloatingToolBar's absolute positioning so it sits
 * relative to the renderer.
 */
export const FloatingLayoutToolsPanel = (): JSX.Element | null => {
  const open = useLayoutToolsPanelStore((state) => state.open)
  const setOpen = useLayoutToolsPanelStore((state) => state.setOpen)

  if (!open) {
    return null
  }

  return (
    <Paper
      data-testid="floating-layout-tools-panel"
      elevation={4}
      sx={{
        position: 'absolute',
        bottom: '1em',
        left: '1em',
        zIndex: 1,
        width: 300,
        maxWidth: '80%',
        borderRadius: '0.5em',
        border: (theme) => `1px solid ${theme.palette.grey[800]}`,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1,
          py: 0.5,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="subtitle2">Layout Tools</Typography>
        <IconButton
          data-testid="floating-layout-tools-close"
          size="small"
          aria-label="Close layout tools"
          onClick={() => setOpen(false)}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ p: 1 }}>
        <LayoutToolsPanel />
      </Box>
    </Paper>
  )
}
