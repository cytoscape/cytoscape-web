import BugReportIcon from '@mui/icons-material/BugReport'
import { ReactElement } from 'react'

import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

/** The row only; `HelpMenu` opens `BugReportDialog` from `onClick`. */
export const BugReportMenuItem = (props: BaseMenuItemProps): ReactElement => (
  <DropdownMenuItem
    label="Report a Bug"
    icon={<BugReportIcon />}
    onClick={props.onClick}
  />
)
