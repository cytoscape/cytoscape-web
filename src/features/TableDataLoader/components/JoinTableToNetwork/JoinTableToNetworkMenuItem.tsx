import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import { ReactElement } from 'react'

import { useWorkspaceStore } from '../../../../data/hooks/stores/WorkspaceStore'
import { BaseMenuItemProps } from '../../../ToolBar/BaseMenuItemProps'
import { DropdownMenuItem } from '../../../ToolBar/DropdownMenu'
import { useJoinTableToNetworkStore } from '../../store/joinTableToNetworkStore'


export const JoinTableToNetworkMenuItem = (
  props: BaseMenuItemProps,
): ReactElement => {
  const networkIds = useWorkspaceStore((state) => state.workspace.networkIds)
  const setShow = useJoinTableToNetworkStore((state) => state.setShow)

  const disabled = networkIds.length === 0

  return (
    <DropdownMenuItem
      label="Table from File..."
      icon={<TableChartOutlinedIcon />}
      disabled={disabled}
      onClick={() => {
        props.onClick()
        setShow(true)
      }}
    />
  )
}
