import type { AttributeName, ValueType } from '../../TableModel'
import type { LineChartPropertiesType } from '../VisualPropertyValue/CustomGraphicsType'

const SVG_WIDTH = 100
const SVG_HEIGHT = 100
const PADDING = 8

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export const buildLineChartSvg = (
  properties: LineChartPropertiesType,
  row: Record<AttributeName, ValueType | null | undefined>,
): string => {
  const columns = properties.cy_dataColumns ?? []
  const colors = properties.cy_colors ?? []

  const series = columns
    .map((column, index) => ({
      column,
      color: colors[index] ?? '#333333',
      value: row[column],
    }))
    .filter((item) => isFiniteNumber(item.value))

  const configuredRange = properties.cy_range
  const values = series.map((item) => item.value).filter(isFiniteNumber)

  let min = configuredRange?.[0]
  let max = configuredRange?.[1]

  if (!isFiniteNumber(min) || !isFiniteNumber(max) || min >= max) {
    if (values.length === 0) {
      min = -1
      max = 1
    } else {
      min = Math.min(...values)
      max = Math.max(...values)

      if (min === max) {
        min -= 1
        max += 1
      }
    }
  }

  const plotWidth = SVG_WIDTH - PADDING * 2
  const plotHeight = SVG_HEIGHT - PADDING * 2

  const xFor = (index: number): number =>
    PADDING +
    (columns.length <= 1
      ? plotWidth / 2
      : (index / (columns.length - 1)) * plotWidth)

  const yFor = (value: number): number =>
    PADDING + ((max! - value) / (max! - min!)) * plotHeight

  const axisColor = escapeXml(properties.cy_axisColor ?? '#555555')
  const axisWidth = isFiniteNumber(properties.cy_axisWidth)
    ? Math.max(0, properties.cy_axisWidth)
    : 0.5

  const lineWidth = isFiniteNumber(properties.cy_lineWidth)
    ? Math.max(0, properties.cy_lineWidth)
    : 1.5

  const showDomainAxis = properties.cy_showDomainAxis ?? true
  const showRangeAxis = properties.cy_showRangeAxis ?? true
  const axisLabelFontSize = isFiniteNumber(properties.cy_axisLabelFontSize)
    ? Math.max(0, properties.cy_axisLabelFontSize)
    : 2

  const domainLabelPosition = properties.cy_domainLabelPosition ?? 'DOWN'
  const domainLabelRotation = domainLabelPosition === 'DOWN_45' ? 45 : 0
  const showZeroBaseline = properties.cy_showRangeZeroBaseline ?? false
  const showItemLabels = properties.cy_showItemLabels ?? false
  const itemLabelFontSize = isFiniteNumber(properties.cy_itemLabelFontSize)
    ? Math.max(0, properties.cy_itemLabelFontSize)
    : 2

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}">`,
    `<defs><clipPath id="line-chart-plot-clip"><rect x="${PADDING}" y="${PADDING}" width="${plotWidth}" height="${plotHeight}"/></clipPath></defs>`,
  ]
  const borderWidth = isFiniteNumber(properties.cy_borderWidth)
    ? Math.max(0, properties.cy_borderWidth)
    : 0

  if (borderWidth > 0) {
    const borderColor = escapeXml(properties.cy_borderColor ?? '#555555')
    parts.push(
      `<rect x="${borderWidth / 2}" y="${borderWidth / 2}" width="${SVG_WIDTH - borderWidth}" height="${SVG_HEIGHT - borderWidth}" fill="none" stroke="${borderColor}" stroke-width="${borderWidth}"/>`,
    )
  }

  if (showDomainAxis) {
    parts.push(
      `<line x1="${PADDING}" y1="${SVG_HEIGHT - PADDING}" x2="${SVG_WIDTH - PADDING}" y2="${SVG_HEIGHT - PADDING}" stroke="${axisColor}" stroke-width="${axisWidth}"/>`,
    )
  }
  if (showDomainAxis) {
    columns.forEach((column, index) => {
      const x = xFor(index)
      const y = SVG_HEIGHT - PADDING + 3
      const transform =
        domainLabelRotation === 0
          ? ''
          : ` transform="rotate(${domainLabelRotation} ${x} ${y})"`

      parts.push(
        `<text x="${x}" y="${y}" fill="${axisColor}" font-size="${axisLabelFontSize}" text-anchor="middle"${transform}>${escapeXml(column)}</text>`,
      )
    })
  }

  if (showRangeAxis) {
    parts.push(
      `<line x1="${PADDING}" y1="${PADDING}" x2="${PADDING}" y2="${SVG_HEIGHT - PADDING}" stroke="${axisColor}" stroke-width="${axisWidth}"/>`,
    )
  }
  if (showRangeAxis) {
    parts.push(
      `<text x="${PADDING - 1}" y="${PADDING + axisLabelFontSize}" fill="${axisColor}" font-size="${axisLabelFontSize}" text-anchor="end">${max!.toFixed(2)}</text>`,
    )

    parts.push(
      `<text x="${PADDING - 1}" y="${SVG_HEIGHT - PADDING}" fill="${axisColor}" font-size="${axisLabelFontSize}" text-anchor="end">${min!.toFixed(2)}</text>`,
    )
  }

  if (showZeroBaseline && min! <= 0 && max! >= 0) {
    const zeroY = yFor(0)
    parts.push(
      `<line x1="${PADDING}" y1="${zeroY}" x2="${SVG_WIDTH - PADDING}" y2="${zeroY}" stroke="${axisColor}" stroke-width="${axisWidth}" stroke-dasharray="2 2"/>`,
    )
  }

  if (columns.length > 0) {
    let segment: string[] = []
    const itemLabels: string[] = []

    const flushSegment = () => {
      if (segment.length > 0) {
        parts.push(
          `<polyline clip-path="url(#line-chart-plot-clip)" fill="none" stroke="${escapeXml(colors[0] ?? '#333333')}" stroke-width="${lineWidth}" stroke-linecap="round" stroke-linejoin="round" points="${segment.join(' ')}"/>`,
        )
        segment = []
      }
    }

    columns.forEach((column, index) => {
      const value = row[column]

      if (!isFiniteNumber(value)) {
        flushSegment()
        return
      }

      const x = xFor(index)
      const y = yFor(value)

      segment.push(`${x},${y}`)

      if (showItemLabels) {
        const labelY = Math.max(
          PADDING + itemLabelFontSize,
          y - itemLabelFontSize,
        )

        itemLabels.push(
          `<text x="${x}" y="${labelY}" fill="${escapeXml(colors[index] ?? '#333333')}" font-size="${itemLabelFontSize}" text-anchor="middle">${escapeXml(String(value))}</text>`,
        )
      }
    })

    flushSegment()
    parts.push(...itemLabels)
  }

  parts.push('</svg>')
  return parts.join('')
}
