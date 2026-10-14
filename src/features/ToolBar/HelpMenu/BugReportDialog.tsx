import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Typography,
} from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'

import { CyDialog } from '@/components/CyDialog'
import { DialogCloseButton } from '@/components/DialogCloseButton'
import packageInfo from '../../../../package.json'

function getIssueEnvironment(): string {
  const cyVersion = packageInfo.version ? packageInfo.version : 'N/A'
  const userAgent = navigator.userAgent
  const osDetails = userAgent.includes('Windows')
    ? 'Windows'
    : userAgent.includes('Mac')
      ? 'Mac'
      : userAgent.includes('Linux')
        ? 'Linux'
        : userAgent.includes('Android')
          ? 'Android'
          : userAgent.includes('iPhone')
            ? 'iPhone'
            : 'Unknown'
  const osVersion = userAgent.includes('Windows')
    ? userAgent.match(/Windows NT (\d+\.\d+)/)?.[1]
    : userAgent.includes('Mac')
      ? userAgent.match(/Mac OS X (\d+_\d+)/)?.[1]
      : userAgent.includes('Linux')
        ? userAgent.match(/Linux (\d+\.\d+)/)?.[1]
        : userAgent.includes('Android')
          ? userAgent.match(/Android (\d+\.\d+)/)?.[1]
          : userAgent.includes('iPhone')
            ? userAgent.match(/iPhone OS (\d+_\d+)/)?.[1]
            : 'N/A'

  const osVersionInfo = osDetails + ' ' + osVersion

  const browserInfo = navigator.userAgent
  const browserVersion = browserInfo.match(
    /(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i,
  )
  // A user agent with none of these tokens (embedded webviews, jsdom) has no
  // match; report it as unknown rather than throwing inside the effect.
  const browserVersionInfo =
    browserVersion === null
      ? 'Unknown'
      : (browserVersion[1].toLowerCase() === 'trident'
          ? 'IE'
          : browserVersion[1]) +
        ' ' +
        browserVersion[2]

  return (
    'Cytoscape Web Version: ' +
    (cyVersion ? cyVersion : '') +
    '\n\nOperating System: ' +
    (osVersionInfo ? osVersionInfo : '') +
    '\n\nBrowser Version: ' +
    (browserVersionInfo ? browserVersionInfo : '')
  )
}

interface BugReportDialogProps {
  open: boolean
  onClose: () => void
}

/**
 * Help > Report a Bug. Owned by `HelpMenu`, not by the menu row, so it
 * outlives the menu that opened it (see `LicenseDialog`). Loads the
 * Atlassian issue collector the first time it opens.
 */
export const BugReportDialog = ({
  open,
  onClose,
}: BugReportDialogProps): ReactElement => {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setIsLoading(true)
      // Initialize Atlassian issue collector when dialog is opened
      ;(window as any).ATL_JQ_PAGE_PROPS = {
        triggerFunction: function (showCollectorDialog: () => void) {
          const triggerElement = document.getElementById('myCustomTrigger')
          if (triggerElement) {
            triggerElement.addEventListener('click', (e: Event) => {
              e.preventDefault()
              showCollectorDialog()
            })
            setIsLoading(false)
          }
        },
        // {{ edit_1 }} Adding fieldValues for the issue collector
        fieldValues: {
          summary: 'CyWeb: ',
          description:
            'How to reproduce the bug in Cytoscape Web:\n\n' +
            getIssueEnvironment(),
        },
      }

      const script = document.createElement('script')
      script.src =
        'https://cytoscape.atlassian.net/s/d41d8cd98f00b204e9800998ecf8427e-T/o2joag/b/24/a44af77267a987a660377e5c46e0fb64/_/download/batch/com.atlassian.jira.collector.plugin.jira-issue-collector-plugin:issuecollector/com.atlassian.jira.collector.plugin.jira-issue-collector-plugin:issuecollector.js?locale=en-US&collectorId=45488c8f'
      script.async = true
      document.body.appendChild(script)
    }
  }, [open])

  return (
    <CyDialog
      data-testid="bug-report-dialog"
      open={open}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ pr: 6 }}>Report a Bug</DialogTitle>
      <DialogCloseButton
        data-testid="bug-report-dialog-close-button"
        onClose={onClose}
      />
      <DialogContent>
        <Paper variant="filled" sx={{ p: 2 }}>
          <Typography variant="body1">Please tell us:</Typography>
          <Typography variant="body1" component="ol" sx={{ mt: 1, mb: 0 }}>
            <li>The steps that reproduce the bug.</li>
            <li>Any data we need to reproduce it, such as the network file.</li>
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2">
            Your Cytoscape Web version, operating system and browser are added
            to the report automatically.
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Before reporting, please check that you can reproduce the bug
            yourself.
          </Typography>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button
          data-testid="bug-report-dialog-cancel-button"
          variant="outlined"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          id="myCustomTrigger"
          data-testid="bug-report-dialog-report-button"
          variant="contained"
          color="warning"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Report a Bug'}
        </Button>
      </DialogActions>
    </CyDialog>
  )
}
