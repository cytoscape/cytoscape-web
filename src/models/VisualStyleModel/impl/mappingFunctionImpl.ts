import { ValueTypeName } from '../../TableModel'
import { SingleValueType } from '../../TableModel/ValueType'
import { MappingFunctionType, VisualPropertyValueTypeName } from '..'

const valueType2BaseType: Record<
  ValueTypeName | VisualPropertyValueTypeName,
  SingleValueType | null
> = {
  [ValueTypeName.String]: 'string',
  [ValueTypeName.Long]: 'number',
  [ValueTypeName.Integer]: 'number',
  [ValueTypeName.Double]: 'number',
  [ValueTypeName.Boolean]: 'boolean',
  [ValueTypeName.ListBoolean]: null,
  [ValueTypeName.ListLong]: null,
  [ValueTypeName.ListDouble]: null,
  [ValueTypeName.ListInteger]: null,
  [ValueTypeName.ListString]: null,
  [VisualPropertyValueTypeName.NodeShape]: 'string',
  [VisualPropertyValueTypeName.EdgeLine]: 'string',
  [VisualPropertyValueTypeName.EdgeArrowShape]: 'string',
  [VisualPropertyValueTypeName.Font]: 'string',
  [VisualPropertyValueTypeName.HorizontalAlign]: 'string',
  [VisualPropertyValueTypeName.VerticalAlign]: 'string',
  [VisualPropertyValueTypeName.NodeBorderLine]: 'string',
  [VisualPropertyValueTypeName.Visibility]: 'string',
  [VisualPropertyValueTypeName.Number]: 'number',
  [VisualPropertyValueTypeName.Boolean]: 'string',
  [VisualPropertyValueTypeName.String]: 'string',
}

// This function will be redundant once continuous discrete mapping ui is available
// Until then, only return valid mappings for a given visual property
// Continuous mappings cannot be applied to vps that are not numbers or colors
export const validMappingsForVP = (
  vpType: VisualPropertyValueTypeName,
): MappingFunctionType[] => {
  if (
    vpType === VisualPropertyValueTypeName.Number ||
    vpType === VisualPropertyValueTypeName.Color
  ) {
    return [
      MappingFunctionType.Continuous,
      MappingFunctionType.Discrete,
      MappingFunctionType.Passthrough,
    ]
  }

  return [MappingFunctionType.Discrete, MappingFunctionType.Passthrough]
}

// check whether a given value type can be applied to a given visual property value type
// e.g. number and font size is a valid mapping but number to a string property is not
export const typesCanBeMapped = (
  mappingType: MappingFunctionType,
  valueTypeName: ValueTypeName,
  vpValueTypeName: VisualPropertyValueTypeName,
  columnName?: string,
): boolean => {
  if (mappingType === MappingFunctionType.Passthrough) {
    const vtBaseType = valueType2BaseType[valueTypeName]
    const isSingleValue = vtBaseType != null
    const typesMatch =
      valueTypeName === vpValueTypeName || vtBaseType === vpValueTypeName
    const singleStringType =
      isSingleValue &&
      valueType2BaseType[vpValueTypeName] === VisualPropertyValueTypeName.String /// any single value type can be mapped to a string
    return typesMatch || singleStringType
  }

  if (mappingType === MappingFunctionType.Continuous) {
    const vtIsNumber =
      valueTypeName === ValueTypeName.Integer ||
      valueTypeName === ValueTypeName.Double ||
      valueTypeName === ValueTypeName.Long
    const vpIsNumberOrColor =
      vpValueTypeName === VisualPropertyValueTypeName.Number ||
      vpValueTypeName === VisualPropertyValueTypeName.Color

    return vtIsNumber && vpIsNumberOrColor
  }

  return true
}
