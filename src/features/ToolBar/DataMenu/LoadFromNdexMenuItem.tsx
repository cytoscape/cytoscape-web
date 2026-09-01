import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import { ReactElement } from 'react'

import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'
import { useNdexGate } from './ndexAvailability'

export const LoadFromNdexMenuItem = (
  props: BaseMenuItemProps,
): ReactElement => {
  const ndex = useNdexGate(true, '')

  return (
    <DropdownMenuItem
      label="Open Network(s) from NDEx..."
      icon={<CloudDownloadIcon />}
      tooltip={ndex.tooltip}
      disabled={ndex.disabled}
      onClick={props.onClick}
    />
  )
}
