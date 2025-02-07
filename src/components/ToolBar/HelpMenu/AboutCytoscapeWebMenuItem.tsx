import React from 'react'
import {
  MenuItem,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material'
import { BaseMenuProps } from '../BaseMenuProps'
import packageInfo from '../../../../package.json'
import { getDatabaseVersion } from '../../../store/persist/db'

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
  props: BaseMenuProps,
): React.ReactElement => {
  const [open, setOpen] = React.useState(false)

  const handleOpenDialog = (): void => {
    setOpen(true)
  }

  const handleCopyInfo = () => {
    const infoToCopy = `Version: ${packageInfo.version}\nBuild ID: ${commitHash}\nBuild Date: ${buildDate}\nCache Version: ${getDatabaseVersion()}`
    navigator.clipboard.writeText(infoToCopy).catch((err) => {
      console.error('Failed to copy: ', err)
    })
  }

  const handleCloseDialog = (): void => {
    setOpen(false)
    props.handleClose()
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
      <MenuItem onClick={handleOpenDialog}>About Cytoscape Web</MenuItem>
      <Dialog open={open} onClose={handleCloseDialog}>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Cytoscape Web
          </Typography>
          <Typography variant="body1" gutterBottom>
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
          <Typography variant="body1" color="textSecondary">
            A web-based network visualization and analysis platform
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Close
          </Button>
          <Button
            onClick={handleCopyInfo}
            sx={{
              color: '#FFFFFF',
              backgroundColor: '#337ab7',
              '&:hover': {
                backgroundColor: '#285a9b',
              },
              '&:disabled': {
                backgroundColor: 'transparent',
              },
            }}
          >
            Copy
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
