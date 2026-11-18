import { useEffect } from 'react'

import {
  DATABASE_DELETED,
  handleDatabaseDeleted,
  isClearLocalCacheAnnouncement,
  isOwnResetAnnouncement,
  UI_EVENTS_CHANNEL,
} from '@/data/db/lifecycle'

/**
 * Release this tab's databases when another tab deletes them, and reload once
 * it is done (`src/data/db/lifecycle.ts`).
 *
 * Mounted by the editor (`SyncTabs`) and by the manual (`ManualApp`): Clear
 * Local Cache deletes both scopes' databases and announces on both channels,
 * and a manual tab that kept a closed connection would fail every read until
 * reloaded.
 */
export const useReloadOnDatabaseReset = (reload: () => void): void => {
  useEffect(() => {
    const channel = new BroadcastChannel(UI_EVENTS_CHANNEL)

    channel.onmessage = (event) => {
      if (event.data?.type !== DATABASE_DELETED) {
        return
      }
      // The resetting tab hears its own announcement: BroadcastChannel excludes
      // only the posting channel object, and `announceDatabaseReset` opens a
      // separate one. Acting on it would close our connection mid-delete.
      if (isOwnResetAnnouncement(event.data)) {
        return
      }
      void handleDatabaseDeleted(channel, reload, {
        clearSessionStorage: isClearLocalCacheAnnouncement(event.data),
      })
    }

    return () => {
      channel.close()
    }
  }, [reload])
}
