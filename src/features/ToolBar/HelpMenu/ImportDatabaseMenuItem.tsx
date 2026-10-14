import UploadIcon from '@mui/icons-material/Upload'
import { ReactElement } from 'react'

import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

/**
 * The row only; `HelpMenu` opens `ImportDatabaseSnapshotDialog` from
 * `onClick`.
 */
export const ImportDatabaseMenuItem = (
  props: BaseMenuItemProps,
): ReactElement => (
  <DropdownMenuItem
    label="Import Database Snapshot..."
    icon={<UploadIcon />}
    onClick={props.onClick}
  />
)
