import { HierarchyCircularNode } from 'd3-hierarchy'
import * as d3Selection from 'd3-selection'
import * as d3Zoom from 'd3-zoom'
import { useEffect, useRef } from 'react'

import {
  CpDefaults,
  findHierarchyNode,
  getColorMapper,
  getFontSize,
  getLabel,
  getWordLines,
} from '@/features/HierarchyViewer/components/CirclePackingLayout/CirclePackingUtils'
import { D3TreeNode } from '@/features/HierarchyViewer/components/CirclePackingLayout/D3TreeNode'
import { CirclePackingView } from '@/features/HierarchyViewer/model/CirclePackingView'
import { IdType } from '@/models/IdType'

import { cellViewRoot } from './buildCellView'

type Circle = HierarchyCircularNode<D3TreeNode>

const FIT_PADDING = 10
/** Share of the view's shorter side a focused subsystem's circle spans, as in CirclePackingPanel.tsx. */
const FOCUS_FILL = 0.5
/** How long a pointer rests on a subsystem before its network is prefetched. */
const HOVER_PREFETCH_MS = 150
const colorScale = getColorMapper([0, 5])

/** Subsystem id of a circle: duplicates in a DAG point at their original. */
export const subsystemIdOf = (circle: Circle): IdType =>
  circle.data.originalId ?? circle.data.id

interface CellViewProps {
  cellView: CirclePackingView
  selectedSubsystemId?: IdType
  /**
   * Subsystem the view opens zoomed to, read once when the view mounts.
   * Resizing keeps it framed until Fit is pressed.
   */
  focusSubsystemId?: IdType
  /** Leaf names to outline, from the subsystem view's selection. */
  highlightedLeafNames: ReadonlySet<string>
  onSelectSubsystem: (subsystemId: IdType | undefined) => void
  /** A pointer has rested on a subsystem's circle; used to prefetch it. */
  onHoverSubsystem?: (subsystemId: IdType) => void
  /** A leaf click: its name, and the subsystem that contains it. */
  onSelectLeaf: (leafName: string, parentSubsystemId: IdType) => void
}

/**
 * The Cell View: the hierarchy as nested circles, drawn with D3 as
 * CirclePackingPanel.tsx draws it. Deeper circles and their labels appear
 * as the view zooms in, or down to a selected subsystem.
 *
 * Copied rather than shared for the prototype: the full app's drawing reads
 * its stores and selects DOM nodes globally.
 */
export const CellView = ({
  cellView,
  selectedSubsystemId,
  focusSubsystemId,
  highlightedLeafNames,
  onSelectSubsystem,
  onHoverSubsystem,
  onSelectLeaf,
}: CellViewProps) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<d3Zoom.ZoomBehavior<SVGSVGElement, unknown> | null>(
    null,
  )
  const zoomDepthRef = useRef(1)
  const selectedDepthRef = useRef(0)
  // Depth the circles and labels show now; -1 after a redraw
  const shownDepthRef = useRef(-1)
  const focusIdRef = useRef(focusSubsystemId)

  const onSelectSubsystemRef = useRef(onSelectSubsystem)
  onSelectSubsystemRef.current = onSelectSubsystem
  const onSelectLeafRef = useRef(onSelectLeaf)
  onSelectLeafRef.current = onSelectLeaf
  const onHoverSubsystemRef = useRef(onHoverSubsystem)
  onHoverSubsystemRef.current = onHoverSubsystem

  /** Show circles down to `depth`, and the labels of that level and of leaves above it. */
  const showDepth = (depth: number): void => {
    const svg = svgRef.current
    // Zooming calls this every frame; the depth changes far less often
    if (svg === null || depth === shownDepthRef.current) return
    shownDepthRef.current = depth
    const select = d3Selection.select(svg)
    select
      .selectAll<SVGCircleElement, Circle>('circle')
      .style('display', (d) => (d.depth <= depth ? 'inline' : 'none'))
    select
      .selectAll<SVGTextElement, Circle>('text')
      .style('display', (d) =>
        (d.depth !== 0 && d.depth === depth) ||
        (d.height === 0 && d.depth < depth)
          ? 'inline'
          : 'none',
      )
  }

  const fit = (): void => {
    const svg = svgRef.current
    const zoom = zoomRef.current
    if (svg === null || zoom === null) return
    const { width, height } = svg.getBoundingClientRect()
    const root = cellViewRoot(cellView)
    if (width === 0 || height === 0 || root.r === 0) return
    const scale = Math.min(width, height) / (root.r * 2 + FIT_PADDING * 2)
    zoom.transform(
      d3Selection.select(svg),
      d3Zoom.zoomIdentity
        .translate(width / 2 - root.x * scale, height / 2 - root.y * scale)
        .scale(scale),
    )
  }

  /** Centre `circle`, scaled to span FOCUS_FILL of the view. */
  const zoomTo = (circle: Circle): void => {
    const svg = svgRef.current
    const zoom = zoomRef.current
    if (svg === null || zoom === null) return
    const { width, height } = svg.getBoundingClientRect()
    if (width === 0 || height === 0 || circle.r === 0) return
    const scale = (Math.min(width, height) / (circle.r * 2)) * FOCUS_FILL
    zoom.transform(
      d3Selection.select(svg),
      d3Zoom.zoomIdentity
        .translate(width / 2 - circle.x * scale, height / 2 - circle.y * scale)
        .scale(scale),
    )
  }

  /** Zoom to the focused subsystem, or fit the whole view without one. */
  const frame = (): void => {
    const focusId = focusIdRef.current
    const circle =
      focusId === undefined
        ? undefined
        : findHierarchyNode(focusId, cellViewRoot(cellView))
    if (circle === undefined) fit()
    else zoomTo(circle)
  }

  const fitAll = (): void => {
    focusIdRef.current = undefined
    fit()
  }

  useEffect(() => {
    const svgElement = svgRef.current
    if (svgElement === null) return
    const root = cellViewRoot(cellView)
    const svg = d3Selection.select(svgElement)
    svg.selectAll('*').remove()
    shownDepthRef.current = -1
    const wrapper = svg.append('g')

    let hoverTimer: ReturnType<typeof setTimeout> | undefined

    svg.on('click', (event: MouseEvent) => {
      if (event.target === svgElement) onSelectSubsystemRef.current(undefined)
    })

    wrapper
      .append('g')
      .selectAll<SVGCircleElement, Circle>('circle')
      .data(root.descendants())
      .join('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', (d) => d.r)
      .attr('fill', (d) => colorScale(d.depth))
      .attr('stroke', CpDefaults.borderColor)
      .attr('stroke-width', CpDefaults.borderWidth)
      .on('click', (_event: MouseEvent, d: Circle) => {
        if (d.height !== 0) {
          onSelectSubsystemRef.current(subsystemIdOf(d))
        } else if (d.parent !== null) {
          onSelectLeafRef.current(d.data.name, subsystemIdOf(d.parent))
        }
      })
      // The root is under every pointer that enters the view; not a sign
      // of interest, so it is not prefetched.
      .on('mouseenter', (_event: MouseEvent, d: Circle) => {
        clearTimeout(hoverTimer)
        if (d.height === 0 || d.depth === 0) return
        hoverTimer = setTimeout(
          () => onHoverSubsystemRef.current?.(subsystemIdOf(d)),
          HOVER_PREFETCH_MS,
        )
      })
      .on('mouseleave', () => clearTimeout(hoverTimer))
      .append('title')
      .text((d) => getLabel(d.data.id, cellView, d.data.name))

    wrapper
      .append('g')
      .attr('pointer-events', 'none')
      .selectAll<SVGTextElement, Circle>('text')
      .data(root.descendants())
      .join('text')
      .each(function (this: SVGTextElement, d) {
        const label = getLabel(d.data.id, cellView, d.data.name)
        const fontSize = getFontSize(d, label)
        const lines = getWordLines(label)
        const textHeight = lines.length * fontSize
        lines.forEach((line, lineNumber) => {
          d3Selection
            .select(this)
            .append('tspan')
            .text(line)
            .attr('font-size', fontSize)
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .attr('x', d.x)
            .attr(
              'y',
              d.y + lineNumber * fontSize - textHeight / 2 + fontSize / 2,
            )
            .style('user-select', 'none')
        })
      })

    const zoom = d3Zoom
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 40])
      .filter((event: any) => !event.button)
      .on('zoom', (event: d3Zoom.D3ZoomEvent<SVGSVGElement, unknown>) => {
        wrapper.attr('transform', event.transform.toString())
        // Depth shown grows with zoom; the fitted view counts as 1.
        zoomDepthRef.current = Math.ceil(event.transform.k / baseScale())
        showDepth(Math.max(zoomDepthRef.current, selectedDepthRef.current))
      })
    zoomRef.current = zoom
    svg.call(zoom)

    const baseScale = (): number => {
      const { width, height } = svgElement.getBoundingClientRect()
      return Math.min(width, height) / (root.r * 2 + FIT_PADDING * 2) || 1
    }

    const resizeObserver = new ResizeObserver(() => frame())
    resizeObserver.observe(svgElement)
    frame()

    return () => {
      clearTimeout(hoverTimer)
      resizeObserver.disconnect()
      svg.on('.zoom', null)
      svg.selectAll('*').remove()
    }
    // frame and showDepth read only refs and cellView
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redraw per Cell View model only
  }, [cellView])

  // Outline the selected subsystem and highlighted leaves, and open the
  // circles down to the selected subsystem.
  useEffect(() => {
    const svg = svgRef.current
    if (svg === null) return
    const root = cellViewRoot(cellView)
    const selected =
      selectedSubsystemId === undefined
        ? undefined
        : findHierarchyNode(selectedSubsystemId, root)
    selectedDepthRef.current = selected?.depth ?? 0
    showDepth(Math.max(zoomDepthRef.current, selectedDepthRef.current + 1))

    const isSelected = (d: Circle): boolean =>
      selectedSubsystemId !== undefined &&
      d.height !== 0 &&
      subsystemIdOf(d) === selectedSubsystemId
    const isLeaf = (d: Circle): boolean =>
      d.height === 0 && highlightedLeafNames.has(d.data.name)
    d3Selection
      .select(svg)
      .selectAll<SVGCircleElement, Circle>('circle')
      .attr('stroke', (d) =>
        isSelected(d)
          ? CpDefaults.selectedBorderColor
          : isLeaf(d)
            ? CpDefaults.leafBorderColor
            : CpDefaults.borderColor,
      )
      .attr('stroke-width', (d) =>
        isSelected(d) || isLeaf(d)
          ? CpDefaults.borderWidthHover
          : CpDefaults.borderWidth,
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- showDepth reads refs only
  }, [cellView, selectedSubsystemId, highlightedLeafNames])

  return (
    <div className="embed-cy">
      <svg
        ref={svgRef}
        data-testid="embed-cell-view"
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      />
      <button
        type="button"
        className="embed-button embed-button-text embed-paper embed-fit"
        data-testid="embed-cell-view-fit"
        onClick={fitAll}
      >
        Fit
      </button>
    </div>
  )
}
