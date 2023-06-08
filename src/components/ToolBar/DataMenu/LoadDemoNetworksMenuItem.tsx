import { MenuItem } from '@mui/material'
import { ReactElement, useContext } from 'react'
import { AppConfigContext } from '../../../AppConfigContext'
import { IdType } from '../../../models/IdType'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { BaseMenuProps } from '../BaseMenuProps'

export const LoadDemoNetworksMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const addNetworks: (ids: IdType | IdType[]) => void = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )

  const { testNetworks } = useContext(AppConfigContext)

  const handleRemoveAllNetworks = (): void => {
    console.info('(Not implemented) All networks removed')
    props.handleClose()
    addNetworks(testNetworks)
  }

  return (
    <MenuItem onClick={handleRemoveAllNetworks}>
      (Demo) Open sample networks
    </MenuItem>
  )
}
