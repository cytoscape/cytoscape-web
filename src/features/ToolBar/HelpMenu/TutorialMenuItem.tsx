import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import { ReactElement } from 'react'

import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'


export const TutorialMenuItem = (props: BaseMenuItemProps): ReactElement => {
  const handleUserManual = (): void => {
    window.open('https://web-manual.cytoscape.org', '_blank')
    props.onClick()
  }

  return (
    <DropdownMenuItem
      label="User Manual"
      icon={<AutoStoriesIcon />}
      onClick={handleUserManual}
    />
  )
}
