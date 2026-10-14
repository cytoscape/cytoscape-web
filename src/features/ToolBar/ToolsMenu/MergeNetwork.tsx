import JoinFullOutlinedIcon from '@mui/icons-material/JoinFullOutlined'
import { ReactElement } from 'react'

import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

/**
 * Tools > Merge Networks. The dialog belongs to the Tools menu
 * (`MergeNetworkDialogHost`), not to this row (#784): `onClick` closes the
 * menu and opens it.
 */
export const MergeNetwork = ({ onClick }: BaseMenuItemProps): ReactElement => (
  <DropdownMenuItem
    label="Merge Networks"
    icon={<JoinFullOutlinedIcon />}
    onClick={onClick}
  />
)
