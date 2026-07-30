import DownloadIcon from '@mui/icons-material/Download'
import { ReactElement } from 'react'

import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useDownloadNetworkFile } from '../../../data/hooks/useDownloadNetworkFile'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

export const DownloadNetworkMenuItem = (
  props: BaseMenuItemProps,
): ReactElement => {
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const downloadNetworkFile = useDownloadNetworkFile()

  const handleSaveCurrentNetworkToFile = async (): Promise<void> => {
    await downloadNetworkFile(currentNetworkId)
    props.onClick()
  }

  const menuItem = (
    <DropdownMenuItem
      label="Download Network File (.cx2)"
      icon={<DownloadIcon />}
      disabled={currentNetworkId === ''}
      onClick={handleSaveCurrentNetworkToFile}
    />
  )
  return <>{menuItem}</>
}
