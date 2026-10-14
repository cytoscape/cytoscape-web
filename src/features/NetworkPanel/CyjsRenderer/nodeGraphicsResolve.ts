// src/features/NetworkPanel/CyjsRenderer/nodeGraphicsResolve.ts
//
// Turns whatever an app's render hook returned into a validated, fully
// defaulted `ResolvedNodeGraphics` — or null.
//
// Everything here is defensive. The input crossed the app boundary, is typed
// only by a contract the app may ignore, and reaches this code from inside the
// render path, where there is no ApiResult channel to report a failure on. So a
// bad value degrades to "no image for this node" and a log line, never a throw.

import { logApp } from '../../../debug'
import {
  describeImageSourceRejection,
  normalizeImageSource,
} from '../../../models/VisualStyleModel/impl/imageSourceImpl'
import type {
  NodeGraphicsContainment,
  NodeGraphicsCrossOrigin,
  NodeGraphicsFit,
  NodeGraphicsImage,
  NodeGraphicsResult,
  ResolvedNodeGraphics,
} from '../../../models/StoreModel/NodeGraphicsStoreModel'

const FITS = new Set<NodeGraphicsFit>(['contain', 'cover', 'none'])
const CROSS_ORIGINS = new Set<NodeGraphicsCrossOrigin>([
  'anonymous',
  'use-credentials',
  'null',
])
const CONTAINMENTS = new Set<NodeGraphicsContainment>(['inside', 'over'])

const DEFAULT_FIT: NodeGraphicsFit = 'contain'
// Matches computeImageProperties: load from servers without CORS headers at the
// cost of tainting the canvas (which excludes the image from PNG export).
const DEFAULT_CROSS_ORIGIN: NodeGraphicsCrossOrigin = 'null'
// 'inside' matches Vizmapper image slots, so a pie chart on the same node still
// draws on top — consistent with how two Vizmapper slots already behave.
const DEFAULT_CONTAINMENT: NodeGraphicsContainment = 'inside'

const clampOpacity = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1
  return Math.min(Math.max(value, 0), 1)
}

/**
 * Normalize a hook result. Returns null when the hook declined (`null`) or
 * returned something unusable.
 *
 * @param result - Whatever the hook returned, untrusted
 * @param hookId - Attribution, so removing a hook can drop only its images
 */
export const resolveNodeGraphics = (
  result: NodeGraphicsResult,
  hookId: string,
): ResolvedNodeGraphics | null => {
  if (result === null || result === undefined) return null

  let raw: NodeGraphicsImage
  if (typeof result === 'string') {
    raw = { image: result }
  } else if (typeof result === 'object') {
    raw = result
  } else {
    logApp.warn(
      `[nodeGraphics]: hook returned ${typeof result}; expected a string, an object, or null`,
    )
    return null
  }

  const source = normalizeImageSource(raw.image)
  if (source.kind !== 'url') {
    // 'empty' is how an app says "nothing here" via a blank string — as routine
    // as returning null, so it stays quiet. The rest are mistakes worth naming.
    if (source.kind === 'rejected' && source.reason !== 'empty') {
      logApp.warn(
        `[nodeGraphics]: ${describeImageSourceRejection(source.reason)}:`,
        source.raw.substring(0, 80),
      )
    } else if (source.kind === 'json') {
      logApp.warn(
        '[nodeGraphics]: hook returned a JSON object string; only images are supported',
      )
    }
    return null
  }

  // Unknown enum values would make Cytoscape.js warn on every restyle, so fall
  // back to the default rather than passing them through.
  const fit = FITS.has(raw.fit as NodeGraphicsFit)
    ? (raw.fit as NodeGraphicsFit)
    : DEFAULT_FIT
  const crossOrigin = CROSS_ORIGINS.has(
    raw.crossOrigin as NodeGraphicsCrossOrigin,
  )
    ? (raw.crossOrigin as NodeGraphicsCrossOrigin)
    : DEFAULT_CROSS_ORIGIN
  const containment = CONTAINMENTS.has(
    raw.containment as NodeGraphicsContainment,
  )
    ? (raw.containment as NodeGraphicsContainment)
    : DEFAULT_CONTAINMENT

  return {
    image: source.url,
    fit,
    opacity: clampOpacity(raw.opacity),
    crossOrigin,
    containment,
    hookId,
  }
}
