import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import { ToolbarMenuItem as MenuItem } from '@/features/ToolBar/menuItemModel'
import { lazy, Suspense, useCallback, useState } from 'react'

import { useResetWorkspace } from '../../../data/hooks/useResetWorkspace'
import { useDeleteCyNetwork } from '../../../data/hooks/useDeleteCyNetwork'
import { RootMenu } from '../../../models/AppModel/RootMenu'
import { ConfirmationDialog } from '../../ConfirmationDialog'
import { JoinTableToNetworkMenuItem } from '../../TableDataLoader/components/JoinTableToNetwork/JoinTableToNetworkMenuItem'
import { useServiceAppMenu } from '../AppMenu/useServiceAppMenu'
import { DropdownMenu } from '../DropdownMenu'

// Lazy: FileUpload pulls in the import pipeline (CX2/SIF parsing and the
// dropzone/dialog stack), which would otherwise ship with the eager toolbar
// chunk. Mounted after first open only.
const FileUpload = lazy(() =>
  import('@/features/ToolBar/FileUpload').then((m) => ({
    default: m.FileUpload,
  })),
)
import { CopyNetworkToNDExMenuItem } from './CopyNetworkToNDExMenuItem'
import { DownloadNetworkMenuItem } from './DownloadNetworkMenuItem'
import { DuplicateNetworkMenuItem } from './DuplicateNetworkMenuItem'
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
  // Mount latch for the lazy FileUpload dialog: stays true after the first
  // open so the close animation still plays and reopening is instant.
  const [hasOpenedFileUpload, setHasOpenedFileUpload] = useState(false)
  const [openDeleteNetworkDialog, setOpenDeleteNetworkDialog] = useState(false)
  const [openDeleteAllNetworksDialog, setOpenDeleteAllNetworksDialog] =
    useState(false)
  const [openResetLocalWorkspaceDialog, setOpenResetLocalWorkspaceDialog] =
    useState(false)

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
    setHasOpenedFileUpload(true)
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

  const { reset } = useResetWorkspace()

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

  /**
   * `ConfirmationDialog` has already closed itself by the time this runs, so
   * every path from here has to end in something the user can see: previously a
   * reset that could not complete simply did nothing — no navigation, no error,
   * and (before `deleteDb` was bounded) no end either, because a peer tab holding
   * the database open left `Dexie.delete` waiting indefinitely.
   */
  const handleResetLocalWorkspace = (): void => {
    // useResetWorkspace owns the outcome branching and the navigation; this
    // handler only reports, and `alert()` is the reporting channel here because
    // the dialog has already closed and the menu has nowhere to render a
    // message.
    void reset().then((result) => {
      if (result.status === 'failed') {
        handleCloseResetLocalWorkspaceDialog()
        alert(`Failed to reset workspace. ${result.reason}`)
        return
      }
      if (result.status === 'reloading') {
        alert(`${result.reason} Reloading Cytoscape Web.`)
      }
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
      icon: <UploadIcon sx={{ mr: 1 }} />,
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
      template: <DuplicateNetworkMenuItem onClick={handleClose} />,
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
      icon: <DownloadIcon sx={{ mr: 1 }} />,
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
      template: (
        <RemoveNetworkMenuItem onClick={handleOpenDeleteNetworkDialog} />
      ),
    },
    {
      template: (
        <RemoveAllNetworksMenuItem
          onClick={handleOpenDeleteAllNetworksDialog}
        />
      ),
    },
    {
      separator: true,
    },
    {
      template: (
        <ResetLocalWorkspaceMenuItem
          onClick={handleOpenResetLocalWorkspaceDialog}
        />
      ),
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
      <LoadFromNdexDialog
        open={openNdexDialog}
        handleClose={handleCloseNdexDialog}
      />
      <LoadWorkspaceDialog
        open={openWorkspaceDialog}
        handleClose={handleCloseWorkspaceDialog}
      />
      {hasOpenedFileUpload && (
        <Suspense fallback={null}>
          <FileUpload
            show={openFileUpload}
            handleClose={handleCloseFileUpload}
          />
        </Suspense>
      )}
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
