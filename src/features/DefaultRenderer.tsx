import { lazy, Suspense } from 'react'

import { Network } from '@/models/NetworkModel'
import { DEFAULT_RENDERER_ID } from '@/models/RendererModel/impl/defaultRenderer'
import { Renderer } from '@/models/RendererModel/Renderer'

// Loaded lazily so this module stays light: RendererStore imports it at store
// creation to seed `renderers`, which would otherwise drag cytoscape and the
// whole CyjsRenderer graph into the pre-render boot path. Module scope so the
// component identity is stable across getComponent calls — a per-call lazy()
// would remount the canvas on every render.
const CyjsRendererLazy = lazy(() =>
  import('./NetworkPanel/CyjsRenderer/CyjsRenderer').then((m) => ({
    default: m.CyjsRenderer,
  })),
)

/**
 * Default renderer for node-link diagrams based on Cytoscape.js
 * wrapped in the common renderer interface
 */
export const DefaultRenderer: Renderer = {
  id: DEFAULT_RENDERER_ID,
  name: 'Network View',
  description: 'Node-link diagram renderer based on Cytoscape.js',
  getComponent: (
    networkData: Network,
    initialSize?: { w: number; h: number },
    visible?: boolean,
    hasTab?: boolean,
  ) => (
    <Suspense fallback={null}>
      <CyjsRendererLazy network={networkData} hasTab={hasTab} />
    </Suspense>
  ),
}
