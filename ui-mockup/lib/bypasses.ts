import type { Row, Style } from './editor.ts'
import { resolveMapping, type MappableProperty } from './mappings.ts'

export type BypassProperty =
  | MappableProperty
  | 'shape'
  | 'opacity'
  | 'border'
  | 'font'
  | 'labelColor'
  | 'labelPosition'
  | 'arrows'
export type BypassValue = string | number | boolean
export type Bypasses = Record<
  string,
  Partial<Record<BypassProperty, BypassValue>>
>

export function effectiveValue(
  style: Style,
  row: Row,
  property: BypassProperty,
): BypassValue {
  const bypass = style.bypasses?.[row.id]?.[property]
  if (bypass !== undefined) return bypass
  if (property === 'labelSize' && style.overrides[row.id] !== undefined)
    return style.overrides[row.id]
  if (property === 'labelText' && !style.mappings?.labelText)
    return style.labelText || row[style.labelAttribute] || ''
  const fallback = style[property] ?? ''
  if (typeof fallback === 'boolean') return fallback
  return resolveMapping(
    style.mappings?.[property as MappableProperty],
    row,
    fallback,
  )
}

export function bypassGroups(
  style: Style,
  rows: Row[],
  property: BypassProperty,
) {
  const groups = new Map<
    string,
    { value: BypassValue; overridden: boolean; ids: string[] }
  >()
  for (const row of rows) {
    const value = effectiveValue(style, row, property)
    const overridden =
      style.bypasses?.[row.id]?.[property] !== undefined ||
      (property === 'labelSize' && style.overrides[row.id] !== undefined)
    const key = JSON.stringify([overridden, value])
    const group = groups.get(key) ?? { value, overridden, ids: [] }
    group.ids.push(row.id)
    groups.set(key, group)
  }
  return [...groups.values()]
}

export function updateBypasses(
  style: Style,
  ids: string[],
  property?: BypassProperty,
  value?: BypassValue,
): Style {
  const bypasses = { ...style.bypasses }
  const overrides = { ...style.overrides }
  for (const id of ids) {
    const entry = { ...bypasses[id] }
    if (!property) delete bypasses[id]
    else {
      if (value === undefined) delete entry[property]
      else entry[property] = value
      if (Object.keys(entry).length) bypasses[id] = entry
      else delete bypasses[id]
    }
    if (!property || property === 'labelSize') delete overrides[id]
  }
  return { ...style, bypasses, overrides }
}
