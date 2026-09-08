'use client'
import { resolveMapping } from '@/lib/mappings'
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
              <line
                key={e.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={String(
                  resolveMapping(s.mappings?.lineColor, e, s.lineColor),
                )}
                strokeWidth={Number(
                  resolveMapping(s.mappings?.lineWidth, e, s.lineWidth),
                )}
                strokeDasharray={
                  e.interaction === 'predicted' ? '4 4' : undefined
                }
                markerEnd={s.arrows ? 'url(#arrow)' : undefined}
                opacity={0.7}
              />
            )
          })}
          {network.nodes.map((n) => {
            const active = selected.includes(n.id),
              r =
                Number(
                  resolveMapping(
                    s.mappings?.size,
                    n,
                    isHierarchy ? 56 : s.size,
                  ),
                ) / 2
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
                {s.shape === 'Diamond' ? (
                  <path
                    d={`M 0 ${-r} L ${r} 0 L 0 ${r} L ${-r} 0 Z`}
                    fill={String(resolveMapping(s.mappings?.fill, n, s.fill))}
                    opacity={s.opacity / 100}
                  />
                ) : s.shape === 'Rounded rectangle' ? (
                  <rect
                    x={-r}
                    y={-r * 0.72}
                    width={r * 2}
                    height={r * 1.44}
                    rx={5}
                    fill={String(resolveMapping(s.mappings?.fill, n, s.fill))}
                    opacity={s.opacity / 100}
                  />
                ) : (
                  <circle
                    r={r}
                    fill={String(resolveMapping(s.mappings?.fill, n, s.fill))}
                    opacity={s.opacity / 100}
                    stroke="color-mix(in srgb, var(--primary), transparent 60%)"
                    strokeWidth={s.border}
                  />
                )}
                {(s.mappings?.labelText
                  ? s.mappings.labelText.enabled || s.labelText
                  : s.mapped) && (
                  <text
                    y={
                      s.labelPosition === 'Below'
                        ? r + 17
                        : s.labelPosition === 'Above'
                          ? -r - 8
                          : 4
                    }
                    textAnchor="middle"
                    style={{
                      fontSize:
                        s.overrides[n.id] ??
                        Number(
                          resolveMapping(s.mappings?.labelSize, n, s.labelSize),
                        ),
                      fill: s.labelColor || undefined,
                      fontFamily:
                        s.font === 'Georgia'
                          ? 'Georgia'
                          : s.font === 'Monospace'
                            ? 'monospace'
                            : undefined,
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {s.mappings?.labelText
                      ? resolveMapping(
                          s.mappings.labelText,
                          n,
                          s.labelText || '',
                        )
                      : n[s.labelAttribute]}
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
