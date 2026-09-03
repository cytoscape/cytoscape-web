// src/app-api/core/visualStyleApi.ts
// Framework-agnostic Visual Style API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { IdType } from '../../models/IdType'
import {
  AttributeName,
  ValueType,
  ValueTypeName,
} from '../../models/TableModel'
import {
  ContinuousFunctionControlPoint,
  ContinuousMappingFunction,
  MappingFunctionType,
  VisualMappingFunction,
  VisualProperty,
  VisualPropertyGroup,
  VisualPropertyName,
  VisualPropertyValueType,
  VisualPropertyValueTypeName,
} from '../../models/VisualStyleModel'
import {
  AppCodes,
  ApiFailure,
  ApiResult,
  StyleCodes,
  fail,
  ok,
} from '../types/ApiResult'
import { markNetworkModified } from './undo'
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
}
