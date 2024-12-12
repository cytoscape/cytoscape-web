import React, { useContext, useEffect, useRef, useState } from 'react'
import Button from '@mui/material/Button'
import { Divider, Snackbar, Alert } from '@mui/material'
import { KeycloakContext } from '../../../bootstrap'
import { AppConfigContext } from '../../../AppConfigContext'
import { RemoveAllNetworksMenuItem } from './RemoveAllNetworksMenuItem'
import { RemoveNetworkMenuItem } from './RemoveNetworkMenuItem'
import { LoadDemoNetworksMenuItem } from './LoadDemoNetworksMenuItem'
import { LoadFromNdexMenuItem } from './LoadFromNdexMenuItem'
import { SaveToNDExMenuItem } from './SaveToNDExMenuItem'
import { CopyNetworkToNDExMenuItem } from './CopyNetworkToNDExMenuItem'
import { UploadNetworkMenuItem } from './ImportNetworkFromFileMenuItem'
import { DownloadNetworkMenuItem } from './DownloadNetworkMenuItem'
import { OpenNetworkInCytoscapeMenuItem } from './OpenNetworkInCytoscapeMenuItem'
import { ResetLocalWorkspaceMenuItem } from './ResetLocalWorkspace'
import { SaveWorkspaceToNDExMenuItem } from './SaveWorkspaceToNDEx'
import { SaveWorkspaceToNDExOverwriteMenuItem } from './SaveWorkspaceToNDExOverwrite'
import { LoadWorkspaceMenuItem } from './LoadWorkspaceMenuItem'
import { DropdownMenuProps } from '../DropdownMenuProps'
import { JoinTableToNetworkMenuItem } from '../../../features/TableDataLoader/components/JoinTableToNetwork/JoinTableToNetworkMenuItem'
import { TieredMenu } from 'primereact/tieredmenu'
import { PrimeReactProvider } from 'primereact/api'
import { OverlayPanel } from 'primereact/overlaypanel'
import { ExportImageMenuItem } from './ExportNetworkToImage/ExportNetworkToImageMenuItem'
import { fetchMyWorkspaces } from '../../../utils/ndex-utils'
import { useCredentialStore } from '../../../store/CredentialStore'

import './menuItem.css'

export const DataMenu: React.FC<DropdownMenuProps> = (props: DropdownMenuProps) => {
  const { label } = props
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true)
  const [existingWorkspace, setExistingWorkspace] = useState<any[]>([])
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const client = useContext(KeycloakContext)
  const authenticated: boolean = client?.authenticated ?? false
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState<'info' | 'success' | 'error'>('info')

  const getToken = useCredentialStore((state) => state.getToken)
  const op = useRef(null)
  const open = Boolean(anchorEl)

  const handleClose = (): void => {
    ;(op.current as any)?.hide()
    setAnchorEl(null)
  }

  const handleSnackbarOpen = (message: string, severity: 'info' | 'success' | 'error' = 'info') => {
    setSnackbarMessage(message)
    setSnackbarSeverity(severity)
    setSnackbarOpen(true)
  }

  const handleSnackbarClose = () => {
    setSnackbarOpen(false)
  }

  useEffect(() => {
    if (authenticated) {
      setIsLoadingWorkspace(true)
      fetchMyWorkspaces(ndexBaseUrl, getToken)
        .then((resultArray) => {
          setExistingWorkspace(resultArray)
          setIsLoadingWorkspace(false)
        })
        .catch((error) => {
          console.error('Error:', error)
          handleSnackbarOpen('Failed to fetch workspaces from NDEx', 'error')
          setIsLoadingWorkspace(false)
        })
    } else {
      setIsLoadingWorkspace(false)
    }
  }, [])

  const menuItems = [
    {
      label: 'Open network(s) From NDEx...',
      template: <LoadFromNdexMenuItem handleClose={handleClose} />,
    },
    {
      label: 'Open workspace from NDEx...',
      template: <LoadWorkspaceMenuItem handleClose={handleClose} />,
    },
    {
      label: 'Open sample networks',
      template: <LoadDemoNetworksMenuItem handleClose={handleClose} />,
    },
    {
      label: 'Open in Cytoscape',
      template: () => (
        <OpenNetworkInCytoscapeMenuItem
          handleClose={handleClose}
          onSnackbarOpen={handleSnackbarOpen} // Pass Snackbar handler
        />
      ),
    },
    {
      label: 'Import',
      items: [
        {
          label: 'From File',
          template: <UploadNetworkMenuItem handleClose={handleClose} />,
        },
        {
          label: '',
          template: <Divider />,
        },
        {
          label: 'Import Table',
          template: () => (
            <JoinTableToNetworkMenuItem handleClose={handleClose} />
          ),
        },
      ],
    },
    {
      label: '',
      template: <Divider />,
    },
    {
      label: 'Save to NDEx',
      template: () => <SaveToNDExMenuItem handleClose={handleClose} />,
    },
    {
      label: 'Copy to NDEx',
      template: () => <CopyNetworkToNDExMenuItem handleClose={handleClose} />,
    },
    {
      label: 'Download',
      template: () => <DownloadNetworkMenuItem handleClose={handleClose} />,
    },
    {
      label: 'Save Workspace to NDEx (overwrite)',
      disabled: isLoadingWorkspace,
      template: () => (
        <SaveWorkspaceToNDExOverwriteMenuItem
          handleClose={handleClose}
          existingWorkspace={existingWorkspace}
        />
      ),
    },
    {
      label: 'Save Workspace to NDEx',
      disabled: isLoadingWorkspace,
      template: () => (
        <SaveWorkspaceToNDExMenuItem
          handleClose={handleClose}
          existingWorkspace={existingWorkspace}
        />
      ),
    },
    {
      label: 'Export',
      items: [
        {
          label: 'Network to Image...',
          template: <ExportImageMenuItem handleClose={handleClose} />,
        },
      ],
    },
    {
      label: '',
      template: <Divider />,
    },
    {
      label: 'Remove Current Network',
      template: () => <RemoveNetworkMenuItem handleClose={handleClose} />,
    },
    {
      label: 'Remove All Networks',
      template: () => <RemoveAllNetworksMenuItem handleClose={handleClose} />,
    },
    {
      label: '',
      template: <Divider />,
    },
    {
      label: 'Reset Local Workspace',
      template: () => <ResetLocalWorkspaceMenuItem handleClose={handleClose} />,
    },
  ]

  return (
    <PrimeReactProvider>
      <Button
        sx={{
          color: 'white',
          textTransform: 'none',
        }}
        id={label}
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={(e) => (op.current as any)?.toggle(e)}
      >
        {label}
      </Button>
      <OverlayPanel ref={op} unstyled>
        <TieredMenu style={{ width: 350 }} model={menuItems} />
      </OverlayPanel>
      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </PrimeReactProvider>
  )
}
