import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dropzone/styles.css'

import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import { debounce } from 'lodash'
import { MenuItem } from 'primereact/menuitem'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useDeleteCyNetwork } from '../../../data/hooks/useDeleteCyNetwork'
import { logUi } from '../../../debug'
import { RootMenu } from '../../../models/AppModel/RootMenu'
import { ConfirmationDialog } from '../../ConfirmationDialog'
import { JoinTableToNetworkMenuItem } from '../../TableDataLoader/components/JoinTableToNetwork/JoinTableToNetworkMenuItem'
import { useServiceAppMenu } from '../AppMenu/useServiceAppMenu'
import { DropdownMenu } from '../DropdownMenu'
import { FileUpload } from '../FileUpload'
import { CopyNetworkToNDExMenuItem } from './CopyNetworkToNDExMenuItem'
import { DownloadNetworkMenuItem } from './DownloadNetworkMenuItem'
import { ExportImageMenuItem } from './ExportNetworkToImage/DynamicExportImageMenuItem'
import { UploadNetworkMenuItem } from './ImportNetworkFromFileMenuItem'
import { LoadDemoNetworksMenuItem } from './LoadDemoNetworksMenuItem'
import { LoadFromNdexDialog } from './LoadFromNdexDialog'
import { LoadFromNdexMenuItem } from './LoadFromNdexMenuItem'
import LoadWorkspaceDialog from './LoadWorkspaceDialog'
import { LoadWorkspaceMenuItem } from './LoadWorkspaceMenuItem'
import { OpenNetworkInCytoscapeMenuItem } from './OpenNetworkInCytoscapeMenuItem'
import { RemoveAllNetworksMenuItem } from './RemoveAllNetworksMenuItem'
import { RemoveNetworkMenuItem } from './RemoveNetworkMenuItem'
import { ResetLocalWorkspaceMenuItem } from './ResetLocalWorkspace'
import { SaveToNDExMenuItem } from './SaveToNDExMenuItem'
import { SaveWorkspaceToNDExMenuItem } from './SaveWorkspaceToNDEx'
import { SaveWorkspaceToNDExOverwriteMenuItem } from './SaveWorkspaceToNDExOverwrite'


export const DataMenu = () => {
  const [open, setOpen] = useState(false)
  const [openNdexDialog, setOpenNdexDialog] = useState(false)
  const [openWorkspaceDialog, setOpenWorkspaceDialog] = useState(false)
  const [openFileUpload, setOpenFileUpload] = useState(false)
  const [openDeleteNetworkDialog, setOpenDeleteNetworkDialog] = useState(false)
  const [openDeleteAllNetworksDialog, setOpenDeleteAllNetworksDialog] = useState(false)
  const [openResetLocalWorkspaceDialog, setOpenResetLocalWorkspaceDialog] = useState(false)

  const handleClose = (): void => {
    setOpen(false)
  }

  const onBeforeRun = useCallback((): void => {
    setOpen(false)
  }, [])

  // Service apps whose cyWebMenuItem.root resolves to the Data menu.
  const { menuItems: serviceMenuItems, dialogs } = useServiceAppMenu(
    RootMenu.Data,
    onBeforeRun,
  )

  // NDEx loading handlers
  const handleOpenNdexDialog = (): void => {
    handleClose()
    setOpenNdexDialog(true)
  }
  const handleCloseNdexDialog = (): void => {
    setOpenNdexDialog(false)
  }

  // Workspace loading handlers
  const handleOpenWorkspaceDialog = (): void => {
    handleClose()
    setOpenWorkspaceDialog(true)
  }
  const handleCloseWorkspaceDialog = (): void => {
    setOpenWorkspaceDialog(false)
  }

  // File upload handlers
  const handleOpenFileUpload = (): void => {
    handleClose()
    setOpenFileUpload(true)
  }
  const handleCloseFileUpload = (): void => {
    setOpenFileUpload(false)
  }

  // Delete network handlers
  const handleOpenDeleteNetworkDialog = (): void => {
    handleClose()
    setOpenDeleteNetworkDialog(true)
  }
  const handleCloseDeleteNetworkDialog = (): void => {
    setOpenDeleteNetworkDialog(false)
  }

  const { deleteCurrentNetwork, deleteAllNetworks } = useDeleteCyNetwork()

  const handleDeleteNetwork = (): void => {
    handleCloseDeleteNetworkDialog()
    deleteCurrentNetwork()
  }

  // Delete all networks handlers
  const handleOpenDeleteAllNetworksDialog = (): void => {
    handleClose()
    setOpenDeleteAllNetworksDialog(true)
  }
  const handleCloseDeleteAllNetworksDialog = (): void => {
    setOpenDeleteAllNetworksDialog(false)
  }

  const navigate = useNavigate()
  const resetWorkspace = useWorkspaceStore((state) => state.resetWorkspace)

  const handleDeleteAllNetworks = (): void => {
    handleCloseDeleteAllNetworksDialog()
    deleteAllNetworks()
  }

  // Reset local workspace handlers
  const handleOpenResetLocalWorkspaceDialog = (): void => {
    handleClose()
    setOpenResetLocalWorkspaceDialog(true)
  }
  const handleCloseResetLocalWorkspaceDialog = (): void => {
    setOpenResetLocalWorkspaceDialog(false)
  }

  const handleResetLocalWorkspace = (): void => {
    resetWorkspace()
      .then(() => {
        handleCloseResetLocalWorkspaceDialog()
      })
      .then(() => {
        // For safety: debounce the navigation to prevent any potential timing issues
        debounce(() => {
          navigate('/')
          navigate(0)
        }, 1500)()
      })
      .catch((error) => {
        logUi.error(
          `[${ResetLocalWorkspaceMenuItem.name}]:[${handleResetLocalWorkspace.name}] Failed to reset workspace`,
          error,
        )
        alert('Failed to reset workspace. Please try again.')
      })
  }

  const menuItems: MenuItem[] = [
    {
      template: <LoadFromNdexMenuItem onClick={handleOpenNdexDialog} />,
    },
    {
      template: <LoadWorkspaceMenuItem onClick={handleOpenWorkspaceDialog} />,
    },
    {
      template: <LoadDemoNetworksMenuItem onClick={handleClose} />,
    },
    {
      template: <OpenNetworkInCytoscapeMenuItem onClick={handleClose} />,
    },
    {
      label: 'Import',
      icon: <UploadIcon sx={{mr: 1}} />,
      items: [
        {
          template: <UploadNetworkMenuItem onClick={handleOpenFileUpload} />,
        },
        {
          template: <JoinTableToNetworkMenuItem onClick={handleClose} />,
        },
      ],
    },
    {
      separator: true,
    },
    {
      template: <SaveToNDExMenuItem onClick={handleClose} />,
    },
    {
      template: <CopyNetworkToNDExMenuItem onClick={handleClose} />,
    },
    {
      template: <DownloadNetworkMenuItem onClick={handleClose} />,
    },
    {
      template: <SaveWorkspaceToNDExOverwriteMenuItem onClick={handleClose} />,
    },
    {
      template: <SaveWorkspaceToNDExMenuItem onClick={handleClose} />,
    },
    {
      label: 'Export',
      icon: <DownloadIcon sx={{mr: 1}} />,
      items: [
        {
          template: <ExportImageMenuItem onClick={handleClose} />,
        },
      ],
    },
    {
      separator: true,
    },
    {
      template: <RemoveNetworkMenuItem onClick={handleOpenDeleteNetworkDialog} />,
    },
    {
      template: <RemoveAllNetworksMenuItem onClick={handleOpenDeleteAllNetworksDialog} />,
    },
    {
      separator: true,
    },
    {
      template: <ResetLocalWorkspaceMenuItem onClick={handleOpenResetLocalWorkspaceDialog} />,
    },
    ...(serviceMenuItems.length > 0
      ? [{ separator: true }, ...serviceMenuItems]
      : []),
  ]

  return (
    <>
      <DropdownMenu
        id="data-menu"
        label="Data"
        menuItems={menuItems}
        open={open}
        onOpenChange={setOpen}
      />
      <LoadFromNdexDialog open={openNdexDialog} handleClose={handleCloseNdexDialog} />
      <LoadWorkspaceDialog open={openWorkspaceDialog} handleClose={handleCloseWorkspaceDialog} />
      <FileUpload show={openFileUpload} handleClose={handleCloseFileUpload} />
      <ConfirmationDialog
        title="Remove Current Network"
        message="Do you really want to delete this network?"
        onConfirm={handleDeleteNetwork}
        open={openDeleteNetworkDialog}
        setOpen={setOpenDeleteNetworkDialog}
        buttonTitle="Yes (cannot be undone)"
        isAlert
      />
      <ConfirmationDialog
        title="Remove All Networks"
        message="Do you really want to delete all networks from this workspace?"
        onConfirm={handleDeleteAllNetworks}
        open={openDeleteAllNetworksDialog}
        setOpen={setOpenDeleteAllNetworksDialog}
        buttonTitle="Yes (cannot be undone)"
        isAlert
      />
      <ConfirmationDialog
        title="Reset Local Workspace (for developers)"
        message="Are you sure you want to reset all workspace data? (This deletes all of the local cache)"
        onConfirm={handleResetLocalWorkspace}
        open={openResetLocalWorkspaceDialog}
        setOpen={setOpenResetLocalWorkspaceDialog}
        buttonTitle="Reset Workspace (cannot be undone)"
        isAlert
      />
      {dialogs}
    </>
  )
}
