import { ReactElement, useEffect } from 'react'
import { getDb } from '../data/db'
import { isHydrating } from '../data/hooks/stores/hydrationContext'
import { useRendererStore } from '../data/hooks/stores/RendererStore'
import { logUi } from '../debug'
import { hydrateFromCrossTabChange } from './crossTabHydration'

export const SyncTabsAction = (): ReactElement => {
  useEffect(() => {
    const channel = new BroadcastChannel('cyweb-db-sync')

    channel.onmessage = (event) => {
      // The event.data is the payload of changes
      const changes = event.data
      void hydrateFromCrossTabChange(changes)
    }

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
      }
    }

    return () => {
      channel.close()
    }
  }, [])

  useEffect(() => {
    const initDbListener = async (): Promise<void> => {
      const db = await getDb()
      db.on('changes', (changes) => {
        // If we are currently hydrating, we do NOT broadcast changes,
        // because the DB did not actually change—we just updated the in-memory
        // store, which bypassed DB writes.
        // Even if a DB write did occur locally, we don't broadcast it if we are
        // in a hydration cycle to prevent infinite ping-pong.
        if (isHydrating()) {
          return
        }

        const payload = changes
          .filter((change) => change.table !== 'timestamp') // Ignore timestamp
          .map((change) => ({
            table: change.table,
            type: change.type,
            key: change.key,
          }))

        if (payload.length > 0) {
          const channel = new BroadcastChannel('cyweb-db-sync')
          channel.postMessage(payload)
          channel.close()
        }
      })
    }

    initDbListener()
      .then(() => {})
      .catch((e) =>
        logUi.error(
          `[${SyncTabsAction.name}]: Failed to initialize db listener`,
          e,
        ),
      )
  }, [])

  return <></>
}
