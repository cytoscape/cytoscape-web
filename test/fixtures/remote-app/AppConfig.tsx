// Minimal Module Federation remote app fixture for the Tier-3.2 E2E test.
//
// Built as a SEPARATE @module-federation/vite bundle (see vite.config.ts) and
// served on a fixed port. The host loads it exactly like a real "Cytoscape Web
// App": it imports this remote's ESM remoteEntry.js, calls
// container.init(shareScope), container.get('./AppConfig'), and invokes the
// default-exported CyApp's mount() lifecycle.
//
// Self-contained — it does NOT import host types, so the fixture builds without
// pulling in the host source tree.
import { useState, version as reactVersion } from 'react'
import { createRoot } from 'react-dom/client'

// Rendered by the remote into its OWN React root (mount). Proves the federated
// bundle loaded and its React works — independent of host↔remote sharing.
function Marker(): JSX.Element {
  const [reactWorks] = useState('hooks-ok')
  ;(
    window as unknown as { __remoteReactVersion?: string }
  ).__remoteReactVersion = reactVersion
  return (
    <div data-testid="remote-app-marker">
      remote app mounted: {reactWorks} (react {reactVersion})
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
  },

  unmount(): void {
    document.getElementById('remote-app-root')?.remove()
  },
}

export default TestRemoteApp
