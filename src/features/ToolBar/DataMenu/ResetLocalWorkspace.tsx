import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import { ReactElement } from 'react'

import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

export const ResetLocalWorkspaceMenuItem = (
  props: BaseMenuItemProps,
): ReactElement => {
  return (
    <DropdownMenuItem
      label="Clear Local Workspace..."
      icon={<CancelOutlinedIcon />}
      onClick={props.onClick}
    />
  )
}
