import { useCallback, useState } from 'react'

import { RootMenu } from '../../../models/AppModel/RootMenu'
import { useServiceAppMenu } from '../AppMenu/useServiceAppMenu'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { DropdownMenu } from '../DropdownMenu'
import { useMenuBarMenu } from '../MenuBar'
import { MergeNetwork } from './MergeNetwork'
import { MergeNetworkDialogHost } from './MergeNetworkDialogHost'

export const ToolsMenu = () => {
  const { open, setOpen } = useMenuBarMenu('tools-menu')

  const hasNoNetworks =
    useWorkspaceStore((state) => state.workspace.networkIds).length === 0

  const handleClose = (): void => {
    setOpen(false)
  }

  // The Merge Networks dialog, mounted only while open (see
  // MergeNetworkDialogHost).
  const [openMerge, setOpenMerge] = useState(false)
  const handleOpenMerge = (): void => {
    handleClose()
    setOpenMerge(true)
  }

  const closeMenu = useCallback((): void => {
    setOpen(false)
  }, [setOpen])

  // Service apps whose cyWebMenuItem.root resolves to the Tools menu.
  const { menuItems: serviceMenuItems, dialogs } = useServiceAppMenu(
    RootMenu.Tools,
    closeMenu,
  )

  const menuItems = [
    {
      label: 'Merge Networks',
      template: <MergeNetwork onClick={handleOpenMerge} />,
    },
    ...serviceMenuItems,
  ]

  return (
    <>
      <DropdownMenu
        id="tools-menu"
        label="Tools"
        menuItems={menuItems}
        open={open}
        onOpenChange={setOpen}
        disabled={hasNoNetworks}
        disabledTooltip="Load or create a network first"
      />
      {openMerge && (
        <MergeNetworkDialogHost handleClose={() => setOpenMerge(false)} />
      )}
      {dialogs}
    </>
  )
}
