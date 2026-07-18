import { AttributeName, Column, ValueTypeName } from '../../TableModel'
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

// CW-569: continuous mappings are supported on numeric and color VPs
// (interpolated) as well as discrete-valued VPs such as edge line type and node
// shape (applied as a step function over the control points).
const CONTINUOUS_DISCRETE_VP_TYPES: Set<VisualPropertyValueTypeName> = new Set([
  VisualPropertyValueTypeName.NodeShape,
  VisualPropertyValueTypeName.EdgeLine,
  VisualPropertyValueTypeName.NodeBorderLine,
  VisualPropertyValueTypeName.EdgeArrowShape,
])

export const supportsContinuousMapping = (
  vpType: VisualPropertyValueTypeName,
): boolean =>
  vpType === VisualPropertyValueTypeName.Number ||
  vpType === VisualPropertyValueTypeName.Color ||
  CONTINUOUS_DISCRETE_VP_TYPES.has(vpType)

export const validMappingsForVP = (
  vpType: VisualPropertyValueTypeName,
): MappingFunctionType[] => {
  if (supportsContinuousMapping(vpType)) {
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
    // A continuous mapping always requires a numeric attribute; the visual
    // property may be numeric, color, or a supported discrete-valued type
    // (CW-569).
    const vtIsNumber =
      valueTypeName === ValueTypeName.Integer ||
      valueTypeName === ValueTypeName.Double ||
      valueTypeName === ValueTypeName.Long

    return vtIsNumber && supportsContinuousMapping(vpValueTypeName)
  }

  return true
}

export type MappingColumnChange =
  | { kind: 'create'; attributeType: ValueTypeName }
  | { kind: 'remove' }
  | { kind: 'clear' }

/**
 * Decide what should happen when the user picks a new mapping attribute
 * (column) in the Vizmapper.
 *
 * CW-616 / CW-651: the attribute type MUST be looked up from the newly selected
 * attribute, not the previously selected one. When a mapping is created from a
 * blank state (no attribute yet selected), looking up the old (empty) attribute
 * yielded `undefined`, so the mapping was never created and the selection
 * reverted to blank.
 *
 * - `create`: create/update the mapping on `nextAttribute` (type is compatible)
 * - `remove`: the type is incompatible with the mapping type; drop the mapping
 * - `clear`:  nothing to map yet (no mapping type or no attribute); just record
 *             the selected column
 */
export const resolveMappingColumnChange = (
  columns: Column[],
  nextAttribute: AttributeName,
  mappingType: MappingFunctionType | '',
  vpValueTypeName: VisualPropertyValueTypeName,
): MappingColumnChange => {
  const nextAttributeType = columns.find(
    (c) => c.name === nextAttribute,
  )?.type

  if (mappingType === '' || nextAttribute === '' || nextAttributeType == null) {
    return { kind: 'clear' }
  }

  if (typesCanBeMapped(mappingType, nextAttributeType, vpValueTypeName)) {
    return { kind: 'create', attributeType: nextAttributeType }
  }

  return { kind: 'remove' }
}
