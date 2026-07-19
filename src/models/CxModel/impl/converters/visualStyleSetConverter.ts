/**
 * Converter for the `cyWebVisualStyles` opaque CX2 aspect — the aspect that
 * carries a network's complete set of named visual styles.
 *
 * CX2 only supports a single style per document (the `visualProperties` /
 * `visualEditorProperties` / bypass aspects), so multi-style networks are
 * persisted as:
 *  - the ACTIVE style in the standard aspects (interoperable with
 *    Cytoscape Desktop, the NDEx viewer, and older Cytoscape Web versions)
 *  - the full named-style set in this custom aspect
 *
 * On import the set is validated with zod; any structural problem makes the
 * importer fall back to a single-style set built from the standard aspects,
 * so a malformed aspect can never break network loading. The active style's
 * content is always taken from the standard `visualProperties` aspect, so
 * edits made by other CX2 tools (which do not know about this aspect) win.
 *
 * Aspect shape (single-element array, mirroring visualEditorProperties):
 * {
 *   "cyWebVisualStyles": [{
 *     "version": "1.0",
 *     "activeStyleId": "<style id>",
 *     "styles": [{
 *       "id": "<style id>",
 *       "name": "<display name>",
 *       "visualProperties": { "default": {...}, "nodeMapping": {...}, "edgeMapping": {...} },
 *       "nodeBypasses": [{ "id": 1, "v": {...} }],
 *       "edgeBypasses": [{ "id": 2, "v": {...} }]
 *     }]
 *   }]
 * }
 */
import { z } from 'zod'

import { logModel } from '../../../../debug'
import { Table } from '../../../TableModel'
import {
  DEFAULT_STYLE_NAME,
  MAX_STYLES_PER_NETWORK,
  NamedVisualStyle,
  VisualStyle,
  VisualStyleSet,
} from '../../../VisualStyleModel'
import {
  cloneVisualStyle,
  createStyleSet,
} from '../../../VisualStyleModel/impl/visualStyleSetImpl'
import { Cx2 } from '../../Cx2'
import { buildVisualStyleAspects } from '../styleAspectBuilder'
import { createVisualStyleFromCx } from './visualStyleConverter'

export const CY_WEB_VISUAL_STYLES_ASPECT_TAG = 'cyWebVisualStyles'

export const CY_WEB_VISUAL_STYLES_ASPECT_VERSION = '1.0'

export { MAX_STYLES_PER_NETWORK }

const namedStyleCxSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  visualProperties: z.object({}).passthrough(),
  nodeBypasses: z.array(z.unknown()).optional(),
  edgeBypasses: z.array(z.unknown()).optional(),
})

const cyWebVisualStylesSchema = z.object({
  version: z.string().optional(),
  activeStyleId: z.string().min(1),
  styles: z.array(namedStyleCxSchema).min(1),
})

export type CyWebVisualStylesAspect = z.infer<typeof cyWebVisualStylesSchema>

/**
 * Find the raw `cyWebVisualStyles` aspect element in a CX2 document.
 * Returns undefined when the aspect is absent or empty.
 */
export const getCyWebVisualStylesAspect = (cx: Cx2): unknown => {
  for (const entry of cx) {
    if (
      entry !== null &&
      typeof entry === 'object' &&
      Object.prototype.hasOwnProperty.call(
        entry,
        CY_WEB_VISUAL_STYLES_ASPECT_TAG,
      )
    ) {
      const values = (entry as Record<string, unknown>)[
        CY_WEB_VISUAL_STYLES_ASPECT_TAG
      ]
      return Array.isArray(values) ? values[0] : undefined
    }
  }
  return undefined
}

/**
 * Build a VisualStyleSet from a CX2 document.
 *
 * @param cx - Full CX2 document (external data — the aspect is validated here)
 * @param activeVisualStyle - The style already converted from the standard
 *   `visualProperties` / bypass aspects. It is used as the content of the
 *   active entry (external tools edit the standard aspects, so they must win)
 *   and as the fallback single style when the custom aspect is absent or
 *   malformed.
 * @returns A structurally valid VisualStyleSet — never throws.
 */
export const createVisualStyleSetFromCx = (
  cx: Cx2,
  activeVisualStyle: VisualStyle,
): VisualStyleSet => {
  const fallback = (): VisualStyleSet => createStyleSet(activeVisualStyle)

  const rawAspect = getCyWebVisualStylesAspect(cx)
  if (rawAspect === undefined) {
    return fallback()
  }

  const parsed = cyWebVisualStylesSchema.safeParse(rawAspect)
  if (!parsed.success) {
    logModel.warn(
      `[visualStyleSetConverter]: Malformed ${CY_WEB_VISUAL_STYLES_ASPECT_TAG} aspect, falling back to single style: ${parsed.error.message}`,
    )
    return fallback()
  }

  const aspect = parsed.data
  if (aspect.styles.length > MAX_STYLES_PER_NETWORK) {
    logModel.warn(
      `[visualStyleSetConverter]: ${CY_WEB_VISUAL_STYLES_ASPECT_TAG} aspect contains ${aspect.styles.length} styles (max ${MAX_STYLES_PER_NETWORK}), falling back to single style`,
    )
    return fallback()
  }

  const ids = aspect.styles.map((s) => s.id)
  if (new Set(ids).size !== ids.length) {
    logModel.warn(
      `[visualStyleSetConverter]: Duplicate style ids in ${CY_WEB_VISUAL_STYLES_ASPECT_TAG} aspect, falling back to single style`,
    )
    return fallback()
  }
  if (!ids.includes(aspect.activeStyleId)) {
    logModel.warn(
      `[visualStyleSetConverter]: activeStyleId "${aspect.activeStyleId}" not found in ${CY_WEB_VISUAL_STYLES_ASPECT_TAG} aspect, falling back to single style`,
    )
    return fallback()
  }

  const styles: Record<string, NamedVisualStyle> = {}
  for (const styleCx of aspect.styles) {
    const name =
      styleCx.name.trim() === '' ? DEFAULT_STYLE_NAME : styleCx.name.trim()
    if (styleCx.id === aspect.activeStyleId) {
      // The standard aspects are authoritative for the active style so that
      // edits made by tools unaware of this aspect are not silently reverted.
      styles[styleCx.id] = {
        id: styleCx.id,
        name,
        visualStyle: activeVisualStyle,
      }
      continue
    }
    // Reuse the standard converter by wrapping this style's aspects in a
    // minimal synthetic CX2 document.
    const syntheticCx = [
      { visualProperties: [styleCx.visualProperties] },
      { nodeBypasses: styleCx.nodeBypasses ?? [] },
      { edgeBypasses: styleCx.edgeBypasses ?? [] },
    ] as unknown as Cx2
    try {
      styles[styleCx.id] = {
        id: styleCx.id,
        name,
        visualStyle: createVisualStyleFromCx(syntheticCx),
      }
    } catch (e) {
      logModel.warn(
        `[visualStyleSetConverter]: Failed to convert style "${name}" (${styleCx.id}), falling back to single style: ${e}`,
      )
      return fallback()
    }
  }

  return {
    activeStyleId: aspect.activeStyleId,
    styles,
  }
}

/**
 * Whether a style set needs the custom aspect at all. A set holding a single
 * style with the default name is exactly what the standard aspects already
 * express, so exporting the custom aspect would be pure noise.
 */
export const styleSetNeedsCustomAspect = (
  styleSet: VisualStyleSet,
): boolean => {
  const entries = Object.values(styleSet.styles)
  return (
    entries.length > 1 || entries.some((s) => s.name !== DEFAULT_STYLE_NAME)
  )
}

/**
 * Build the `cyWebVisualStyles` aspect element for export.
 *
 * @returns The single aspect element, or undefined when the set does not
 *   need the custom aspect (single style with the default name).
 */
export const buildCyWebVisualStylesAspect = (
  styleSet: VisualStyleSet,
  nodeTable: Table,
  edgeTable: Table,
): CyWebVisualStylesAspect | undefined => {
  if (!styleSetNeedsCustomAspect(styleSet)) {
    return undefined
  }

  const styles = Object.values(styleSet.styles).map((namedStyle) => {
    const aspects = buildVisualStyleAspects(
      // clone so aspect building can never be affected by frozen store objects
      cloneVisualStyle(namedStyle.visualStyle),
      nodeTable,
      edgeTable,
    )
    return {
      id: namedStyle.id,
      name: namedStyle.name,
      visualProperties: aspects.visualProperties[0] ?? {},
      nodeBypasses: aspects.nodeBypasses,
      edgeBypasses: aspects.edgeBypasses,
    }
  })

  return {
    version: CY_WEB_VISUAL_STYLES_ASPECT_VERSION,
    activeStyleId: styleSet.activeStyleId,
    styles,
  }
}
