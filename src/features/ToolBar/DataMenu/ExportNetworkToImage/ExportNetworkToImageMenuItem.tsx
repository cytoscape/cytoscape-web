import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import { FC } from 'react'

import { useWorkspaceStore } from '../../../../data/hooks/stores/WorkspaceStore'
import { BaseMenuItemProps } from '../../BaseMenuItemProps'
import { DropdownMenuItem } from '../../DropdownMenu'

/**
 * Data > Export > Network to Image. The dialog belongs to the Data menu, not
 * to this row (#784): `onClick` closes the menu and opens it.
 */
export const ExportImageMenuItem: FC<BaseMenuItemProps> = ({ onClick }) => {
  const networkIds = useWorkspaceStore((state) => state.workspace.networkIds)

  return (
    <DropdownMenuItem
      label="Network to Image..."
      icon={<ImageOutlinedIcon />}
      disabled={networkIds.length === 0}
      onClick={onClick}
    />
  )
}
