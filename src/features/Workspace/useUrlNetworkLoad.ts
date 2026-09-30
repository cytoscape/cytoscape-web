import { useEffect, useRef, useState } from 'react'

import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { logUi } from '../../debug'
import { IdType } from '../../models/IdType'

export interface UrlNetworkLoader {
  /**
   * Loads the network into the stores. Resolves whether it loaded; failures
   * are reported by the loader itself, not thrown. `isRemoved` turns true
   * once the network has left the workspace during the load, and a loader
   * must then leave the stores alone: they no longer hold that network.
   */
  load: (networkId: IdType, isRemoved: () => boolean) => Promise<boolean>
  /**
   * The load settled and its network is still the one the URL names and
   * still in the workspace. Not called for a load that went stale.
   */
  onLoaded: (networkId: IdType, loaded: boolean) => void
}

/**
 * Loads the network the URL names — the only network-load trigger in the app
 * (see `useUrlFollowsNetworkRemoval` for why that matters).
 *
 * One load runs at a time. The URL can change while it runs (a click on
 * another network, a deletion redirecting the URL), so:
 * - a load whose network was removed meanwhile does not touch the stores and
 *   is not reported, or it would bring the deleted network back as current;
 * - a load whose URL moved on is not reported, so it cannot make its network
 *   current over the one the URL now names;
 * - when a load settles and the URL names another network, that network is
 *   loaded next. It used to be skipped for good, so the network a deletion
 *   redirected to during a load never loaded.
 *
 * `loader` may change on every render; the latest one is used.
 *
 * @param urlNetworkId - The route's networkId
 */
export const useUrlNetworkLoad = (
  urlNetworkId: IdType | undefined,
  loader: UrlNetworkLoader,
): void => {
  const loaderRef = useRef(loader)
  const urlNetworkIdRef = useRef(urlNetworkId)
  const isLoadingRef = useRef(false)
  // Bumped when a load settles after the URL moved on, to load what it names
  const [urlChangedDuringLoad, setUrlChangedDuringLoad] = useState(0)

  // Declared before the load effect so it runs first in the same commit: the
  // load then starts with this render's loader
  useEffect(() => {
    loaderRef.current = loader
    urlNetworkIdRef.current = urlNetworkId
  })

  useEffect(() => {
    const networkId = urlNetworkId
    if (networkId === undefined || networkId === '') {
      return
    }
    // The running load picks this URL up when it settles
    if (isLoadingRef.current) {
      return
    }
    isLoadingRef.current = true

    // Only a network that was listed and then left counts as removed: a URL
    // may name one the workspace does not list
    const inWorkspace = (): boolean =>
      useWorkspaceStore.getState().workspace.networkIds.includes(networkId)
    const wasInWorkspace = inWorkspace()
    const isRemoved = (): boolean => wasInWorkspace && !inWorkspace()

    loaderRef.current
      .load(networkId, isRemoved)
      .then((loaded) => {
        if (urlNetworkIdRef.current !== networkId || isRemoved()) {
          logUi.info(
            `[useUrlNetworkLoad]: Discarding the load of ${networkId}: ${isRemoved() ? 'it was removed' : 'the URL moved on'}`,
          )
          return
        }
        loaderRef.current.onLoaded(networkId, loaded)
      })
      .catch((error) => {
        logUi.error(
          `[useUrlNetworkLoad]: Failed to load network ${networkId}: ${error}`,
        )
      })
      .finally(() => {
        isLoadingRef.current = false
        const latest = urlNetworkIdRef.current
        if (latest !== undefined && latest !== '' && latest !== networkId) {
          setUrlChangedDuringLoad((count) => count + 1)
        }
      })
  }, [urlNetworkId, urlChangedDuringLoad])
}
