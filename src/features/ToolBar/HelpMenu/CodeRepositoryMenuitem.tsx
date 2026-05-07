import GitHubIcon from '@mui/icons-material/GitHub'
import { ReactElement } from 'react'

import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

export const CodeRepositoryMenuItem = (props: BaseMenuItemProps): ReactElement => {
  const handleCodeRepository = (): void => {
    window.open('https://github.com/cytoscape/cytoscape-web', '_blank')
    props.onClick()
  }

  return (
    <DropdownMenuItem
      label="Code Repository"
      icon={<GitHubIcon />}
      onClick={handleCodeRepository}
    />
  )
}
