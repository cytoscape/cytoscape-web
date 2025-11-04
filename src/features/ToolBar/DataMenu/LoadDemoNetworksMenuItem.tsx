import { MenuItem } from '@mui/material'
import { ReactElement, useContext } from 'react'
import { AppConfigContext } from '../../../AppConfigContext'
import { IdType } from '../../../models/IdType'
import { useWorkspaceStore } from '../../../hooks/stores/WorkspaceStore'
import { BaseMenuProps } from '../BaseMenuProps'
import { useUrlNavigation } from '../../../hooks/navigation/useUrlNavigation'
import { fetchNdexSummaries } from '../../../api/ndex'
import { useNetworkSummaryStore } from '../../../hooks/stores/NetworkSummaryStore'
import { useCredentialStore } from '../../../hooks/stores/CredentialStore'
import { NetworkSummary } from '../../../models'

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
