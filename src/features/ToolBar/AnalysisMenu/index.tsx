import { ToolbarMenuItem as MenuItem } from '@/features/ToolBar/menuItemModel'
import { useCallback } from 'react'

import { RootMenu } from '@/models/AppModel/RootMenu'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
// Direct file imports: the components barrel would pull LLMQueryResultPanel
// (and its query stack) into this eager menu chunk.
import { LLMQueryOptionsDialog } from '@/features/LLMQuery/components/LLMQueryOptionsDialog'
import { LLMQueryOptionsMenuItem } from '@/features/LLMQuery/components/LLMQueryOptionsMenuItem'
import { RunLLMQueryMenuItem } from '@/features/LLMQuery/components/RunLLMQueryMenuItem'
import { useLLMQueryStore } from '@/features/LLMQuery/store'
import { appendServiceMenuItems } from '../AppMenu/appendServiceMenuItems'
import { useServiceAppMenu } from '../AppMenu/useServiceAppMenu'
import { DropdownMenu } from '../DropdownMenu'
import { useMenuBarMenu } from '../MenuBar'

export const AnalysisMenu = () => {
  const { open, setOpen } = useMenuBarMenu('analysis-menu')
  // In the LLM query store, so the LLM Query panel can open it too. The
  // dialog is rendered here, once, outside the menu rows (see #784).
  const openDialog = useLLMQueryStore((state) => state.optionsDialogOpen)
  const setOpenDialog = useLLMQueryStore((state) => state.setOptionsDialogOpen)

  const hasNoNetworks =
    useWorkspaceStore((state) => state.workspace.networkIds).length === 0

  const handleClose = (): void => {
    setOpen(false)
  }

  const closeMenu = useCallback((): void => {
    setOpen(false)
  }, [setOpen])

  // Service apps whose cyWebMenuItem.root resolves to the Analysis menu.
  const { menuItems: serviceMenuItems, dialogs } = useServiceAppMenu(
    RootMenu.Analysis,
    closeMenu,
  )

  const handleOpenDialog = (): void => {
    handleClose()
    setOpenDialog(true)
  }

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
  }

  const builtInItems: MenuItem[] = [
    {
      template: <RunLLMQueryMenuItem onClick={handleClose} />,
    },
    {
      separator: true,
    },
    {
      template: <LLMQueryOptionsMenuItem onClick={handleOpenDialog} />,
    },
  ]
  const menuItems = appendServiceMenuItems(builtInItems, serviceMenuItems)

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
