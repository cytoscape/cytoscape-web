import { Alert, Box, Button, Typography } from '@mui/material'
import { type ReactElement, useCallback, useEffect, useState } from 'react'

import { dbNameFor } from '@/data/db/dbScope'
import { ObjectStoreNames } from '@/data/db'

/**
 * What each object store of the editor's database holds, in reader terms.
 * Typed over every store: a new store fails the type check until it has a
 * label here, so this page cannot silently under-report.
 */
const STORE_LABELS: Record<ObjectStoreNames, string> = {
  workspace: 'Workspace name and network list',
  summaries: 'Network names, descriptions and sizes',
  cyNetworks: 'Network nodes and edges',
  cyTables: 'Node, edge and network tables',
  cyVisualStyles: 'Styles',
  cyNetworkViews: 'Node positions and views',
  uiState: 'Panel, tab and table settings',
  filters: 'Hierarchy filter settings',
  apps: 'Installed apps',
  serviceApps: 'Service apps',
  opaqueAspects: 'Other network data kept for NDEx and Cytoscape Desktop',
  undoStacks: 'Undo history',
  appSettings: 'App settings',
  cyStyleLibrary: 'Workspace Styles',
  viewSelections: 'Selections',
  appData: 'Data saved by apps',
  workspaceFilters: 'FILTER tab filters',
  appliedWorkspaceFilters: 'Applied filters',
}

/** localStorage keys Cytoscape Web writes, with what they hold. */
const LOCAL_STORAGE_LABELS: Record<string, string> = {
  'cyweb.onboarding': 'Whether you have seen the welcome dialog and tours',
  cytoscapeWebCrashDataConsent: 'Your crash report choice, kept one year',
  cytoscapeWebDesktopPermissionNoticeSeen:
    'Whether you have seen the Cytoscape Desktop connection notice',
  'cyweb-network-search': 'Your search box settings',
  'cyweb-debug-enabled': 'Developer logging switch',
}

interface StoreCount {
  store: string
  label: string
  rows: number
}

type Snapshot =
  | { kind: 'loading' }
  | { kind: 'unsupported' }
  | { kind: 'empty' }
  | { kind: 'ready'; version: number; counts: StoreCount[] }

/**
 * Counts the rows in the editor's database without opening it for writing.
 * Checks `indexedDB.databases()` first: `indexedDB.open` on a missing name
 * would create an empty database, which this view must never do.
 */
const readEditorDatabase = async (): Promise<Snapshot> => {
  const editorDb = dbNameFor('app')
  if (typeof indexedDB.databases !== 'function') {
    return { kind: 'unsupported' }
  }
  const existing = await indexedDB.databases()
  if (!existing.some((info) => info.name === editorDb)) {
    return { kind: 'empty' }
  }
  return await new Promise<Snapshot>((resolve, reject) => {
    const request = indexedDB.open(editorDb)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      // Let an editor tab upgrade its schema without waiting on this view.
      db.onversionchange = () => db.close()
      const stores = Object.values(ObjectStoreNames).filter((name) =>
        db.objectStoreNames.contains(name),
      )
      if (stores.length === 0) {
        db.close()
        resolve({ kind: 'empty' })
        return
      }
      const transaction = db.transaction(stores, 'readonly')
      const counts: StoreCount[] = []
      for (const store of stores) {
        const count = transaction.objectStore(store).count()
        count.onsuccess = () =>
          counts.push({ store, label: STORE_LABELS[store], rows: count.result })
      }
      transaction.oncomplete = () => {
        db.close()
        counts.sort(
          (a, b) =>
            stores.indexOf(a.store as ObjectStoreNames) -
            stores.indexOf(b.store as ObjectStoreNames),
        )
        resolve({ kind: 'ready', version: db.version, counts })
      }
      transaction.onerror = () => {
        db.close()
        reject(transaction.error)
      }
    }
  })
}

const readLocalStorageKeys = (): string[] => {
  try {
    return Object.keys(LOCAL_STORAGE_LABELS).filter(
      (key) => window.localStorage.getItem(key) !== null,
    )
  } catch {
    return []
  }
}

/**
 * A read-only look at what Cytoscape Web keeps in this browser: row counts
 * from the editor's database, the app's localStorage keys, and cookie names.
 * It never shows the stored values, and it never writes.
 */
export const BrowserStorageView = (): ReactElement => {
  const [snapshot, setSnapshot] = useState<Snapshot>({ kind: 'loading' })
  const [localKeys, setLocalKeys] = useState<string[]>([])
  const [cookies, setCookies] = useState<string[]>([])
  const [error, setError] = useState<string>()

  const refresh = useCallback((): void => {
    setError(undefined)
    setLocalKeys(readLocalStorageKeys())
    setCookies(
      document.cookie
        .split(';')
        .map((c) => c.split('=')[0].trim())
        .filter((name) => name !== ''),
    )
    readEditorDatabase()
      .then(setSnapshot)
      .catch((cause: unknown) => setError(String(cause)))
  }, [])

  useEffect(refresh, [refresh])

  return (
    <Box
      data-testid="manual-browser-storage"
      sx={{ my: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
          What Cytoscape Web stores in this browser
        </Typography>
        <Button size="small" onClick={refresh}>
          Refresh
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Read from this browser now. Counts only: the stored values are not
        shown, and nothing is changed or sent anywhere.
      </Typography>

      {error !== undefined ? (
        <Alert severity="warning">Could not read the database: {error}</Alert>
      ) : null}
      {snapshot.kind === 'unsupported' ? (
        <Alert severity="info">
          This browser cannot list its databases, so the workspace counts are
          not shown.
        </Alert>
      ) : null}
      {snapshot.kind === 'empty' ? (
        <Typography variant="body2">
          No workspace is stored in this browser.
        </Typography>
      ) : null}
      {snapshot.kind === 'ready' ? (
        <table data-testid="manual-browser-storage-db">
          <thead>
            <tr>
              <th>Your workspace (database {dbNameFor('app')})</th>
              <th>Entries</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.counts.map((row) => (
              <tr key={row.store}>
                <td>{row.label}</td>
                <td>{row.rows}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <table data-testid="manual-browser-storage-local">
        <thead>
          <tr>
            <th>Preferences (localStorage)</th>
            <th>Stored</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(LOCAL_STORAGE_LABELS).map(([key, label]) => (
            <tr key={key}>
              <td>{label}</td>
              <td>{localKeys.includes(key) ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Typography variant="body2">
        Cookies for this site:{' '}
        {cookies.length === 0 ? 'none' : cookies.join(', ')}.
      </Typography>
    </Box>
  )
}
