import { ReactElement, useEffect, useState } from 'react'
import {
  getDb,
  getTimestampFromDb,
  putTimestampToDb,
} from '../store/persist/db'
import debounce from 'lodash.debounce'
import { useWorkspaceStore } from '../store/WorkspaceStore'
import { useNavigate } from 'react-router-dom'

const markForPageReload = debounce(() => {
  void putTimestampToDb(Date.now())
}, 300)

export const SyncTabsAction = (): ReactElement => {
  const [localTimestamp, setLocalTimestamp] = useState(0)
  const [reloadToRootPage, setReloadToRootPage] = useState(false)
  const [tabIsActive, setTabIsActive] = useState(true)
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const [tabNetworkId, setTabNetworkId] = useState<string | null>(
    currentNetworkId,
  )

  const navigate = useNavigate()
  useEffect(() => {
    const onVisibilityChange = (): void => {
      if (document.hidden) {
        // get timestamp when the tab was hidden
        setTabNetworkId(currentNetworkId)
        setLocalTimestamp(Date.now())
        setTabIsActive(false)
      } else {
        setTabIsActive(true)
        // the tab is now active, get the timestamp from db
        // if the db timestamp is newer than the local timestamp, show the dialog
        // as it means the user has made changes in another tab
        void getTimestampFromDb().then((timestamp) => {
          if ((timestamp ?? Date.now()) > localTimestamp) {
            if (reloadToRootPage) {
              navigate('/')
            }
            // window.location.reload()
          }
        })
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const initDbListener = async (): Promise<void> => {
    const db = await getDb()
    db.on('changes', (changes) => {
      if (tabIsActive) {
        return
      }
      changes.forEach((change) => {
        // ignore changes to the timestamp table
        if (change.table === 'timestamp') {
          return
        }
        switch (change.type) {
          case 1: // CREATED
            // console.log('change created:', change)
            markForPageReload()
            break
          case 2: // UPDATED
            // console.log('change updated:', change)
            markForPageReload()
            // only mark for page reload if the network that changed is the current network id
            console.log('change.obj.id:', change?.obj?.id)
            console.log('currentNetworkId:', currentNetworkId)
            console.log('tab network id:', tabNetworkId)
            if (change?.obj?.id === currentNetworkId) {
              markForPageReload()
            }
            break
          case 3: // DELETED
            // console.log('change deleted:', change)
            markForPageReload()

            // the current network has been deleted from another tab,
            // instead of reloading the current url e.g. /workspace/networks/<currentNetworkId>
            // reload to the root url e.g. / and let the routing logic handle which route to navigate to

            if (change.oldObj?.id === currentNetworkId) {
              setReloadToRootPage(true)
              console.log('change.obj.id:', change?.oldObj?.id)
              console.log('currentNetworkId:', currentNetworkId)
              console.log('tab network id:', tabNetworkId)
            }
            break
        }
      })
    })
  }

  useEffect(() => {
    initDbListener()
      .then(() => {})
      .catch((e) => console.log(e))
  }, [currentNetworkId, tabIsActive])

  return <></>
}
