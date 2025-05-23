import { IdType } from '../IdType'
import { ValueType, AttributeName, ValueTypeName } from '../TableModel'
import {
  VisualStyle,
  VisualPropertyName,
  VisualPropertyValueType,
  ContinuousFunctionControlPoint,
  DiscreteMappingFunction,
  ContinuousMappingFunction,
  PassthroughMappingFunction,
  VisualPropertyValueTypeName,
  Bypass,
  MappingFunctionType,
} from '../VisualStyleModel'

export interface VisualStyleState {
  visualStyles: Record<IdType, VisualStyle>
}

/**
 * Actions to mutate visual style structure
 */
export interface UpdateVisualStyleAction {
  setDefault: (
    networkId: IdType,
    vpName: VisualPropertyName,
    vpValue: VisualPropertyValueType,
  ) => void
  setBypass: (
    networkId: IdType,
    vpName: VisualPropertyName,
    elementIds: IdType[],
    vpValue: VisualPropertyValueType,
  ) => void
  setBypassMap: (
    networkId: IdType,
    vpName: VisualPropertyName,
    elementMap: Bypass<VisualPropertyValueType>,
  ) => void
  deleteBypass: (
    networkId: IdType,
    vpName: VisualPropertyName,
    elementIds: IdType[],
  ) => void
  setDiscreteMappingValue: (
    networkId: IdType,
    vpName: VisualPropertyName,
    values: ValueType[],
    vpValue: VisualPropertyValueType,
  ) => void
  deleteDiscreteMappingValue: (
    networkId: IdType,
    vpName: VisualPropertyName,
    values: ValueType[],
  ) => void
  setContinuousMappingValues: (
    networkId: IdType,
    vpName: VisualPropertyName,
    min: ContinuousFunctionControlPoint,
    max: ContinuousFunctionControlPoint,
    controlPoints: ContinuousFunctionControlPoint[],
    ltMinVpValue: VisualPropertyValueType,
    gtMaxVpValue: VisualPropertyValueType,
  ) => void
  createMapping: (
    networkId: IdType,
    vpName: VisualPropertyName,
    vpType: VisualPropertyValueTypeName,
    mappingType: MappingFunctionType,
    attribute: AttributeName,
    attributeDataType: ValueTypeName,
    attributeValues: ValueType[],
  ) => void
  setMapping: (
    networkId: IdType,
    vpName: VisualPropertyName,
    mapping:
      | DiscreteMappingFunction
      | ContinuousMappingFunction
      | PassthroughMappingFunction
      | undefined,
  ) => void
  createContinuousMapping: (
    networkId: IdType,
    vpName: VisualPropertyName,
    vpType: VisualPropertyValueTypeName,
    attribute: AttributeName,
    attributeValues: ValueType[],
    attributeType: ValueTypeName,
  ) => void
  createDiscreteMapping: (
    networkId: IdType,
    vpName: VisualPropertyName,
    attribute: AttributeName,
    attributeType: ValueTypeName,
  ) => void
  createPassthroughMapping: (
    networkId: IdType,
    vpName: VisualPropertyName,
    attribute: AttributeName,
    attributeType: ValueTypeName,
  ) => void
  removeMapping: (networkId: IdType, vpName: VisualPropertyName) => void
  // setMapping: () // TODO
}

export interface VisualStyleAction {
  add: (networkId: IdType, visualStyle: VisualStyle) => void
  delete: (networkId: IdType) => void
  deleteAll: () => void
}

export type VisualStyleStore = VisualStyleState &
  VisualStyleAction &
  UpdateVisualStyleAction
