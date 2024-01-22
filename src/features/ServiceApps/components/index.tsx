import { MenuItem } from '@mui/material'
import { BaseMenuProps } from '../../../components/ToolBar/BaseMenuProps'
import { runCommunityDetection } from '../api'
import { ReactElement } from 'react'

export const CDAPSOptionsMenuItem = (props: BaseMenuProps): ReactElement => {
  const runCDAPS = async (): Promise<void> => {
    await runCommunityDetection()
  }

  return <MenuItem onClick={runCDAPS}>Run CDAPS</MenuItem>
}
