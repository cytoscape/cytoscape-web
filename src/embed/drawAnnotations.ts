import { Core } from 'cytoscape'

import { createAnnotationLayers } from '@/features/NetworkPanel/CyjsRenderer/annotations/cyjsAnnotationRenderer'
import { registerCyExtensions } from '@/features/NetworkPanel/CyjsRenderer/registerCyExtensions'
import { CX_ANNOTATIONS_KEY } from '@/models/CxModel/impl/extractor'
import { NetworkSummary } from '@/models/NetworkSummaryModel'

registerCyExtensions()

/**
 * Paint the network's Cytoscape Desktop annotations (the `__Annotations`
 * network attribute) on canvases under and over the network, as
 * CyjsRenderer.tsx paintAnnotations does. The layers repaint on every pan
 * and zoom. Returns a function that removes them.
 */
export const drawAnnotations = (
  cy: Core,
  summary: NetworkSummary,
  backgroundColor: string,
): (() => void) => {
  const annotations = summary.properties.filter(
    (p) => p.predicateString === CX_ANNOTATIONS_KEY,
  )
  if (annotations.length === 0) {
    return () => undefined
  }

  const layers = createAnnotationLayers(cy)
  layers.setAnnotations({
    networkAttributes: {
      elements: annotations.map((a) => ({
        n: CX_ANNOTATIONS_KEY,
        v: Array.isArray(a.value) ? a.value : [a.value],
      })),
    },
  })
  // The background canvas sits below the annotation canvases, so it carries
  // the network background colour; the container colour would be hidden.
  layers.setBackgroundColor(backgroundColor)
  layers.attach()
  layers.redraw()
  return () => layers.dispose()
}
