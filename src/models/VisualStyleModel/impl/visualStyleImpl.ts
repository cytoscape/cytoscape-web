import { IdType } from '../../IdType'
import { AttributeName, ValueType, ValueTypeName } from '../../TableModel'
import {
  Bypass,
  ContinuousFunctionControlPoint,
  ContinuousMappingFunction,
  DiscreteMappingFunction,
  MappingFunctionType,
  PassthroughMappingFunction,
  VisualProperty,
  VisualPropertyName,
  VisualPropertyValueType,
  VisualStyle,
} from '..'
import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'

/**
 * Set the default value for a visual property
 */
export const setDefault = (
  visualStyle: VisualStyle,
  vpName: VisualPropertyName,
  vpValue: VisualPropertyValueType,
): VisualStyle => {
  return {
    ...visualStyle,
    [vpName]: {
      ...visualStyle[vpName],
      defaultValue: vpValue,
    },
  }
}

/**
 * Set bypass values for multiple elements
 */
export const setBypass = (
  visualStyle: VisualStyle,
  vpName: VisualPropertyName,
  elementIds: IdType[],
  vpValue: VisualPropertyValueType,
): VisualStyle => {
  const visualProperty = visualStyle[vpName]
  const newBypassMap = new Map(visualProperty.bypassMap)

  elementIds.forEach((eleId) => {
    newBypassMap.set(eleId, vpValue)
  })

  return {
    ...visualStyle,
    [vpName]: {
      ...visualProperty,
      bypassMap: newBypassMap,
    },
  }
}

/**
 * Delete bypass values for multiple elements
 */
export const deleteBypass = (
  visualStyle: VisualStyle,
  vpName: VisualPropertyName,
  elementIds: IdType[],
): VisualStyle => {
  const visualProperty = visualStyle[vpName]
  const newBypassMap = new Map(visualProperty.bypassMap)

  elementIds.forEach((eleId) => {
    newBypassMap.delete(eleId)
  })

  return {
    ...visualStyle,
    [vpName]: {
      ...visualProperty,
      bypassMap: newBypassMap,
    },
  }
}

/**
 * Set the entire bypass map for a visual property
 */
export const setBypassMap = <T extends VisualPropertyValueType>(
  visualStyle: VisualStyle,
  vpName: VisualPropertyName,
  elementMap: Bypass<T>,
): VisualStyle => {
  return {
    ...visualStyle,
    [vpName]: {
      ...visualStyle[vpName],
      bypassMap: elementMap,
    },
  }
}

/**
 * Set discrete mapping values for multiple attribute values
 */
export const setDiscreteMappingValue = (
  visualStyle: VisualStyle,
  vpName: VisualPropertyName,
  values: ValueType[],
  vpValue: VisualPropertyValueType,
): VisualStyle => {
  const visualProperty = visualStyle[vpName]
  const mapping = visualProperty.mapping as DiscreteMappingFunction | undefined

  if (mapping?.vpValueMap == null) {
    return visualStyle
  }

  const newVpValueMap = new Map(mapping.vpValueMap)
  values.forEach((value) => {
    newVpValueMap.set(value, vpValue)
  })

  const newMapping: DiscreteMappingFunction = {
    ...mapping,
    vpValueMap: newVpValueMap,
  }

  return {
    ...visualStyle,
    [vpName]: {
      ...visualProperty,
      mapping: newMapping,
    },
  }
}

/**
 * Delete discrete mapping values for multiple attribute values
 */
export const deleteDiscreteMappingValue = (
  visualStyle: VisualStyle,
  vpName: VisualPropertyName,
  values: ValueType[],
): VisualStyle => {
  const visualProperty = visualStyle[vpName]
  const mapping = visualProperty.mapping as DiscreteMappingFunction | undefined

  if (mapping?.vpValueMap == null) {
    return visualStyle
  }

  const newVpValueMap = new Map(mapping.vpValueMap)
  values.forEach((value) => {
    newVpValueMap.delete(value)
  })

  const newMapping: DiscreteMappingFunction = {
    ...mapping,
    vpValueMap: newVpValueMap,
  }

  return {
    ...visualStyle,
    [vpName]: {
      ...visualProperty,
      mapping: newMapping,
    },
  }
}

/**
 * Set continuous mapping values
 */
export const setContinuousMappingValues = (
  visualStyle: VisualStyle,
  vpName: VisualPropertyName,
  min: ContinuousFunctionControlPoint,
  max: ContinuousFunctionControlPoint,
  controlPoints: ContinuousFunctionControlPoint[],
  ltMinVpValue: VisualPropertyValueType,
  gtMaxVpValue: VisualPropertyValueType,
): VisualStyle => {
  const visualProperty = visualStyle[vpName]
  const mapping = visualProperty.mapping as ContinuousMappingFunction | undefined

  if (mapping == null) {
    return visualStyle
  }

  const newMapping: ContinuousMappingFunction = {
    ...mapping,
    min,
    max,
    controlPoints,
    ltMinVpValue,
    gtMaxVpValue,
  }

  return {
    ...visualStyle,
    [vpName]: {
      ...visualProperty,
      mapping: newMapping,
    },
  }
}

/**
 * Create a discrete mapping function
 */
export const createDiscreteMapping = (
  visualStyle: VisualStyle,
  vpName: VisualPropertyName,
  attributeName: AttributeName,
  attributeType: ValueTypeName,
): VisualStyle => {
  const visualProperty = visualStyle[vpName]
  const { defaultValue } = visualProperty
  const vpValueMap = new Map<ValueType, VisualPropertyValueType>()

  const discreteMapping: DiscreteMappingFunction = {
    attribute: attributeName,
    type: MappingFunctionType.Discrete,
    vpValueMap,
    visualPropertyType: visualProperty.type,
    defaultValue,
  }

  return {
    ...visualStyle,
    [vpName]: {
      ...visualProperty,
      mapping: discreteMapping,
    },
  }
}

/**
 * Create a continuous mapping function
 */
export const createContinuousMapping = (
  visualStyle: VisualStyle,
  vpName: VisualPropertyName,
  vpType: VisualPropertyValueTypeName,
  attributeName: AttributeName,
  attributeValues: ValueType[],
): VisualStyle => {
  const DEFAULT_COLOR_SCHEME = ['#2166ac', 'white', '#b2182b']
  const DEFAULT_NUMBER_RANGE =
    !vpName.includes('Opacity') && !vpName.includes('opacity')
      ? [1, 100]
      : [0, 1]

  const mean = (data: number[]): number => {
    return data.reduce((a, b) => a + b) / data.length
  }

  const standardDeviation = (data: number[]): number => {
    const dataMean = mean(data)
    const sqDiff = data.map((n) => Math.pow(n - dataMean, 2))
    const avgSqDiff = mean(sqDiff)
    return Math.sqrt(avgSqDiff)
  }

  // Function to calculate the CDF of the t-distribution
  const tDistributionCDF = (t: number, df: number): number => {
    const x = df / (df + t * t)
    const a = 0.5 * df
    const b = 0.5
    const betacdf = (x: number, a: number, b: number): number => {
      const bt = Math.exp(
        a * Math.log(x) +
          b * Math.log(1 - x) -
          Math.log(a) -
          Math.log(b),
      )
      return bt
    }
    return 1 - 0.5 * betacdf(x, a, b)
  }

  // Function to perform two-tailed t-test
  const twoTailedTTest = (
    data: number[],
    populationMean: number,
  ): number => {
    const dataMean = mean(data)
    const dataStdDev = standardDeviation(data)
    const n = data.length
    const tStatistic =
      (dataMean - populationMean) / (dataStdDev / Math.sqrt(n))

    // Calculate degrees of freedom
    const degreesOfFreedom = n - 1

    // Calculate p-value for two-tailed test
    const pValue =
      2 * (1 - tDistributionCDF(Math.abs(tStatistic), degreesOfFreedom))

    return pValue
  }

  const createColorMapping = (): {
    min: ContinuousFunctionControlPoint
    max: ContinuousFunctionControlPoint
    ctrlPts: ContinuousFunctionControlPoint[]
  } => {
    let minValue = attributeValues[0] as number
    let maxValue = attributeValues[attributeValues.length - 1] as number
    if (twoTailedTTest(attributeValues as number[], 0) < 0.05) {
      const absoluteMax = Math.max(...(attributeValues as number[]).map(Math.abs))
      minValue = -absoluteMax
      maxValue = absoluteMax
    }

    const min = {
      value: minValue,
      vpValue: DEFAULT_COLOR_SCHEME[0],
      inclusive: false,
    }

    const max = {
      value: maxValue,
      vpValue: DEFAULT_COLOR_SCHEME[2],
      inclusive: false,
    }

    const ctrlPts = [
      {
        value: minValue,
        vpValue: DEFAULT_COLOR_SCHEME[0],
      },
      {
        value: ((max.value as number) + (min.value as number)) / 2,
        vpValue: DEFAULT_COLOR_SCHEME[1],
      },
      {
        value: maxValue,
        vpValue: DEFAULT_COLOR_SCHEME[2],
      },
    ]

    return { min, max, ctrlPts }
  }

  const createNumberMapping = (): {
    min: ContinuousFunctionControlPoint
    max: ContinuousFunctionControlPoint
    ctrlPts: ContinuousFunctionControlPoint[]
  } => {
    const min = {
      value: attributeValues[0] as number,
      vpValue: DEFAULT_NUMBER_RANGE[0],
      inclusive: false,
    }

    const max = {
      value: attributeValues[attributeValues.length - 1] as number,
      vpValue: DEFAULT_NUMBER_RANGE[1],
      inclusive: false,
    }

    const ctrlPts = [
      {
        value: attributeValues[0] as number,
        vpValue: DEFAULT_NUMBER_RANGE[0],
      },
      {
        value: ((max.value as number) + (min.value as number)) / 2,
        vpValue:
          (DEFAULT_NUMBER_RANGE[0] + DEFAULT_NUMBER_RANGE[1]) / 2,
      },
      {
        value: attributeValues[attributeValues.length - 1] as number,
        vpValue: DEFAULT_NUMBER_RANGE[1],
      },
    ]

    return { min, max, ctrlPts }
  }

  const visualProperty = visualStyle[vpName]
  const { defaultValue, type } = visualProperty

  if (vpType === VisualPropertyValueTypeName.Color) {
    const { min, max, ctrlPts } = createColorMapping()
    const continuousMapping: ContinuousMappingFunction = {
      attribute: attributeName,
      type: MappingFunctionType.Continuous,
      min,
      max,
      controlPoints: ctrlPts,
      visualPropertyType: type,
      defaultValue,
      ltMinVpValue: DEFAULT_COLOR_SCHEME[0],
      gtMaxVpValue: DEFAULT_COLOR_SCHEME[2],
    }

    return {
      ...visualStyle,
      [vpName]: {
        ...visualProperty,
        mapping: continuousMapping,
      },
    }
  } else if (vpType === VisualPropertyValueTypeName.Number) {
    const { min, max, ctrlPts } = createNumberMapping()
    const continuousMapping: ContinuousMappingFunction = {
      attribute: attributeName,
      type: MappingFunctionType.Continuous,
      min,
      max,
      controlPoints: ctrlPts,
      visualPropertyType: type,
      defaultValue,
      ltMinVpValue: DEFAULT_NUMBER_RANGE[0],
      gtMaxVpValue: DEFAULT_NUMBER_RANGE[1],
    }

    return {
      ...visualStyle,
      [vpName]: {
        ...visualProperty,
        mapping: continuousMapping,
      },
    }
  }

  // Return unchanged if vpType is not Color or Number
  return visualStyle
}

/**
 * Create a passthrough mapping function
 */
export const createPassthroughMapping = (
  visualStyle: VisualStyle,
  vpName: VisualPropertyName,
  attributeName: AttributeName,
  attributeType: ValueTypeName,
): VisualStyle => {
  const visualProperty = visualStyle[vpName]
  const { defaultValue, type } = visualProperty

  const passthroughMapping: PassthroughMappingFunction = {
    type: MappingFunctionType.Passthrough,
    attribute: attributeName,
    visualPropertyType: type,
    defaultValue,
  }

  return {
    ...visualStyle,
    [vpName]: {
      ...visualProperty,
      mapping: passthroughMapping,
    },
  }
}

/**
 * Remove a mapping function from a visual property
 */
export const removeMapping = (
  visualStyle: VisualStyle,
  vpName: VisualPropertyName,
): VisualStyle => {
  const visualProperty = visualStyle[vpName]
  const { mapping, ...rest } = visualProperty

  const updatedProperty: VisualProperty<VisualPropertyValueType> = {
    ...rest,
  } as VisualProperty<VisualPropertyValueType>

  return {
    ...visualStyle,
    [vpName]: updatedProperty,
  }
}

/**
 * Set a mapping function for a visual property
 */
export const setMapping = (
  visualStyle: VisualStyle,
  vpName: VisualPropertyName,
  mapping:
    | DiscreteMappingFunction
    | ContinuousMappingFunction
    | PassthroughMappingFunction
    | undefined,
): VisualStyle => {
  if (mapping === undefined) {
    return removeMapping(visualStyle, vpName)
  }

  return {
    ...visualStyle,
    [vpName]: {
      ...visualStyle[vpName],
      mapping,
    },
  }
}

