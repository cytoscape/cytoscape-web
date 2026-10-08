import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { ReactElement } from 'react'

import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

/** The row only; `HelpMenu` opens `AboutDialog` from `onClick`. */
export const AboutCytoscapeWebMenuItem = (
  props: BaseMenuItemProps,
): ReactElement => (
  <DropdownMenuItem
    label="About Cytoscape Web"
    icon={<InfoOutlinedIcon />}
    onClick={props.onClick}
  />
)
