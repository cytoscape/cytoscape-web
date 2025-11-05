import { MenuItem } from '@mui/material'
import { ReactElement, useContext } from 'react'

import { fetchNdexSummaries } from '../../../api/ndex'
import { AppConfigContext } from '../../../AppConfigContext'
import { useUrlNavigation } from '../../../hooks/navigation/useUrlNavigation'
import { useCredentialStore } from '../../../hooks/stores/CredentialStore'
import { useNetworkSummaryStore } from '../../../hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '../../../hooks/stores/WorkspaceStore'
import { NetworkSummary } from '../../../models'
import { IdType } from '../../../models/IdType'
import { BaseMenuProps } from '../BaseMenuProps'

export const LoadDemoNetworksMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const addNetworks: (ids: IdType | IdType[]) => void = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )

  const { testNetworks } = useContext(AppConfigContext)

  const { navigateToNetwork } = useUrlNavigation()

  const workspace = useWorkspaceStore((state) => state.workspace)
  const addSummaries = useNetworkSummaryStore((state) => state.addAll)
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  const { getToken } = useCredentialStore()
  const handleAddDemoNetworks = async () => {
    const token = await getToken()
    const summaries = await fetchNdexSummaries(testNetworks, token)
    addNetworks(testNetworks)

    addSummaries(
      summaries.reduce(
        (acc, summary) => {
          acc[summary.externalId] = summary
          return acc
        },
        {} as Record<IdType, NetworkSummary>,
      ),
    )

    setCurrentNetworkId(testNetworks[0])
    navigateToNetwork({
      workspaceId: workspace.id,
      networkId: testNetworks[0],
      searchParams: new URLSearchParams(location.search),
      replace: false,
    })
    props.handleClose()
  }

  return (
    <MenuItem onClick={handleAddDemoNetworks}>Open Sample Networks</MenuItem>
  )
}
