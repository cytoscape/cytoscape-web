/**
 * Merge opaque (non-core) CX2 aspects across the networks being merged
 * (CW-522). Merge Networks previously dropped opaque aspects entirely.
 *
 * Policy (per CW-522): concatenate + dedupe. For each aspect key, the entries
 * from every source network are concatenated, then exact duplicate entries
 * (deep-equal) are removed so merging networks that share the same aspect data
 * does not multiply it.
 *
 * Pure — no React/Zustand — so it is unit-testable in isolation.
 */
import { OpaqueAspects } from '../../../models/OpaqueAspectModel'

/**
 * Deterministic stringification with recursively sorted object keys, so two
 * deep-equal entries produce the same key regardless of property order across
 * source networks.
 */
const stableKey = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableKey).join(',')}]`
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort()
    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${stableKey((value as any)[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

/**
 * Merge the opaque aspects of several source networks into one aspect map.
 *
 * @param sources per-network opaque aspects (undefined/null entries are ignored)
 * @returns a single OpaqueAspects with concatenated, de-duplicated entries
 */
export const mergeOpaqueAspects = (
  sources: Array<OpaqueAspects | undefined | null>,
): OpaqueAspects => {
  const merged: OpaqueAspects = {}
  const seen: Record<string, Set<string>> = {}

  sources.forEach((src) => {
    if (src == null) {
      return
    }
    Object.entries(src).forEach(([aspectName, entries]) => {
      if (!Array.isArray(entries)) {
        return
      }
      if (merged[aspectName] === undefined) {
        merged[aspectName] = []
        seen[aspectName] = new Set<string>()
      }
      entries.forEach((entry) => {
        const key = stableKey(entry)
        if (!seen[aspectName].has(key)) {
          seen[aspectName].add(key)
          merged[aspectName].push(entry)
        }
      })
    })
  })

  return merged
}

/**
 * Convert an OpaqueAspects map into the array-of-single-key-objects form used
 * by `CyNetwork.otherAspects` and the OpaqueAspect store's `addAll`.
 */
export const toOpaqueAspectsArray = (aspects: OpaqueAspects): OpaqueAspects[] =>
  Object.entries(aspects).map(([name, data]) => ({ [name]: data }))
