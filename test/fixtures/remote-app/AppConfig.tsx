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

// Rendered by the HOST inside the dialog it opens for the fixture's
// 'open-dialog' menu item (apis.dialog.open). Because it calls a hook
// (useState), it only renders successfully if the remote shares the host's
// single React instance. With two separate React copies, React throws
// "invalid hook call" and the host's PluginErrorBoundary swaps in a fallback,
// so the marker never appears. This is the shared-singleton assertion
// (Stage 3) — it used to live in an 'apps-menu' component, but menu entries
// are plain data now and the host renders them itself.
function DialogMarker({ close }: { close: () => void }): JSX.Element {
  const [shared] = useState('dialog-hooks-ok')
  return (
    <div data-testid="remote-dialog-marker">
      {shared}
      <button data-testid="remote-dialog-done" onClick={close}>
        Done
      </button>
    </div>
  )
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

// Registered as a 'modal-launcher' resource — the HOST renders this inside
// its own dialog shell when openModal('fixture-modal') is called. Hooks
// prove the shared React instance, like MenuMarker above.
function FixtureModal({
  requestClose,
}: {
  requestClose: () => void
}): JSX.Element {
  const [state] = useState('modal-hooks-ok')
  return (
    <div data-testid="remote-modal-marker">
      Fixture Modal: {state}
      <button data-testid="remote-modal-cancel" onClick={requestClose}>
        Cancel
      </button>
    </div>
  )
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

// A 16x16 filled circle, inlined so the fixture needs no static asset.
// Deliberately NOT percent-encoded: a raw SVG data URI with literal quotes is
// valid and common, and the host must keep it intact when it becomes a CSS
// `url("...")` mask. (No `#` in the markup — that would start a fragment.)
const FIXTURE_ICON_URI =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="royalblue"/></svg>'

// The slice of the per-app API object the fixture's menu handlers use. A
// test double gets exactly the surface it calls (see cyweb.d.ts for why).
interface MountApis {
  dialog: {
    open: (opts: {
      id?: string
      title: string
      render: (props: { close: () => void }) => unknown
      maxWidth?: string | false
    }) => unknown
  }
  resource: {
    openModal: (id: string) => unknown
  }
}

const TestRemoteApp = {
  id: 'testRemoteApp',
  name: 'Test Remote App',
  description: 'E2E fixture remote that renders a marker on mount.',
  version: '1.0.0',

  // Lifecycle hook the host calls after loading ./AppConfig.
  mount(context: {
    apis: {
      dialog: {
        open: (opts: {
          id?: string
          title: string
          render: (props: { close: () => void }) => unknown
          maxWidth?: string | false
        }) => unknown
      }
      resource: {
        registerMenuItem: (opts: {
          id: string
          label: string
          tooltip?: string
          icon?: string
          onClick: (apis: MountApis) => void | Promise<void>
        }) => unknown
        registerPanel: (opts: {
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
        registerModal: (opts: {
          id: string
          component: unknown
          maxWidth?: string | false
          fullWidth?: boolean
        }) => unknown
        openModal: (id: string) => unknown
      }
    }
  }): void {
    // (1) Render into the remote's own root — load/lifecycle proof.
    const host = document.createElement('div')
    host.id = 'remote-app-root'
    document.body.appendChild(host)
    createRoot(host).render(<Marker />)

    // (2) A plain-data menu item: the HOST renders the row from label/tooltip
    // (no component crosses the boundary), and its click opens a dialog whose
    // body is a hooks-using component rendered in the host's tree — the
    // shared-single-React proof. `apis` is the per-app object the host hands
    // to every onClick; the E2E asserts both the host row and the dialog.
    context.apis.resource.registerMenuItem({
      id: 'open-dialog',
      label: 'Open Fixture Dialog',
      tooltip: 'Opens a host-framed dialog',
      // An image URI (same contract as a search-bar provider icon) — the
      // host renders it at a fixed size; no component crosses the boundary.
      icon: FIXTURE_ICON_URI,
      onClick: (apis) => {
        apis.dialog.open({
          id: 'fixture-dialog',
          title: 'Fixture Dialog',
          maxWidth: 'xs',
          render: ({ close }) => <DialogMarker close={close} />,
        })
      },
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

    // (4) Register a network search provider — the host's Workspace-tab
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

    // (5) Register a modal and a menu item that opens it imperatively —
    // the 'modal-launcher' contract: the host renders the modal in its own
    // dialog shell, and it outlives the dropdown that launched it (the host
    // closes the dropdown before running onClick).
    context.apis.resource.registerModal({
      id: 'fixture-modal',
      component: FixtureModal,
      maxWidth: 'sm',
      fullWidth: true,
    })
    context.apis.resource.registerMenuItem({
      id: 'open-modal',
      label: 'Open Fixture Modal',
      onClick: (apis) => {
        apis.resource.openModal('fixture-modal')
      },
    })
  },

  unmount(): void {
    document.getElementById('remote-app-root')?.remove()
    document.getElementById('remote-search-result')?.remove()
  },
}

export default TestRemoteApp
