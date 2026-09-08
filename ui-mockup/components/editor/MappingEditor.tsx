'use client'
import { useState } from 'react'
import { ChevronRight, Link2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  assignCategory,
  fitDomain,
  type Mapping,
  type MappingValue,
  type MappableProperty,
} from '@/lib/mappings'
import type { Network, Style } from '@/lib/editor'

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v)
      }}
    >
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
function NumberField({
  label,
  value,
  min = -1e6,
  max = 1e6,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (v: number) => void
}) {
  return (
    <Input
      key={value}
      aria-label={label}
      type="number"
      step="any"
      min={min}
      max={max}
      defaultValue={value}
      onBlur={(e) => {
        const n = Number(e.target.value)
        if (e.target.value.trim() && Number.isFinite(n)) {
          const next = Math.max(min, Math.min(max, n))
          if (next !== value) onChange(next)
          e.target.value = String(next)
        } else e.target.value = String(value)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          e.currentTarget.value = String(value)
          e.currentTarget.blur()
        }
      }}
    />
  )
}
function ValueField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: MappingValue
  min?: number
  max?: number
  onChange: (v: MappingValue) => void
}) {
  return typeof value === 'number' ? (
    <NumberField
      label={label}
      value={value}
      min={min}
      max={max}
      onChange={onChange}
    />
  ) : (
    <label className="mapping-color">
      <input
        aria-label={label}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span>{value.toUpperCase()}</span>
    </label>
  )
}

export function MappingEditor({
  property,
  label,
  network,
  onStyle,
  type = 'number',
  min = 1,
  max = 64,
  unit = '',
  initialOpen = false,
}: {
  property: MappableProperty
  label: string
  network: Network
  onStyle: (s: Partial<Style>, transient?: boolean) => void
  type?: 'number' | 'color' | 'text'
  min?: number
  max?: number
  unit?: string
  initialOpen?: boolean
}) {
  const [open, setOpen] = useState(initialOpen)
  const [query, setQuery] = useState('')
  const edges = property === 'lineWidth' || property === 'lineColor'
  const rows = edges ? network.edges : network.nodes
  const columns = network.columns[edges ? 'edges' : 'nodes'].filter(
    (c) => !['source', 'target'].includes(c.key),
  )
  const numeric = columns.filter((c) =>
    rows.some((r) => r[c.key]?.trim() && Number.isFinite(Number(r[c.key]))),
  )
  const saved = network.style.mappings?.[property]
  const attribute = type === 'text' ? 'name' : edges ? 'confidence' : 'log2FC'
  const fallback =
    type === 'text'
      ? network.style.labelText || ''
      : network.style[
          property as 'fill' | 'size' | 'labelSize' | 'lineWidth' | 'lineColor'
        ]
  const mapping: Mapping = saved ?? {
    enabled: type === 'text' && network.style.mapped,
    kind: type === 'text' ? 'passthrough' : 'continuous',
    attribute: type === 'text' ? network.style.labelAttribute : attribute,
    domain: fitDomain(rows, attribute),
    range:
      type === 'color'
        ? ['#d4d4d4', '#404040']
        : [min, property === 'lineWidth' ? 5 : Math.min(max, 40)],
    entries: [],
  }
  const update = (patch: Partial<Mapping>, transient = false) =>
    onStyle(
      {
        mappings: {
          ...network.style.mappings,
          [property]: { ...mapping, ...patch },
        },
      },
      transient,
    )
  const setFallback = (v: MappingValue) => onStyle({ [property]: v })
  const availableColumns = mapping.kind === 'continuous' ? numeric : columns
  const categories = [
    ...new Set(
      rows
        .map((r) => r[mapping.attribute])
        .filter((v) => v != null && v.trim() !== ''),
    ),
  ].sort()
  const dataDomain = fitDomain(rows, mapping.attribute)
  const domainMin = Math.min(dataDomain[0], mapping.domain[0]),
    domainMax = Math.max(dataDomain[1], mapping.domain[1])
  const summary =
    mapping.kind === 'continuous'
      ? `${mapping.attribute} → ${mapping.range.join('–')}${unit}`
      : mapping.kind === 'discrete'
        ? `${mapping.attribute} · ${mapping.entries.length} values`
        : mapping.attribute
  const changeKind = (kind: Mapping['kind']) => {
    const nextAttribute =
      kind === 'discrete' ? (edges ? 'interaction' : 'type') : attribute
    update({
      kind,
      attribute: nextAttribute,
      domain: fitDomain(rows, nextAttribute),
      entries: mapping.entries.length
        ? mapping.entries
        : [
            {
              id: crypto.randomUUID(),
              value: type === 'color' ? '#404040' : min,
              categories: [],
            },
            {
              id: crypto.randomUUID(),
              value: type === 'color' ? '#d4d4d4' : Math.min(max, 32),
              categories: [],
            },
          ],
    })
  }
  return (
    <Collapsible
      open={mapping.enabled && open}
      onOpenChange={setOpen}
      className="mapped-property"
    >
      <div className="mapped-property-heading">
        {mapping.enabled ? (
          <CollapsibleTrigger
            className="mapped-property-disclosure"
            aria-label={`${open ? 'Collapse' : 'Expand'} ${label} settings`}
          >
            <span className="tree-row-content">
              <ChevronRight size={12} />
              <span>{label}</span>
            </span>
          </CollapsibleTrigger>
        ) : (
          <span className="plain-property-name">{label}</span>
        )}
        {mapping.enabled && !open && (
          <div className="mapping-summary">{summary}</div>
        )}
        {!mapping.enabled && (
          <div className="inline-property-value">
            {type === 'text' ? (
              <Input
                aria-label="Default label text"
                value={String(fallback)}
                onChange={(e) => setFallback(e.target.value)}
                placeholder="No text"
              />
            ) : (
              <ValueField
                label={label}
                value={fallback}
                min={min}
                max={max}
                onChange={setFallback}
              />
            )}
            {type === 'number' && unit && (
              <span className="property-unit">{unit}</span>
            )}
          </div>
        )}
        <Button
          size="icon-xs"
          className="property-map-toggle"
          title={mapping.enabled ? `Disable ${label} mapping` : `Map ${label}`}
          variant={mapping.enabled ? 'secondary' : 'ghost'}
          aria-label={`Map ${label}`}
          aria-pressed={mapping.enabled}
          onClick={() => {
            update({ enabled: !mapping.enabled })
            setOpen(true)
          }}
        >
          <Link2 size={13} />
        </Button>
      </div>
      <CollapsibleContent className="mapping-body">
        {mapping.enabled && (
          <>
            <div className="mapping-field">
              <span>Attribute</span>
              <SelectField
                label={`${label} attribute`}
                value={mapping.attribute}
                options={availableColumns.map((c) => ({
                  value: c.key,
                  label: c.label,
                }))}
                onChange={(attribute) =>
                  update({
                    attribute,
                    domain: fitDomain(rows, attribute),
                    entries: mapping.entries.map((e) => ({
                      ...e,
                      categories: [],
                    })),
                  })
                }
              />
            </div>
            <div className="mapping-field">
              <span>Mapping</span>
              <SelectField
                label={`${label} mapping type`}
                value={mapping.kind}
                options={
                  type === 'text'
                    ? [{ value: 'passthrough', label: 'Passthrough' }]
                    : [
                        { value: 'continuous', label: 'Continuous' },
                        { value: 'discrete', label: 'Discrete' },
                      ]
                }
                onChange={(v) => changeKind(v as Mapping['kind'])}
              />
            </div>
            {mapping.kind === 'continuous' && (
              <>
                <fieldset
                  className="mapping-control-group"
                  aria-label={`${label} data domain`}
                >
                  <div className="mapping-caption">
                    <span>Data domain</span>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => update({ domain: dataDomain })}
                    >
                      Fit to data
                    </Button>
                  </div>
                  <div className="mapping-endpoints">
                    <NumberField
                      label={`${label} domain minimum`}
                      value={mapping.domain[0]}
                      max={mapping.domain[1] - 0.001}
                      onChange={(v) =>
                        update({ domain: [v, mapping.domain[1]] })
                      }
                    />
                    <span>→</span>
                    <NumberField
                      label={`${label} domain maximum`}
                      value={mapping.domain[1]}
                      min={mapping.domain[0] + 0.001}
                      onChange={(v) =>
                        update({ domain: [mapping.domain[0], v] })
                      }
                    />
                  </div>
                  <Slider
                    aria-label={`${label} domain slider`}
                    min={domainMin}
                    max={domainMax}
                    step={Math.max(0.001, (domainMax - domainMin) / 1000)}
                    minStepsBetweenValues={1}
                    value={mapping.domain}
                    onValueChange={(v) =>
                      update({ domain: v as [number, number] }, true)
                    }
                    onValueCommitted={(v) =>
                      update({ domain: v as [number, number] })
                    }
                  />
                </fieldset>
                <fieldset
                  className="mapping-control-group"
                  aria-label={`${label} output range`}
                >
                  <div className="mapping-caption">
                    <span>
                      {type === 'color'
                        ? 'Colour range'
                        : `Output range (${unit || 'value'})`}
                    </span>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        update({ range: [mapping.range[1], mapping.range[0]] })
                      }
                    >
                      Reverse
                    </Button>
                  </div>
                  {type === 'color' && (
                    <div
                      className="mapping-gradient"
                      style={{
                        background: `linear-gradient(to right, ${mapping.range[0]}, ${mapping.range[1]})`,
                      }}
                    />
                  )}
                  <div
                    className={`mapping-endpoints ${type === 'color' ? 'color-endpoints' : ''}`}
                  >
                    <ValueField
                      label={`${label} range start`}
                      value={mapping.range[0]}
                      min={min}
                      max={max}
                      onChange={(v) => update({ range: [v, mapping.range[1]] })}
                    />
                    <span>→</span>
                    <ValueField
                      label={`${label} range end`}
                      value={mapping.range[1]}
                      min={min}
                      max={max}
                      onChange={(v) => update({ range: [mapping.range[0], v] })}
                    />
                  </div>
                  {type === 'number' && (
                    <Slider
                      aria-label={`${label} output slider`}
                      min={min}
                      max={max}
                      step={0.1}
                      value={[...(mapping.range as number[])].sort(
                        (a, b) => a - b,
                      )}
                      onValueChange={(v) => {
                        const pair = v as [number, number]
                        update(
                          {
                            range:
                              Number(mapping.range[0]) >
                              Number(mapping.range[1])
                                ? [pair[1], pair[0]]
                                : pair,
                          },
                          true,
                        )
                      }}
                      onValueCommitted={(v) => {
                        const pair = v as [number, number]
                        update({
                          range:
                            Number(mapping.range[0]) > Number(mapping.range[1])
                              ? [pair[1], pair[0]]
                              : pair,
                        })
                      }}
                    />
                  )}
                  <small className="mapping-note">
                    Outside domain: use nearest endpoint.
                  </small>
                </fieldset>
              </>
            )}
            {mapping.kind === 'discrete' && (
              <div className="discrete-entries">
                {mapping.entries.map((entry, index) => (
                  <div className="discrete-entry" key={entry.id}>
                    <div className="discrete-value">
                      <ValueField
                        label={`${label} style value ${index + 1}`}
                        value={entry.value}
                        min={min}
                        max={max}
                        onChange={(value) =>
                          update({
                            entries: mapping.entries.map((e) =>
                              e.id === entry.id ? { ...e, value } : e,
                            ),
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove ${label} style value ${index + 1}`}
                        onClick={() =>
                          update({
                            entries: mapping.entries.filter(
                              (e) => e.id !== entry.id,
                            ),
                          })
                        }
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                    <div className="category-chips">
                      {entry.categories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          aria-label={`Remove ${category} from ${label} style value ${index + 1}`}
                          onClick={() =>
                            update({
                              entries: assignCategory(
                                mapping.entries,
                                entry.id,
                                category,
                                false,
                              ),
                            })
                          }
                        >
                          {category}
                          <span>×</span>
                        </button>
                      ))}
                    </div>
                    <Popover>
                      <PopoverTrigger
                        className="category-picker-trigger"
                        onClick={() => setQuery('')}
                        aria-label={`Select categories for ${label} style value ${index + 1}`}
                      >
                        Select values… <span>{entry.categories.length}</span>
                      </PopoverTrigger>
                      <PopoverContent
                        className="mapping-category-picker"
                        side="right"
                        align="start"
                      >
                        <PopoverTitle>
                          Select {mapping.attribute} values
                        </PopoverTitle>
                        <Input
                          aria-label="Search categories"
                          placeholder="Search values…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        <div className="category-options">
                          {categories
                            .filter((c) =>
                              c.toLowerCase().includes(query.toLowerCase()),
                            )
                            .map((category) => {
                              const owner = mapping.entries.find((e) =>
                                e.categories.includes(category),
                              )
                              return (
                                <label key={category}>
                                  <Checkbox
                                    aria-label={category}
                                    checked={entry.categories.includes(
                                      category,
                                    )}
                                    onCheckedChange={(checked) =>
                                      update({
                                        entries: assignCategory(
                                          mapping.entries,
                                          entry.id,
                                          category,
                                          checked === true,
                                        ),
                                      })
                                    }
                                  />
                                  <span>
                                    {category}
                                    <small>
                                      {owner && owner.id !== entry.id
                                        ? 'Moves from another style value'
                                        : `${rows.filter((r) => r[mapping.attribute] === category).length} ${edges ? 'edges' : 'nodes'}`}
                                    </small>
                                  </span>
                                </label>
                              )
                            })}
                          {!categories.some((c) =>
                            c.toLowerCase().includes(query.toLowerCase()),
                          ) && <small>No matching values.</small>}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() =>
                    update({
                      entries: [
                        ...mapping.entries,
                        {
                          id: crypto.randomUUID(),
                          value: fallback,
                          categories: [],
                        },
                      ],
                    })
                  }
                >
                  <Plus size={12} />
                  Add style value
                </Button>
              </div>
            )}
            <div className="mapping-fallback">
              <span>
                {mapping.kind === 'discrete'
                  ? 'Unmatched / missing'
                  : 'Missing values'}
              </span>
              {type === 'text' ? (
                <Input
                  aria-label="Fallback label text"
                  value={String(fallback)}
                  onChange={(e) => setFallback(e.target.value)}
                  placeholder="No text"
                />
              ) : (
                <ValueField
                  label={`${label} fallback`}
                  value={fallback}
                  min={min}
                  max={max}
                  onChange={setFallback}
                />
              )}
            </div>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
