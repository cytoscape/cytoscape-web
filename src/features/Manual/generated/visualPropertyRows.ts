import type {
  VisualPropertyGroup,
  VisualPropertyName,
  VisualPropertyValueTypeName,
} from '@/models/VisualStyleModel'
import { getDefaultVisualStyle } from '@/models/VisualStyleModel/impl/defaultVisualStyle'

/**
 * Manual text for visual properties whose model entry has no `tooltip`.
 * A property's own tooltip wins: it is the text the Style panel shows.
 *
 * `visualPropertyRows.test.ts` fails when a property has neither, so a new
 * property cannot reach the manual's tables without a description.
 */
export const VISUAL_PROPERTY_DESCRIPTIONS: Partial<
  Record<VisualPropertyName, string>
> = {
  nodeShape: 'The shape of the node.',
  nodeBorderColor: 'The color of the border of the node.',
  nodeBorderLineType: 'The type of line used for the border of the node.',
  nodeBorderWidth: 'The width of the node border.',
  nodeHeight: 'The height of the node. Independent of the width.',
  nodeWidth: 'The width of the node. Independent of the height.',
  nodeBackgroundColor: 'The fill color of the node.',
  nodeLabel: 'The text of the node label.',
  nodeLabelColor: 'The color of the node label.',
  nodeLabelFontSize: 'The font size of the node label.',
  nodeLabelFont: 'The font of the node label.',
  nodeLabelPosition: 'The position of the node label relative to the node.',
  nodeSelectedPaint: 'The fill color of the node when it is selected.',
  nodeImageChartPosition1:
    'Where an image or chart sits on the node, and how it aligns.',
  nodeImageChartSize1: 'The size of an image or chart on the node.',
  edgeLineType: 'The line style of the edge: solid, dashed, and so on.',
  edgeSourceArrowShape: 'The shape of the arrow at the source end.',
  edgeTargetArrowShape: 'The shape of the arrow at the target end.',
  edgeLabel: 'The text of the edge label.',
  edgeLabelColor: 'The color of the edge label.',
  edgeLabelFontSize: 'The font size of the edge label.',
  edgeLabelFont: 'The font of the edge label.',
  edgeWidth: 'The width of the edge line.',
  edgeSelectedPaint:
    'The color of the whole edge, line and arrows, when it is selected.',
  networkBackgroundColor: 'The background color of the network view.',
}

export interface VisualPropertyRow {
  /** Display name as the Style panel shows it; numbered series collapsed. */
  readonly displayName: string
  readonly names: readonly VisualPropertyName[]
  readonly type: VisualPropertyValueTypeName
  readonly defaultValue: string
  readonly description: string | undefined
}

/** `Image/Chart Position 3` → `Image/Chart Position`. */
const seriesName = (displayName: string): string | undefined =>
  /^(Image\/Chart(?: Position| Size)?) \d+$/.exec(displayName)?.[1]

const formatDefault = (value: unknown): string => {
  if (typeof value === 'string') return value === '' ? '(empty)' : value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return '—'
}

/**
 * One row per visual property in `group`, in the order the model declares
 * them — the order the Style panel lists them. A numbered series
 * (`Image/Chart 1` … `Image/Chart 9`) collapses into one row.
 */
export const visualPropertyRows = (
  group: VisualPropertyGroup,
): VisualPropertyRow[] => {
  const rows: VisualPropertyRow[] = []
  const seriesIndex = new Map<string, number>()

  for (const vp of Object.values(getDefaultVisualStyle())) {
    if (vp.group !== group) continue
    const description = vp.tooltip ?? VISUAL_PROPERTY_DESCRIPTIONS[vp.name]
    const series = seriesName(vp.displayName)

    if (series !== undefined) {
      const index = seriesIndex.get(series)
      if (index !== undefined) {
        const row = rows[index]
        const names = [...row.names, vp.name]
        rows[index] = {
          ...row,
          names,
          displayName: `${series} 1–${names.length}`,
        }
        continue
      }
      seriesIndex.set(series, rows.length)
    }

    rows.push({
      displayName: series !== undefined ? `${series} 1` : vp.displayName,
      names: [vp.name],
      type: vp.type,
      defaultValue: formatDefault(vp.defaultValue),
      description,
    })
  }
  return rows
}
