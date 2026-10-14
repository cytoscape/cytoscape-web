import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import { ReactElement } from 'react'

import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

/** The row only; `HelpMenu` opens `CitationDialog` from `onClick`. */
export const CitationMenuItem = (props: BaseMenuItemProps): ReactElement => (
  <DropdownMenuItem
    label="Citation"
    icon={<FormatQuoteIcon />}
    onClick={props.onClick}
  />
)
