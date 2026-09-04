/**
 * Pure implementation functions for VisualStyleSet — the container that
 * lets a network own multiple named visual styles.
 *
 * No React / Zustand imports allowed here (model layer).
 */
import { v4 as uuidv4 } from 'uuid'

import { IdType } from '../../IdType'
import { MappingFunctionType } from '../VisualMappingFunction/MappingFunctionType'
import { VisualPropertyGroup } from '../VisualPropertyGroup'
import { VisualPropertyName } from '../VisualPropertyName'
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

/**
 * Every key the runtime treats as a visual property. A style object can also
 * carry fields the VisualStyle type does not describe (see
 * `visualStyleApi.getVisualProperties`, which filters them out the same way),
 * so validation ignores unknown keys instead of rejecting them.
 */
const KNOWN_VP_NAMES: ReadonlySet<string> = new Set(
  Object.values(VisualPropertyName),
)

const VP_GROUPS: ReadonlySet<string> = new Set(
  Object.values(VisualPropertyGroup),
)

const MAPPING_TYPES: ReadonlySet<string> = new Set(
  Object.values(MappingFunctionType),
)

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Structural check on a visual style supplied from outside the host —
 * an app passing one to `visualStyleApi.applyVisualStyle`, say.
 *
 * Without it a malformed object becomes a network's active style and the
 * failure surfaces later, in the renderer, with nothing naming the caller.
 *
 * What is checked: every entry whose key is a known `VisualPropertyName`
 * must be an object with a valid `group`, a `type`, a `defaultValue`, and —
 * when present — a `mapping` with a known `type` and an `attribute`. At
 * least one such entry must exist. Unknown keys are ignored (a real style
 * object carries some).
 *
 * What is NOT checked: `bypassMap`, because every consumer of an external
 * style strips bypasses first (they are keyed by the source network's
 * element ids), and property VALUES, because `validateVisualPropertyValue`
 * in the app API owns that per-property and reports which one failed.
 */
export const isValidVisualStyle = (value: unknown): value is VisualStyle => {
  if (!isPlainRecord(value)) {
    return false
  }
  let knownCount = 0
  for (const [vpName, vp] of Object.entries(value)) {
    if (!KNOWN_VP_NAMES.has(vpName)) {
      continue
    }
    knownCount += 1
    if (!isPlainRecord(vp)) {
      return false
    }
    if (typeof vp.group !== 'string' || !VP_GROUPS.has(vp.group)) {
      return false
    }
    if (typeof vp.type !== 'string' || vp.type === '') {
      return false
    }
    if (vp.defaultValue === undefined) {
      return false
    }
    if (vp.mapping !== undefined) {
      if (!isPlainRecord(vp.mapping)) {
        return false
      }
      if (
        typeof vp.mapping.type !== 'string' ||
        !MAPPING_TYPES.has(vp.mapping.type)
      ) {
        return false
      }
      if (typeof vp.mapping.attribute !== 'string') {
        return false
      }
    }
  }
  return knownCount > 0
}
