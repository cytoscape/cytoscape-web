import { ToolbarMenuItem as MenuItem } from '@/features/ToolBar/menuItemModel'
import { useCallback, useState } from 'react'

import { RootMenu } from '@/models/AppModel/RootMenu'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
// Direct file imports: the components barrel would pull LLMQueryResultPanel
// (and its query stack) into this eager menu chunk.
import { LLMQueryOptionsDialog } from '@/features/LLMQuery/components/LLMQueryOptionsDialog'
import { LLMQueryOptionsMenuItem } from '@/features/LLMQuery/components/LLMQueryOptionsMenuItem'
import { RunLLMQueryMenuItem } from '@/features/LLMQuery/components/RunLLMQueryMenuItem'
import { useServiceAppMenu } from '../AppMenu/useServiceAppMenu'
import { DropdownMenu } from '../DropdownMenu'
import { useMenuBarMenu } from '../MenuBar'

export const AnalysisMenu = () => {
  const { open, setOpen } = useMenuBarMenu('analysis-menu')
  const [openDialog, setOpenDialog] = useState(false)

  const hasNoNetworks =
    useWorkspaceStore((state) => state.workspace.networkIds).length === 0

  const handleClose = (): void => {
    setOpen(false)
  }

  const onBeforeRun = useCallback((): void => {
    setOpen(false)
  }, [setOpen])

  // Service apps whose cyWebMenuItem.root resolves to the Analysis menu.
  const { menuItems: serviceMenuItems, dialogs } = useServiceAppMenu(
    RootMenu.Analysis,
    onBeforeRun,
  )

  const handleOpenDialog = (): void => {
    handleClose()
    setOpenDialog(true)
  }

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
  }

  const menuItems: MenuItem[] = [
    {
      template: <RunLLMQueryMenuItem onClick={handleClose} />,
    },
    {
      separator: true,
    },
    {
      template: <LLMQueryOptionsMenuItem onClick={handleOpenDialog} />,
    },
    ...(serviceMenuItems.length > 0
      ? [{ separator: true }, ...serviceMenuItems]
      : []),
  ]

  return (
    <>
      <DropdownMenu
        id="analysis-menu"
        label="Analysis"
        menuItems={menuItems}
        open={open}
        disabled={hasNoNetworks}
        disabledTooltip="Load or create a network first"
        onOpenChange={setOpen}
      />
      <LLMQueryOptionsDialog
        open={openDialog}
        handleClose={handleCloseDialog}
      />
      {dialogs}
    </>
  )
}
