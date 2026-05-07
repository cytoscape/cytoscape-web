import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import { ReactElement } from 'react'

import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'


export const RemoveAllNetworksMenuItem = (props: BaseMenuItemProps): ReactElement => {
  const networkIds = useWorkspaceStore((state) => state.workspace.networkIds)

  return (
    <DropdownMenuItem
      label="Remove All Networks"
      icon={<DeleteForeverIcon />}
      disabled={networkIds.length === 0}
      onClick={props.onClick}
    />
  )
}
