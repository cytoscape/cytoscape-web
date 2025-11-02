import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

export const CodeRepositoryMenuItem = (props: BaseMenuProps): ReactElement => {
  const handleBugReport = (): void => {
    window.open('https://github.com/cytoscape/cytoscape-web', '_blank')
    props.handleClose()
  }

  return (
    <MenuItem onClick={handleBugReport}>
      Code Repository
    </MenuItem>
  )
}
