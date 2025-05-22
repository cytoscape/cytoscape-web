/* eslint-disable react/no-unescaped-entities */
import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

export const DeveloperMenuItem = (props: BaseMenuProps): ReactElement => {
  const handleBugReport = (): void => {
    window.open('https://github.com/cytoscape/cytoscape-web/wiki/Cytoscape-Web-Developer-Tutorial', '_blank')
    props.handleClose()
  }

  return (
    <MenuItem onClick={handleBugReport}>
      Developer's Guide
    </MenuItem>
  )
}
