import { Alert, Box, Button, Typography } from '@mui/material'
import { type ReactElement, useCallback, useEffect, useState } from 'react'

import { dbNameFor, profileDbNameFor } from '@/data/db/dbScope'
import { ObjectStoreNames } from '@/data/db'
import { ProfileStoreNames } from '@/data/db/profileDb'
import {
  TAB_NETWORK_KEY,
  TAB_VIEW_STATE_KEY,
} from '@/data/tabState/storageKeys'
import { LLM_API_KEYS_SESSION_KEY } from '@/features/LLMQuery/store/storageKeys'

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

/**
 * What each object store of the profile database holds. That database keeps
 * what belongs to this browser rather than to a workspace, so clearing the
 * workspace leaves it. Typed over every store, like `STORE_LABELS`.
 */
const PROFILE_STORE_LABELS: Record<ProfileStoreNames, string> = {
  settings: 'LLM Query provider, endpoint and model',
}

/**
 * sessionStorage keys Cytoscape Web writes, with what they hold. Listed
 * without a "stored" column: sessionStorage belongs to one tab, and this
 * page usually runs in a different tab from the editor, so it cannot see
 * what the editor's tab holds.
 */
const SESSION_STORAGE_LABELS: Record<string, string> = {
  [TAB_VIEW_STATE_KEY]: 'Which panels and tabs are open',
  [TAB_NETWORK_KEY]: 'Which network is shown',
  [LLM_API_KEYS_SESSION_KEY]: 'The LLM Query API key you entered, if any',
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
 * Counts the rows in one of the editor's databases without opening it for
 * writing. Checks `indexedDB.databases()` first: `indexedDB.open` on a
 * missing name would create an empty database, which this view must never do.
 */
const readDatabase = async <S extends string>(
  editorDb: string,
  storeNames: readonly S[],
  labels: Record<S, string>,
): Promise<Snapshot> => {
  if (typeof indexedDB.databases !== 'function') {
    return { kind: 'unsupported' }
  }
  const existing = await indexedDB.databases()
  if (!existing.some((info) => info.name === editorDb)) {
    return { kind: 'empty' }
  }
  return await new Promise<Snapshot>((resolve, reject) => {
    const request = indexedDB.open(editorDb)
    // Another tab can delete the database between the list and this open,
    // and opening a missing database creates it. Abort that creation: the
    // view must never write.
    request.onupgradeneeded = () => {
      request.transaction?.abort()
    }
    request.onerror = () => {
      // The aborted creation above: the database is gone, not unreadable.
      if (request.error?.name === 'AbortError') resolve({ kind: 'empty' })
      else reject(request.error)
    }
    request.onsuccess = () => {
      const db = request.result
      // Let an editor tab upgrade its schema without waiting on this view.
      db.onversionchange = () => db.close()
      const stores = storeNames.filter((name) =>
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
          counts.push({ store, label: labels[store], rows: count.result })
      }
      transaction.oncomplete = () => {
        db.close()
        counts.sort(
          (a, b) => stores.indexOf(a.store as S) - stores.indexOf(b.store as S),
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

const readEditorDatabase = async (): Promise<Snapshot> =>
  await readDatabase(
    dbNameFor('app'),
    Object.values(ObjectStoreNames),
    STORE_LABELS,
  )

const readProfileDatabase = async (): Promise<Snapshot> =>
  await readDatabase(
    profileDbNameFor('app'),
    Object.values(ProfileStoreNames),
    PROFILE_STORE_LABELS,
  )

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
 * from the editor's two databases, the app's localStorage keys, what it
 * keeps per tab in sessionStorage, and cookie names. It never shows the
 * stored values, and it never writes.
 */
export const BrowserStorageView = (): ReactElement => {
  const [snapshot, setSnapshot] = useState<Snapshot>({ kind: 'loading' })
  const [profile, setProfile] = useState<Snapshot>({ kind: 'loading' })
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
    readProfileDatabase()
      .then(setProfile)
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

      {profile.kind === 'ready' ? (
        <table data-testid="manual-browser-storage-profile-db">
          <thead>
            <tr>
              <th>
                Kept when you clear the workspace (database{' '}
                {profileDbNameFor('app')})
              </th>
              <th>Entries</th>
            </tr>
          </thead>
          <tbody>
            {profile.counts.map((row) => (
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

      <table data-testid="manual-browser-storage-session">
        <thead>
          <tr>
            <th>Kept for one tab, until you close it (sessionStorage)</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(SESSION_STORAGE_LABELS).map(([key, label]) => (
            <tr key={key}>
              <td>{label}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Each tab has its own, so this page cannot tell what another tab holds.
      </Typography>

      <Typography variant="body2">
        Cookies for this site:{' '}
        {cookies.length === 0 ? 'none' : cookies.join(', ')}.
      </Typography>
    </Box>
  )
}
