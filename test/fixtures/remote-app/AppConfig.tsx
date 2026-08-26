// Minimal Module Federation remote app fixture for the Tier-3.2 E2E test.
//
// Built as a SEPARATE @module-federation/vite bundle (see vite.config.ts) and
// served on a fixed port. The host loads it exactly like a real "Cytoscape Web
// App": it imports this remote's ESM remoteEntry.js, calls
// container.init(shareScope), container.get('./AppConfig'), and invokes the
// default-exported CyApp's mount() lifecycle.
//
// Self-contained apart from the ONE federated import below — it does not pull
// in the host source tree; `cyweb/WorkspaceApi` is declared locally in
// cyweb.d.ts and resolved at runtime through the federation runtime.
import {
  useCallback,
  useEffect,
  useState,
  version as reactVersion,
} from 'react'
import { createRoot } from 'react-dom/client'

// A RUNTIME import, not `import type`. A type-only import is erased at build
// time and would exercise nothing: this is the only thing in the suite that
// makes the remote consume a host API, which is the direction the runtime host
// resolution (mfRuntimePlugin.ts) exists to make work.
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'
import { useAppContext, type AppDataApi } from 'cyweb/AppIdContext'
import { useCyWebEvent } from 'cyweb/EventBus'

// Rendered by the remote into its OWN React root (mount). Proves the federated
// bundle loaded and its React works — independent of host↔remote sharing.
function Marker(): JSX.Element {
  const [reactWorks] = useState('hooks-ok')
  ;(
    window as unknown as { __remoteReactVersion?: string }
  ).__remoteReactVersion = reactVersion

  // Call the host API and render its result. The VALUE is what the E2E asserts
  // — an element that merely exists would also appear if this rendered the
  // empty string, which is what a mis-shaped cyweb.d.ts produces.
  const info = useWorkspaceApi().getWorkspaceInfo()
  const workspaceId = info.success
    ? info.data.workspaceId
    : `ERROR:${info.error.code}`

  return (
    <div data-testid="remote-app-marker">
      remote app mounted: {reactWorks} (react {reactVersion})
      <span data-testid="remote-host-workspace-id">{workspaceId}</span>
    </div>
  )
}

// Registered as an 'apps-menu' resource — the HOST renders this component inside
// its OWN React tree. Because it calls a hook (useState), it only renders
// successfully if the remote shares the host's single React instance. With two
// separate React copies, React throws "invalid hook call" and the host's
// PluginErrorBoundary swaps in a fallback, so the marker never appears. This is
// the true shared-singleton assertion (Stage 3).
function MenuMarker(): JSX.Element {
  const [shared] = useState('single-react-ok')
  return <span data-testid="remote-menu-marker">{shared}</span>
}

// ── App data panel (right-panel slot) ────────────────────────────────────────
//
// The read pattern the app-data API documents, in a component the HOST renders
// and keeps mounted across a network switch. Two reads, not one:
//
//   1. At mount, from workspace.getCurrentNetworkId() — no event fires for the
//      network that is already current when an app mounts.
//   2. On every `network:switched` — the panel is keyed by its resource id, not
//      by network, so React never remounts it and never re-reads for us.
//
// Any regression in either half shows up as a stale or empty value in the E2E.
const RESULTS_KEY = 'results'

function AppDataPanel(): JSX.Element {
  const ctx = useAppContext()
  const appData: AppDataApi | undefined = ctx?.apis.appData
  const [networkId, setNetworkId] = useState('')
  const [value, setValue] = useState('')

  const load = useCallback(
    (id: string) => {
      setNetworkId(id)
      if (appData === undefined || id === '') return setValue('')
      const result = appData.get(id, RESULTS_KEY)
      setValue(result.success ? String(result.data.value) : '')
    },
    [appData],
  )

  useEffect(() => {
    if (ctx === null) return
    const current = ctx.apis.workspace.getCurrentNetworkId()
    load(current.success ? current.data.networkId : '')
  }, [ctx, load])

  useCyWebEvent(
    'network:switched',
    useCallback((detail) => load(detail.networkId), [load]),
  )

  return (
    <div data-testid="remote-app-data-panel">
      <span data-testid="remote-app-data-network">{networkId}</span>
      <span data-testid="remote-app-data-value">{value}</span>
      <button
        data-testid="remote-app-data-write"
        onClick={() => {
          appData?.set(networkId, RESULTS_KEY, `results-for-${networkId}`)
          load(networkId)
        }}
      >
        write
      </button>
    </div>
  )
}

const TestRemoteApp = {
  id: 'testRemoteApp',
  name: 'Test Remote App',
  description: 'E2E fixture remote that renders a marker on mount.',
  version: '1.0.0',

  // Lifecycle hook the host calls after loading ./AppConfig.
  mount(context: {
    apis: {
      resource: {
        registerMenuItem: (opts: {
          id: string
          title?: string
          component: unknown
        }) => unknown
        registerPanel: (opts: {
          id: string
          title?: string
          component: unknown
        }) => unknown
      }
    }
  }): void {
    // (1) Render into the remote's own root — load/lifecycle proof.
    const host = document.createElement('div')
    host.id = 'remote-app-root'
    document.body.appendChild(host)
    createRoot(host).render(<Marker />)

    // (2) Hand the host a hooks-using component to render in its own tree —
    // shared-single-React proof.
    context.apis.resource.registerMenuItem({
      id: 'marker',
      title: 'Remote Marker',
      component: MenuMarker,
    })

    // (3) A right-panel component that reads per-network app data — the
    // storage-domain proof. Registered through the resource API rather than
    // declared in the manifest so the panel and the appData instance come from
    // the same per-app context object.
    context.apis.resource.registerPanel({
      id: 'appdata',
      title: 'App Data',
      component: AppDataPanel,
    })
  },

  unmount(): void {
    document.getElementById('remote-app-root')?.remove()
  },
}

export default TestRemoteApp
