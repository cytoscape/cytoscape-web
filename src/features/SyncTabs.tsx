import { ReactElement, useEffect } from 'react'
import { getDb } from '../data/db'
import { isHydrating } from '../data/hooks/stores/hydrationContext'
import { useRendererStore } from '../data/hooks/stores/RendererStore'
import { logUi } from '../debug'
import { hydrateFromCrossTabChange } from './crossTabHydration'

import { useWorkspaceStore } from '../data/hooks/stores/WorkspaceStore'

export const SyncTabsAction = (): ReactElement => {
  useEffect(() => {
    const channel = new BroadcastChannel('cyweb-db-sync')

    channel.onmessage = (event) => {
      // The event.data is the payload of changes
      const changes = event.data

      const { currentNetworkId } = useWorkspaceStore.getState().workspace
      const affectsCurrentNetwork = changes.some(
        (c: any) =>
          c.key === currentNetworkId ||
          c.table === 'workspace' ||
          c.table === 'uiState' ||
          c.table === 'summaries',
      )

      if (affectsCurrentNetwork) {
        void hydrateFromCrossTabChange(changes)
      }
    }

    let dbInstance: any = null
    const changesListener = (changes: any) => {
        if (isHydrating()) {
          return
        }

        const payload = changes
          .filter((change: any) => change.table !== 'timestamp')
          .map((change: any) => ({
            table: change.table,
            type: change.type,
            key: change.key,
          }))

        if (payload.length > 0) {
          channel.postMessage(payload)
        }
    }

    const initDbListener = async (): Promise<void> => {
      dbInstance = await getDb()
      dbInstance.on('changes', changesListener)
    }

    initDbListener()
      .then(() => {})
      .catch((e) =>
        logUi.error(
          `[${SyncTabsAction.name}]: Failed to initialize db listener`,
          e,
        ),
      )

    return () => {
      channel.close()
      if (dbInstance) {
        dbInstance.on('changes').unsubscribe(changesListener)
      }
    }

    initDbListener()
      .then(() => {})
      .catch((e) =>
        logUi.error(
          `[${SyncTabsAction.name}]: Failed to initialize db listener`,
          e,
        ),
      )

    return () => {
      channel.close()
    }
  }, [])

  useEffect(() => {
    const channel = new BroadcastChannel('cyweb-ui-events')

    channel.onmessage = (event) => {
      const { type, networkId } = event.data
      if (type === 'FIT_NETWORK' && networkId) {
        useRendererStore.getState().deleteViewport('cyjs', networkId)
      } else if (type === 'DATABASE_DELETED') {
        window.location.href = '/'
      }
    }

    return () => {
      channel.close()
    }
  }, [])

  return <></>
}
