'use client'
import { useState, useRef } from 'react'
import { ChevronRight, RotateCcw } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Network, Row, Style } from '@/lib/editor'
import {
  bypassGroups,
  effectiveValue,
  updateBypasses,
  type BypassProperty,
  type BypassValue,
} from '@/lib/bypasses'

type Property = {
  key: BypassProperty
  label: string
  type?: 'color' | 'text' | 'choice'
  min?: number
  max?: number
  options?: string[]
}
const nodeGroups: [string, Property[]][] = [
  [
    'Appearance',
    [
      { key: 'fill', label: 'Fill', type: 'color' },
      {
        key: 'shape',
        label: 'Shape',
        type: 'choice',
        options: ['Ellipse', 'Rounded rectangle', 'Diamond'],
      },
      { key: 'opacity', label: 'Opacity', min: 0, max: 100 },
    ],
  ],
  ['Size', [{ key: 'size', label: 'Diameter', min: 8, max: 64 }]],
  ['Border', [{ key: 'border', label: 'Border width', min: 0, max: 6 }]],
  [
    'Labels',
    [
      { key: 'labelText', label: 'Label text', type: 'text' },
      {
        key: 'font',
        label: 'Font',
        type: 'choice',
        options: ['Inter', 'Georgia', 'Monospace'],
      },
      { key: 'labelSize', label: 'Font size', min: 8, max: 28 },
      { key: 'labelColor', label: 'Color', type: 'color' },
      {
        key: 'labelPosition',
        label: 'Position',
        type: 'choice',
        options: ['Below', 'Center', 'Above'],
      },
    ],
  ],
]
const edgeGroups: [string, Property[]][] = [
  [
    'Line',
    [
      { key: 'lineWidth', label: 'Line width', min: 0.5, max: 12 },
      { key: 'lineColor', label: 'Edge colour', type: 'color' },
    ],
  ],
  [
    'Arrows',
    [
      {
        key: 'arrows',
        label: 'Arrows',
        type: 'choice',
        options: ['None', 'Target'],
      },
    ],
  ],
]

function ValueControl({
  property: p,
  value,
  onChange,
  onStart,
}: {
  property: Property
  value: BypassValue
  onChange: (v: BypassValue, transient?: boolean) => void
  onStart: () => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const skipBlur = useRef(false)
  const colorChanged = useRef(false)
  const commit = () => {
    if (draft === null) return
    if (p.type === 'color') {
      if (/^#[0-9a-f]{6}$/i.test(draft)) onChange(draft.toLowerCase())
    } else if (p.type) onChange(draft)
    else if (draft.trim() && Number.isFinite(Number(draft)))
      onChange(Math.max(p.min ?? 0, Math.min(p.max ?? 100, Number(draft))))
    setDraft(null)
  }
  if (p.type === 'choice')
    return (
      <Select
        value={p.key === 'arrows' ? (value ? 'Target' : 'None') : String(value)}
        onValueChange={(v) => {
          if (v) onChange(p.key === 'arrows' ? v === 'Target' : v)
        }}
      >
        <SelectTrigger className="property-select" aria-label={p.label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="style-select-menu">
          {p.options?.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  if (p.type === 'color')
    return (
      <div className="bypass-color">
        <input
          aria-label={p.label}
          type="color"
          value={String(value || '#737373')}
          onChange={(e) => {
            onStart()
            colorChanged.current = true
            onChange(e.target.value, true)
          }}
          onBlur={(e) => {
            if (colorChanged.current) {
              colorChanged.current = false
              onChange(e.target.value)
            }
          }}
        />
        <input
          className="bypass-hex"
          aria-label={`${p.label} hex`}
          value={draft ?? String(value)}
          placeholder="Theme colour"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (skipBlur.current) skipBlur.current = false
            else commit()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit()
              skipBlur.current = true
              e.currentTarget.blur()
            }
            if (e.key === 'Escape') {
              setDraft(null)
              skipBlur.current = true
              e.currentTarget.blur()
            }
          }}
        />
      </div>
    )
  return (
    <div className="bypass-value">
      <Input
        aria-label={p.label}
        className={p.type ? '' : 'bypass-number'}
        type={p.type ? 'text' : 'number'}
        value={draft ?? String(value)}
        min={p.min}
        max={p.max}
        step={0.1}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (skipBlur.current) skipBlur.current = false
          else commit()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit()
            skipBlur.current = true
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') {
            setDraft(null)
            skipBlur.current = true
            e.currentTarget.blur()
          }
        }}
      />
      {!p.type && (
        <Slider
          aria-label={`${p.label} slider`}
          min={p.min}
          max={p.max}
          step={0.1}
          value={[Number(value)]}
          onValueChange={(v) => {
            onStart()
            onChange(Array.isArray(v) ? v[0] : v, true)
          }}
          onValueCommitted={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        />
      )}
    </div>
  )
}

function BypassRow({
  property: p,
  rows,
  network,
  onStyle,
}: {
  property: Property
  rows: Row[]
  network: Network
  onStyle: (s: Partial<Style>, transient?: boolean) => void
}) {
  const groups = bypassGroups(network.style, rows, p.key)
  const [frozen, setFrozen] = useState<typeof groups | null>(null)
  const [all, setAll] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const shown = frozen ?? groups
  const overridden = groups.some((g) => g.overridden)
  const write = (ids: string[], value?: BypassValue, transient = false) => {
    onStyle(updateBypasses(network.style, ids, p.key, value), transient)
    if (!transient) setFrozen(null)
  }
  const control = (ids: string[], value: BypassValue) => (
    <ValueControl
      property={p}
      value={value}
      onStart={() => setFrozen((prev) => prev ?? groups)}
      onChange={(v, transient) => write(ids, v, transient)}
    />
  )
  return (
    <div
      className={`mapped-property bypass-property ${shown.length === 1 ? 'bypass-single' : ''}`}
    >
      <div className="mapped-property-heading">
        <span className="plain-property-name">{p.label}</span>
        <Button
          className="property-map-toggle"
          variant="ghost"
          size="icon-xs"
          disabled={!overridden}
          aria-label={`Reset ${p.label} bypasses`}
          title="Restore network style"
          onClick={() => write(rows.map((r) => r.id))}
        >
          <RotateCcw size={13} />
        </Button>
      </div>
      <div className="bypass-values">
        {shown.length > 4 && (
          <button
            className="bypass-expand"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            <ChevronRight size={12} />
            {shown.length} distinct values
          </button>
        )}
        {(shown.length <= 4 || expanded) &&
          shown.map((g) => (
            <div className="bypass-entry" key={g.ids.join('|')}>
              <div className="bypass-entry-caption">
                <span>
                  {g.overridden ? 'Overridden' : 'Inherited'} · {g.ids.length}{' '}
                  {rows[0]?.source !== undefined
                    ? g.ids.length === 1
                      ? 'edge'
                      : 'edges'
                    : g.ids.length === 1
                      ? 'node'
                      : 'nodes'}
                </span>
                {g.overridden && shown.length > 1 && (
                  <button
                    aria-label={`Reset ${p.label} for ${g.ids.length} elements`}
                    title="Restore network style for this group"
                    onClick={() => write(g.ids)}
                  >
                    <RotateCcw size={11} />
                  </button>
                )}
              </div>
              {control(
                g.ids,
                effectiveValue(
                  network.style,
                  rows.find((r) => r.id === g.ids[0])!,
                  p.key,
                ),
              )}
            </div>
          ))}
        {shown.length > 1 && (
          <>
            <button
              className="bypass-set-all"
              onClick={() => setAll(!all)}
              aria-expanded={all}
            >
              Set all…
            </button>
            {all && (
              <div className="bypass-entry">
                <span className="bypass-entry-caption">
                  Apply to all {rows.length} selected
                </span>
                {control(
                  rows.map((r) => r.id),
                  effectiveValue(network.style, rows[0], p.key),
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function BypassInspector({
  network,
  selected,
  onStyle,
  active,
}: {
  active: boolean
  network: Network
  selected: string[]
  onStyle: (s: Partial<Style>, transient?: boolean) => void
}) {
  const nodes = network.nodes.filter((n) => selected.includes(n.id)),
    edges = network.edges.filter((e) => selected.includes(e.id))
  return (
    <div className="bypass-tree" hidden={!active}>
      {(
        [
          ['Nodes', nodes, nodeGroups],
          ['Edges', edges, edgeGroups],
        ] as const
      ).map(
        ([title, rows, groups]) =>
          rows.length > 0 && (
            <Collapsible key={title} defaultOpen>
              <CollapsibleTrigger className="section-trigger">
                <span className="tree-row-content">
                  <ChevronRight size={14} />
                  {title}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="property-tree">
                {groups.map(([name, props]) =>
                  name === 'Arrows' ? (
                    <div className="category-content" key={name}>
                      <BypassRow
                        property={props[0]}
                        rows={rows}
                        network={network}
                        onStyle={onStyle}
                      />
                    </div>
                  ) : (
                    <Collapsible
                      className="inspector-group"
                      defaultOpen={name === 'Appearance' || name === 'Line'}
                      key={name}
                    >
                      <CollapsibleTrigger className="category-trigger">
                        <span className="tree-row-content">
                          <ChevronRight size={13} />
                          {name}
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="category-content">
                        {props.map((p) => (
                          <BypassRow
                            key={`${p.key}:${selected.join('|')}`}
                            property={p}
                            rows={rows}
                            network={network}
                            onStyle={onStyle}
                          />
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ),
                )}
              </CollapsibleContent>
            </Collapsible>
          ),
      )}
    </div>
  )
}
