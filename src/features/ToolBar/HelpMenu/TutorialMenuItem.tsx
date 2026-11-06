import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import { ReactElement } from 'react'

import { MANUAL_ROUTE_SEGMENT } from '@/data/db/dbScope'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

/**
 * Opens the in-app manual in a new tab. A new document, not a client-side
 * route change: the manual tab opens its own sandbox database
 * (src/data/db/dbScope.ts), and this tab keeps the workspace.
 *
 * Opened WITHOUT `noopener` on purpose: the manual's "Go to Cytoscape Web"
 * button uses `window.opener` to switch back to this tab
 * (src/features/Manual/goToEditor.ts). Both tabs are on the same origin.
 */
export const TutorialMenuItem = (props: BaseMenuItemProps): ReactElement => {
  const handleUserManual = (): void => {
    window.open(`${import.meta.env.BASE_URL}${MANUAL_ROUTE_SEGMENT}/`, '_blank')
    props.onClick()
  }

  return (
    <DropdownMenuItem
      label="User Manual"
      icon={<AutoStoriesIcon />}
      onClick={handleUserManual}
      dataTestId="help-menu-user-manual"
    />
  )
}
