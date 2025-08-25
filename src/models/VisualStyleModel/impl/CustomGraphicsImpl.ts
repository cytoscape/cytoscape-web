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
  RingChartPropertiesType,
} from '../VisualPropertyValue/CustomGraphicsType'
import { SpecialPropertyName } from './CyjsProperties/CyjsStyleModels/DirectMappingSelector'

export const VALID_PIE_CHART_SLICE_INDEX_RANGE = [1, 16]

/**
 * Returns all custom graphics related property keys as an array
 * @returns Array of custom graphics property keys
 */
export const getCustomGraphicsPropertyKeys = (): string[] => {
  const propertyKeys: string[] = []

  // Add the main pie chart properties
  propertyKeys.push(SpecialPropertyName.PieSize)
  propertyKeys.push(SpecialPropertyName.PieStartAngle)
  propertyKeys.push(SpecialPropertyName.PieHole)

  // Add pie background colors for all valid slice indices (1-16)
  for (
    let i = VALID_PIE_CHART_SLICE_INDEX_RANGE[0];
    i <= VALID_PIE_CHART_SLICE_INDEX_RANGE[1];
    i++
  ) {
    propertyKeys.push(getPieBackgroundColorViewModelProp(i))
  }

  // Add pie background sizes for all valid slice indices (1-16)
  for (
    let i = VALID_PIE_CHART_SLICE_INDEX_RANGE[0];
    i <= VALID_PIE_CHART_SLICE_INDEX_RANGE[1];
    i++
  ) {
    propertyKeys.push(getPieBackgroundSizeViewModelProp(i))
  }

  return propertyKeys
}

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

export const getFirstValidCustomGraphicVp = (
  vps: VisualProperty<VisualPropertyValueType>[],
): VisualProperty<CustomGraphicsType> | undefined => {
  const customGraphicNodeVps = getCustomGraphicNodeVps(vps)

  // helper to test if a CustomGraphicsType is one of the supported chart/image types
  const isPreferredGraphic = (value: CustomGraphicsType) =>
    value.name === CustomGraphicsNameType.PieChart ||
    value.name === CustomGraphicsNameType.RingChart ||
    value.name === CustomGraphicsNameType.Image

  const fullyValid = customGraphicNodeVps.find((vp) => {
    const defaultValue = vp.defaultValue as CustomGraphicsType
    const bypassMap = vp.bypassMap

    const isValidDefault = isPreferredGraphic(defaultValue)
    const isValidBypass = Array.from(bypassMap.values()).every((v) =>
      isPreferredGraphic(v as CustomGraphicsType),
    )

    return isValidDefault && isValidBypass
  })
  if (fullyValid) {
    return fullyValid as VisualProperty<CustomGraphicsType>
  }

  // If none of the preferred types are fully valid, pick the first “empty” graphic (None)
  const emptyGraphic = customGraphicNodeVps.find((vp) => {
    const defaultValue = vp.defaultValue as CustomGraphicsType
    return defaultValue.name === CustomGraphicsNameType.None
  })
  if (emptyGraphic) {
    return emptyGraphic as VisualProperty<CustomGraphicsType>
  }

  // No valid or empty graphics found → return undefined
  return undefined
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

const angleValueToCyjsPixelValue = (value: number) =>
  `${(((90 - value) % 360) + 360) % 360}deg`

const holeSizeValueToCyjsPixelValue = (value: number) => `${value * 100}%`

// Helper functions to get pie background property names from SpecialPropertyName map
export const getPieBackgroundColorViewModelProp = (
  sliceIndex: number,
): string => {
  // Check if the index is in the valid range
  if (
    sliceIndex < VALID_PIE_CHART_SLICE_INDEX_RANGE[0] ||
    sliceIndex > VALID_PIE_CHART_SLICE_INDEX_RANGE[1]
  ) {
    console.debug(
      `[CustomGraphicsImpl] getPieBackgroundColorViewModelProp: Invalid pie chart slice index: ${sliceIndex}. Valid range is ${VALID_PIE_CHART_SLICE_INDEX_RANGE[0]}-${VALID_PIE_CHART_SLICE_INDEX_RANGE[1]}`,
    )
  }

  const propMap: Record<number, SpecialPropertyName> = {
    1: SpecialPropertyName.Pie1BackgroundColor,
    2: SpecialPropertyName.Pie2BackgroundColor,
    3: SpecialPropertyName.Pie3BackgroundColor,
    4: SpecialPropertyName.Pie4BackgroundColor,
    5: SpecialPropertyName.Pie5BackgroundColor,
    6: SpecialPropertyName.Pie6BackgroundColor,
    7: SpecialPropertyName.Pie7BackgroundColor,
    8: SpecialPropertyName.Pie8BackgroundColor,
    9: SpecialPropertyName.Pie9BackgroundColor,
    10: SpecialPropertyName.Pie10BackgroundColor,
    11: SpecialPropertyName.Pie11BackgroundColor,
    12: SpecialPropertyName.Pie12BackgroundColor,
    13: SpecialPropertyName.Pie13BackgroundColor,
    14: SpecialPropertyName.Pie14BackgroundColor,
    15: SpecialPropertyName.Pie15BackgroundColor,
    16: SpecialPropertyName.Pie16BackgroundColor,
  }

  return propMap[sliceIndex] || `pie${sliceIndex}BackgroundColor`
}

export const getPieBackgroundSizeViewModelProp = (
  sliceIndex: number,
): string => {
  // Check if the index is in the valid range
  if (
    sliceIndex < VALID_PIE_CHART_SLICE_INDEX_RANGE[0] ||
    sliceIndex > VALID_PIE_CHART_SLICE_INDEX_RANGE[1]
  ) {
    console.debug(
      `[CustomGraphicsImpl] getPieBackgroundSizeViewModelProp: Invalid pie chart slice index: ${sliceIndex}. Valid range is ${VALID_PIE_CHART_SLICE_INDEX_RANGE[0]}-${VALID_PIE_CHART_SLICE_INDEX_RANGE[1]}`,
    )
  }

  const propMap: Record<number, SpecialPropertyName> = {
    1: SpecialPropertyName.Pie1BackgroundSize,
    2: SpecialPropertyName.Pie2BackgroundSize,
    3: SpecialPropertyName.Pie3BackgroundSize,
    4: SpecialPropertyName.Pie4BackgroundSize,
    5: SpecialPropertyName.Pie5BackgroundSize,
    6: SpecialPropertyName.Pie6BackgroundSize,
    7: SpecialPropertyName.Pie7BackgroundSize,
    8: SpecialPropertyName.Pie8BackgroundSize,
    9: SpecialPropertyName.Pie9BackgroundSize,
    10: SpecialPropertyName.Pie10BackgroundSize,
    11: SpecialPropertyName.Pie11BackgroundSize,
    12: SpecialPropertyName.Pie12BackgroundSize,
    13: SpecialPropertyName.Pie13BackgroundSize,
    14: SpecialPropertyName.Pie14BackgroundSize,
    15: SpecialPropertyName.Pie15BackgroundSize,
    16: SpecialPropertyName.Pie16BackgroundSize,
  }
  return propMap[sliceIndex] || `pie${sliceIndex}BackgroundSize`
}

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
  const padding = 4 // padding between pie chart and node border, this is an attempt to render things similarly to Cytoscape Desktop
  const size = Math.min(width, height) - padding

  const angle = pieValues.cy_startAngle ?? 0

  piePairsToAdd.push([
    SpecialPropertyName.PieSize,
    sizeValueToCyjsPixelValue(size),
  ])

  piePairsToAdd.push([
    SpecialPropertyName.PieStartAngle,
    angleValueToCyjsPixelValue(angle),
  ])

  const colorsReversed = pieValues.cy_colors.slice().reverse()
  const columnsReversed = pieValues.cy_dataColumns.slice().reverse()

  colorsReversed.forEach((color, index) => {
    const attribute = columnsReversed[index]
    const attributeValue = row[attribute]
    const value = (attributeValue ?? 0) as number
    const percentage = Math.min(Math.max(0, value / totalValue), 1)
    const percentageToString = `${percentage * 100}%`

    const bgColorSelectorStr = getPieBackgroundColorViewModelProp(index + 1)
    const pieSliceSizeSelectorStr = getPieBackgroundSizeViewModelProp(index + 1)

    piePairsToAdd.push([bgColorSelectorStr, color])
    piePairsToAdd.push([pieSliceSizeSelectorStr, percentageToString])
  })
  return piePairsToAdd
}

export const computeRingChartProperties = (
  id: IdType,

  value: CustomGraphicsType,
  row: Record<AttributeName, ValueType>,
  widthVp: VisualProperty<VisualPropertyValueType>,
  heightVp: VisualProperty<VisualPropertyValueType>,
  mappers: Map<AttributeName, Mapper>,
) => {
  const piePairsToAdd: [string, VisualPropertyValueType][] = []
  const pieValues = value.properties as RingChartPropertiesType
  const totalValue = pieValues.cy_dataColumns.reduce((acc, attribute) => {
    const attributeValue = row[attribute] as number
    const value = attributeValue ?? 0
    return acc + value
  }, 0)

  const width = computeCustomGraphicSizeProperties(id, widthVp, mappers, row)

  const height = computeCustomGraphicSizeProperties(id, heightVp, mappers, row)
  const padding = 4 // padding between pie chart and node border, this is an attempt to render things similarly to Cytoscape Desktop
  const size = Math.min(width, height) - padding

  const angle = pieValues.cy_startAngle ?? 0

  const holeSize = pieValues.cy_holeSize ?? 0.4

  piePairsToAdd.push([
    SpecialPropertyName.PieSize,
    sizeValueToCyjsPixelValue(size),
  ])

  piePairsToAdd.push([
    SpecialPropertyName.PieStartAngle,
    angleValueToCyjsPixelValue(angle),
  ])

  piePairsToAdd.push([
    SpecialPropertyName.PieHole,
    holeSizeValueToCyjsPixelValue(holeSize),
  ])

  const colorsReversed = pieValues.cy_colors.slice().reverse()
  const columnsReversed = pieValues.cy_dataColumns.slice().reverse()

  colorsReversed.forEach((color, index) => {
    const attribute = columnsReversed[index]
    const attributeValue = row[attribute]
    const value = (attributeValue ?? 0) as number
    const percentage = Math.min(Math.max(0, value / totalValue), 1)
    const percentageToString = `${percentage * 100}%`

    const bgColorSelectorStr = getPieBackgroundColorViewModelProp(index + 1)
    const pieSliceSizeSelectorStr = getPieBackgroundSizeViewModelProp(index + 1)

    piePairsToAdd.push([bgColorSelectorStr, color])
    piePairsToAdd.push([pieSliceSizeSelectorStr, percentageToString])
  })

  return piePairsToAdd
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
    return computeRingChartProperties(
      id,
      value,
      row,
      widthVp,
      heightVp,
      mappers,
    )
  } else if (value.name === CustomGraphicsNameType.Image) {
    //TODO implement image properties
    // return computeImageProperties(id, value, row, customGraphicsSizeVp, mappers)
  } else if (value.name === CustomGraphicsNameType.None) {
    return []
  }

  return []
}
