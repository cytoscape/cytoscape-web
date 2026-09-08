'use client'
import { useState, type ReactNode } from 'react'
import {
  ChevronRight,
  RotateCcw,
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
import { MappingEditor } from './MappingEditor'
import { resolveMapping } from '@/lib/mappings'

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
      <SelectContent className="style-select-menu">
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
        <span className="tree-row-content">
          <ChevronRight size={13} />
          {title}
        </span>
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
  onStyle: (s: Partial<Style>, transient?: boolean) => void
  mode: string
}) {
  const s = network.style
  return (
    <>
      <div className="style-heading">
        <span>Style</span>
      </div>
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="section-trigger">
          <span className="tree-row-content">
            <ChevronRight size={14} />
            Nodes
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="property-tree">
          <Group title="Appearance" open={mode !== 'styles'}>
            <MappingEditor
              property="fill"
              label="Fill"
              type="color"
              network={network}
              onStyle={onStyle}
              initialOpen
            />
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
            <MappingEditor
              property="size"
              label="Diameter"
              min={8}
              max={64}
              network={network}
              onStyle={onStyle}
              initialOpen
            />
          </Group>
          <Group title="Border">
            <Range
              label="Border width"
              value={s.border}
              min={0}
              max={6}
              onChange={(border) => onStyle({ border })}
            />
          </Group>
          <Group title="Labels" open={mode !== 'mappings'}>
            <MappingEditor
              property="labelText"
              label="Label text"
              type="text"
              network={network}
              onStyle={onStyle}
              initialOpen
            />
            <div className="property">
              Font
              <Choice
                label="Label font"
                value={s.font}
                options={['Inter', 'Georgia', 'Monospace']}
                onChange={(font) => onStyle({ font })}
              />
            </div>
            <MappingEditor
              property="labelSize"
              label="Font size"
              min={8}
              max={24}
              network={network}
              onStyle={onStyle}
              initialOpen
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
                  value={
                    s.overrides[selected[0]] ??
                    Number(
                      resolveMapping(
                        s.mappings?.labelSize,
                        network.nodes.find((n) => n.id === selected[0]) ?? {},
                        s.labelSize,
                      ),
                    )
                  }
                  min={8}
                  max={28}
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
      <Collapsible defaultOpen={mode === 'mappings'}>
        <CollapsibleTrigger className="section-trigger">
          <span className="tree-row-content">
            <ChevronRight size={14} />
            Edges
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="property-tree">
          <Group title="Line" open>
            <MappingEditor
              property="lineWidth"
              label="Line width"
              min={0.5}
              max={12}
              network={network}
              onStyle={onStyle}
              initialOpen
            />
            <MappingEditor
              property="lineColor"
              label="Edge colour"
              type="color"
              network={network}
              onStyle={onStyle}
              initialOpen
            />
          </Group>
          <div className="property direct-arrow-property">
            <span>Arrows</span>
            <Choice
              label="Edge arrows"
              value={s.arrows ? 'Target' : 'None'}
              options={['None', 'Target']}
              onChange={(v) => onStyle({ arrows: v === 'Target' })}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
      <Collapsible>
        <CollapsibleTrigger className="section-trigger">
          <span className="tree-row-content">
            <ChevronRight size={14} />
            Network
          </span>
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
