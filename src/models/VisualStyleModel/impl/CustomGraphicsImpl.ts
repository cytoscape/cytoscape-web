// The first valid custom graphic will have only pie charts/ring charts/images in the
// default value, mapping and bypass.

import { IdType } from '../../IdType'
import { AttributeName, ValueType } from '../../TableModel'
import { Mapper } from '../VisualMappingFunction'
import { VisualProperty } from '../VisualProperty'
import { VisualPropertyValueType } from '../VisualPropertyValue'
import {
  CustomGraphicsNameType,
  CustomGraphicsType,
  PieChartPropertiesType,
} from '../VisualPropertyValue/CustomGraphicsType'

export const getCustomGraphicNodeVps = (
  vps: VisualProperty<VisualPropertyValueType>[],
) => {
  return vps
    .filter((vp) => vp.name.startsWith('nodeImageChart'))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const getNonCustomGraphicVps = (
  vps: VisualProperty<VisualPropertyValueType>[],
) => {
  return vps.filter((vp) => !vp.name.startsWith('nodeImageChart'))
}

// Support only default values and bypasses for now
export const getFirstValidCustomGraphicVp = (
  vps: VisualProperty<VisualPropertyValueType>[],
): VisualProperty<CustomGraphicsType> | undefined => {
  const customGraphicNodeVps = getCustomGraphicNodeVps(vps)

  const firstValidCustomGraphicVp = customGraphicNodeVps.find((vp) => {
    const defaultValue = vp.defaultValue as CustomGraphicsType
    const mapping = vp.mapping
    const bypassMap = vp.bypassMap

    const isValidCustomGraphicValue = (value: CustomGraphicsType) => {
      return (
        value.name === CustomGraphicsNameType.PieChart ||
        value.name === CustomGraphicsNameType.RingChart ||
        value.name === CustomGraphicsNameType.Image
      )
    }

    const isValidDefaultValue = isValidCustomGraphicValue(defaultValue)

    // Only support default values and bypasses for now
    // Ignore mappings
    // const isValidMapping = mapping !== undefined && (mapping)

    const isValidBypassMap = Array.from(bypassMap.values()).every((value) =>
      isValidCustomGraphicValue(value as CustomGraphicsType),
    )

    if (isValidDefaultValue && isValidBypassMap) {
      return vp
    }
  })

  return firstValidCustomGraphicVp as VisualProperty<CustomGraphicsType>
}

export const getSizePropertyForCustomGraphic = (
  value: VisualProperty<VisualPropertyValueType>,
  customGraphicVps: VisualProperty<VisualPropertyValueType>[],
): VisualProperty<VisualPropertyValueType> => {
  const lastCharacter = value.name.slice(-1) // e.g. nodeImageChartSize1 -> 1
  const customGraphicsSizeVP = customGraphicVps.find((vp) => {
    return vp.name === `nodeImageChartSize${lastCharacter}`
  })

  return customGraphicsSizeVP as VisualProperty<VisualPropertyValueType>
}

const sizeValueToCyjsPixelValue = (value: number) => `${value}px`

const computeCustomGraphicSizeProperties = (
  id: IdType,
  vp: VisualProperty<VisualPropertyValueType>,
  mappers: Map<AttributeName, Mapper>,
  row: Record<AttributeName, ValueType>,
) => {
  const { defaultValue, mapping, bypassMap, name, group } = vp
  const bypass = bypassMap.get(id)
  if (bypass !== undefined) {
    return bypass as number
  } else if (mapping !== undefined) {
    const attrName: string = mapping.attribute
    const attributeValueAssigned: ValueType | undefined = row[attrName]

    if (attributeValueAssigned !== undefined) {
      const mapper: Mapper | undefined = mappers.get(vp.name)
      if (mapper === undefined) {
        throw new Error(
          `Mapping is defined, but Mapper for ${vp.name} is not found`,
        )
      }
      const computedValue: VisualPropertyValueType = mapper(
        attributeValueAssigned,
      )

      return computedValue as number
    } else {
      return defaultValue as number
    }
  } else {
    return defaultValue as number
  }
}

export const computePieChartProperties = (
  id: IdType,

  value: CustomGraphicsType,
  row: Record<AttributeName, ValueType>,
  widthVp: VisualProperty<VisualPropertyValueType>,
  heightVp: VisualProperty<VisualPropertyValueType>,
  mappers: Map<AttributeName, Mapper>,
) => {
  const piePairsToAdd: [string, VisualPropertyValueType][] = []
  const pieValues = value.properties as PieChartPropertiesType
  const totalValue = pieValues.cy_dataColumns.reduce((acc, attribute) => {
    const attributeValue = row[attribute] as number
    const value = attributeValue ?? 0
    return acc + value
  }, 0)

  const width = computeCustomGraphicSizeProperties(id, widthVp, mappers, row)

  const height = computeCustomGraphicSizeProperties(id, heightVp, mappers, row)

  const size = Math.min(width, height)
  piePairsToAdd.push(['pieSize', sizeValueToCyjsPixelValue(size)])

  pieValues.cy_colors.forEach((color, index) => {
    const attribute = pieValues.cy_dataColumns[index]
    const attributeValue = row[attribute]
    const value = (attributeValue ?? 0) as number
    const percentage = Math.min(Math.max(0, value / totalValue), 1)
    const percentageToString = `${percentage * 100}%`
    const bgColorSelectorStr = `pie${index + 1}BackgroundColor` // pie chart properties start at 1 instead of 0
    const pieSliceSizeSelectorStr = `pie${index + 1}BackgroundSize`

    piePairsToAdd.push([bgColorSelectorStr, color])
    piePairsToAdd.push([pieSliceSizeSelectorStr, percentageToString])
  })
  return piePairsToAdd
}

export const computeRingChartProperties = (
  id: IdType,
  value: CustomGraphicsType,
  row: Record<AttributeName, ValueType>,
  customGraphicsSizeVp: VisualProperty<VisualPropertyValueType>,
  mappers: Map<AttributeName, Mapper>,
) => {
  const size = computeCustomGraphicSizeProperties(
    id,
    customGraphicsSizeVp,
    mappers,
    row,
  )
}

export const computeImageProperties = (
  id: IdType,
  value: CustomGraphicsType,
  row: Record<AttributeName, ValueType>,
  customGraphicsSizeVp: VisualProperty<VisualPropertyValueType>,
  mappers: Map<AttributeName, Mapper>,
) => {
  const size = computeCustomGraphicSizeProperties(
    id,
    customGraphicsSizeVp,
    mappers,
    row,
  )
}

export const computeCustomGraphicsProperties = (
  id: IdType,

  value: CustomGraphicsType,
  row: Record<AttributeName, ValueType>,
  widthVp: VisualProperty<VisualPropertyValueType>,
  heightVp: VisualProperty<VisualPropertyValueType>,
  mappers: Map<AttributeName, Mapper>,
) => {
  if (value.name === CustomGraphicsNameType.PieChart) {
    return computePieChartProperties(id, value, row, widthVp, heightVp, mappers)
  } else if (value.name === CustomGraphicsNameType.RingChart) {
    //TODO implement ring chart properties
    // return computeRingChartProperties(
    //   id,
    //   value,
    //   row,
    //   customGraphicsSizeVp,
    //   mappers,
    // )
  } else if (value.name === CustomGraphicsNameType.Image) {
    //TODO implement image properties
    // return computeImageProperties(id, value, row, customGraphicsSizeVp, mappers)
  }

  return []
}
