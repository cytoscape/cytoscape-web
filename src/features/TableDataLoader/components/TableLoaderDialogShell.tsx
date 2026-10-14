import CloseIcon from '@mui/icons-material/Close'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit'
import {
  Box,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import { ReactNode, useState } from 'react'

import { CyDialog } from '@/components/CyDialog'

export interface TableLoaderDialogShellProps {
  show: boolean
  title: string
  onClose: () => void
  /** Prefix for the modal / fullscreen-toggle data-testids. */
  testIdPrefix: string
  minHeight: number
  minWidth: number
  children: ReactNode
}

/**
 * Shared dialog shell for the table-loader wizards: a title bar with a
 * fullscreen toggle and close button over free-sized content. Replaces the
 * Mantine Modal both forms used.
 */
export function TableLoaderDialogShell(
  props: TableLoaderDialogShellProps,
): JSX.Element {
  const { show, title, onClose, testIdPrefix, minHeight, minWidth, children } =
    props
  const [fullScreen, setFullScreen] = useState(false)

  return (
    <CyDialog
      data-testid={`${testIdPrefix}-modal`}
      open={show}
      fullScreen={fullScreen}
      maxWidth={false}
      aria-labelledby={`${testIdPrefix}-dialog-title`}
      sx={{ zIndex: 2000 }}
    >
      <DialogTitle
        id={`${testIdPrefix}-dialog-title`}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1,
        }}
      >
        <Typography
          component="span"
          variant="h6"
          sx={{ color: 'text.secondary' }}
        >
          {title}
        </Typography>
        <Box>
          {fullScreen ? (
            <Tooltip title="Exit Fullscreen">
              <IconButton
                aria-label="Exit fullscreen"
                data-testid={`${testIdPrefix}-exit-fullscreen-button`}
                onClick={() => setFullScreen(false)}
              >
                <FullscreenExitIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Fullscreen">
              <IconButton
                aria-label="Fullscreen"
                data-testid={`${testIdPrefix}-fullscreen-button`}
                onClick={() => setFullScreen(true)}
              >
                <FullscreenIcon />
              </IconButton>
            </Tooltip>
          )}
          <IconButton
            aria-label="Close"
            data-testid={`${testIdPrefix}-close-button`}
            onClick={onClose}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ minHeight, minWidth, p: 1 }}>{children}</Box>
      </DialogContent>
    </CyDialog>
  )
}
