import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Paper,
  Typography,
} from '@mui/material'
import React from 'react'

import packageInfo from '../../../../package.json'
import { getDatabaseVersion } from '../../../data/db'
import { logUi } from '../../../debug'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'


const formatDateForHash = (dateString: string): string => {
  const date = new Date(dateString)

  const pad = (num: number) => String(num).padStart(2, '0')

  const month = pad(date.getMonth() + 1) // Months are zero-based
  const day = pad(date.getDate())
  const year = date.getFullYear()
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())

  return `${month}-${day}-${year}-${hours}-${minutes}-${seconds}`
}

export const AboutCytoscapeWebMenuItem = (
  props: BaseMenuItemProps,
): React.ReactElement => {
  const [open, setOpen] = React.useState(false)

  const handleOpenDialog = (): void => {
    setOpen(true)
  }

  const handleCopyInfo = () => {
    const infoToCopy = `Version: ${packageInfo.version}\nBuild ID: ${commitHash}\nBuild Date: ${buildDate}\nCache Version: ${getDatabaseVersion()}`
    navigator.clipboard.writeText(infoToCopy).catch((err) => {
      logUi.error(`[${handleCopyInfo.name}]: Failed to copy: `, err)
    })
  }

  const handleCloseDialog = (): void => {
    setOpen(false)
    props.onClick()
  }

  const commitHash =
    process.env.REACT_APP_GIT_COMMIT && process.env.REACT_APP_LAST_COMMIT_TIME
      ? process.env.REACT_APP_GIT_COMMIT.substring(0, 7) +
        '-' +
        formatDateForHash(process.env.REACT_APP_LAST_COMMIT_TIME)
      : 'N/A'

  const buildDate = process.env.REACT_APP_BUILD_TIME
    ? new Date(process.env.REACT_APP_BUILD_TIME).toLocaleString()
    : 'N/A'

  return (
    <>
      <DropdownMenuItem
        label="About Cytoscape Web"
        icon={<InfoOutlinedIcon />}
        onClick={handleOpenDialog}
      />
      <Dialog open={open} onClose={handleCloseDialog}>
        <DialogContent>
          <Typography variant="h6" sx={{ mb: 4 }}>
            Cytoscape Web
          </Typography>
          <Typography variant="body1">
            A web-based network visualization and analysis platform.
          </Typography>
          <Paper
            variant="filled"
            sx={{
              mt: 4,
              p: 2,
              color: (theme) => theme.palette.text.secondary,
            }}
          >
            <Typography variant="body1" sx={{ mb: 1 }}>
              Version: {packageInfo.version}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Build ID: {commitHash}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Build Date: {buildDate}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Cache Version: {getDatabaseVersion()}
            </Typography>
            <Button
              onClick={handleCopyInfo}
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              sx={{ mt: 2 }}
            >
              Copy
            </Button>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={handleCloseDialog}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
