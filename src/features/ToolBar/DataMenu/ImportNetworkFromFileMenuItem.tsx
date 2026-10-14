import ShareIcon from '@mui/icons-material/Share'
import { ReactElement } from 'react'

import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

export const UploadNetworkMenuItem = (
  props: BaseMenuItemProps,
): ReactElement => {
  return (
    <DropdownMenuItem
      label="Network from File..."
      icon={<ShareIcon />}
      onClick={props.onClick}
    />
  )
}
