import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import {
  Box,
  Button,
  DialogContent,
  DialogTitle,
  Link,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material'
import { ReactElement } from 'react'

import { CyDialog } from '@/components/CyDialog'
import { DialogCloseButton } from '@/components/DialogCloseButton'
import logo from '../../../assets/cytoscape.svg'
import packageInfo from '../../../../package.json'
import { getDatabaseVersion } from '../../../data/db'
import { logUi } from '../../../debug'

export const CODE_REPO_URL = 'https://github.com/cytoscape/cytoscape-web'
export const CYTOSCAPE_HOME_URL = 'https://home.cytoscape.org/'
export const CYTOSCAPE_DESKTOP_URL = 'https://desktop.cytoscape.org/'
export const ROADMAP_URL =
  'https://github.com/cytoscape/cytoscape-home/blob/main/roadmap.md#web'
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
      <DialogTitle sx={{ pr: 6 }}>About Cytoscape Web</DialogTitle>
      <DialogCloseButton
        data-testid="about-dialog-close-button"
        onClose={onClose}
      />
      {/* No minimum below `sm`: under ~424px the paper is narrower than 360px
          and the content would scroll sideways. */}
      <DialogContent sx={{ minWidth: { xs: 0, sm: 360 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
          }}
        >
          <Box
            component="img"
            src={logo}
            alt="Cytoscape Web logo"
            sx={{ width: 300, height: 'auto' }}
          />
          <Box sx={{ ml: 2 }}>
            <Typography variant="body1" component="p">
              An{' '}
              <Link
                href={CODE_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                open-source
              </Link>{' '}
              platform for network visualization and analysis, bringing{' '}
              <Link
                href={CYTOSCAPE_DESKTOP_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Cytoscape
              </Link>{' '}
              workflows directly to the web.
            </Typography>
            <Typography variant="body1" component="p" sx={{ mt: 2 }}>
              For more information about the Cytoscape ecosystem, visit our{' '}
              <Link
                href={CYTOSCAPE_HOME_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                website
              </Link>
              .
            </Typography>
          </Box>
        </Box>
        <Paper
          variant="filled"
          sx={{
            mt: 4,
            p: 2,
            color: (theme) => theme.palette.text.secondary,
          }}
        >
          <Typography variant="body2" gutterBottom>
            Version:&nbsp;
            <Tooltip title="View release notes on GitHub">
              <Link
                data-testid="about-version-link"
                href={RELEASE_NOTES_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {packageInfo.version}
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
        <Typography
          variant="caption"
          component="div"
          sx={{ textAlign: 'right' }}
        >
          See our{' '}
          <Link href={ROADMAP_URL} target="_blank" rel="noopener noreferrer">
            roadmap
          </Link>{' '}
          for what&apos;s planned next for Cytoscape Web.
        </Typography>
      </DialogContent>
    </CyDialog>
  )
}
