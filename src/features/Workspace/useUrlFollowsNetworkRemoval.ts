import { useEffect, useRef } from 'react'

import { useUrlNavigation } from '../../data/hooks/navigation/useUrlNavigation'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { logUi } from '../../debug'
import { IdType } from '../../models/IdType'
import { redirectAfterRemoval } from './networkRemovalRedirect'

/** Just past urlManager's 300 ms throttle window */
const RETRY_DELAY_MS = 350
const MAX_ATTEMPTS = 3

/**
 * Moves the URL off a network the moment it leaves the workspace.
 *
 * The URL is the only network-load trigger: `WorkspaceEditor` loads a network
 * when the route's networkId changes, and nothing writes `currentNetworkId`
 * back into the URL. A removal that does not navigate leaves the deleted id in
 * the address bar, so the network that became current is never loaded, and
 * re-adding the deleted one later navigates to an unchanged path that loads
 * nothing either — "Loading network data..." forever. The App API's
 * `deleteNetwork`, `deleteCurrentNetwork` and `deleteAllNetworks` cannot
 * navigate (core code has no router), so this listener does it for every
 * removal path; host paths that already navigate end up at the same place.
 *
 * @param urlNetworkId - The route's networkId, as `WorkspaceEditor` reads it
 */
export const useUrlFollowsNetworkRemoval = (
  urlNetworkId: IdType | undefined,
): void => {
  const { navigateToNetwork } = useUrlNavigation()

  // Read by the store listener below. Refs, not effect dependencies:
  // re-subscribing whenever they change would drop a pending retry.
  const urlNetworkIdRef = useRef<IdType | undefined>(urlNetworkId)
  const navigateRef = useRef(navigateToNetwork)
  useEffect(() => {
    urlNetworkIdRef.current = urlNetworkId
    navigateRef.current = navigateToNetwork
  })

  useEffect(() => {
    let attempts = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const followRemoval = (): void => {
      retryTimer = undefined
      const { workspace } = useWorkspaceStore.getState()
      const target = redirectAfterRemoval(urlNetworkIdRef.current, workspace)
      if (target === undefined || attempts >= MAX_ATTEMPTS) {
        return
      }
      attempts += 1
      logUi.info(
        `[useUrlFollowsNetworkRemoval]: ${urlNetworkIdRef.current} left the workspace, navigating to ${target === '' ? 'the network list' : target}`,
      )
      navigateRef.current({
        workspaceId: workspace.id,
        networkId: target,
        searchParams: new URLSearchParams(location.search),
        replace: true,
      })
      // urlManager silently drops a navigation within 300 ms of the previous
      // one. Look again once that window has passed; after a navigation that
      // did land, the URL no longer names a removed network and this stops.
      retryTimer = setTimeout(followRemoval, RETRY_DELAY_MS)
    }

    const unsubscribe = useWorkspaceStore.subscribe((state, prevState) => {
      const urlId = urlNetworkIdRef.current
      if (urlId === undefined || urlId === '') {
        return
      }
      // Act on the removal itself, never on the state the editor mounted
      // with: a URL may name a network the workspace does not hold (yet).
      const removed =
        prevState.workspace.networkIds.includes(urlId) &&
        !state.workspace.networkIds.includes(urlId)
      if (!removed) {
        return
      }
      attempts = 0
      clearTimeout(retryTimer)
      // The delete cascade drops the id from the workspace before it repairs
      // currentNetworkId, so wait for the synchronous cascade to finish.
      queueMicrotask(followRemoval)
    })

    return () => {
      unsubscribe()
      clearTimeout(retryTimer)
    }
  }, [])
}
