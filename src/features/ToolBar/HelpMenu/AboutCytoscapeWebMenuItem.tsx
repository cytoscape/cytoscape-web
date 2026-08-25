import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  Link,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material'
import React from 'react'

import { CyDialog } from '@/components/CyDialog'
import logo from '../../../assets/cytoscape.svg'
import packageInfo from '../../../../package.json'
import { getDatabaseVersion } from '../../../data/db'
import { logUi } from '../../../debug'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

// Release notes live on the GitHub releases index. The generic page is used
// (rather than a version-specific tag) so the link never 404s when the
// package version lags the latest published tag.
export const RELEASE_NOTES_URL =
  'https://github.com/cytoscape/cytoscape-web/releases'

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
      <CyDialog dismiss="lightweight" open={open} onClose={handleCloseDialog}>
        <DialogContent sx={{ minWidth: 360 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <img
              src={logo}
              alt="Cytoscape Web logo"
              style={{ width: 40, height: 40 }}
            />
            <Typography variant="h6">Cytoscape Web</Typography>
          </Box>
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
            <Typography
              variant="body1"
              sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              Version:&nbsp;
              <Tooltip title="View release notes on GitHub">
                <Link
                  data-testid="about-version-link"
                  href={RELEASE_NOTES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.25,
                  }}
                >
                  {packageInfo.version}
                  <OpenInNewIcon sx={{ fontSize: 14 }} />
                </Link>
              </Tooltip>
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
          <Button variant="contained" onClick={handleCloseDialog}>
            Close
          </Button>
        </DialogActions>
      </CyDialog>
    </>
  )
}
