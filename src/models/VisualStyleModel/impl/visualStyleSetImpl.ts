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
 * Every key a `VisualStyle` must carry. `VisualStyle` is a TOTAL record over
 * `VisualPropertyName`, so a style missing any of these is not one — the
 * network would silently lose the properties it omits.
 */
const REQUIRED_VP_NAMES: readonly string[] = Object.values(VisualPropertyName)

const VP_GROUPS: ReadonlySet<string> = new Set(
  Object.values(VisualPropertyGroup),
)

const MAPPING_TYPES: ReadonlySet<string> = new Set(
  Object.values(MappingFunctionType),
)

/** How many missing property names a rejection message lists before "…". */
const MAX_NAMES_IN_PROBLEM = 5

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Explain why a value is not a usable `VisualStyle`, or return undefined when
 * it is one. `isValidVisualStyle` is the boolean form; callers that report the
 * failure to someone (the app API's `applyVisualStyle`) use this one, so the
 * error names what is actually wrong instead of restating the contract.
 *
 * The check exists because a style supplied from outside the host — an app
 * passing one to `applyVisualStyle` — becomes what the renderer reads. Without
 * it a malformed object fails later, inside `CyjsRenderer`, with nothing
 * naming the caller.
 *
 * What is checked:
 *
 * - Every `VisualPropertyName` is present. A partial style is rejected rather
 *   than merged over the defaults: this API is "make B look like A", and
 *   quietly substituting Cytoscape Web defaults for the properties A did not
 *   mention would not do that. Every style the host produces is complete —
 *   `createVisualStyle`, the presets, and `createVisualStyleFromCx` (which
 *   starts from the default style) all carry the full set.
 * - Every such entry is an object with a valid `group`, a `type`, a
 *   `defaultValue`, and — when present — a `mapping` with a known `type` and
 *   an `attribute`.
 *
 * Keys that are not visual property names are ignored, not rejected: a stored
 * style can carry fields the `VisualStyle` type does not describe, and
 * `visualStyleApi.getVisualProperties` skips them the same way.
 *
 * What is NOT checked: `bypassMap`, because every consumer of an external
 * style strips bypasses first (they are keyed by the source network's element
 * ids), and property VALUES, because `validateVisualPropertyValue` in the app
 * API owns that per-property and reports which one failed.
 */
export const visualStyleProblem = (value: unknown): string | undefined => {
  if (!isPlainRecord(value)) {
    return 'expected an object keyed by VisualPropertyName'
  }

  const missing = REQUIRED_VP_NAMES.filter(
    (vpName) => value[vpName] === undefined,
  )
  if (missing.length > 0) {
    const listed = missing.slice(0, MAX_NAMES_IN_PROBLEM).join(', ')
    const rest = missing.length > MAX_NAMES_IN_PROBLEM ? ', …' : ''
    return (
      `missing ${missing.length} of ${REQUIRED_VP_NAMES.length} visual ` +
      `properties (${listed}${rest})`
    )
  }

  for (const vpName of REQUIRED_VP_NAMES) {
    const vp = value[vpName]
    if (!isPlainRecord(vp)) {
      return `${vpName} is not a visual property object`
    }
    if (typeof vp.group !== 'string' || !VP_GROUPS.has(vp.group)) {
      return `${vpName} has no valid group (node, edge or network)`
    }
    if (typeof vp.type !== 'string' || vp.type === '') {
      return `${vpName} has no type`
    }
    if (vp.defaultValue === undefined) {
      return `${vpName} has no defaultValue`
    }
    if (vp.mapping === undefined) {
      continue
    }
    if (!isPlainRecord(vp.mapping)) {
      return `${vpName} has a mapping that is not an object`
    }
    if (
      typeof vp.mapping.type !== 'string' ||
      !MAPPING_TYPES.has(vp.mapping.type)
    ) {
      return (
        `${vpName} has a mapping with no valid type ` +
        '(passthrough, discrete or continuous)'
      )
    }
    if (typeof vp.mapping.attribute !== 'string') {
      return `${vpName} has a mapping with no attribute`
    }
  }

  return undefined
}

/**
 * True when `value` is a complete, well-formed `VisualStyle`.
 * See {@link visualStyleProblem} for what that means and why.
 */
export const isValidVisualStyle = (value: unknown): value is VisualStyle =>
  visualStyleProblem(value) === undefined
