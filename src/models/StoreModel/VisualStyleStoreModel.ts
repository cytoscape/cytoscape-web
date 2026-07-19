import { IdType } from '../IdType'
import { AttributeName, ValueType, ValueTypeName } from '../TableModel'
import {
  Bypass,
  ContinuousFunctionControlPoint,
  ContinuousMappingFunction,
  DiscreteMappingFunction,
  MappingFunctionType,
  PassthroughMappingFunction,
  VisualPropertyName,
  VisualPropertyValueType,
  VisualPropertyValueTypeName,
  VisualStyle,
  VisualStyleSet,
} from '../VisualStyleModel'

/**
 * One entry of a network's style set as held in the store.
 *
 * The store uses a working-copy pattern: `visualStyles[networkId]` always
 * holds the content of the ACTIVE style (preserving the store's historical
 * shape for all existing consumers, including Module Federation apps), so
 * the active entry here has `visualStyle === undefined`. Inactive entries
 * carry their content inline.
 */
export interface NamedStyleEntry {
  id: IdType
  name: string
  /** Style content. Undefined for the active entry — its content is the
   * working copy in `visualStyles[networkId]`. */
  visualStyle?: VisualStyle
}

/**
 * Store-internal representation of a network's named style set.
 */
export interface VisualStyleSetState {
  activeStyleId: IdType
  styles: Record<IdType, NamedStyleEntry>
}

export interface VisualStyleState {
  /** ACTIVE style of each network (the working copy that all visual
   * property mutations operate on). */
  visualStyles: Record<IdType, VisualStyle>
  /** Named style sets of each network (multi-style support). */
  styleSets: Record<IdType, VisualStyleSetState>
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
  /**
   * Register a network's visual style(s).
   *
   * @param visualStyle - content of the ACTIVE style
   * @param styleSet - optional complete named-style set (e.g. from a CX2
   *   import or the DB cache). When omitted, a fresh single-style set named
   *   "Default" is created around `visualStyle`.
   */
  add: (
    networkId: IdType,
    visualStyle: VisualStyle,
    styleSet?: VisualStyleSet,
  ) => void
  delete: (networkId: IdType) => void
  deleteAll: () => void
}

/**
 * Actions for managing a network's set of named styles.
 */
export interface StyleSetAction {
  /** Make another named style the active one. Clears the network's
   * undo/redo history (recorded edits reference the previous style). */
  switchStyle: (networkId: IdType, styleId: IdType) => void
  /** Create a new named style as a copy of the current ACTIVE style.
   * Returns the new style id, or undefined if the network is unknown. */
  createStyle: (networkId: IdType, name?: string) => IdType | undefined
  /** Duplicate any named style ("Copy of <name>").
   * Returns the new style id, or undefined on failure. */
  duplicateStyle: (networkId: IdType, styleId: IdType) => IdType | undefined
  /** Rename a named style (name is de-duplicated against siblings). */
  renameStyle: (networkId: IdType, styleId: IdType, name: string) => void
  /** Delete a named style. The last remaining style cannot be deleted;
   * deleting the active style activates another one. */
  deleteStyle: (networkId: IdType, styleId: IdType) => void
  /** Add a deep copy of an external style (e.g. a library template) as a
   * new named style. Returns the new style id, or undefined on failure. */
  importStyle: (
    networkId: IdType,
    name: string,
    visualStyle: VisualStyle,
  ) => IdType | undefined
}

export type VisualStyleStore = VisualStyleState &
  VisualStyleAction &
  StyleSetAction &
  UpdateVisualStyleAction
