import { ReactElement, useEffect, useState } from 'react'
import {
  getDb,
  getTimestampFromDb,
  putTimestampToDb,
} from '../store/persist/db'
import debounce from 'lodash.debounce'
import { useNavigate } from 'react-router-dom'

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
        void getTimestampFromDb().then((timestamp) => {
          if ((timestamp ?? Date.now()) > localTimestamp) {
            // navigate to /networks/ and reload the page
            // navigate to /networks/ because the user may have deleted the current network
            // and navigating to /networks/<deleted_network_id> will re-add the network to the workspace
            navigate('..', { relative: 'path' })
            window.location.reload()
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
