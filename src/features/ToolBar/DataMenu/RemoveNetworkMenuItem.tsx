import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import { ReactElement } from 'react'

import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

export function RemoveNetworkMenuItem(props: BaseMenuItemProps): ReactElement {
  const networkIds = useWorkspaceStore((state) => state.workspace.networkIds)

  return (
    <DropdownMenuItem
      label="Remove Current Network"
      icon={<DeleteForeverIcon />}
      disabled={networkIds.length === 0}
      onClick={props.onClick}
    />
  )
}
