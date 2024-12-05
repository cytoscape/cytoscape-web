import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

export const TutorialMenuItem = (props: BaseMenuProps): ReactElement => {
  const handleUserManual = (): void => {
    window.open('https://web-manual.cytoscape.org', '_blank')
    props.handleClose()
  }

  return (
    <MenuItem onClick={handleUserManual} disabled={false}>
      User Manual
    </MenuItem>
  )
}
