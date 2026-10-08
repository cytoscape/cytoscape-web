// src/app-api/core/visualStyleApi.ts
// Framework-agnostic Visual Style API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { IdType } from '../../models/IdType'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import {
  AttributeName,
  ValueType,
  ValueTypeName,
} from '../../models/TableModel'
import {
  ContinuousFunctionControlPoint,
  ContinuousMappingFunction,
  MappingFunctionType,
  MAX_STYLES_PER_NETWORK,
  VisualMappingFunction,
  VisualProperty,
  VisualPropertyGroup,
  VisualPropertyName,
  VisualPropertyValueType,
  VisualPropertyValueTypeName,
  VisualStyle,
} from '../../models/VisualStyleModel'
import {
  cloneVisualStyle,
  visualStyleProblem,
} from '../../models/VisualStyleModel/impl/visualStyleSetImpl'
import {
  AppCodes,
  ApiFailure,
  ApiResult,
  StyleCodes,
  fail,
  ok,
} from '../types/ApiResult'
import { corePostEdit, markNetworkModified } from './undo'
import {
  validateBypassTargetScope,
  validateContinuousMappingBounds,
  validateElementsExist,
  validateMappingAttribute,
  validateVisualPropertyValue,
} from './validation'

// ── Public types ─────────────────────────────────────────────────────────────

/**
 * Parameters for createContinuousMapping. Bundled into an options object
 * because a continuous mapping needs many correlated values; passing them
 * positionally (nine arguments, three optional) is error-prone.
 */
export interface CreateContinuousMappingOptions {
  /** The visual property's value type (e.g. 'color', 'number'). */
  vpType: VisualPropertyValueTypeName
  /** Source attribute (table column) the mapping reads. */
  attribute: AttributeName
  /** Numeric attribute values that anchor the mapping (min…max). */
  attributeValues: ValueType[]
  /** Declared type of the source attribute. */
  attributeType: ValueTypeName
  /** Explicit control points; defaults are computed when omitted. */
  controlPoints?: ContinuousFunctionControlPoint[]
  /** Value applied below the minimum anchor. */
  ltMinVpValue?: VisualPropertyValueType
  /** Value applied above the maximum anchor. */
  gtMaxVpValue?: VisualPropertyValueType
}

/** Options for applyVisualStyle. */
export interface ApplyVisualStyleOptions {
  /**
   * Name of the new named-style entry in the target network's style set.
   * De-duplicated against its siblings ("X" → "X 2").
   *
   * @default "Imported style"
   */
  name?: string
}

/** One named style a network owns, from getStyles(). */
export interface NamedStyleInfo {
  /** Unique within this network's style set, and meaningless outside it. */
  id: IdType
  /** Display name. Unique within the set, but not across networks. */
  name: string
  /** True for the one style that is rendered and edited. */
  active: boolean
}

/** One visual property's identity and scope, from getVisualProperties(). */
export interface VisualPropertyInfo {
  name: VisualPropertyName
  group: VisualPropertyGroup
  type: VisualPropertyValueTypeName
  /** True when this property currently has a mapping. */
  hasMapping: boolean
}

export interface VisualStyleApi {
  // --- Read ---

  /**
   * List every visual property in the network's style, with its scope
   * (node/edge/network), value type, and whether it has a mapping.
   */
  getVisualProperties(
    networkId: IdType,
  ): ApiResult<{ properties: VisualPropertyInfo[] }>

  /** Read the default value of a visual property. */
  getDefault(
    networkId: IdType,
    vpName: VisualPropertyName,
  ): ApiResult<{ value: VisualPropertyValueType }>

  /**
   * Read a single element's bypass for a property. `value` is undefined
   * when the element has no bypass for it.
   */
  getBypass(
    networkId: IdType,
    vpName: VisualPropertyName,
    elementId: IdType,
  ): ApiResult<{ value: VisualPropertyValueType | undefined }>

  /**
   * Read every bypass set for a property, keyed by element id. Empty
   * object when the property has no bypasses.
   */
  getBypasses(
    networkId: IdType,
    vpName: VisualPropertyName,
  ): ApiResult<{ bypasses: Record<IdType, VisualPropertyValueType> }>

  /**
   * Read the mapping installed on a property. `mapping` is undefined when
   * the property has no mapping.
   */
  getMapping(
    networkId: IdType,
    vpName: VisualPropertyName,
  ): ApiResult<{ mapping: VisualMappingFunction | undefined }>

  /**
   * Read the network's active visual style as one object — every default,
   * mapping and bypass in the shape `applyVisualStyle` accepts.
   *
   * The returned style is a detached deep copy: mutating it changes
   * nothing in the network, and later edits to the network do not reach
   * it. Bypass entries survive here (they are stripped by
   * `applyVisualStyle`, not by this read).
   *
   * Only a network whose style is loaded in memory can answer — a
   * workspace network that has never been opened reports
   * `APP1 NETWORK_NOT_FOUND`.
   */
  getVisualStyle(networkId: IdType): ApiResult<{ visualStyle: VisualStyle }>

  /**
   * List the named styles the network owns, in the order the style set
   * holds them. Exactly one is `active`.
   *
   * Pair with `switchStyle` to move between styles the network already
   * has, and with `applyVisualStyle` to add one it does not.
   */
  getStyles(networkId: IdType): ApiResult<{ styles: NamedStyleInfo[] }>

  // --- Write ---

  setDefault(
    networkId: IdType,
    vpName: VisualPropertyName,
    vpValue: VisualPropertyValueType,
  ): ApiResult

  /**
   * Set several visual-property defaults in one call. Every entry is
   * validated first (property existence and value type); if any is
   * invalid, nothing is applied (all-or-nothing), so a bad value can't
   * leave a half-updated style.
   */
  setDefaults(
    networkId: IdType,
    defaults: Partial<Record<VisualPropertyName, VisualPropertyValueType>>,
  ): ApiResult

  setBypass(
    networkId: IdType,
    vpName: VisualPropertyName,
    elementIds: IdType[],
    vpValue: VisualPropertyValueType,
  ): ApiResult

  /**
   * Set several visual-property bypasses on the same set of elements in
   * one call — e.g. highlighting nodes with color + border + size at once.
   * Every entry is validated first (property existence, node/edge scope,
   * value type, and element existence); if any is invalid, nothing is
   * applied (all-or-nothing).
   */
  setBypasses(
    networkId: IdType,
    elementIds: IdType[],
    bypasses: Partial<Record<VisualPropertyName, VisualPropertyValueType>>,
  ): ApiResult

  deleteBypass(
    networkId: IdType,
    vpName: VisualPropertyName,
    elementIds: IdType[],
  ): ApiResult

  createDiscreteMapping(
    networkId: IdType,
    vpName: VisualPropertyName,
    attribute: AttributeName,
    attributeType: ValueTypeName,
    mapping?: Record<string, VisualPropertyValueType>,
  ): ApiResult

  createContinuousMapping(
    networkId: IdType,
    vpName: VisualPropertyName,
    options: CreateContinuousMappingOptions,
  ): ApiResult
  createPassthroughMapping(
    networkId: IdType,
    vpName: VisualPropertyName,
    attribute: AttributeName,
    attributeType: ValueTypeName,
  ): ApiResult

  /** Remove any mapping from a visual property. */
  deleteMapping(networkId: IdType, vpName: VisualPropertyName): ApiResult

  /**
   * Give the network a whole visual style — the equivalent of Cytoscape
   * Desktop's `VisualMappingManager.setVisualStyle(style, view)`, and of
   * the in-app "Apply Style" paths.
   *
   * **Copy, not a shared reference.** Desktop attaches one `VisualStyle`
   * object to a view, so several views can follow it and a later edit to
   * it changes all of them. In Cytoscape Web a style has no existence
   * outside a network, so this takes a snapshot: the network gets its own
   * deep copy of `visualStyle` as it is at this moment, and afterwards
   * edits to the passed object and to the network's copy are independent.
   *
   * The copy is added to the network's named-style set (as if by the
   * Vizmapper's "Apply Style") and made active. Bypasses are dropped —
   * they are keyed by the source network's node and edge ids, which name
   * nothing in the target. The switch is recorded as one undo entry, so
   * the user can undo it like any other style switch; the copy stays in
   * the style set after an undo, inert until selected.
   *
   * Fires `style:switched`, plus one `style:changed` per property that
   * differs from the previously active style.
   *
   * @returns the id of the new named-style entry within the target
   *   network's style set.
   */
  applyVisualStyle(
    networkId: IdType,
    visualStyle: VisualStyle,
    options?: ApplyVisualStyleOptions,
  ): ApiResult<{ styleId: IdType }>

  /**
   * Make one of the network's own named styles the active one. Ids come
   * from `getStyles` or from `applyVisualStyle`, and mean nothing outside
   * this network's style set.
   *
   * Recorded as one undo entry, like the Vizmapper's style picker.
   * Switching to the style that is already active succeeds and does
   * nothing — no undo entry, and the network is not marked modified.
   *
   * Fires `style:switched`, plus one `style:changed` per property that
   * differs between the two styles.
   */
  switchStyle(networkId: IdType, styleId: IdType): ApiResult
}

// ── Private helpers ──────────────────────────────────────────────────────────

/**
 * Shared preconditions for the three mapping creators: the visual
 * property must exist, must not be network-scoped (CX2 MC1), and its
 * source attribute must be declared with a compatible type (MI1/MI2,
 * plus MI3 for continuous mappings).
 */
function checkMappingPreconditions(
  networkId: IdType,
  vpName: VisualPropertyName,
  attribute: AttributeName,
  attributeType: ValueTypeName,
  requireNumeric: boolean,
): ApiFailure | undefined {
  const visualProperty =
    useVisualStyleStore.getState().visualStyles[networkId]?.[vpName]
  if (visualProperty === undefined) {
    return fail(AppCodes.INVALID_INPUT, `Unknown visual property ${vpName}`)
  }
  if (visualProperty.group === 'network') {
    return fail(StyleCodes.NETWORK_SCOPED_MAPPING_FORBIDDEN, vpName)
  }
  return validateMappingAttribute(
    networkId,
    visualProperty.group,
    attribute,
    attributeType,
    { requireNumeric },
  )
}

/** Name given to a style copied in by `applyVisualStyle` with no `name`. */
const DEFAULT_IMPORTED_STYLE_NAME = 'Imported style'

// ── Core implementation ──────────────────────────────────────────────────────

/**
 * Look up one visual property, returning a typed failure when the
 * network's style or the property itself is missing — shared by every
 * read method so they report the same codes as their write siblings.
 */
function resolveVisualProperty(
  networkId: IdType,
  vpName: VisualPropertyName,
):
  | { property: VisualProperty<VisualPropertyValueType> }
  | { failure: ApiFailure } {
  const style = useVisualStyleStore.getState().visualStyles[networkId]
  if (style === undefined) {
    return { failure: fail(AppCodes.NETWORK_NOT_FOUND, networkId) }
  }
  const property = style[vpName]
  if (property === undefined) {
    return {
      failure: fail(
        AppCodes.INVALID_INPUT,
        `Unknown visual property ${vpName}`,
      ),
    }
  }
  return { property }
}

export const visualStyleApi: VisualStyleApi = {
  getVisualProperties(
    networkId,
  ): ApiResult<{ properties: VisualPropertyInfo[] }> {
    try {
      const style = useVisualStyleStore.getState().visualStyles[networkId]
      if (style === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const properties: VisualPropertyInfo[] = []
      // Every field is treated as possibly absent: the runtime style
      // object can carry non-property fields that the VisualStyle type
      // does not describe, and those are filtered out below.
      for (const [name, vp] of Object.entries(style) as Array<
        [
          VisualPropertyName,
          Partial<VisualProperty<VisualPropertyValueType>> | undefined,
        ]
      >) {
        // Skip non-property fields the style object may carry
        if (vp?.group === undefined || vp.type === undefined) continue
        properties.push({
          name,
          group: vp.group,
          type: vp.type,
          hasMapping: vp.mapping !== undefined,
        })
      }
      return ok({ properties })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getDefault(networkId, vpName): ApiResult<{ value: VisualPropertyValueType }> {
    try {
      const resolved = resolveVisualProperty(networkId, vpName)
      if ('failure' in resolved) return resolved.failure
      return ok({ value: resolved.property.defaultValue })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getBypass(
    networkId,
    vpName,
    elementId,
  ): ApiResult<{ value: VisualPropertyValueType | undefined }> {
    try {
      const resolved = resolveVisualProperty(networkId, vpName)
      if ('failure' in resolved) return resolved.failure
      const bypassMap: Map<IdType, VisualPropertyValueType> | undefined =
        resolved.property.bypassMap
      return ok({ value: bypassMap?.get(elementId) })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getBypasses(
    networkId,
    vpName,
  ): ApiResult<{ bypasses: Record<IdType, VisualPropertyValueType> }> {
    try {
      const resolved = resolveVisualProperty(networkId, vpName)
      if ('failure' in resolved) return resolved.failure
      const bypassMap: Map<IdType, VisualPropertyValueType> | undefined =
        resolved.property.bypassMap
      const bypasses: Record<IdType, VisualPropertyValueType> = {}
      bypassMap?.forEach((value, id) => {
        bypasses[id] = value
      })
      return ok({ bypasses })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getMapping(
    networkId,
    vpName,
  ): ApiResult<{ mapping: VisualMappingFunction | undefined }> {
    try {
      const resolved = resolveVisualProperty(networkId, vpName)
      if ('failure' in resolved) return resolved.failure
      return ok({ mapping: resolved.property.mapping })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getVisualStyle(networkId): ApiResult<{ visualStyle: VisualStyle }> {
    try {
      const style = useVisualStyleStore.getState().visualStyles[networkId]
      if (style === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      // Detached on purpose. The stored object is deeply frozen by Immer,
      // so handing it back would give the caller something it cannot touch
      // (the `appData.get` problem) and would keep changing under it.
      return ok({ visualStyle: cloneVisualStyle(style) })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getStyles(networkId): ApiResult<{ styles: NamedStyleInfo[] }> {
    try {
      const styleSet = useVisualStyleStore.getState().styleSets[networkId]
      if (styleSet === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      // Metadata only. The inactive entries hold their content inline and
      // the active one's lives in the working copy, so returning content
      // here would mean cloning the whole set to list two fields of it.
      const styles = Object.values(styleSet.styles).map((entry) => ({
        id: entry.id,
        name: entry.name,
        active: entry.id === styleSet.activeStyleId,
      }))
      return ok({ styles })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  setDefault(networkId, vpName, vpValue): ApiResult {
    try {
      const visualStyles = useVisualStyleStore.getState().visualStyles
      if (visualStyles[networkId] === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const visualProperty = visualStyles[networkId][vpName]
      if (visualProperty === undefined) {
        return fail(AppCodes.INVALID_INPUT, `Unknown visual property ${vpName}`)
      }
      const invalidValue = validateVisualPropertyValue(
        vpName,
        visualProperty.type,
        vpValue,
      )
      if (invalidValue) return invalidValue

      useVisualStyleStore.getState().setDefault(networkId, vpName, vpValue)
      markNetworkModified(networkId)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  setDefaults(networkId, defaults): ApiResult {
    try {
      const style = useVisualStyleStore.getState().visualStyles[networkId]
      if (style === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const entries = Object.entries(defaults) as Array<
        [VisualPropertyName, VisualPropertyValueType]
      >
      // Validate every entry before applying any (all-or-nothing)
      for (const [vpName, vpValue] of entries) {
        const visualProperty = style[vpName]
        if (visualProperty === undefined) {
          return fail(
            AppCodes.INVALID_INPUT,
            `Unknown visual property ${vpName}`,
          )
        }
        const invalidValue = validateVisualPropertyValue(
          vpName,
          visualProperty.type,
          vpValue,
        )
        if (invalidValue) return invalidValue
      }
      const setDefault = useVisualStyleStore.getState().setDefault
      for (const [vpName, vpValue] of entries) {
        setDefault(networkId, vpName, vpValue)
      }
      // An empty map runs the loop zero times, so nothing changed.
      if (entries.length > 0) {
        markNetworkModified(networkId)
      }
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  setBypass(networkId, vpName, elementIds, vpValue): ApiResult {
    try {
      const visualStyles = useVisualStyleStore.getState().visualStyles
      if (visualStyles[networkId] === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      if (elementIds.length === 0) {
        return fail(AppCodes.INVALID_INPUT, 'elementIds must not be empty')
      }

      const visualProperty = visualStyles[networkId][vpName]
      if (visualProperty === undefined) {
        return fail(AppCodes.INVALID_INPUT, `Unknown visual property ${vpName}`)
      }
      if (visualProperty.group === 'network') {
        return fail(StyleCodes.NETWORK_SCOPED_BYPASS_FORBIDDEN, vpName)
      }

      const invalidValue = validateVisualPropertyValue(
        vpName,
        visualProperty.type,
        vpValue,
      )
      if (invalidValue) return invalidValue

      const missingElements = validateElementsExist(networkId, elementIds)
      if (missingElements) return missingElements

      const scopeMismatch = validateBypassTargetScope(
        networkId,
        elementIds,
        visualProperty.group,
      )
      if (scopeMismatch) return scopeMismatch

      useVisualStyleStore
        .getState()
        .setBypass(networkId, vpName, elementIds, vpValue)
      markNetworkModified(networkId)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  setBypasses(networkId, elementIds, bypasses): ApiResult {
    try {
      const style = useVisualStyleStore.getState().visualStyles[networkId]
      if (style === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      if (elementIds.length === 0) {
        return fail(AppCodes.INVALID_INPUT, 'elementIds must not be empty')
      }
      const entries = Object.entries(bypasses) as Array<
        [VisualPropertyName, VisualPropertyValueType]
      >

      // Elements must exist (checked once for the shared target set)
      const missingElements = validateElementsExist(networkId, elementIds)
      if (missingElements) return missingElements

      // Validate every property before applying any (all-or-nothing)
      const groupsToScopeCheck = new Set<'node' | 'edge'>()
      for (const [vpName, vpValue] of entries) {
        const visualProperty = style[vpName]
        if (visualProperty === undefined) {
          return fail(
            AppCodes.INVALID_INPUT,
            `Unknown visual property ${vpName}`,
          )
        }
        if (visualProperty.group === 'network') {
          return fail(StyleCodes.NETWORK_SCOPED_BYPASS_FORBIDDEN, vpName)
        }
        const invalidValue = validateVisualPropertyValue(
          vpName,
          visualProperty.type,
          vpValue,
        )
        if (invalidValue) return invalidValue
        groupsToScopeCheck.add(visualProperty.group)
      }

      // The scope check depends only on (networkId, elementIds, group), so
      // it runs once per distinct group rather than once per property —
      // each one scans the network's node list
      for (const group of groupsToScopeCheck) {
        const scopeMismatch = validateBypassTargetScope(
          networkId,
          elementIds,
          group,
        )
        if (scopeMismatch) return scopeMismatch
      }

      const setBypass = useVisualStyleStore.getState().setBypass
      for (const [vpName, vpValue] of entries) {
        setBypass(networkId, vpName, elementIds, vpValue)
      }
      // An empty map runs the loop zero times, so nothing changed.
      if (entries.length > 0) {
        markNetworkModified(networkId)
      }
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  deleteBypass(networkId, vpName, elementIds): ApiResult {
    try {
      const visualStyles = useVisualStyleStore.getState().visualStyles
      if (visualStyles[networkId] === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      // Read before the delete: `visualStyleImpl.deleteBypass` drops the ids
      // from the map whether or not they were in it, so afterwards there is
      // nothing left to tell a real removal from a no-op. An app that clears
      // bypasses speculatively (on every selection change, say) must not
      // dirty a clean network.
      const bypassMap = visualStyles[networkId][vpName]?.bypassMap
      const removedAny = elementIds.some(
        (elementId) => bypassMap?.has(elementId) === true,
      )

      useVisualStyleStore.getState().deleteBypass(networkId, vpName, elementIds)
      if (removedAny) {
        markNetworkModified(networkId)
      }
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  createDiscreteMapping(
    networkId,
    vpName,
    attribute,
    attributeType,
    mapping,
  ): ApiResult {
    try {
      const store = useVisualStyleStore.getState()
      const visualStyles = store.visualStyles
      if (visualStyles[networkId] === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const invalid = checkMappingPreconditions(
        networkId,
        vpName,
        attribute,
        attributeType,
        false,
      )
      if (invalid) return invalid

      // Build a complete discrete mapping with entries in one call
      const vpValueMap = new Map<ValueType, VisualPropertyValueType>()
      if (mapping) {
        for (const [key, value] of Object.entries(mapping)) {
          const parsedKey =
            attributeType === ValueTypeName.Integer ||
            attributeType === ValueTypeName.Long
              ? parseInt(key, 10)
              : attributeType === ValueTypeName.Double
                ? parseFloat(key)
                : key
          vpValueMap.set(parsedKey, value)
        }
      }
      const visualProperty = visualStyles[networkId][vpName]
      store.setMapping(networkId, vpName, {
        attribute,
        type: MappingFunctionType.Discrete,
        vpValueMap,
        visualPropertyType: visualProperty.type,
        defaultValue: visualProperty.defaultValue,
      })
      markNetworkModified(networkId)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  createContinuousMapping(networkId, vpName, options): ApiResult {
    try {
      const {
        vpType,
        attribute,
        attributeValues,
        attributeType,
        controlPoints,
        ltMinVpValue,
        gtMaxVpValue,
      } = options
      const store = useVisualStyleStore.getState()
      if (store.visualStyles[networkId] === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const invalid = checkMappingPreconditions(
        networkId,
        vpName,
        attribute,
        attributeType,
        true,
      )
      if (invalid) return invalid

      const invalidBounds = validateContinuousMappingBounds(
        attributeValues,
        controlPoints,
      )
      if (invalidBounds) return invalidBounds

      store.createContinuousMapping(
        networkId,
        vpName,
        vpType,
        attribute,
        attributeValues,
        attributeType,
      )

      // createContinuousMapping computes default min/max/controlPoints/lt/gt values;
      // read them back so any caller-supplied overrides can fall back to those defaults.
      const currentMapping = useVisualStyleStore.getState().visualStyles[
        networkId
      ][vpName].mapping as ContinuousMappingFunction | undefined
      if (currentMapping) {
        const effectiveControlPoints =
          controlPoints ?? currentMapping.controlPoints
        const min: ContinuousFunctionControlPoint = controlPoints
          ? controlPoints[0]
          : currentMapping.min
        const max: ContinuousFunctionControlPoint = controlPoints
          ? controlPoints[controlPoints.length - 1]
          : currentMapping.max
        useVisualStyleStore
          .getState()
          .setContinuousMappingValues(
            networkId,
            vpName,
            min,
            max,
            effectiveControlPoints,
            ltMinVpValue ?? currentMapping.ltMinVpValue,
            gtMaxVpValue ?? currentMapping.gtMaxVpValue,
          )
      }
      markNetworkModified(networkId)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  createPassthroughMapping(
    networkId,
    vpName,
    attribute,
    attributeType,
  ): ApiResult {
    try {
      const visualStyles = useVisualStyleStore.getState().visualStyles
      if (visualStyles[networkId] === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const invalid = checkMappingPreconditions(
        networkId,
        vpName,
        attribute,
        attributeType,
        false,
      )
      if (invalid) return invalid

      useVisualStyleStore
        .getState()
        .createPassthroughMapping(networkId, vpName, attribute, attributeType)
      markNetworkModified(networkId)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  deleteMapping(networkId, vpName): ApiResult {
    try {
      const visualStyles = useVisualStyleStore.getState().visualStyles
      if (visualStyles[networkId] === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      // Removing an absent mapping changes nothing, so it must not mark.
      const hadMapping = visualStyles[networkId][vpName]?.mapping !== undefined

      useVisualStyleStore.getState().removeMapping(networkId, vpName)
      if (hadMapping) {
        markNetworkModified(networkId)
      }
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  applyVisualStyle(
    networkId,
    visualStyle,
    options,
  ): ApiResult<{ styleId: IdType }> {
    try {
      const store = useVisualStyleStore.getState()
      if (store.visualStyles[networkId] === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      // The one place an arbitrary object from an app becomes what the
      // renderer reads. Without this check a malformed style fails later,
      // inside CyjsRenderer, with nothing naming the caller — hence the
      // reason string rather than a bare boolean.
      const problem = visualStyleProblem(visualStyle)
      if (problem !== undefined) {
        return fail(AppCodes.INVALID_INPUT, `visualStyle ${problem}`)
      }
      const styleSet = store.styleSets[networkId]
      if (styleSet === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      // Checked here rather than read off importStyle's return value:
      // importStyle reports both an unknown network and a full set as
      // `undefined`, so the reason has to be established before the call.
      if (Object.keys(styleSet.styles).length >= MAX_STYLES_PER_NETWORK) {
        return fail(AppCodes.STYLE_SET_FULL, networkId, MAX_STYLES_PER_NETWORK)
      }

      const previousStyleId = styleSet.activeStyleId
      const styleId = store.importStyle(
        networkId,
        options?.name ?? DEFAULT_IMPORTED_STYLE_NAME,
        visualStyle,
      )
      if (styleId === undefined) {
        return fail(
          AppCodes.OPERATION_FAILED,
          `Could not add a visual style to network ${networkId}`,
        )
      }

      // Same two steps, in the same order, as the Vizmapper's copy-in path
      // (StyleManager.handleCopyIn).
      if (useVisualStyleStore.getState().switchStyle(networkId, styleId)) {
        // The STORED name, read fresh: importStyle de-duplicates, so a
        // second copy from the same source is "X 2" and the undo
        // description has to match what the user sees in the style list.
        const storedName =
          useVisualStyleStore.getState().styleSets[networkId]?.styles[styleId]
            ?.name ?? options?.name
        corePostEdit(
          networkId,
          UndoCommandType.SWITCH_STYLE,
          `Switch style to "${storedName ?? DEFAULT_IMPORTED_STYLE_NAME}"`,
          [networkId, previousStyleId],
          [networkId, styleId],
        )
      } else {
        // corePostEdit marks the network itself, so this only covers the
        // case where the switch failed: the copy still landed in the style
        // set and has to be saveable.
        markNetworkModified(networkId)
      }
      return ok({ styleId })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  switchStyle(networkId, styleId): ApiResult {
    try {
      const styleSet = useVisualStyleStore.getState().styleSets[networkId]
      if (styleSet === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const target = styleSet.styles[styleId]
      if (target === undefined) {
        return fail(AppCodes.STYLE_NOT_FOUND, styleId, networkId)
      }
      // Already active: nothing changed, so no undo entry and no modified
      // mark. An app that re-asserts a style on every event must not dirty
      // a clean network — same reasoning as deleteBypass.
      const previousStyleId = styleSet.activeStyleId
      if (styleId === previousStyleId) {
        return ok()
      }

      if (!useVisualStyleStore.getState().switchStyle(networkId, styleId)) {
        // Both of the store's other refusals — unknown network, unknown
        // style — are already ruled out above, so this is the entry whose
        // content is missing: a set that broke its own invariant.
        return fail(
          AppCodes.OPERATION_FAILED,
          `Style ${styleId} of network ${networkId} has no content`,
        )
      }
      corePostEdit(
        networkId,
        UndoCommandType.SWITCH_STYLE,
        `Switch style to "${target.name}"`,
        [networkId, previousStyleId],
        [networkId, styleId],
      )
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },
}
