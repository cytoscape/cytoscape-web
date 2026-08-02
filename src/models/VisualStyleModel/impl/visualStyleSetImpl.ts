/**
 * Pure implementation functions for VisualStyleSet — the container that
 * lets a network own multiple named visual styles.
 *
 * No React / Zustand imports allowed here (model layer).
 */
import { v4 as uuidv4 } from 'uuid'

import { IdType } from '../../IdType'
import { VisualStyle } from '../VisualStyle'
import {
  DEFAULT_STYLE_NAME,
  NamedVisualStyle,
  VisualStyleSet,
} from '../VisualStyleSet'

/**
 * Deep-copy a visual style, including bypass and discrete-mapping Maps.
 * The copy shares no references with the source, so mutating one can
 * never leak into the other (styles in a set must be fully independent).
 */
export const cloneVisualStyle = (visualStyle: VisualStyle): VisualStyle => {
  // structuredClone correctly handles Map instances and frozen/Immer objects
  if (typeof structuredClone !== 'undefined') {
    return structuredClone(visualStyle)
  }
  // Fallback for environments without structuredClone
  return Object.fromEntries(
    Object.entries(visualStyle).map(([vpName, vp]) => {
      const cloned: any = {
        ...vp,
        bypassMap: new Map(vp.bypassMap),
      }
      if (vp.mapping !== undefined) {
        const mapping: any = { ...vp.mapping }
        if (mapping.vpValueMap instanceof Map) {
          mapping.vpValueMap = new Map(mapping.vpValueMap)
        }
        if (Array.isArray(mapping.controlPoints)) {
          mapping.controlPoints = mapping.controlPoints.map((cp: any) => ({
            ...cp,
          }))
        }
        cloned.mapping = mapping
      }
      return [vpName, cloned]
    }),
  ) as VisualStyle
}

/**
 * Return a copy of the style with all bypasses removed.
 * Used when saving a style to the library — bypass entries reference
 * element ids of a specific network and must not travel with a template.
 */
export const stripBypasses = (visualStyle: VisualStyle): VisualStyle => {
  const copy = cloneVisualStyle(visualStyle)
  Object.values(copy).forEach((vp) => {
    vp.bypassMap = new Map()
  })
  return copy
}

/**
 * Generate a new unique style id.
 */
export const createStyleId = (): IdType => uuidv4()

/**
 * Wrap a single visual style as a complete style set with one active entry.
 */
export const createStyleSet = (
  visualStyle: VisualStyle,
  name: string = DEFAULT_STYLE_NAME,
): VisualStyleSet => {
  const id = createStyleId()
  return {
    activeStyleId: id,
    styles: {
      [id]: { id, name, visualStyle },
    },
  }
}

/**
 * Return the active named style of a set, or undefined if the set is
 * inconsistent (active pointer does not resolve).
 */
export const getActiveStyle = (
  styleSet: VisualStyleSet,
): NamedVisualStyle | undefined => styleSet.styles[styleSet.activeStyleId]

/**
 * Check the structural invariants of a style set.
 */
export const isValidStyleSet = (styleSet: VisualStyleSet): boolean => {
  const entries = Object.entries(styleSet.styles ?? {})
  if (entries.length === 0) {
    return false
  }
  if (styleSet.styles[styleSet.activeStyleId] === undefined) {
    return false
  }
  return entries.every(
    ([key, entry]) =>
      entry !== undefined &&
      entry.id === key &&
      typeof entry.name === 'string' &&
      entry.visualStyle !== undefined,
  )
}

/**
 * Pick a style name that does not collide with any of the existing names.
 * "Style" → "Style 2" → "Style 3" … (the base name itself is returned
 * unchanged when it is already unique).
 */
export const uniqueStyleName = (
  baseName: string,
  existingNames: string[],
): string => {
  const names = new Set(existingNames)
  const trimmed = baseName.trim() === '' ? DEFAULT_STYLE_NAME : baseName.trim()
  if (!names.has(trimmed)) {
    return trimmed
  }
  let counter = 2
  while (names.has(`${trimmed} ${counter}`)) {
    counter += 1
  }
  return `${trimmed} ${counter}`
}
