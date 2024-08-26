import { IdType } from '../IdType'
import { ValueType, AttributeName } from '../TableModel'
import {
  VisualStyle,
  VisualPropertyName,
  VisualPropertyValueType,
  ContinuousFunctionControlPoint,
  DiscreteMappingFunction,
  ContinuousMappingFunction,
  PassthroughMappingFunction,
  VisualPropertyValueTypeName,
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
  ) => void
  createDiscreteMapping: (
    networkId: IdType,
    vpName: VisualPropertyName,
    attribute: AttributeName,
  ) => void
  createPassthroughMapping: (
    networkId: IdType,
    vpName: VisualPropertyName,
    attribute: AttributeName,
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
