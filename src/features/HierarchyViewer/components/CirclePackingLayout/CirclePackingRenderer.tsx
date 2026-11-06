import { lazy, Suspense } from 'react'

import { Network } from '../../../../models/NetworkModel'
import { Renderer } from '../../../../models/RendererModel/Renderer'

export const CP_RENDERER_ID: string = 'circlePacking'

// Lazy: this module is part of the eager workspace chunk, through
// useHierarchyViewerManager, and the panel pulls in d3-hierarchy/-selection/-zoom.
const CirclePackingPanel = lazy(() =>
  import('./CirclePackingPanel').then((m) => ({
    default: m.CirclePackingPanel,
  })),
)

/**
 * The Cell View. Module-scope so the renderer object keeps a stable identity
 * across renders. The lazy component stays out of the object: the store freezes
 * what it is given, and React cannot use a frozen `React.lazy` reference.
 */
export const CirclePackingRenderer: Renderer = {
  id: CP_RENDERER_ID,
  name: 'Cell View',
  description: 'Circle Packing Renderer',
  getComponent: (
    networkData: Network,
    initialSize = { w: 0, h: 0 },
    visible = true,
  ) => (
    <Suspense>
      <CirclePackingPanel
        rendererId={CP_RENDERER_ID}
        network={networkData}
        initialSize={initialSize}
        visible={visible}
      />
    </Suspense>
  ),
}
