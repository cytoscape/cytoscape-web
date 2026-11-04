import cytoscape, { Core, EventObject } from 'cytoscape'
import { useEffect, useRef, useState } from 'react'

import config from '@/assets/config.json'
import { logUi } from '@/debug'
import { CyNetwork } from '@/models/CyNetworkModel'
import { IdType } from '@/models/IdType'
import { NetworkSummary } from '@/models/NetworkSummaryModel'

import { drawAnnotations } from './drawAnnotations'
import { buildDrawing, Drawing } from './drawing'
import { applyPositions, DrawProgress, drawNetwork } from './drawNetwork'
import { runDefaultLayout } from './runDefaultLayout'
import { addSearchStyle } from './searchHighlight'

export const FIT_PADDING = 20
/** Zoom change per pixel of wheel delta; a mouse notch (~100) is ~18%. */
const WHEEL_ZOOM_RATE = 0.002
const FILTER_HIDDEN_CLASS = 'embed-filter-hidden'
/**
 * Networks with at least this many nodes and edges draw with Cytoscape.js's
 * WebGL renderer. The canvas renderer redraws every edge each frame, which
 * blocks for hundreds of milliseconds per frame at ~20,000 edges.
 */
const WEBGL_MIN_ELEMENTS = 10000

interface CyViewProps {
  cyNetwork: CyNetwork
  /** Draw this summary's Cytoscape Desktop annotations. */
  annotationsFrom?: NetworkSummary
  /** The network, built ahead (e.g. in the prepare worker); else built here. */
  drawing?: Drawing
  /** Run the full app's default layout; for networks without coordinates. */
  defaultLayout?: { networkId: IdType; isHierarchical: boolean }
  /** Nodes shown as selected. */
  selectedNodeIds?: readonly IdType[]
  /** Elements hidden by a filter, through a stylesheet class. */
  hiddenIds?: ReadonlySet<IdType>
  onNodeTap?: (nodeId: IdType | undefined) => void
  /** Receives the instance after the first draw, and null on teardown. */
  onReady?: (cy: Core | null) => void
  /** Exposes the instance as window.__embedCy in dev, for compare-embed. */
  exposeForCompare?: boolean
  testId?: string
}

/**
 * One network drawn with Cytoscape.js through the full app's pipeline, with
 * annotations, an optional default layout, and a Fit button. The wheel and
 * trackpad pinch zoom the network.
 */
export const CyView = ({
  cyNetwork,
  annotationsFrom,
  drawing: prebuilt,
  defaultLayout,
  selectedNodeIds,
  hiddenIds,
  onNodeTap,
  onReady,
  exposeForCompare = false,
  testId = 'embed-canvas',
}: CyViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const [background, setBackground] = useState<string>('#ffffff')
  const [isLayingOut, setIsLayingOut] = useState(false)
  const [progress, setProgress] = useState<DrawProgress | undefined>()

  // Callbacks change identity on every parent render; the instance is
  // built once per network, so it reads them through refs.
  const onNodeTapRef = useRef(onNodeTap)
  onNodeTapRef.current = onNodeTap
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  // Read by the edge batches still drawing when the filter changes
  const hiddenIdsRef = useRef(hiddenIds)
  hiddenIdsRef.current = hiddenIds

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    const useWebgl =
      cyNetwork.network.nodes.length + cyNetwork.network.edges.length >=
      WEBGL_MIN_ELEMENTS
    const cy = cytoscape({
      container,
      webgl: useWebgl,
      hideEdgesOnViewport: true,
      boxSelectionEnabled: false,
      // Wheel zoom is handled below, at a steadier rate than Cytoscape.js's.
      userZoomingEnabled: false,
    })
    cyRef.current = cy
    let disposed = false
    if (import.meta.env.DEV) {
      // For scripts/compare-embed.mjs and browser checks
      const w = window as unknown as { __embedCys?: Record<string, Core> }
      w.__embedCys = { ...w.__embedCys, [testId]: cy }
      if (exposeForCompare) {
        Object.assign(window, {
          __embedCy: cy,
          __embedSummary: annotationsFrom,
        })
      }
    }

    const network = prebuilt ?? buildDrawing(cyNetwork)
    const drawing = drawNetwork(cy, network, {
      // Edges drawn after the first frame miss the filter effect below
      onEdgesAdded: (edges) => {
        const hidden = hiddenIdsRef.current
        if (hidden === undefined || hidden.size === 0) return
        edges
          .filter((edge) => hidden.has(edge.id()))
          .addClass(FILTER_HIDDEN_CLASS)
      },
      onProgress: (p) => {
        if (!disposed) {
          setProgress(p.edgesDrawn < p.edgeCount ? p : undefined)
        }
      },
    })
    const backgroundColor = network.background
    addSearchStyle(cy)
    cy.style()
      .selector(`.${FILTER_HIDDEN_CLASS}`)
      .style({ display: 'none' })
      .update()
    setBackground(backgroundColor)
    const removeAnnotations =
      annotationsFrom === undefined
        ? () => undefined
        : drawAnnotations(cy, annotationsFrom, backgroundColor)
    // Fit to the nodes: edges still drawing add nothing to the bounds, and
    // fitting to them would resolve their styles all at once.
    cy.fit(cy.nodes(), FIT_PADDING)

    cy.on('tap', 'node', (e: EventObject) =>
      onNodeTapRef.current?.(e.target.id()),
    )
    cy.on('tap', (e: EventObject) => {
      if (e.target === cy) onNodeTapRef.current?.(undefined)
    })

    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      const rect = container.getBoundingClientRect()
      cy.zoom({
        level: cy.zoom() * Math.exp(-e.deltaY * WHEEL_ZOOM_RATE),
        renderedPosition: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      })
    }
    container.addEventListener('wheel', onWheel, { passive: false })

    // Keep the network in view when the frame or a pane resizes.
    const resizeObserver = new ResizeObserver(() => {
      cy.resize()
    })
    resizeObserver.observe(container)

    onReadyRef.current?.(cy)

    if (defaultLayout !== undefined) {
      setIsLayingOut(true)
      runDefaultLayout(
        defaultLayout.networkId,
        cyNetwork.network,
        defaultLayout.isHierarchical,
        config.maxNetworkElementsThreshold,
      )
        .then((layoutPositions) => {
          if (disposed || layoutPositions === undefined) return
          applyPositions(cy, layoutPositions)
          cy.fit(undefined, FIT_PADDING)
        })
        .catch((error: unknown) => {
          logUi.warn('[embed] default layout failed', error)
        })
        .finally(() => {
          if (!disposed) setIsLayingOut(false)
        })
    }

    return () => {
      disposed = true
      drawing.cancel()
      setProgress(undefined)
      resizeObserver.disconnect()
      container.removeEventListener('wheel', onWheel)
      removeAnnotations()
      onReadyRef.current?.(null)
      cy.destroy()
      cyRef.current = null
    }
    // One instance per network and layout input; selection and filters
    // update it in place below.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- annotationsFrom/defaultLayout/exposeForCompare are fixed per network
  }, [cyNetwork, prebuilt])

  useEffect(() => {
    const cy = cyRef.current
    if (cy === null) return
    const ids = new Set(selectedNodeIds ?? [])
    cy.batch(() => {
      cy.nodes().forEach((node) => {
        if (ids.has(node.id())) node.select()
        else node.unselect()
      })
    })
  }, [selectedNodeIds, cyNetwork, prebuilt])

  useEffect(() => {
    const cy = cyRef.current
    if (cy === null) return
    cy.batch(() => {
      cy.elements().removeClass(FILTER_HIDDEN_CLASS)
      if (hiddenIds !== undefined && hiddenIds.size > 0) {
        cy.elements()
          .filter((ele) => hiddenIds.has(ele.id()))
          .addClass(FILTER_HIDDEN_CLASS)
      }
    })
  }, [hiddenIds, cyNetwork, prebuilt])

  return (
    <div className="embed-cy" style={{ background }}>
      <div
        ref={containerRef}
        data-testid={testId}
        // Transparent and its own stacking context, as in CyjsRenderer.tsx:
        // the annotation canvases sit at negative z-index inside it, and a
        // container background would paint over them.
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      />
      <button
        type="button"
        className="embed-button embed-button-text embed-paper embed-fit"
        data-testid={`${testId}-fit`}
        onClick={() => cyRef.current?.fit(undefined, FIT_PADDING)}
      >
        Fit
      </button>
      {progress !== undefined && (
        <div
          className="embed-paper embed-status embed-progress"
          data-testid={`${testId}-progress`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.edgeCount}
          aria-valuenow={progress.edgesDrawn}
        >
          Drawing interactions {progress.edgesDrawn.toLocaleString()} /{' '}
          {progress.edgeCount.toLocaleString()}
          <div className="embed-progress-track">
            <div
              className="embed-progress-bar"
              style={{
                width: `${(100 * progress.edgesDrawn) / progress.edgeCount}%`,
              }}
            />
          </div>
        </div>
      )}
      {isLayingOut && progress === undefined && (
        <div className="embed-paper embed-status">Applying layout…</div>
      )}
    </div>
  )
}
