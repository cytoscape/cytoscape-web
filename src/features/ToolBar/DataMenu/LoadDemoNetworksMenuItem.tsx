import { ReactElement, useContext } from 'react'

import { AppConfigContext } from '../../../AppConfigContext'
import { fetchNdexSummaries } from '../../../data/external-api/ndex'
import { useUrlNavigation } from '../../../data/hooks/navigation/useUrlNavigation'
import { useCredentialStore } from '../../../data/hooks/stores/CredentialStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { NetworkSummary } from '../../../models'
import { IdType } from '../../../models/IdType'
import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { MessageSeverity } from '../../../models/MessageModel'
import { logUi } from '../../../debug'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'
import { useNdexGate } from './ndexAvailability'

export const LoadDemoNetworksMenuItem = (
  props: BaseMenuItemProps,
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
  const addMessage = useMessageStore((state) => state.addMessage)

  // The sample networks are fetched from NDEx, so this is a remote operation
  // like the rest of them and goes grey with the others when offline.
  const ndex = useNdexGate(true, '')

  const handleAddDemoNetworks = async (): Promise<void> => {
    // DropdownMenuItem calls onClick without awaiting, so a rejection here
    // used to surface as an unhandled rejection and nothing else: the menu
    // closed and no networks appeared, with no indication why.
    try {
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
    } catch (error) {
      logUi.error(
        `[${LoadDemoNetworksMenuItem.name}]:[handleAddDemoNetworks] Failed to fetch the sample networks`,
        error,
      )
      addMessage({
        message: 'Could not reach NDEx to load the sample networks.',
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
    } finally {
      props.onClick()
    }
  }

  return (
    <DropdownMenuItem
      label="Open Sample Networks"
      tooltip={ndex.tooltip}
      disabled={ndex.disabled}
      onClick={() => void handleAddDemoNetworks()}
    />
  )
}
