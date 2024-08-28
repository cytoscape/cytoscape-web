/* eslint-disable react/no-unescaped-entities */
import { MenuItem, Dialog, DialogContent, DialogTitle, Button, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { ReactElement, useState, useEffect } from 'react'
import packageInfo from '../../../../package.json';


function getIssueEnvironment(): string {
    const cyVersion = packageInfo.version ? packageInfo.version : "N/A";
    const userAgent = navigator.userAgent;
    const osDetails = userAgent.includes("Windows") ? "Windows" : 
                       userAgent.includes("Mac") ? "Mac" : 
                       userAgent.includes("Linux") ? "Linux" : 
                       userAgent.includes("Android") ? "Android" : 
                       userAgent.includes("iPhone") ? "iPhone" : 
                       "Unknown";
    const osVersion = userAgent.includes("Windows") ? userAgent.match(/Windows NT (\d+\.\d+)/)?.[1] : 
                        userAgent.includes("Mac") ? userAgent.match(/Mac OS X (\d+_\d+)/)?.[1] : 
                        userAgent.includes("Linux") ? userAgent.match(/Linux (\d+\.\d+)/)?.[1] : 
                        userAgent.includes("Android") ? userAgent.match(/Android (\d+\.\d+)/)?.[1] : 
                        userAgent.includes("iPhone") ? userAgent.match(/iPhone OS (\d+_\d+)/)?.[1] : 
                        "N/A";

    const osVersionInfo = osDetails + ' ' + osVersion;

    const browserInfo = navigator.userAgent;
    const browserVersion = browserInfo.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    const browser = browserVersion[1].toLowerCase() === 'trident' ? 'IE' : browserVersion[1];
    const version = browserVersion[2];
    const browserVersionInfo = browser + ' ' + version;


    return "Cytoscape Web Version: " + (cyVersion ? cyVersion : "") + "\n\nOperating System: " + (osVersionInfo ? osVersionInfo : "") + "\n\nBrowser Version: " + (browserVersionInfo ? browserVersionInfo : "");
}

interface BugReportMenuItemProps {
  handleClose?: () => void;
}

export const BugReportMenuItem = ({ handleClose }: BugReportMenuItemProps): ReactElement => {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleOpen = () => {
    setOpen(true)
  }

  const handleDialogClose = () => {
    setOpen(false)
    if (handleClose) {
      handleClose();
    }
  }

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      // Initialize Atlassian issue collector when dialog is opened
      (window as any).ATL_JQ_PAGE_PROPS = {
        triggerFunction: function (showCollectorDialog: () => void) {
          const triggerElement = document.getElementById('myCustomTrigger');
          if (triggerElement) {
            triggerElement.addEventListener('click', (e: Event) => {
              e.preventDefault();
              showCollectorDialog();
            });
            setIsLoading(false);
          }
          
        },
        // {{ edit_1 }} Adding fieldValues for the issue collector
        fieldValues: {
          summary: "",
          description: "How to reproduce the bug in Cytoscape Web:\n\n" + getIssueEnvironment()
        }
      }

      const script = document.createElement('script')
      script.src = 'https://cytoscape.atlassian.net/s/d41d8cd98f00b204e9800998ecf8427e-T/o2joag/b/24/a44af77267a987a660377e5c46e0fb64/_/download/batch/com.atlassian.jira.collector.plugin.jira-issue-collector-plugin:issuecollector/com.atlassian.jira.collector.plugin.jira-issue-collector-plugin:issuecollector.js?locale=en-US&collectorId=45488c8f'
      script.async = true
      document.body.appendChild(script)
    }
  }, [open])

  return (
    <>
      <MenuItem onClick={handleOpen}>
        Report a Bug
      </MenuItem>
      <Dialog open={open} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Report a Bug
          <IconButton
            aria-label="close"
            onClick={handleDialogClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <p className="lead">
            <b>TELL US: 1)</b> How to reproduce the bug. <b>2)</b> What operating system you're using <b>3)</b> What
            Cytoscape Web version you're using. <b>4)</b> What browser you're using. Try to reproduce the bug
            yourself <b>before</b> you report it. Be sure to include any data we may need to reproduce the bug.
          </p>
          <div id="myCustomTrigger">
            <Button variant="contained" color="warning" fullWidth disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Click here to report a bug'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}