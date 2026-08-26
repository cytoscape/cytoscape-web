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
import { useState, version as reactVersion } from 'react'
import { createRoot } from 'react-dom/client'

// A RUNTIME import, not `import type`. A type-only import is erased at build
// time and would exercise nothing: this is the only thing in the suite that
// makes the remote consume a host API, which is the direction the runtime host
// resolution (mfRuntimePlugin.ts) exists to make work.
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'

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

// State shared between the search options panel and the submit handler —
// the app owns its extra parameters; the host only renders the panel.
let exactMatch = false

// Registered as the search provider's optionsComponent — the HOST renders it
// inside the "More Options" popover in its OWN React tree (hooks prove the
// shared React instance, like MenuMarker above).
function SearchOptionsPanel(): JSX.Element {
  const [checked, setChecked] = useState(exactMatch)
  return (
    <label data-testid="remote-search-options">
      <input
        type="checkbox"
        data-testid="remote-search-exact-checkbox"
        checked={checked}
        onChange={(e) => {
          exactMatch = e.target.checked
          setChecked(e.target.checked)
        }}
      />
      Exact match
    </label>
  )
}

// The submit handler writes what it received into a DOM marker the E2E can
// assert on: the trimmed query from the host plus the app-owned option.
function runFixtureSearch(query: { query: string }): void {
  let el = document.getElementById('remote-search-result')
  if (el === null) {
    el = document.createElement('div')
    el.id = 'remote-search-result'
    el.setAttribute('data-testid', 'remote-search-result')
    document.body.appendChild(el)
  }
  el.textContent = `query:${query.query};exact:${exactMatch}`
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
        registerNetworkSearchProvider: (opts: {
          id: string
          name: string
          description?: string
          placeholder?: string
          optionsComponent?: unknown
          onSubmit: (query: { query: string }) => void
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

    // (3) Register a network search provider — the host's Workspace-tab
    // search bar only appears once a provider exists, so this both proves
    // the registration path and gives the E2E a provider to drive.
    context.apis.resource.registerNetworkSearchProvider({
      id: 'fixture-search',
      name: 'Fixture Search',
      description: 'E2E fixture network search provider.',
      placeholder: 'Fixture query...',
      optionsComponent: SearchOptionsPanel,
      onSubmit: runFixtureSearch,
    })
  },

  unmount(): void {
    document.getElementById('remote-app-root')?.remove()
    document.getElementById('remote-search-result')?.remove()
  },
}

export default TestRemoteApp
