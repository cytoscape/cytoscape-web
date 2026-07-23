import { DrawHeaderCallback, GridColumnIcon } from '@glideapps/glide-data-grid'
import { ValueTypeName } from '../../../models/TableModel'
import { getBadgeWidth, getValueTypeNameSVG } from '../../../models/TableModel/impl/valueTypeNameIcons'

export const getHeaderIconForType = (type: ValueTypeName): GridColumnIcon | string => {
  return type as string
}

export const createHeaderIcons = (isDark: boolean): Record<string, () => string> => {
  const icons: Record<string, () => string> = {}
  Object.values(ValueTypeName).forEach((type) => {
    icons[type] = () => getValueTypeNameSVG(type, isDark)
  })
  return icons
}

export const handleDrawHeader: DrawHeaderCallback = ({ ctx, column }) => {
  // Only apply to columns that have our custom SVG badge type
  const colType = (column as any).type as ValueTypeName
  if (!colType || !Object.values(ValueTypeName).includes(colType)) {
    return false
  }

  const badgeWidth = getBadgeWidth(colType)
  const gap = 8

  // glide-data-grid advances the text by Math.ceil(headerIconSize * 1.3)
  const defaultAdvance = Math.ceil(badgeWidth * 1.3)
  const desiredAdvance = badgeWidth + gap
  const shift = desiredAdvance - defaultAdvance

  const originalFillText = ctx.fillText
  ctx.fillText = function (text, x, y, maxWidth) {
    ctx.fillText = originalFillText
    if (text === column.title) {
      originalFillText.call(this, text, x + shift, y, maxWidth)
    } else {
      originalFillText.call(this, text, x, y, maxWidth)
    }
  }

  return false
}
