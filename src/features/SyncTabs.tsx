import { ReactElement, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getDb,
  getTimestampFromDb,
  getWorkspaceFromDb,
  putTimestampToDb,
} from '../db'
import debounce from 'lodash.debounce'
import { logUi } from '../debug'

const markForPageReload = debounce(() => {
  void putTimestampToDb(Date.now())
}, 300)

export const SyncTabsAction = (): ReactElement => {
  const params = useParams<{ workspaceId?: string; networkId?: string }>()
  const workspaceId = params.workspaceId ?? ''
  const networkId = params.networkId ?? ''
  const [localTimestamp, setLocalTimestamp] = useState(0)

  useEffect(() => {
    const onVisibilityChange = (): void => {
      if (document.hidden) {
        setLocalTimestamp(Date.now())
      } else {
        void getTimestampFromDb().then(async (timestamp) => {
          const workspace = await getWorkspaceFromDb(workspaceId)

          if ((timestamp ?? Date.now()) > localTimestamp) {
            // if the network at the current url was deleted, navigate to /networks/ and reload the page
            if (!workspace.networkIds.includes(networkId)) {
              // navigate('..', { relative: 'path' })
              window.location.reload()
            } else {
              window.location.reload()
            }
          }
        })
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [workspaceId, networkId])

  const initDbListener = async (): Promise<void> => {
    const db = await getDb()
    db.on('changes', (changes) => {
      changes.forEach((change) => {
        // ignore changes to the timestamp table
        if (change.table === 'timestamp') {
          return
        }
        switch (change.type) {
          case 1: // CREATED
            markForPageReload()
            break
          case 2: // UPDATED
            markForPageReload()
            break
          case 3: // DELETED
            markForPageReload()
            break
        }
      })
    })
  }

  useEffect(() => {
    initDbListener()
      .then(() => {})
      .catch((e) =>
        logUi.error(
          `[${SyncTabsAction.name}]:[${initDbListener.name}]: Failed to initialize db listener`,
          e,
        ),
      )
  }, [])

  return <></>
}
