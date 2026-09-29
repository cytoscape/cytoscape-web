import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import { ToolbarMenuItem as MenuItem } from '@/features/ToolBar/menuItemModel'
import { lazy, Suspense, useCallback, useState } from 'react'

import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useCytoscapeDesktopPermissionNotice } from '../../../data/hooks/useCytoscapeDesktopPermissionNotice'
import { useOpenNetworkInCytoscapeFromStores } from '../../../data/hooks/useOpenInCytoscapeDesktop'
import { useResetWorkspace } from '../../../data/hooks/useResetWorkspace'
import { useDeleteCyNetwork } from '../../../data/hooks/useDeleteCyNetwork'
import { RootMenu } from '../../../models/AppModel/RootMenu'
import { ConfirmationDialog } from '../../ConfirmationDialog'
import { CytoscapeDesktopPermissionDialog } from '../../CytoscapeDesktopPermissionDialog'
import { JoinTableToNetworkMenuItem } from '../../TableDataLoader/components/JoinTableToNetwork/JoinTableToNetworkMenuItem'
import { appendServiceMenuItems } from '../AppMenu/appendServiceMenuItems'
import { useServiceAppMenu } from '../AppMenu/useServiceAppMenu'
import { DropdownMenu } from '../DropdownMenu'
import { useMenuBarMenu } from '../MenuBar'

// Lazy: FileUpload pulls in the import pipeline (CX2/SIF parsing and the
// dropzone/dialog stack), which would otherwise ship with the eager toolbar
// chunk. Mounted after first open only.
const FileUpload = lazy(() =>
  import('@/features/ToolBar/FileUpload').then((m) => ({
    default: m.FileUpload,
  })),
)
// Lazy: keeps the export dialog out of the eager toolbar chunk, as the lazy
// wrapper around its menu row used to. Mounted after first open only.
const ExportImage = lazy(() =>
  import('./ExportNetworkToImage/ExportImage').then((m) => ({
    default: m.ExportImage,
  })),
)
import { CopyNetworkToNDExMenuItem } from './CopyNetworkToNDExMenuItem'
import { DownloadNetworkMenuItem } from './DownloadNetworkMenuItem'
import { DuplicateNetworkMenuItem } from './DuplicateNetworkMenuItem'
import { ExportImageMenuItem } from './ExportNetworkToImage/ExportNetworkToImageMenuItem'
import { UploadNetworkMenuItem } from './ImportNetworkFromFileMenuItem'
import { LoadDemoNetworksMenuItem } from './LoadDemoNetworksMenuItem'
import { LoadFromNdexDialog } from './LoadFromNdexDialog'
import { LoadFromNdexMenuItem } from './LoadFromNdexMenuItem'
import LoadWorkspaceDialog from './LoadWorkspaceDialog'
import { LoadWorkspaceMenuItem } from './LoadWorkspaceMenuItem'
import { useFileUploadDialogStore } from './store/fileUploadDialogStore'
import { useLoadFromNdexDialogStore } from './store/loadFromNdexDialogStore'
import { OpenNetworkInCytoscapeMenuItem } from './OpenNetworkInCytoscapeMenuItem'
import { RemoveAllNetworksMenuItem } from './RemoveAllNetworksMenuItem'
import { RemoveNetworkMenuItem } from './RemoveNetworkMenuItem'
import { ResetLocalWorkspaceMenuItem } from './ResetLocalWorkspace'
import { SaveToNDExMenuItem } from './SaveToNDExMenuItem'
import { SaveWorkspaceToNDExMenuItem } from './SaveWorkspaceToNDEx'
import { SaveWorkspaceToNDExOverwriteMenuItem } from './SaveWorkspaceToNDExOverwrite'

export const DataMenu = () => {
  const { open, setOpen } = useMenuBarMenu('data-menu')
  const [openWorkspaceDialog, setOpenWorkspaceDialog] = useState(false)
  const [openDeleteNetworkDialog, setOpenDeleteNetworkDialog] = useState(false)
  const [openDeleteAllNetworksDialog, setOpenDeleteAllNetworksDialog] =
    useState(false)
  const [openResetLocalWorkspaceDialog, setOpenResetLocalWorkspaceDialog] =
    useState(false)

  const handleClose = (): void => {
    setOpen(false)
  }

  const closeMenu = useCallback((): void => {
    setOpen(false)
  }, [setOpen])

  // Service apps whose cyWebMenuItem.root resolves to the Data menu.
  const { menuItems: serviceMenuItems, dialogs } = useServiceAppMenu(
    RootMenu.Data,
    closeMenu,
  )

  // NDEx dialog state lives in a store: the network search bar's NDEx
  // provider opens the same dialog (with a query to run) from outside
  // this menu.
  const openNdexDialog = useLoadFromNdexDialogStore((state) => state.isOpen)
  const ndexInitialQuery = useLoadFromNdexDialogStore(
    (state) => state.initialQuery,
  )
  const openNdexDialogAction = useLoadFromNdexDialogStore(
    (state) => state.openDialog,
  )
  const handleCloseNdexDialog = useLoadFromNdexDialogStore(
    (state) => state.closeDialog,
  )
  const handleOpenNdexDialog = (): void => {
    handleClose()
    openNdexDialogAction()
  }

  // Workspace loading handlers
  const handleOpenWorkspaceDialog = (): void => {
    handleClose()
    setOpenWorkspaceDialog(true)
  }
  const handleCloseWorkspaceDialog = (): void => {
    setOpenWorkspaceDialog(false)
  }

  // File upload dialog state lives in a store too: the empty-workspace
  // panel's "Import from file" opens the same dialog from the canvas (#651).
  // `hasOpened` is the mount latch for the lazy FileUpload dialog — it stays
  // true after the first open so the close animation still plays and
  // reopening is instant.
  const openFileUpload = useFileUploadDialogStore((state) => state.isOpen)
  const hasOpenedFileUpload = useFileUploadDialogStore(
    (state) => state.hasOpened,
  )
  const openFileUploadAction = useFileUploadDialogStore(
    (state) => state.openDialog,
  )
  const handleCloseFileUpload = useFileUploadDialogStore(
    (state) => state.closeDialog,
  )
  const handleOpenFileUpload = (): void => {
    handleClose()
    openFileUploadAction()
  }

  // Export image dialog. `hasOpenedExportImage` is the mount latch for the
  // lazy dialog, like `hasOpenedFileUpload`.
  const [openExportImage, setOpenExportImage] = useState(false)
  const [hasOpenedExportImage, setHasOpenedExportImage] = useState(false)
  const handleOpenExportImage = (): void => {
    handleClose()
    setHasOpenedExportImage(true)
    setOpenExportImage(true)
  }

  // Open in Cytoscape Desktop: on first use, the permission notice explains
  // the browser's local-network prompt before anything reaches localhost.
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const openNetworkInCytoscape = useOpenNetworkInCytoscapeFromStores()
  const desktopNotice = useCytoscapeDesktopPermissionNotice()
  const handleOpenNetworkInCytoscape = (): void => {
    handleClose()
    desktopNotice.run(() => {
      void openNetworkInCytoscape(currentNetworkId)
    })
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

  const builtInItems: MenuItem[] = [
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
      template: (
        <OpenNetworkInCytoscapeMenuItem
          onClick={handleOpenNetworkInCytoscape}
        />
      ),
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
          template: <ExportImageMenuItem onClick={handleOpenExportImage} />,
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
  ]
  const menuItems = appendServiceMenuItems(builtInItems, serviceMenuItems)

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
        initialQuery={ndexInitialQuery ?? undefined}
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
      <CytoscapeDesktopPermissionDialog
        open={desktopNotice.open}
        onConfirm={desktopNotice.onConfirm}
        onCancel={desktopNotice.onCancel}
      />
      {hasOpenedExportImage && (
        <Suspense fallback={null}>
          <ExportImage
            open={openExportImage}
            handleClose={() => setOpenExportImage(false)}
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
