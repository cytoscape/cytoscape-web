import DeselectIcon from '@mui/icons-material/Deselect'
import SelectAllIcon from '@mui/icons-material/SelectAll'

import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import {
  deselectAll,
  deselectAllEdges,
  deselectAllNodes,
  selectAll,
  selectAllEdges,
  selectAllNodes,
} from '../../../data/select/selectCommands'
import { DropdownMenu } from '../DropdownMenu'
import { useMenuBarMenu } from '../MenuBar'
import { ToolbarMenuItem as MenuItem } from '../menuItemModel'
import {
  HideSelectedMenuItem,
  SelectionMenuItem,
  ShowAllMenuItem,
} from './SelectMenuItems'
import {
  SELECT_ALL_KEY_SHORTCUTS,
  selectAllShortcutLabel,
  useSelectAllShortcut,
} from './useSelectAllShortcut'

/**
 * The Select menu (Cytoscape Desktop's Select menu): select or deselect all
 * nodes and edges, hide the selection, show everything again. It acts on the
 * active network view. See SelectMenu_docs/SelectMenu.md.
 */
export const SelectMenu = () => {
  const { open, setOpen } = useMenuBarMenu('select-menu')
  useSelectAllShortcut()

  const hasNoNetworks =
    useWorkspaceStore((state) => state.workspace.networkIds).length === 0

  const handleClose = (): void => {
    setOpen(false)
  }

  const menuItems: MenuItem[] = [
    {
      template: (
        <SelectionMenuItem
          label="Select All Nodes"
          dataTestId="select-menu-select-all-nodes"
          command={selectAllNodes}
          onClick={handleClose}
        />
      ),
    },
    {
      template: (
        <SelectionMenuItem
          label="Select All Edges"
          dataTestId="select-menu-select-all-edges"
          command={selectAllEdges}
          onClick={handleClose}
        />
      ),
    },
    {
      template: (
        <SelectionMenuItem
          label="Deselect All Nodes"
          dataTestId="select-menu-deselect-all-nodes"
          command={deselectAllNodes}
          onClick={handleClose}
        />
      ),
    },
    {
      template: (
        <SelectionMenuItem
          label="Deselect All Edges"
          dataTestId="select-menu-deselect-all-edges"
          command={deselectAllEdges}
          onClick={handleClose}
        />
      ),
    },
    { separator: true },
    {
      template: (
        <SelectionMenuItem
          label="Select All"
          dataTestId="select-menu-select-all"
          icon={<SelectAllIcon />}
          shortcut={selectAllShortcutLabel()}
          command={selectAll}
          onClick={handleClose}
        />
      ),
      keyShortcuts: SELECT_ALL_KEY_SHORTCUTS,
    },
    {
      template: (
        <SelectionMenuItem
          label="Deselect All"
          dataTestId="select-menu-deselect-all"
          icon={<DeselectIcon />}
          command={deselectAll}
          onClick={handleClose}
        />
      ),
    },
    { separator: true },
    { template: <HideSelectedMenuItem onClick={handleClose} /> },
    { template: <ShowAllMenuItem onClick={handleClose} /> },
  ]

  return (
    <DropdownMenu
      id="select-menu"
      label="Select"
      menuItems={menuItems}
      open={open}
      disabled={hasNoNetworks}
      disabledTooltip="Load or create a network first"
      onOpenChange={setOpen}
    />
  )
}
