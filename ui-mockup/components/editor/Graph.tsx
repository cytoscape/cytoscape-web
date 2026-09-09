'use client'
import { effectiveValue } from '@/lib/bypasses'
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- SVG canvas and nodes provide keyboard navigation; HTML buttons cannot wrap SVG geometry. */
import { useState, useEffect, useRef } from 'react'
import {
  Minus,
  Plus,
  Maximize,
  MousePointer2,
  ArrowUpRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Network } from '@/lib/editor'
export function Graph({
  network,
  selected,
  onSelect,
  onNodeClick,
  onOpen,
  confidence,
  physical,
  predicted,
}: {
  network: Network
  selected: string[]
  onSelect: (ids: string[]) => void
  onNodeClick: (id: string) => void
  onOpen: () => void
  confidence: number
  physical: boolean
  predicted: boolean
}) {
  const [zoom, setZoom] = useState(1)
  const root = useRef<HTMLDivElement>(null)
  const [bounds, setBounds] = useState({ width: 980, height: 480 })
  useEffect(() => {
    if (!root.current) return
    const observer = new ResizeObserver(([entry]) =>
      setBounds({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    )
    observer.observe(root.current)
    return () => observer.disconnect()
  }, [])
  const point = (n: { x: string; y: string }) => ({
    x: 70 + ((Number(n.x) - 60) / 840) * Math.max(100, bounds.width - 140),
    y: 100 + ((Number(n.y) - 45) / 380) * Math.max(70, bounds.height - 165),
  })
  const s = network.style,
    isHierarchy = network.id === 'hierarchy'
  const edges = network.edges.filter(
    (e) =>
      Number(e.confidence) >= confidence &&
      (e.interaction === 'physical' ? physical : predicted),
  )
  return (
    <div
      ref={root}
      className="canvas-area"
      style={{ background: s.background || undefined }}
    >
      <div className="canvas-heading">
        <div className="canvas-eyebrow">
          {isHierarchy ? 'HIERARCHY' : 'NETWORK'}
        </div>
        <h1>{network.name}</h1>
        <p>
          {network.nodes.length} nodes <span>·</span> {edges.length} edges{' '}
          {edges.length !== network.edges.length && <span>shown</span>}
        </p>
      </div>
      <svg
        className="graph"
        viewBox={`0 0 ${bounds.width} ${bounds.height}`}
        aria-label={`${network.name} graph`}
        role="application"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onSelect([])
        }}
        onClick={() => onSelect([])}
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="20"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
          </marker>
        </defs>
        <g
          transform={`translate(${(bounds.width / 2) * (1 - zoom)} ${(bounds.height / 2) * (1 - zoom)}) scale(${zoom})`}
        >
          {edges.map((e) => {
            const a = point(network.nodes.find((n) => n.id === e.source)!),
              b = point(network.nodes.find((n) => n.id === e.target)!)
            return (
              <g
                key={e.id}
                role="button"
                tabIndex={0}
                aria-label={`Select edge ${network.nodes.find((n) => n.id === e.source)?.name} to ${network.nodes.find((n) => n.id === e.target)?.name}`}
                aria-pressed={selected.includes(e.id)}
                onClick={(event) => {
                  event.stopPropagation()
                  onSelect(
                    event.shiftKey
                      ? selected.includes(e.id)
                        ? selected.filter((id) => id !== e.id)
                        : [...selected, e.id]
                      : [e.id],
                  )
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    event.stopPropagation()
                    onSelect([e.id])
                  }
                }}
              >
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="transparent"
                  strokeWidth={Math.max(
                    12,
                    Number(effectiveValue(s, e, 'lineWidth')) + 8,
                  )}
                />
                {selected.includes(e.id) && (
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="var(--foreground)"
                    strokeOpacity={0.2}
                    strokeWidth={Number(effectiveValue(s, e, 'lineWidth')) + 5}
                  />
                )}
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={String(effectiveValue(s, e, 'lineColor'))}
                  strokeWidth={Number(effectiveValue(s, e, 'lineWidth'))}
                  strokeDasharray={
                    e.interaction === 'predicted' ? '4 4' : undefined
                  }
                  markerEnd={
                    effectiveValue(s, e, 'arrows') ? 'url(#arrow)' : undefined
                  }
                  opacity={0.7}
                />
              </g>
            )
          })}
          {network.nodes.map((n) => {
            const active = selected.includes(n.id),
              r = Number(effectiveValue(s, n, 'size')) / 2
            return (
              <g
                key={n.id}
                role="button"
                tabIndex={0}
                aria-label={`Select ${n.name}`}
                aria-pressed={active}
                className="graph-node"
                transform={`translate(${point(n).x},${point(n).y})`}
                onClick={(e) => {
                  e.stopPropagation()
                  onNodeClick(n.id)
                  onSelect(
                    e.shiftKey
                      ? active
                        ? selected.filter((id) => id !== n.id)
                        : [...selected, n.id]
                      : [n.id],
                  )
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  if (isHierarchy && n.name === 'MAPK cascade') onOpen()
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault()
                    onNodeClick(n.id)
                    onSelect([n.id])
                    if (
                      e.key === 'Enter' &&
                      isHierarchy &&
                      n.name === 'MAPK cascade'
                    )
                      onOpen()
                  }
                }}
              >
                {active && (
                  <circle
                    r={r + 5}
                    fill="none"
                    stroke="var(--foreground)"
                    strokeWidth={2}
                  />
                )}
                <circle r={Math.max(r, 16)} fill="transparent" />
                {effectiveValue(s, n, 'shape') === 'Diamond' ? (
                  <path
                    d={`M 0 ${-r} L ${r} 0 L 0 ${r} L ${-r} 0 Z`}
                    fill={String(effectiveValue(s, n, 'fill'))}
                    opacity={Number(effectiveValue(s, n, 'opacity')) / 100}
                    stroke="color-mix(in srgb, var(--primary), transparent 60%)"
                    strokeWidth={Number(effectiveValue(s, n, 'border'))}
                  />
                ) : effectiveValue(s, n, 'shape') === 'Rounded rectangle' ? (
                  <rect
                    x={-r}
                    y={-r * 0.72}
                    width={r * 2}
                    height={r * 1.44}
                    rx={5}
                    fill={String(effectiveValue(s, n, 'fill'))}
                    opacity={Number(effectiveValue(s, n, 'opacity')) / 100}
                    stroke="color-mix(in srgb, var(--primary), transparent 60%)"
                    strokeWidth={Number(effectiveValue(s, n, 'border'))}
                  />
                ) : (
                  <circle
                    r={r}
                    fill={String(effectiveValue(s, n, 'fill'))}
                    opacity={Number(effectiveValue(s, n, 'opacity')) / 100}
                    stroke="color-mix(in srgb, var(--primary), transparent 60%)"
                    strokeWidth={Number(effectiveValue(s, n, 'border'))}
                  />
                )}
                {(s.bypasses?.[n.id]?.labelText !== undefined ||
                  (s.mappings?.labelText
                    ? s.mappings.labelText.enabled || s.labelText
                    : s.mapped)) && (
                  <text
                    y={
                      effectiveValue(s, n, 'labelPosition') === 'Below'
                        ? r + 17
                        : effectiveValue(s, n, 'labelPosition') === 'Above'
                          ? -r - 8
                          : 4
                    }
                    textAnchor="middle"
                    style={{
                      fontSize: Number(effectiveValue(s, n, 'labelSize')),
                      fill:
                        String(effectiveValue(s, n, 'labelColor')) || undefined,
                      fontFamily:
                        effectiveValue(s, n, 'font') === 'Georgia'
                          ? 'Georgia'
                          : effectiveValue(s, n, 'font') === 'Monospace'
                            ? 'monospace'
                            : undefined,
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {String(effectiveValue(s, n, 'labelText'))}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>
      {isHierarchy && (
        <Button
          className="open-subsystem"
          size="sm"
          variant="outline"
          onClick={onOpen}
        >
          Open MAPK cascade <ArrowUpRight size={14} />
        </Button>
      )}
      <div className="canvas-note">
        <span className="species-dot" />
        Homo sapiens <span>·</span>{' '}
        {selected.length
          ? `${selected.length} selected · Shift-click to add`
          : 'Click a node to inspect'}
      </div>
      <div className="canvas-tools">
        <MousePointer2 size={15} />
        <span className="tool-divider" />
        <Button
          aria-label="Zoom out"
          variant="ghost"
          size="icon-xs"
          onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
        >
          <Minus />
        </Button>
        <span>{Math.round(zoom * 100)}%</span>
        <Button
          aria-label="Zoom in"
          variant="ghost"
          size="icon-xs"
          onClick={() => setZoom(Math.min(2, zoom + 0.1))}
        >
          <Plus />
        </Button>
        <span className="tool-divider" />
        <Button
          aria-label="Fit network"
          variant="ghost"
          size="icon-xs"
          onClick={() => setZoom(1)}
        >
          <Maximize />
        </Button>
      </div>
    </div>
  )
}
