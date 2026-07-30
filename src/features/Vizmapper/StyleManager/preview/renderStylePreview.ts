/**
 * Renders a visual style to a PNG data URL for the style picker's thumbnails.
 *
 * Deliberately goes through the SAME pipeline as the real canvas —
 * applyVisualStyle -> addCyElements -> createCyjsDataMapper -> applyViewModel —
 * so a thumbnail cannot drift from what the network will actually look like.
 * A hand-drawn SVG swatch would be cheaper and would silently become a lie the
 * first time the renderer changed.
 *
 * The DOM/cytoscape dependency is confined here; the graph a style is drawn on
 * is built by previewSample.ts, which stays pure and unit-testable.
 */
import cytoscape, { Core } from 'cytoscape'

import { IdType } from '../../../../models/IdType'
import { NetworkView } from '../../../../models/ViewModel'
import { VisualStyle } from '../../../../models/VisualStyleModel'
import VisualStyleFn from '../../../../models/VisualStyleModel'
import { stripBypasses } from '../../../../models/VisualStyleModel/impl/visualStyleSetImpl'
import { VisualEditorProperties } from '../../../../models/VisualStyleModel/VisualStyleOptions'
import { addCyElements } from '../../../NetworkPanel/CyjsRenderer/cyjsFactoryUtil'
import {
  applyViewModel,
  createCyjsDataMapper,
} from '../../../NetworkPanel/CyjsRenderer/cyjsRenderUtil'
import { PreviewSample } from './previewSample'

const PREVIEW_WIDTH = 300
const PREVIEW_HEIGHT = 200
/** Headroom for labels that overhang their node; see the fit call below. */
const PREVIEW_PADDING = 28

/**
 * A preview shows a style, not a network's editor state, so the editor
 * overrides are all off. tableDisplayConfiguration is irrelevant to rendering
 * but required by the type.
 */
const PREVIEW_EDITOR_PROPERTIES: VisualEditorProperties = {
  nodeSizeLocked: false,
  arrowColorMatchesEdge: false,
  tableDisplayConfiguration: {
    nodeTable: { columnConfiguration: [] },
    edgeTable: { columnConfiguration: [] },
  },
}

/**
 * ONE offscreen cytoscape instance for the whole app, reused for every
 * thumbnail in sequence.
 *
 * A grid of 20 tiles each constructing its own instance means 20 canvases and
 * 20 renderer teardowns; the picker would jank on open. Renders are serialized
 * through renderQueue below instead.
 */
let previewCy: Core | undefined
let previewHost: HTMLDivElement | undefined

const getPreviewCy = (): Core => {
  if (previewCy !== undefined) {
    return previewCy
  }
  previewHost = document.createElement('div')
  previewHost.style.position = 'absolute'
  // Off-screen rather than display:none — a zero-size container gives
  // cytoscape no viewport to fit into and cy.png() comes back blank.
  previewHost.style.left = '-10000px'
  previewHost.style.top = '0'
  previewHost.style.width = `${PREVIEW_WIDTH}px`
  previewHost.style.height = `${PREVIEW_HEIGHT}px`
  previewHost.setAttribute('aria-hidden', 'true')
  document.body.appendChild(previewHost)

  previewCy = cytoscape({
    container: previewHost,
    // No interaction: this instance is never shown, and the handlers would
    // only cost time.
    userZoomingEnabled: false,
    userPanningEnabled: false,
    boxSelectionEnabled: false,
    autounselectify: true,
  })
  return previewCy
}

/**
 * Serializes renders so concurrent callers cannot interleave on the shared
 * instance — the second caller's cy.add() would otherwise land in the first
 * caller's graph and both thumbnails would be wrong.
 */
let renderQueue: Promise<unknown> = Promise.resolve()

const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
  const result = renderQueue.then(work, work)
  // Swallow rejections on the chain itself so one failed render does not
  // reject every later one; the caller still sees its own rejection.
  renderQueue = result.catch(() => undefined)
  return result
}

/**
 * Thumbnail cache.
 *
 * Keyed by the VisualStyle OBJECT, not by an id or a hash: the store's Immer
 * middleware hands out a fresh object on every mutation, so an edited style is
 * automatically a cache miss and an unedited one is automatically a hit. No
 * hashing of ~100 visual properties, and no chance of a stale thumbnail
 * surviving an edit.
 *
 * The inner key is the sample's key, so the same style previewed against a
 * different network is a separate entry.
 */
const cache = new WeakMap<VisualStyle, Map<string, string>>()

const cached = (
  visualStyle: VisualStyle,
  sampleKey: string,
): string | undefined => cache.get(visualStyle)?.get(sampleKey)

const putInCache = (
  visualStyle: VisualStyle,
  sampleKey: string,
  dataUrl: string,
): void => {
  const bySample = cache.get(visualStyle) ?? new Map<string, string>()
  bySample.set(sampleKey, dataUrl)
  cache.set(visualStyle, bySample)
}

/**
 * Build the NetworkView for a sample, stamping the sample's positions onto the
 * node views. applyVisualStyle computes the visual values but knows nothing
 * about layout.
 */
const buildPreviewView = (
  sample: PreviewSample,
  visualStyle: VisualStyle,
): NetworkView => {
  const view = VisualStyleFn.applyVisualStyle({
    network: sample.network,
    nodeTable: sample.nodeTable,
    edgeTable: sample.edgeTable,
    visualStyle,
  })

  Object.entries(sample.positions).forEach(([nodeId, position]) => {
    const nodeView = view.nodeViews[nodeId as IdType]
    if (nodeView !== undefined) {
      nodeView.x = position.x
      nodeView.y = position.y
    }
  })

  return view
}

/**
 * Render `visualStyle` on `sample` and return a PNG data URL.
 *
 * Bypasses are stripped first: a bypass keys off the element ids of one
 * specific network, so on a sample graph it would either miss entirely or paint
 * a meaningless one-off override.
 */
export const renderStylePreview = async (
  visualStyle: VisualStyle,
  sample: PreviewSample,
): Promise<string> => {
  const hit = cached(visualStyle, sample.key)
  if (hit !== undefined) {
    return hit
  }

  return await enqueue(async () => {
    // Re-check inside the queue: several tiles can ask for the same style
    // before any of them has rendered.
    const queuedHit = cached(visualStyle, sample.key)
    if (queuedHit !== undefined) {
      return queuedHit
    }

    const cy = getPreviewCy()
    const previewStyle = stripBypasses(visualStyle)
    const view = buildPreviewView(sample, previewStyle)

    cy.elements().remove()
    addCyElements(
      cy,
      Object.values(view.nodeViews),
      sample.network.edges,
      view.edgeViews,
    )
    cy.style(createCyjsDataMapper(previewStyle) as any)
    applyViewModel(cy, view, PREVIEW_EDITOR_PROPERTIES)
    // Fit into the container and export the VIEWPORT, not `full: true`. A full
    // export sizes itself from the element bounding box, which clips a label
    // that overhangs its node — the reason several Cytoscape Desktop thumbnails
    // read as "ource" and "Targe". Fitting with padding first guarantees
    // headroom for overhanging labels.
    cy.fit(undefined, PREVIEW_PADDING)

    const dataUrl = cy.png({
      output: 'base64uri',
      maxWidth: PREVIEW_WIDTH,
      maxHeight: PREVIEW_HEIGHT,
      // Opaque white: node fills are frequently white or transparent, and on a
      // transparent thumbnail those styles read as an empty tile.
      bg: '#ffffff',
    })

    putInCache(visualStyle, sample.key, dataUrl)
    return dataUrl
  })
}

/** Tear down the shared instance. For tests and hot-reload hygiene. */
export const resetStylePreviewForTesting = (): void => {
  previewCy?.destroy()
  previewCy = undefined
  previewHost?.remove()
  previewHost = undefined
  renderQueue = Promise.resolve()
}
