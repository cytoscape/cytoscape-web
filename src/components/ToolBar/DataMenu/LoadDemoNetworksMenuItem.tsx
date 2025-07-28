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

  const handleAddDemoNetworks = (): void => {
    props.handleClose()
    addNetworks(testNetworks)
  }

  return (
    <MenuItem onClick={handleAddDemoNetworks}>Open Sample Networks</MenuItem>
  )
}
