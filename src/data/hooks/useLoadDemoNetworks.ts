import { useCallback, useContext, useState } from 'react'

import { AppConfigContext } from '../../AppConfigContext'
import { logUi } from '../../debug'
import { NetworkSummary } from '../../models'
import { IdType } from '../../models/IdType'
import { fetchNdexSummaries } from '../external-api/ndex'
import { useUrlNavigation } from './navigation/useUrlNavigation'
import { useCredentialStore } from './stores/CredentialStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'

export type DemoNetworksLoadStatus = 'idle' | 'loading' | 'error'

export interface UseLoadDemoNetworksReturn {
  /**
   * Fetch the configured sample networks' summaries from NDEx, add them to
   * the workspace and navigate to the first one. Resolves `true` on success;
   * a failure is logged, exposed through `status`/`errorMessage`, and leaves
   * the workspace untouched.
   */
  loadDemoNetworks: () => Promise<boolean>
  status: DemoNetworksLoadStatus
  /** Message of the last failure; null unless `status` is `'error'`. */
  errorMessage: string | null
}

/**
 * Loads the sample networks listed under `testNetworks` in the app config.
 *
 * Shared by the Data → "Open Sample Networks" menu item and the empty
 * workspace call to action (#651). It is a live NDEx round trip, so unlike a
 * menu item that simply closes, callers can render pending and failure
 * states from `status`.
 */
export const useLoadDemoNetworks = (): UseLoadDemoNetworksReturn => {
  const { testNetworks } = useContext(AppConfigContext)
  const { navigateToNetwork } = useUrlNavigation()
  const getToken = useCredentialStore((state) => state.getToken)
  const addNetworkIds = useWorkspaceStore((state) => state.addNetworkIds)
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  const addSummaries = useNetworkSummaryStore((state) => state.addAll)

  const [status, setStatus] = useState<DemoNetworksLoadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadDemoNetworks = useCallback(async (): Promise<boolean> => {
    setStatus('loading')
    setErrorMessage(null)
    try {
      if (testNetworks.length === 0) {
        throw new Error('No sample networks are configured')
      }
      const token = await getToken()
      const summaries = await fetchNdexSummaries(testNetworks, token)

      // NDEx answers the batch with only the networks it can serve (a
      // deleted or private sample silently drops out), so reconcile against
      // what came back: an id without a summary would sit blank in the
      // workspace panel, and selecting it would fail on the network fetch.
      const resolvedIds = testNetworks.filter((id) =>
        summaries.some((summary) => summary.externalId === id),
      )
      if (resolvedIds.length === 0) {
        throw new Error('No sample networks could be retrieved from NDEx')
      }

      addNetworkIds(resolvedIds)
      addSummaries(
        summaries.reduce(
          (acc, summary) => {
            acc[summary.externalId] = summary
            return acc
          },
          {} as Record<IdType, NetworkSummary>,
        ),
      )

      const firstId = resolvedIds[0]
      setCurrentNetworkId(firstId)
      navigateToNetwork({
        workspaceId: useWorkspaceStore.getState().workspace.id,
        networkId: firstId,
        searchParams: new URLSearchParams(location.search),
        replace: false,
      })
      setStatus('idle')
      return true
    } catch (error) {
      logUi.error('Failed to load sample networks from NDEx', error)
      setErrorMessage(error instanceof Error ? error.message : String(error))
      setStatus('error')
      return false
    }
  }, [
    addNetworkIds,
    addSummaries,
    getToken,
    navigateToNetwork,
    setCurrentNetworkId,
    testNetworks,
  ])

  return { loadDemoNetworks, status, errorMessage }
}
