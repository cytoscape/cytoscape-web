'use client'
import { useState, type ReactNode } from 'react'
import {
  ChevronRight,
  Circle,
  GitBranch,
  Frame,
  Link2,
  RotateCcw,
  SlidersHorizontal,
  Check,
  ChevronsUpDown,
  Network as NetworkIcon,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
} from '@/components/ui/popover'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type Network, type Style } from '@/lib/editor'

export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v)
      }}
    >
      <SelectTrigger aria-label={label} className="property-select">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
function Group({
  title,
  children,
  open = false,
}: {
  title: string
  children: ReactNode
  open?: boolean
}) {
  return (
    <Collapsible defaultOpen={open} className="inspector-group">
      <CollapsibleTrigger className="category-trigger">
        <ChevronRight size={13} />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent className="category-content">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
export function Range({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  unit = '',
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  unit?: string
}) {
  return (
    <div className="range-property">
      <div className="property">
        <span>{label}</span>
        <span className="number-unit">
          <input
            aria-label={label}
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)))
            }}
          />
          <span>{unit}</span>
        </span>
      </div>
      <Slider
        aria-label={`${label} slider`}
        value={[value]}
        min={min}
        max={max}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  )
}
export function NetworkPicker({
  networks,
  current,
  onChoose,
}: {
  networks: Record<string, Network>
  current: string
  onChoose: (id: string) => void
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState('')
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="workspace-switch"
        aria-label="Select workspace network"
      >
        <span className="brand-mark">
          <NetworkIcon size={21} />
        </span>
        <span>
          <strong>Cancer signaling</strong>
          <small>{networks[current].name}</small>
        </span>
        <ChevronsUpDown size={15} />
      </PopoverTrigger>
      <PopoverContent align="start" className="network-picker">
        <PopoverTitle>Workspace networks</PopoverTitle>
        <Input
          placeholder="Find a network…"
          aria-label="Find a network"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="picker-list">
          {Object.values(networks)
            .filter((n) => n.name.toLowerCase().includes(query.toLowerCase()))
            .map((n) => (
              <button
                className="network-option"
                key={n.id}
                onClick={() => {
                  onChoose(n.id)
                  setOpen(false)
                }}
              >
                <NetworkIcon size={17} />
                <span>
                  <strong>{n.name}</strong>
                  <small>
                    {n.nodes.length} nodes · {n.edges.length} edges
                  </small>
                </span>
                {current === n.id && <Check size={15} />}
              </button>
            ))}
        </div>
        <small>Illustrative local workspace</small>
      </PopoverContent>
    </Popover>
  )
}
export function StyleInspector({
  network,
  selected,
  onStyle,
  mode,
}: {
  network: Network
  selected: string[]
  onStyle: (s: Partial<Style>) => void
  mode: string
}) {
  const s = network.style
  return (
    <>
      <div className="style-heading">
        <span>Style</span>
        <span className="target-name" title={network.name}>
          {network.name}
        </span>
      </div>
      <div className="style-preset">
        <span className="preset-preview">
          <i />
          <i />
          <i />
        </span>
        <div>
          <strong>Signal</strong>
          <small>Network style</small>
        </div>
        <Popover>
          <PopoverTrigger aria-label="Style options">
            <SlidersHorizontal size={16} />
          </PopoverTrigger>
          <PopoverContent>
            <PopoverTitle>Style options</PopoverTitle>
            <Button
              variant="ghost"
              onClick={() =>
                onStyle({
                  fill: '#737373',
                  size: 24,
                  labelSize: 12,
                  opacity: 100,
                  overrides: {},
                })
              }
            >
              <RotateCcw />
              Reset appearance
            </Button>
          </PopoverContent>
        </Popover>
      </div>
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="section-trigger">
          <ChevronRight size={14} />
          <Circle size={15} />
          Nodes
        </CollapsibleTrigger>
        <CollapsibleContent className="property-tree">
          <Group title="Appearance" open={mode !== 'styles'}>
            <label className="property">
              Fill
              <span className="color-value">
                <input
                  aria-label="Node fill"
                  type="color"
                  value={s.fill}
                  onChange={(e) => onStyle({ fill: e.target.value })}
                />
                <span>{s.fill.toUpperCase()}</span>
              </span>
            </label>
            <div className="property">
              Shape
              <Choice
                label="Node shape"
                value={s.shape}
                options={['Ellipse', 'Rounded rectangle', 'Diamond']}
                onChange={(shape) => onStyle({ shape })}
              />
            </div>
            <Range
              label="Opacity"
              value={s.opacity}
              onChange={(opacity) => onStyle({ opacity })}
              unit="%"
            />
          </Group>
          <Group title="Size">
            <Range
              label="Diameter"
              value={s.size}
              min={8}
              max={64}
              unit="px"
              onChange={(size) => onStyle({ size })}
            />
          </Group>
          <Group title="Border">
            <Range
              label="Border width"
              value={s.border}
              min={0}
              max={6}
              unit="px"
              onChange={(border) => onStyle({ border })}
            />
          </Group>
          <Group title="Labels" open>
            <div className="property">
              Text
              <Popover>
                <PopoverTrigger
                  className="mapping-trigger"
                  aria-label="Map label text"
                >
                  <span>{s.mapped ? s.labelAttribute : 'None'}</span>
                  <span className="mapping-badge">
                    <Link2 size={10} />
                    {s.mapped ? 'Mapped' : 'Default'}
                  </span>
                </PopoverTrigger>
                <PopoverContent
                  side="right"
                  align="start"
                  className="mapping-popover"
                >
                  <PopoverTitle>Map label text</PopoverTitle>
                  <p className="muted">Use a node attribute as its label.</p>
                  <span>Attribute</span>
                  <Choice
                    label="Label attribute"
                    value={s.labelAttribute}
                    options={['name', 'type', 'log2FC']}
                    onChange={(labelAttribute) =>
                      onStyle({ labelAttribute, mapped: true })
                    }
                  />
                  <span>Mapping</span>
                  <Choice
                    label="Label mapping"
                    value={s.mapped ? 'Passthrough' : 'None'}
                    options={['Passthrough', 'None']}
                    onChange={(v) => onStyle({ mapped: v === 'Passthrough' })}
                  />
                  <small>Changes apply to all nodes. Overrides are kept.</small>
                </PopoverContent>
              </Popover>
            </div>
            <div className="property">
              Font
              <Choice
                label="Label font"
                value={s.font}
                options={['Inter', 'Georgia', 'Monospace']}
                onChange={(font) => onStyle({ font })}
              />
            </div>
            <Range
              label="Font size"
              value={s.labelSize}
              min={8}
              max={24}
              unit="px"
              onChange={(labelSize) => onStyle({ labelSize })}
            />
            <label className="property">
              Color
              <input
                type="color"
                aria-label="Label color"
                value={s.labelColor || '#737373'}
                onChange={(e) => onStyle({ labelColor: e.target.value })}
              />
            </label>
            <div className="property">
              Position
              <Choice
                label="Label position"
                value={s.labelPosition}
                options={['Below', 'Center', 'Above']}
                onChange={(labelPosition) => onStyle({ labelPosition })}
              />
            </div>
            {selected.length > 0 ? (
              <div className="override-box">
                <div className="override-heading">
                  <span>
                    {selected.length} {selected.length === 1 ? 'node' : 'nodes'}{' '}
                    selected
                  </span>
                  <span className="mapping-badge">Override</span>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Clear selected overrides"
                    onClick={() => {
                      const overrides = { ...s.overrides }
                      selected.forEach((id) => delete overrides[id])
                      onStyle({ overrides })
                    }}
                  >
                    <RotateCcw size={12} />
                  </Button>
                </div>
                <Range
                  label="Selected label size"
                  value={s.overrides[selected[0]] ?? s.labelSize}
                  min={8}
                  max={28}
                  unit="px"
                  onChange={(size) =>
                    onStyle({
                      overrides: {
                        ...s.overrides,
                        ...Object.fromEntries(selected.map((id) => [id, size])),
                      },
                    })
                  }
                />
              </div>
            ) : (
              <small className="inspector-hint">
                Select nodes to override their labels.
              </small>
            )}
          </Group>
          <Group title="Images & Charts">
            <small className="inspector-hint">
              Custom graphics are outside this prototype.
            </small>
          </Group>
        </CollapsibleContent>
      </Collapsible>
      <Collapsible>
        <CollapsibleTrigger className="section-trigger">
          <ChevronRight size={14} />
          <GitBranch size={15} />
          Edges
        </CollapsibleTrigger>
        <CollapsibleContent className="property-tree">
          <Group title="Line" open>
            <Range
              label="Line width"
              value={s.lineWidth}
              min={1}
              max={5}
              unit="px"
              onChange={(lineWidth) => onStyle({ lineWidth })}
            />
            <label className="property">
              Color
              <input
                type="color"
                aria-label="Edge color"
                value={s.lineColor}
                onChange={(e) => onStyle({ lineColor: e.target.value })}
              />
            </label>
          </Group>
          <Group title="Arrows">
            <Choice
              label="Edge arrows"
              value={s.arrows ? 'Target' : 'None'}
              options={['None', 'Target']}
              onChange={(v) => onStyle({ arrows: v === 'Target' })}
            />
          </Group>
        </CollapsibleContent>
      </Collapsible>
      <Collapsible>
        <CollapsibleTrigger className="section-trigger">
          <ChevronRight size={14} />
          <Frame size={15} />
          Network
        </CollapsibleTrigger>
        <CollapsibleContent className="property-tree">
          <Group title="Background" open>
            <label className="property">
              Canvas
              <input
                type="color"
                aria-label="Canvas color"
                value={s.background || '#ffffff'}
                onChange={(e) => onStyle({ background: e.target.value })}
              />
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStyle({ background: '' })}
            >
              Use theme color
            </Button>
          </Group>
        </CollapsibleContent>
      </Collapsible>
    </>
  )
}
