/* eslint-disable react/no-unescaped-entities */
import MenuBookIcon from '@mui/icons-material/MenuBook'
import { ReactElement } from 'react'

import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

export const DeveloperMenuItem = (props: BaseMenuItemProps): ReactElement => {
  const handleBugReport = (): void => {
    window.open('https://github.com/cytoscape/cytoscape-web/wiki/Cytoscape-Web-Developer-Tutorial', '_blank')
    props.onClick()
  }

  return (
    <DropdownMenuItem
      label="Developer's Guide"
      icon={<MenuBookIcon />}
      onClick={handleBugReport}
    />
  )
}
