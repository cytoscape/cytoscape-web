import { ValueTypeName } from '../ValueTypeName'
import { valueTypeNameGlyph } from './valueTypeNameDisplay'
import { isListType } from './valueTypeImpl'

export const getValueTypeNameColors = (type: ValueTypeName, isDarkTheme: boolean) => {
  const isList = isListType(type)
  const baseType = isList ? type.replace('list_of_', '') : type

  let textColor = isDarkTheme ? '#e0e0e0' : '#424242'
  if (baseType === 'string') {
    textColor = isDarkTheme ? '#4db6ac' : '#00897b'
  } else if (baseType === 'integer' || baseType === 'long' || baseType === 'double') {
    textColor = isDarkTheme ? '#81c784' : '#43a047'
  } else if (baseType === 'boolean') {
    textColor = isDarkTheme ? '#9575cd' : '#5e35b1'
  }

  const bracketColor = isDarkTheme ? '#ffb74d' : '#f57c00'
  const borderColor = isDarkTheme ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
  const bgColor = isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'

  return { textColor, bracketColor, borderColor, bgColor }
}

export const getBaseTypeName = (type: ValueTypeName): string => {
  return isListType(type) ? type.replace('list_of_', '') : type
}

/**
 * Glyph drawn inside the badge, without the list brackets — callers that
 * colorize the brackets separately add them back.
 */
export const getBaseGlyph = (type: ValueTypeName): string => {
  return valueTypeNameGlyph(getBaseTypeName(type) as ValueTypeName)
}

/** Narrowest badge, so a one-character glyph such as "1" is not cramped. */
const MIN_BADGE_WIDTH = 26

export const getBadgeWidth = (type: ValueTypeName): number => {
  const isList = isListType(type)
  const glyph = getBaseGlyph(type)

  // These character widths are approximate for font-size 11px monospace
  const charWidth = 6.6
  const paddingX = 10
  const textWidth = glyph.length * charWidth
  const totalTextWidth = isList ? textWidth + 2 * charWidth : textWidth
  return Math.max(MIN_BADGE_WIDTH, Math.ceil(totalTextWidth + paddingX))
}

export const getValueTypeNameSVG = (type: ValueTypeName, isDarkTheme: boolean): string => {
  const isList = isListType(type)
  const glyph = getBaseGlyph(type)
  const { textColor, bracketColor, borderColor, bgColor } = getValueTypeNameColors(type, isDarkTheme)

  const badgeWidth = getBadgeWidth(type)
  const badgeHeight = 18
  
  const size = badgeWidth
  const yOffset = (size - badgeHeight) / 2
  const midX = size / 2

  let textContent = ''
  if (isList) {
    textContent = `<tspan fill="${bracketColor}">[</tspan><tspan fill="${textColor}">${glyph}</tspan><tspan fill="${bracketColor}">]</tspan>`
  } else {
    textContent = `<tspan fill="${textColor}">${glyph}</tspan>`
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="${yOffset}" width="${badgeWidth}" height="${badgeHeight}" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1"/>
  <text x="${midX}" y="${yOffset + 12.5}" font-family="monospace, Consolas, Courier New" font-size="11" font-weight="bold" text-anchor="middle">${textContent}</text>
</svg>`
}

