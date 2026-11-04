import cytoscape, { Core, EventObject } from 'cytoscape'
import { useEffect, useRef, useState } from 'react'

import config from '@/assets/config.json'
import { logUi } from '@/debug'
import { CyNetwork } from '@/models/CyNetworkModel'
import { IdType } from '@/models/IdType'
import { NetworkSummary } from '@/models/NetworkSummaryModel'

import { drawAnnotations } from './drawAnnotations'
import { applyPositions, drawNetwork } from './drawNetwork'
import { runDefaultLayout } from './runDefaultLayout'
import { addSearchStyle } from './searchHighlight'

export const FIT_PADDING = 20
/** Zoom change per pixel of wheel delta; a mouse notch (~100) is ~18%. */
const WHEEL_ZOOM_RATE = 0.002
const HINT_DURATION_MS = 1500
const FILTER_HIDDEN_CLASS = 'embed-filter-hidden'

export const ZOOM_KEY = /Mac|iPhone|iPad/.test(navigator.userAgent)
  ? '⌘'
  : 'Ctrl'

interface CyViewProps {
  cyNetwork: CyNetwork
  /** Draw this summary's Cytoscape Desktop annotations. */
  annotationsFrom?: NetworkSummary
  /** Positions applied over the CX2 ones, e.g. from applyCpLayout. */
  positions?: Map<IdType, [number, number]>
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
 * annotations, an optional default layout, and a Fit button. The host page
 * scrolls on a plain wheel; Ctrl/⌘ + wheel (and trackpad pinch, which the
 * browser reports as Ctrl + wheel) zooms the network.
 */
export const CyView = ({
  cyNetwork,
  annotationsFrom,
  positions,
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
  const [showHint, setShowHint] = useState(false)

  // Callbacks change identity on every parent render; the instance is
  // built once per network, so it reads them through refs.
  const onNodeTapRef = useRef(onNodeTap)
  onNodeTapRef.current = onNodeTap
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    const cy = cytoscape({
      container,
      hideEdgesOnViewport: true,
      boxSelectionEnabled: false,
      // Wheel zoom is handled below so a plain wheel scrolls the host page.
      userZoomingEnabled: false,
    })
    cyRef.current = cy
    let disposed = false
    let hintTimer: ReturnType<typeof setTimeout> | undefined
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

    const backgroundColor = drawNetwork(cy, cyNetwork)
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
    if (positions !== undefined) applyPositions(cy, positions)
    cy.fit(undefined, FIT_PADDING)

    cy.on('tap', 'node', (e: EventObject) =>
      onNodeTapRef.current?.(e.target.id()),
    )
    cy.on('tap', (e: EventObject) => {
      if (e.target === cy) onNodeTapRef.current?.(undefined)
    })

    const onWheel = (e: WheelEvent): void => {
      if (!(e.ctrlKey || e.metaKey)) {
        setShowHint(true)
        clearTimeout(hintTimer)
        hintTimer = setTimeout(() => setShowHint(false), HINT_DURATION_MS)
        return
      }
      e.preventDefault()
      setShowHint(false)
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
      clearTimeout(hintTimer)
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
  }, [cyNetwork, positions])

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
  }, [selectedNodeIds, cyNetwork, positions])

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
  }, [hiddenIds, cyNetwork, positions])

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
      {isLayingOut && (
        <div className="embed-paper embed-status">Applying layout…</div>
      )}
      <div
        className="embed-hint"
        style={{ opacity: showHint ? 1 : 0 }}
        aria-hidden={!showHint}
      >
        Use {ZOOM_KEY} + scroll to zoom
      </div>
    </div>
  )
}
