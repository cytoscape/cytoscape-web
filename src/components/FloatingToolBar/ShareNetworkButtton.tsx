import { Alert, IconButton, Snackbar, Tooltip } from '@mui/material'
import { Share } from '@mui/icons-material'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useState } from 'react'

export const ShareNetworkButton = (): JSX.Element => {
  const [open, setOpen] = useState(false)
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const copyTextToClipboard = async (text: string): Promise<void> => {
    if ('clipboard' in navigator) {
      return await navigator.clipboard.writeText(text)
    }
  }
  const handleClick = (): void => {
    const server = window.location.origin
    void copyTextToClipboard(`${server}/network/${currentNetworkId}`).then(
      () => {
        // Notify user that the sharable URL has been copied to clipboard
        setOpen(true)
      },
    )
  }

  const handleClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string,
  ): void => {
    if (reason === 'clickaway') {
      return
    }

    setOpen(false)
  }

  return (
    <>
      <Tooltip
        title={`Share this network (copy URL to clipboard)`}
        placement="top"
        arrow
      >
        <IconButton
          onClick={handleClick}
          aria-label="share"
          size="small"
          disableFocusRipple={true}
        >
          <Share fontSize="inherit" />
        </IconButton>
      </Tooltip>
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={open}
        autoHideDuration={3000}
        onClose={handleClose}
      >
        <Alert onClose={handleClose} severity="success" sx={{ width: '100%' }}>
          URL for sharing this network has been copied!
        </Alert>
      </Snackbar>
    </>
  )
}
