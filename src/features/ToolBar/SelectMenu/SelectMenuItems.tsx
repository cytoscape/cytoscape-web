import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { ReactElement, ReactNode } from 'react'

import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { hideSelected, showAll } from '../../../data/select/selectCommands'
import { IdType } from '../../../models/IdType'
import { hasHiddenElements } from '../../../models/VisualStyleModel/impl/visibilityBypass'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'
import { useSelectTargetNetworkId } from './selectTarget'

// The rows subscribe to the stores only while the menu is open, since a
// closed menu renders none of them

/** Whether the network and its view model are loaded */
const useNetworkLoaded = (networkId: IdType): boolean => {
  const hasNetwork = useNetworkStore((state) => state.networks.has(networkId))
  const hasView = useViewModelStore(
    (state) => state.getViewModel(networkId) !== undefined,
  )
  return hasNetwork && hasView
}

interface SelectionMenuItemProps extends BaseMenuItemProps {
  label: string
  dataTestId: string
  command: (networkId: IdType) => boolean
  icon?: ReactNode
  shortcut?: string
}

/**
 * A row that changes the selection: enabled whenever the network is loaded,
 * as in Cytoscape Desktop
 */
export const SelectionMenuItem = ({
  label,
  dataTestId,
  command,
  icon,
  shortcut,
  onClick,
}: SelectionMenuItemProps): ReactElement => {
  const networkId = useSelectTargetNetworkId()
  const loaded = useNetworkLoaded(networkId)
  return (
    <DropdownMenuItem
      label={label}
      dataTestId={dataTestId}
      icon={icon}
      shortcut={shortcut}
      disabled={!loaded}
      onClick={() => {
        onClick()
        command(networkId)
      }}
    />
  )
}

/** Hide Selected Nodes and Edges: enabled while something is selected */
export const HideSelectedMenuItem = ({
  onClick,
}: BaseMenuItemProps): ReactElement => {
  const networkId = useSelectTargetNetworkId()
  const loaded = useNetworkLoaded(networkId)
  const hasSelection = useViewModelStore((state) => {
    const view = state.getViewModel(networkId)
    return (
      view !== undefined &&
      (view.selectedNodes.length > 0 || view.selectedEdges.length > 0)
    )
  })
  const hasStyle = useVisualStyleStore(
    (state) => state.visualStyles[networkId] !== undefined,
  )
  return (
    <DropdownMenuItem
      label="Hide Selected Nodes and Edges"
      dataTestId="select-menu-hide-selected"
      icon={<VisibilityOffIcon />}
      disabled={!loaded || !hasStyle || !hasSelection}
      onClick={() => {
        onClick()
        hideSelected(networkId)
      }}
    />
  )
}

/** Show All: enabled while a visibility bypass hides a node or an edge */
export const ShowAllMenuItem = ({
  onClick,
}: BaseMenuItemProps): ReactElement => {
  const networkId = useSelectTargetNetworkId()
  const loaded = useNetworkLoaded(networkId)
  const hasHidden = useVisualStyleStore((state) => {
    const style = state.visualStyles[networkId]
    return style !== undefined && hasHiddenElements(style)
  })
  return (
    <DropdownMenuItem
      label="Show All"
      dataTestId="select-menu-show-all"
      icon={<VisibilityIcon />}
      disabled={!loaded || !hasHidden}
      onClick={() => {
        onClick()
        showAll(networkId)
      }}
    />
  )
}
