import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import { ReactElement } from 'react'

import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

/**
 * Help › Developer › Clear Local Cache. Opens the confirmation dialog, which
 * the Help menu owns (a row unmounts with its menu).
 */
export const ClearLocalCacheMenuItem = (
  props: BaseMenuItemProps,
): ReactElement => {
  return (
    <DropdownMenuItem
      label="Clear Local Cache"
      icon={<DeleteForeverIcon />}
      onClick={props.onClick}
    />
  )
}
