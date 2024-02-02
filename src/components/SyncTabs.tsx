import { ReactElement, useEffect, useState } from 'react'
import {
  getDb,
  getTimestampFromDb,
  getWorkspaceFromDb,
  putTimestampToDb,
} from '../store/persist/db'
import debounce from 'lodash.debounce'
import { useNavigate } from 'react-router-dom'
import { parsePathName } from '../utils/paths-util'

const markForPageReload = debounce(() => {
  void putTimestampToDb(Date.now())
}, 300)

export const SyncTabsAction = (): ReactElement => {
  const [localTimestamp, setLocalTimestamp] = useState(0)

  const navigate = useNavigate()
  useEffect(() => {
    const onVisibilityChange = (): void => {
      if (document.hidden) {
        setLocalTimestamp(Date.now())
      } else {
        void getTimestampFromDb().then(async (timestamp) => {
          const parsed = parsePathName(location.pathname)
          const { networkId, workspaceId } = parsed

          const workspace = await getWorkspaceFromDb(workspaceId)

          if ((timestamp ?? Date.now()) > localTimestamp) {
            // if the network at the current url was deleted, navigate to /networks/ and reload the page
            if (!workspace.networkIds.includes(networkId)) {
              navigate('..', { relative: 'path' })
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
  })

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
      .catch((e) => console.log(e))
  }, [])

  return <></>
}
