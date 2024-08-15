import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

export const TutorialMenuItem = (props: BaseMenuProps): ReactElement => {
  const handleBugReport = (): void => {
    window.open('https://github.com/cytoscape/cytoscape-web/wiki/Tutorial-For-Cytoscape-Web', '_blank')
    props.handleClose()
  }

  return (
    <MenuItem onClick={handleBugReport}>
      Tutorials
    </MenuItem>
  )
}
