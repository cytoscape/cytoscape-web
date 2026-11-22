import { currentDbScope } from '@/data/db/dbScope'
import { listenForDatabaseReset } from '@/data/db/lifecycle'
import { appRootHref } from './appRootHref'

let installed = false

/**
 * Hear Clear Local Cache and Load Workspace from other tabs for the whole life
 * of this document (see `listenForDatabaseReset`).
 *
 * The reload depends on the scope. An editor tab, wherever it is (a network,
 * the Error page, the startup failure screen), starts over at the app root
 * so a stale path or query cannot reload old data. A manual tab reloads in
 * place: the manual reads nothing from its address that outlives a clear.
 */
export const installDatabaseResetListener = (): void => {
  if (installed) {
    return
  }
  installed = true
  const reload =
    currentDbScope() === 'manual'
      ? () => window.location.reload()
      : () => window.location.assign(appRootHref())
  listenForDatabaseReset(reload)
}

export const resetDatabaseResetListenerForTesting = (): void => {
  installed = false
}
