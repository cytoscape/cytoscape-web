import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

export const BugReportMenuItem = (props: BaseMenuProps): ReactElement => {
  const handleBugReport = (): void => {
    window.open('https://cytoscape.org/bug-report.html', '_blank')
    props.handleClose()
  }

  return (
    <MenuItem onClick={handleBugReport}>
      Report a Bug
    </MenuItem>
  )
}
