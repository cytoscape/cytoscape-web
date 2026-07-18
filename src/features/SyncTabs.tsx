import debounce from 'lodash.debounce'
import { ReactElement, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import {
  getDb,
  getTimestampFromDb,
  getWorkspaceFromDb,
  putTimestampToDb,
} from '../data/db'
import { useDebugEnabled } from '../data/hooks/useDebugEnabled'
import { useAppStore } from '../data/hooks/stores/AppStore'
import { useMessageStore } from '../data/hooks/stores/MessageStore'
import { logUi } from '../debug'
import { ServiceStatus } from '../models/AppModel/ServiceStatus'
import { MessageSeverity } from '../models/MessageModel'
import {
  consumeCrossTabReloadFlag,
  flagCrossTabReload,
} from './MultiTabNotice/multiTabAwareness'
import { shouldReloadOnRefocus } from './syncTabsUtils'

const markForPageReload = debounce(() => {
  void putTimestampToDb(Date.now())
}, 300)

export const SyncTabsAction = (): ReactElement => {
  const params = useParams<{ workspaceId?: string; networkId?: string }>()
  const workspaceId = params.workspaceId ?? ''
  const [localTimestamp, setLocalTimestamp] = useState(0)
  const debug = useDebugEnabled()

  useEffect(() => {
    const onVisibilityChange = (): void => {
      if (debug) {
        return
      }

      if (document.hidden) {
        setLocalTimestamp(Date.now())
      } else {
        const { currentTask } = useAppStore.getState()
        const isTaskRunning =
          currentTask?.status === ServiceStatus.Submitted ||
          currentTask?.status === ServiceStatus.Processing

        if (isTaskRunning) {
          logUi.warn(
            `[${SyncTabsAction.name}]: Page reload skipped because a service app task is running: ${currentTask.id}`,
          )
          return
        }

        void getTimestampFromDb().then(async (timestamp) => {
          const workspace = await getWorkspaceFromDb(workspaceId)
          const hasData = workspace.networkIds.length > 0

          // Only reload when another tab actually wrote newer data to the shared
          // DB after this tab was hidden. An absent timestamp (never-written /
          // empty tab) or an empty workspace must not force a reload (CW-652).
          if (shouldReloadOnRefocus(timestamp, localTimestamp, hasData)) {
            // Leave a breadcrumb so the next load can tell the user why this tab
            // reloaded (CW-658).
            flagCrossTabReload()
            window.location.reload()
          }
        })
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [workspaceId, localTimestamp, debug])

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

  // If this load was triggered by a cross-tab reload, tell the user why (CW-658).
  useEffect(() => {
    if (consumeCrossTabReloadFlag()) {
      useMessageStore.getState().addMessage({
        message:
          'This tab was reloaded to reflect changes made in another Cytoscape Web tab.',
        duration: 6000,
        severity: MessageSeverity.INFO,
      })
    }
  }, [])

  return <></>
}
