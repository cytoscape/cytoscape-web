import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import { ReactElement } from 'react'

import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

export const LoadFromNdexMenuItem = (
  props: BaseMenuItemProps,
): ReactElement => {
  return (
    <DropdownMenuItem
      label="Open Network(s) from NDEx..."
      icon={<CloudDownloadIcon />}
      onClick={props.onClick}
    />
  )
}
