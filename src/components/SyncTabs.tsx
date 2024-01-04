import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
// import Dexie from 'dexie'
import { ReactElement, useEffect, useState } from 'react'
import {
  getDb,
  getTimestampFromDb,
  putTimestampToDb,
} from '../store/persist/db'
import debounce from 'lodash.debounce'

const updateTimeStamp = debounce(() => {
  void putTimestampToDb(Date.now())
}, 300)

export const SyncTabsAction = (): ReactElement => {
  const [showDialog, setShowDialog] = useState(false)
  const [localTimestamp, setLocalTimestamp] = useState(0)

  useEffect(() => {
    const onVisibilityChange = (): void => {
      if (document.hidden) {
        // get timestamp when the tab was hidden
        setLocalTimestamp(Date.now())
      } else {
        // the tab is now active, get the timestamp from db
        // if the db timestamp is newer than the local timestamp, show the dialog
        // as it means the user has made changes in another tab
        void getTimestampFromDb().then((timestamp) => {
          if ((timestamp ?? Date.now()) > localTimestamp) {
            setShowDialog(true)
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
            // console.log('change created: ' + JSON.stringify(change.obj))
            updateTimeStamp()
            break
          case 2: // UPDATED
            // console.log('change updated: ' + JSON.stringify(change.obj))

            updateTimeStamp()
            break
          case 3: // DELETED
            // console.log('change deleted: ' + JSON.stringify(change))

            updateTimeStamp()
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

  return (
    <>
      <Dialog open={showDialog}>
        <DialogTitle>Cytoscape Web tabs out of sync</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Changes have been made in another tab in Cytoscape Web. Reload the
            page to sync the changes.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => window.location.reload()}>
            Reload Cytoscape Web
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
