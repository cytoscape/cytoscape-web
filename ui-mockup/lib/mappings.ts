import type { Row } from './editor.ts'

export type MappingValue = number | string
export type MappingEntry = {
  id: string
  value: MappingValue
  categories: string[]
}
export type Mapping = {
  enabled: boolean
  kind: 'continuous' | 'discrete' | 'passthrough'
  attribute: string
  domain: [number, number]
  range: [MappingValue, MappingValue]
  entries: MappingEntry[]
}
export type MappableProperty =
  | 'fill'
  | 'size'
  | 'labelSize'
  | 'lineWidth'
  | 'lineColor'
  | 'labelText'

export function fitDomain(rows: Row[], attribute: string): [number, number] {
  const values = rows
    .map((r) => r[attribute])
    .filter((v) => v != null && v.trim() !== '')
    .map(Number)
    .filter(Number.isFinite)
  if (!values.length) return [0, 1]
  const low = Math.min(...values),
    high = Math.max(...values)
  return [low, high === low ? low + 1 : high]
}

export function assignCategory(
  entries: MappingEntry[],
  id: string,
  category: string,
  checked: boolean,
): MappingEntry[] {
  return entries.map((entry) => ({
    ...entry,
    categories:
      entry.id === id && checked
        ? [...entry.categories.filter((c) => c !== category), category]
        : entry.categories.filter(
            (c) => c !== category || (!checked && entry.id !== id),
          ),
  }))
}

export function resolveMapping(
  mapping: Mapping | undefined,
  row: Row,
  fallback: MappingValue,
): MappingValue {
  if (!mapping?.enabled) return fallback
  const raw = row[mapping.attribute]
  if (raw == null || raw.trim() === '') return fallback
  if (mapping.kind === 'passthrough') return raw
  if (mapping.kind === 'discrete')
    return (
      mapping.entries.find((e) => e.categories.includes(raw))?.value ?? fallback
    )
  const [lo, hi] = mapping.domain
  if (
    !Number.isFinite(Number(raw)) ||
    !Number.isFinite(lo) ||
    !Number.isFinite(hi) ||
    hi <= lo
  )
    return fallback
  const t = Math.max(0, Math.min(1, (Number(raw) - lo) / (hi - lo)))
  const [a, b] = mapping.range
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t
  if (
    typeof a !== 'string' ||
    typeof b !== 'string' ||
    !/^#[0-9a-f]{6}$/i.test(a) ||
    !/^#[0-9a-f]{6}$/i.test(b)
  )
    return fallback
  return (
    '#' +
    [1, 3, 5]
      .map((i) =>
        Math.round(
          parseInt(a.slice(i, i + 2), 16) * (1 - t) +
            parseInt(b.slice(i, i + 2), 16) * t,
        )
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  )
}
