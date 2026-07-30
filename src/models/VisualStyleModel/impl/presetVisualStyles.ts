/**
 * General-purpose visual styles shipped with the app.
 *
 * These are not any network's style: they are a starting catalogue, so the style
 * picker offers something on a fresh workspace where the only alternative is the
 * one "Default" the current network came with. Applying one copies it in, exactly
 * like a style from another network.
 *
 * Each is built from `createVisualStyle()` with a handful of defaults overridden,
 * so a preset inherits every property the app adds later — including the
 * passthrough `nodeLabel` mapping on the `name` column, which is what makes
 * labels appear at all.
 *
 * Model layer: no React, no Zustand. Consumed by
 * `features/Vizmapper/StyleManager`.
 */
import { EdgeArrowShapeType } from '../VisualPropertyValue/EdgeArrowShapeType'
import { EdgeLineType } from '../VisualPropertyValue/EdgeLineType'
import { NodeShapeType } from '../VisualPropertyValue/NodeShapeType'
import { VisualPropertyName } from '../VisualPropertyName'
import { VisualStyle } from '../VisualStyle'
import { createVisualStyle } from './visualStyleFnImpl'

export interface PresetVisualStyle {
  /** Stable across sessions — used for React keys and test ids. */
  id: string
  name: string
  /** One line on what it is for; shown as the tile's secondary text. */
  description: string
  visualStyle: VisualStyle
}

type Overrides = Partial<Record<VisualPropertyName, unknown>>

const build = (overrides: Overrides): VisualStyle => {
  const visualStyle = createVisualStyle()
  Object.entries(overrides).forEach(([vpName, value]) => {
    const vp = (visualStyle as any)[vpName]
    if (vp !== undefined) {
      vp.defaultValue = value
    }
  })
  return visualStyle
}

/**
 * Built ONCE at module scope, deliberately.
 *
 * The thumbnail cache is a WeakMap keyed by the style object, so rebuilding these
 * per render would miss every time and re-rasterize the whole catalogue on each
 * repaint. Sharing the objects is safe because `importStyle` deep-clones what it
 * is handed, so a copied preset can never mutate the original.
 */
export const PRESET_VISUAL_STYLES: readonly PresetVisualStyle[] = [
  {
    id: 'preset-minimal',
    name: 'Minimal',
    description: 'Small pale nodes, faint edges',
    visualStyle: build({
      [VisualPropertyName.NodeShape]: NodeShapeType.Ellipse,
      [VisualPropertyName.NodeBackgroundColor]: '#E8E8E8',
      [VisualPropertyName.NodeBorderColor]: '#BDBDBD',
      [VisualPropertyName.NodeBorderWidth]: 1,
      [VisualPropertyName.NodeWidth]: 30,
      [VisualPropertyName.NodeHeight]: 30,
      [VisualPropertyName.NodeLabelColor]: '#616161',
      [VisualPropertyName.NodeLabelFontSize]: 9,
      [VisualPropertyName.EdgeLineColor]: '#D0D0D0',
      [VisualPropertyName.EdgeWidth]: 1,
    }),
  },
  {
    id: 'preset-directed',
    name: 'Directed',
    description: 'Arrowheads for directed graphs',
    visualStyle: build({
      [VisualPropertyName.NodeShape]: NodeShapeType.Ellipse,
      [VisualPropertyName.NodeBackgroundColor]: '#FFFFFF',
      [VisualPropertyName.NodeBorderColor]: '#37474F',
      [VisualPropertyName.NodeBorderWidth]: 2,
      [VisualPropertyName.NodeLabelColor]: '#263238',
      [VisualPropertyName.EdgeLineColor]: '#546E7A',
      [VisualPropertyName.EdgeWidth]: 2,
      [VisualPropertyName.EdgeTargetArrowShape]: EdgeArrowShapeType.Triangle,
      [VisualPropertyName.EdgeTargetArrowColor]: '#546E7A',
    }),
  },
  {
    id: 'preset-high-contrast',
    name: 'High Contrast',
    description: 'Heavy dark shapes for projectors',
    visualStyle: build({
      [VisualPropertyName.NodeShape]: NodeShapeType.RoundRectangle,
      [VisualPropertyName.NodeBackgroundColor]: '#212121',
      [VisualPropertyName.NodeBorderColor]: '#000000',
      [VisualPropertyName.NodeBorderWidth]: 2,
      [VisualPropertyName.NodeLabelColor]: '#FFFFFF',
      [VisualPropertyName.NodeLabelFontSize]: 13,
      [VisualPropertyName.NodeWidth]: 85,
      [VisualPropertyName.NodeHeight]: 40,
      [VisualPropertyName.EdgeLineColor]: '#000000',
      [VisualPropertyName.EdgeWidth]: 4,
    }),
  },
  {
    id: 'preset-dark',
    name: 'Dark',
    description: 'Light nodes on a dark canvas',
    visualStyle: build({
      [VisualPropertyName.NetworkBackgroundColor]: '#1E1E1E',
      [VisualPropertyName.NodeShape]: NodeShapeType.RoundRectangle,
      [VisualPropertyName.NodeBackgroundColor]: '#4FC3F7',
      [VisualPropertyName.NodeBorderColor]: '#0288D1',
      [VisualPropertyName.NodeBorderWidth]: 1,
      [VisualPropertyName.NodeLabelColor]: '#ECEFF1',
      [VisualPropertyName.EdgeLineColor]: '#78909C',
      [VisualPropertyName.EdgeWidth]: 2,
    }),
  },
  {
    id: 'preset-big-labels',
    name: 'Big Labels',
    description: 'Oversized text for figures',
    visualStyle: build({
      [VisualPropertyName.NodeShape]: NodeShapeType.RoundRectangle,
      [VisualPropertyName.NodeBackgroundColor]: '#FFF9C4',
      [VisualPropertyName.NodeBorderColor]: '#F9A825',
      [VisualPropertyName.NodeBorderWidth]: 1,
      [VisualPropertyName.NodeWidth]: 120,
      [VisualPropertyName.NodeHeight]: 45,
      [VisualPropertyName.NodeLabelColor]: '#3E2723',
      [VisualPropertyName.NodeLabelFontSize]: 20,
      [VisualPropertyName.EdgeLineColor]: '#BDBDBD',
      [VisualPropertyName.EdgeWidth]: 2,
    }),
  },
  {
    id: 'preset-outline',
    name: 'Outline',
    description: 'Unfilled nodes, coloured borders',
    visualStyle: build({
      [VisualPropertyName.NodeShape]: NodeShapeType.Ellipse,
      [VisualPropertyName.NodeBackgroundColor]: '#FFFFFF',
      [VisualPropertyName.NodeBorderColor]: '#7E57C2',
      [VisualPropertyName.NodeBorderWidth]: 3,
      [VisualPropertyName.NodeLabelColor]: '#4527A0',
      [VisualPropertyName.EdgeLineColor]: '#B39DDB',
      [VisualPropertyName.EdgeWidth]: 2,
    }),
  },
  {
    id: 'preset-box',
    name: 'Box',
    description: 'Square-cornered rectangles',
    visualStyle: build({
      [VisualPropertyName.NodeShape]: NodeShapeType.Rectangle,
      [VisualPropertyName.NodeBackgroundColor]: '#80CBC4',
      [VisualPropertyName.NodeBorderColor]: '#00695C',
      [VisualPropertyName.NodeBorderWidth]: 2,
      [VisualPropertyName.NodeLabelColor]: '#004D40',
      [VisualPropertyName.NodeWidth]: 90,
      [VisualPropertyName.NodeHeight]: 34,
      [VisualPropertyName.EdgeLineColor]: '#4DB6AC',
      [VisualPropertyName.EdgeWidth]: 3,
    }),
  },
  {
    id: 'preset-blueprint',
    name: 'Blueprint',
    description: 'Dashed edges, hexagonal nodes',
    visualStyle: build({
      [VisualPropertyName.NodeShape]: NodeShapeType.Hexagon,
      [VisualPropertyName.NodeBackgroundColor]: '#E3F2FD',
      [VisualPropertyName.NodeBorderColor]: '#1565C0',
      [VisualPropertyName.NodeBorderWidth]: 2,
      [VisualPropertyName.NodeLabelColor]: '#0D47A1',
      [VisualPropertyName.EdgeLineColor]: '#1565C0',
      [VisualPropertyName.EdgeLineType]: EdgeLineType.Dashed,
      [VisualPropertyName.EdgeWidth]: 2,
    }),
  },
]
