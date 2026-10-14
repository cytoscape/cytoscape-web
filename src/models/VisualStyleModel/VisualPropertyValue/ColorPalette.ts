import { ColorType } from './ColorType'

/**
 * Represents a color palette - an ordered array of colors
 */
export type ColorPalette = ColorType[]

/**
 * How a palette varies across its range. The pickers group by this, so it is
 * the one taxonomy for palettes.
 */
export type PaletteCategory =
  | 'sequential'
  | 'diverging'
  | 'viridis'
  | 'categorical'

/**
 * Palette metadata for identification and display
 */
export interface PaletteMetadata {
  id: string
  name: string
  description?: string
  category: PaletteCategory
  colorBlindSafe?: boolean
}

/**
 * A palette definition with its metadata and colors.
 * For diverging palettes, min/middle/max colors are provided for continuous mapping.
 */
export interface PaletteDefinition {
  metadata: PaletteMetadata
  colors: ColorPalette
  /**
   * Minimum color (for diverging palettes used in continuous mapping)
   * Typically the "low" end of the diverging scale
   */
  min?: ColorType
  /**
   * Middle color (for diverging palettes used in continuous mapping)
   * Typically the neutral/middle point of the diverging scale
   */
  middle?: ColorType
  /**
   * Maximum color (for diverging palettes used in continuous mapping)
   * Typically the "high" end of the diverging scale
   */
  max?: ColorType
}
