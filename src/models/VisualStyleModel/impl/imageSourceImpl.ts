// src/models/VisualStyleModel/impl/imageSourceImpl.ts
//
// One image-source policy, shared by every path that turns an external string
// into a Cytoscape.js `background-image` value.
//
// Three callers, historically with three copies of this logic:
//   1. `customGraphicPassthroughFn` (mapperFactory.ts) — a table column value
//      passed through to a custom-graphics slot.
//   2. `computeImageProperties` (customGraphicsImpl.ts) — a stored
//      `ImagePropertiesType.url` on its way to the renderer.
//   3. `nodeGraphicsApi` — an app render hook's return value.
//
// Keeping the policy here means an app hook cannot smuggle in a scheme the
// Vizmapper path rejects, and a fix to the SVG wrapping benefits all three.

import { logModel } from '../../../debug'

/** Why an image source was refused. Callers decide how loudly to report it. */
export type ImageSourceRejection = 'empty' | 'blob' | 'file' | 'unrecognized'

export type ImageSourceResult =
  /** Usable directly as a Cytoscape.js `background-image` value. */
  | { readonly kind: 'url'; readonly url: string }
  /** Looks like a JSON object. Only the chart callers care; others reject it. */
  | { readonly kind: 'json'; readonly raw: string }
  | {
      readonly kind: 'rejected'
      readonly reason: ImageSourceRejection
      /** Trimmed input, for log messages. Empty when the input was blank. */
      readonly raw: string
    }

/**
 * Classify an external image source string against the shared policy.
 *
 * Accepts `http(s)://` URLs, `data:` URIs, and raw `<svg>` markup (promoted to
 * a `data:image/svg+xml` URI, because Cytoscape.js only takes a URL).
 *
 * Rejects `blob:` (ephemeral — dead by the time the style reapplies) and
 * `file:` (unreadable from the page). Anything else is `unrecognized`.
 *
 * Pure: never logs, never throws. Callers own the reporting.
 */
export const normalizeImageSource = (value: unknown): ImageSourceResult => {
  if (value == null || value === '') {
    return { kind: 'rejected', reason: 'empty', raw: '' }
  }

  const raw = String(value).trim()
  if (raw === '') {
    return { kind: 'rejected', reason: 'empty', raw: '' }
  }

  if (raw.startsWith('blob:')) {
    return { kind: 'rejected', reason: 'blob', raw }
  }
  if (raw.startsWith('file:')) {
    return { kind: 'rejected', reason: 'file', raw }
  }

  // Raw markup → the data URI form that wrapSvgDataUriForSize can size.
  if (raw.startsWith('<svg')) {
    return { kind: 'url', url: 'data:image/svg+xml,' + encodeURIComponent(raw) }
  }

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('data:')
  ) {
    return { kind: 'url', url: raw }
  }

  if (raw.startsWith('{')) {
    return { kind: 'json', raw }
  }

  return { kind: 'rejected', reason: 'unrecognized', raw }
}

/** Human-readable reason, for a caller's warn message. */
export const describeImageSourceRejection = (
  reason: ImageSourceRejection,
): string => {
  switch (reason) {
    case 'blob':
      return 'Blob URLs are ephemeral and cannot be used for custom graphics'
    case 'file':
      return 'Local file URLs are not supported for custom graphics'
    case 'empty':
      return 'Image source is empty'
    default:
      return 'Unrecognized image source'
  }
}

/** Leading number of an SVG length attribute (`"100"`, `"100px"`). */
const readLength = (value: string | undefined): number | undefined => {
  if (value === undefined) return undefined
  const match = /^\s*([\d.]+)/.exec(value)
  if (match === null) return undefined
  const parsed = parseFloat(match[1])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/**
 * Rewrite the source root `<svg>` so it fills its parent viewport while keeping
 * its own aspect ratio.
 *
 * Without this the source renders at its natural size inside the wrapper, which
 * crops anything larger than the node — measurably so: a 100x100 source in a
 * 140x60 node lost its centre entirely, and the visible remnant drifted further
 * off-centre the more the canvas was zoomed.
 *
 * A source carrying `width`/`height` but no `viewBox` has no scalable coordinate
 * system, so one is derived from those dimensions before they are replaced.
 */
const fitSourceToViewport = (rawSvg: string): string =>
  rawSvg.replace(
    /<svg\b([^>]*?)(\/?)>/,
    (whole: string, attrs: string, selfClose: string) => {
      const width = readLength(/\bwidth="([^"]*)"/.exec(attrs)?.[1])
      const height = readLength(/\bheight="([^"]*)"/.exec(attrs)?.[1])

      let next = attrs
      if (
        !/\bviewBox=/.test(next) &&
        width !== undefined &&
        height !== undefined
      ) {
        next += ` viewBox="0 0 ${width} ${height}"`
      }
      next = next.replace(
        /\s(width|height|preserveAspectRatio)="[^"]*"/g,
        '',
      )

      return `<svg${next} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"${selfClose}>`
    },
  )

/**
 * Wrap an SVG data URI in an outer SVG sized to `width` x `height`, with the
 * source scaled to fit inside it and centered.
 *
 * The outer box must match the node box: that is what keeps Cytoscape's image
 * offset at zero and avoids a canvas bug where a background image whose bounding
 * box is smaller than the node drifts off its anchor as the view zooms. See
 * docs/design/custom-graphics-image/zoom-bug-demo.html for a repro. Within that
 * box the source keeps its own aspect ratio, so a wide graphic uses the node's
 * full width instead of being confined to a min(width, height) square.
 *
 * Non-SVG URLs pass through untouched. On any decode failure the input is
 * returned unchanged, so a malformed URI degrades to "unsized" rather than
 * "no image".
 */
export const wrapSvgDataUriForSize = (
  url: string,
  width: number,
  height: number,
): string => {
  if (!url.startsWith('data:image/svg+xml')) {
    return url
  }

  try {
    const commaIdx = url.indexOf(',')
    if (commaIdx === -1) {
      return url
    }

    const metadata = url.substring(0, commaIdx)
    const data = url.substring(commaIdx + 1)
    const rawSvg = metadata.includes('base64')
      ? atob(data)
      : decodeURIComponent(data)

    const wrapperSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${fitSourceToViewport(rawSvg)}</svg>`

    return 'data:image/svg+xml,' + encodeURIComponent(wrapperSvg)
  } catch (e) {
    logModel.warn('Failed to wrap SVG custom graphic', e)
    return url
  }
}
