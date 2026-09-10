import ContentCopyIcon from '@mui/icons-material/ContentCopy'
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
import { ReactElement } from 'react'

import { CyDialog } from '@/components/CyDialog'
import logo from '../../../assets/cytoscape.svg'
import packageInfo from '../../../../package.json'
import { getDatabaseVersion } from '../../../data/db'
import { logUi } from '../../../debug'

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

interface AboutDialogProps {
  open: boolean
  onClose: () => void
}

/**
 * Help > About Cytoscape Web. Owned by `HelpMenu`, not by the menu row, so
 * it outlives the menu that opened it (see `LicenseDialog`).
 */
export const AboutDialog = ({
  open,
  onClose,
}: AboutDialogProps): ReactElement => {
  const commitHash =
    process.env.REACT_APP_GIT_COMMIT && process.env.REACT_APP_LAST_COMMIT_TIME
      ? process.env.REACT_APP_GIT_COMMIT.substring(0, 7) +
        '-' +
        formatDateForHash(process.env.REACT_APP_LAST_COMMIT_TIME)
      : 'N/A'

  const buildDate = process.env.REACT_APP_BUILD_TIME
    ? new Date(process.env.REACT_APP_BUILD_TIME).toLocaleString()
    : 'N/A'

  const handleCopyInfo = (): void => {
    const infoToCopy = `Version: ${packageInfo.version}\nBuild ID: ${commitHash}\nBuild Date: ${buildDate}\nCache Version: ${getDatabaseVersion()}`
    navigator.clipboard.writeText(infoToCopy).catch((err) => {
      logUi.error(`[${handleCopyInfo.name}]: Failed to copy: `, err)
    })
  }

  return (
    <CyDialog data-testid="about-dialog" open={open}>
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
        <Button
          data-testid="about-dialog-close-button"
          variant="contained"
          onClick={onClose}
        >
          Close
        </Button>
      </DialogActions>
    </CyDialog>
  )
}
