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

// A component that uses a hook. Rendering it inside the host page proves the
// federated bundle carries a working React across the bundler boundary.
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

const TestRemoteApp = {
  id: 'testRemoteApp',
  name: 'Test Remote App',
  description: 'E2E fixture remote that renders a marker on mount.',
  version: '1.0.0',

  // Lifecycle hook the host calls after loading ./AppConfig. Renders a marker
  // node into the page so the test can assert the full load → init → get →
  // mount path executed against the real Vite bundle.
  mount(): void {
    const host = document.createElement('div')
    host.id = 'remote-app-root'
    document.body.appendChild(host)
    createRoot(host).render(<Marker />)
  },

  unmount(): void {
    document.getElementById('remote-app-root')?.remove()
  },
}

export default TestRemoteApp
