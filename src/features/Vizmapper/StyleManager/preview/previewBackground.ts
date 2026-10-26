import { VisualStyle } from '@/models/VisualStyleModel'

/** Used when a style has no network background colour of its own. */
const FALLBACK_BACKGROUND = '#ffffff'

/**
 * The background a style's thumbnail is drawn on: the style's OWN network
 * background, because networkBackgroundColor never reaches the cyjs
 * stylesheet — NetworkPanel applies it as container CSS, so a hardcoded white
 * would render every dark style on white and lie about what the canvas will
 * look like. Always a concrete colour, never transparent: a white or unfilled
 * node on a transparent thumbnail reads as an empty tile.
 *
 * The thumbnail and the tile around it both use this, so the band a
 * letterboxed thumbnail leaves in its tile matches the thumbnail.
 */
export const previewBackgroundColor = (
  visualStyle: VisualStyle | undefined,
): string =>
  (visualStyle?.networkBackgroundColor?.defaultValue as string | undefined) ??
  FALLBACK_BACKGROUND
