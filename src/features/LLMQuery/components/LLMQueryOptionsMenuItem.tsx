import SettingsIcon from '@mui/icons-material/Settings'
import { ReactElement } from 'react'

import { BaseMenuItemProps } from '../../ToolBar/BaseMenuItemProps'
import { DropdownMenuItem } from '../../ToolBar/DropdownMenu'
import { useLLMQueryStore } from '../store'


export const LLMQueryOptionsMenuItem = (props: BaseMenuItemProps): ReactElement => {
  const loading = useLLMQueryStore((state) => state.loading)

  const tooltipTitle = loading ? 'Generating response...' : ''

  return (
    <DropdownMenuItem
      label="LLM Query Options..."
      tooltip={tooltipTitle}
      icon={<SettingsIcon />}
      disabled={loading}
      onClick={props.onClick}
    />
  )
}