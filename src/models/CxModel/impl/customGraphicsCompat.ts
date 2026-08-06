import { Cx2 } from '../Cx2'

/**
 * A node custom-graphics *value* slot (NODE_CUSTOMGRAPHICS_1..9), as opposed to
 * its paired size or position slot.
 */
const isCustomGraphicValueKey = (key: string): boolean =>
  key.startsWith('NODE_CUSTOMGRAPHICS_') &&
  !key.startsWith('NODE_CUSTOMGRAPHICS_SIZE') &&
  !key.startsWith('NODE_CUSTOMGRAPHICS_POSITION')

/**
 * Walk every place a custom-graphic image reference can live in a CX2 and report
 * whether any of them matches.
 *
 * There are four such places, and both detectors below need all four:
 *   1. default node visual properties (NODE_CUSTOMGRAPHICS_n objects),
 *   2. per-node bypasses,
 *   3. node table columns referenced by a NODE_CUSTOMGRAPHICS_n passthrough
 *      mapping — both the per-node values and the column's declared default in
 *      `attributeDeclarations` (a CX2 column default applies to every node that
 *      omits the value, so a data URI declared there is just as real as one
 *      repeated on each node),
 *
 * `isSlotMatch` tests a custom-graphics slot value (a `{type, name, properties}`
 * object); `isColumnMatch` tests a raw column value (a string).
 */
const scanCustomGraphics = (
  cx2: Cx2,
  {
    isSlotMatch,
    isColumnMatch,
  }: {
    isSlotMatch: (value: unknown) => boolean
    isColumnMatch: (value: unknown) => boolean
  },
): boolean => {
  const aspects = cx2 as any[]
  const passthroughAttributes = new Set<string>()

  for (const aspect of aspects) {
    // 1 & passthrough discovery — visualProperties
    for (const vp of aspect?.visualProperties ?? []) {
      for (const [key, value] of Object.entries(vp?.default?.node ?? {})) {
        if (isCustomGraphicValueKey(key) && isSlotMatch(value)) return true
      }
      for (const [key, mapping] of Object.entries(vp?.nodeMapping ?? {})) {
        const isPassthrough = (mapping as any)?.type === 'PASSTHROUGH'
        if (isCustomGraphicValueKey(key) && isPassthrough) {
          const attribute = (mapping as any)?.definition?.attribute
          if (typeof attribute === 'string') {
            passthroughAttributes.add(attribute)
          }
        }
      }
    }
    // 2 — per-node bypasses
    for (const bypass of aspect?.nodeBypasses ?? []) {
      for (const [key, value] of Object.entries(bypass?.v ?? {})) {
        if (isCustomGraphicValueKey(key) && isSlotMatch(value)) return true
      }
    }
  }

  // 3 — columns feeding a custom-graphics passthrough
  if (passthroughAttributes.size === 0) return false

  for (const aspect of aspects) {
    for (const declaration of aspect?.attributeDeclarations ?? []) {
      for (const attribute of passthroughAttributes) {
        if (isColumnMatch(declaration?.nodes?.[attribute]?.v)) return true
      }
    }
    for (const node of aspect?.nodes ?? []) {
      for (const attribute of passthroughAttributes) {
        if (isColumnMatch(node?.v?.[attribute])) return true
      }
    }
  }

  return false
}

const imageUrlOf = (value: unknown): unknown =>
  (value as { properties?: { url?: unknown } } | undefined)?.properties?.url

/**
 * Cytoscape Desktop's image custom graphics are loaded through Java's URL/ImageIO stack,
 * which has no handler for `data:` URIs (and cannot decode inline `<svg>` markup as a
 * bitmap). When Cytoscape Web sends such a network to Desktop, those nodes render a "?"
 * placeholder even though the rest of the network imports fine.
 *
 * This detects whether an exported CX2 carries any custom-graphic image backed by inline
 * data (a `data:` URI or raw SVG), so callers can warn the user before sending to Desktop.
 * It is the *narrow* case — see `hasImageCustomGraphics` for the broader one.
 */
export const hasDataUriCustomGraphics = (cx2: Cx2): boolean => {
  const isInlineImage = (value: unknown): boolean =>
    typeof value === 'string' &&
    (value.startsWith('data:') || value.trimStart().startsWith('<svg'))

  return scanCustomGraphics(cx2, {
    isSlotMatch: (value) => isInlineImage(imageUrlOf(value)),
    isColumnMatch: isInlineImage,
  })
}

/**
 * Whether an exported CX2 contains any **image** custom graphic (as opposed to a
 * pie/ring chart, which Desktop computes from data and renders fine).
 *
 * Cytoscape Desktop does not load custom-graphic image bytes from a CX2 — the pixels
 * live in its session `CustomGraphicsManager` pool, and a plain CX2 import (from Web,
 * a file, or REST) never fetches them, regardless of URL scheme (http/https/data/file).
 * Such nodes render a "?" placeholder unless a supporting Desktop app (e.g. stringApp)
 * repopulates the pool. Callers can use this to warn before sending to Desktop.
 */
export const hasImageCustomGraphics = (cx2: Cx2): boolean => {
  const isImageValue = (value: unknown): boolean =>
    (value as { type?: string } | undefined)?.type === 'image'

  const looksLikeImageRef = (value: unknown): boolean =>
    typeof value === 'string' &&
    (/^(https?:|data:|file:)/.test(value) ||
      value.trimStart().startsWith('<svg') ||
      /\.(svg|png|jpe?g|gif|bmp)(\?|#|$)/i.test(value))

  return scanCustomGraphics(cx2, {
    isSlotMatch: isImageValue,
    isColumnMatch: looksLikeImageRef,
  })
}

/**
 * The single wording for the Desktop image-custom-graphics caveat, shared by every
 * export path that a person watches: "Open in Cytoscape Desktop", the CX2 file
 * download, and both NDEx saves. All of those emit byte-identical CX2, so a
 * downloaded file later opened via Desktop's File > Import fails exactly like the
 * direct hand-off — keeping one constant stops the four call sites from drifting.
 */
export const IMAGE_CUSTOM_GRAPHICS_DESKTOP_WARNING =
  'Node custom-graphic images may appear as "?" in Cytoscape Desktop — ' +
  'Desktop loads images from its own image pool, not from the network file.'

/** How long the Desktop caveat stays on screen (ms). Long enough to read. */
export const IMAGE_CUSTOM_GRAPHICS_WARNING_DURATION = 8000
